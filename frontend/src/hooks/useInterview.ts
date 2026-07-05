import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getNextQuestion, transcribeAudio, type Question } from "@/lib/api";

export interface InterviewMessage {
  id: string;
  role: "ai" | "user";
  content: string;
  created_at: string;
}

const MAX_QUESTIONS = 3; // daily content modes (thinking / market_signal)

// Product-progress mode is a quick single-prompt share, not a multi-question
// interview.
const PRODUCT_UPDATE_MAX_QUESTIONS = 1;

// First DNA interview: opens with a self-introduction, then DNA questions.
// The intro, every question and every follow-up all count toward this single
// cap, so the whole session is at most DNA_MAX_QUESTIONS turns.
const DNA_MAX_QUESTIONS = 5;

const SELF_INTRO_QUESTION =
  "先做个简单的自我介绍吧——你是谁？在做什么产品？现在走到哪一步了？";

// crypto.randomUUID() only exists in secure contexts (HTTPS/localhost). Fall
// back to a manual UUID so the app also works over plain HTTP / old WebViews.
function safeUUID(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID();
  if (c?.getRandomValues) {
    const b = c.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = Array.from(b, (x) => x.toString(16).padStart(2, "0"));
    return `${h[0]}${h[1]}${h[2]}${h[3]}-${h[4]}${h[5]}-${h[6]}${h[7]}-${h[8]}${h[9]}-${h[10]}${h[11]}${h[12]}${h[13]}${h[14]}${h[15]}`;
  }
  return `id-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

export function useInterview(category = "interview") {
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [completed, setCompleted] = useState(false);

  // The DNA-building interview (category "interview") opens with a self-intro
  // and counts follow-ups toward its cap; daily content modes do not.
  // Product-progress is a single-question quick share.
  const isDna = category === "interview";
  const maxQuestions = isDna
    ? DNA_MAX_QUESTIONS
    : category === "product_update"
      ? PRODUCT_UPDATE_MAX_QUESTIONS
      : MAX_QUESTIONS;

  const startInterview = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Create interview session
    const { data: interview, error } = await supabase
      .from("interviews")
      .insert({ user_id: user.id })
      .select()
      .single();

    if (error) throw error;
    setInterviewId(interview.id);
    setMessages([]);
    setQuestionCount(0);
    setCompleted(false);

    // First turn. The DNA interview always opens with a self-introduction;
    // daily content modes pull a random question from the bank.
    let firstQuestion: Question | null;
    if (isDna) {
      firstQuestion = {
        id: "self-intro",
        category,
        question: SELF_INTRO_QUESTION,
        follow_up: null,
      };
    } else {
      const { question } = await getNextQuestion(category, interview.id);
      firstQuestion = question;
    }

    if (firstQuestion) {
      setCurrentQuestion(firstQuestion);
      setQuestionCount(1);
      // Save AI message
      await supabase.from("interview_messages").insert({
        interview_id: interview.id,
        role: "ai",
        content: firstQuestion.question,
      });
      setMessages([
        {
          id: safeUUID(),
          role: "ai",
          content: firstQuestion.question,
          created_at: new Date().toISOString(),
        },
      ]);
    }

    return interview.id;
  }, [category, isDna]);

  const sendAnswer = useCallback(
    async (answer: string) => {
      if (!interviewId) throw new Error("No active interview");
      if (completed) return;

      setLoading(true);
      try {
        // Save user message
        const { data: userMsg } = await supabase
          .from("interview_messages")
          .insert({
            interview_id: interviewId,
            role: "user",
            content: answer,
          })
          .select()
          .single();

        if (userMsg) {
          setMessages((prev) => [...prev, userMsg]);
        }

        // Decide the next AI turn. Questions AND follow-ups both count toward
        // maxQuestions (for every mode), so the session never exceeds that many
        // asked turns. Once we've hit the cap, finish.
        const followUp = currentQuestion?.follow_up || undefined;
        let questionText: string;

        if (questionCount >= maxQuestions) {
          questionText = "采访完成！我们可以进入下一步了。";
          setCurrentQuestion(null);
          setCompleted(true);
        } else if (followUp) {
          questionText = followUp;
          setCurrentQuestion(null);
          setQuestionCount((c) => c + 1);
        } else {
          const { question } = await getNextQuestion(category, interviewId);
          if (question) {
            questionText = question.question;
            setCurrentQuestion(question);
            setQuestionCount((c) => c + 1);
          } else {
            questionText = "采访完成！我们可以进入下一步了。";
            setCurrentQuestion(null);
            setCompleted(true);
          }
        }

        // Save AI message
        const { data: aiMsg } = await supabase
          .from("interview_messages")
          .insert({
            interview_id: interviewId,
            role: "ai",
            content: questionText,
          })
          .select()
          .single();

        if (aiMsg) {
          setMessages((prev) => [...prev, aiMsg]);
        }
      } finally {
        setLoading(false);
      }
    },
    [
      interviewId,
      currentQuestion,
      questionCount,
      completed,
      category,
      isDna,
      maxQuestions,
    ],
  );

  const voiceAnswer = useCallback(
    async (audioBlob: Blob) => {
      if (!interviewId) throw new Error("No active interview");

      setLoading(true);
      try {
        const { text } = await transcribeAudio(audioBlob, interviewId);
        if (text) {
          await sendAnswer(text);
        }
        return text;
      } finally {
        setLoading(false);
      }
    },
    [interviewId, sendAnswer],
  );

  const completeInterview = useCallback(async () => {
    if (!interviewId) return;

    await supabase
      .from("interviews")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", interviewId);
  }, [interviewId]);

  return {
    interviewId,
    messages,
    currentQuestion,
    questionCount,
    maxQuestions,
    loading,
    recording,
    completed,
    setRecording,
    startInterview,
    sendAnswer,
    voiceAnswer,
    completeInterview,
  };
}
