import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getNextQuestion, transcribeAudio, type Question } from "@/lib/api";

export interface InterviewMessage {
  id: string;
  role: "ai" | "user";
  content: string;
  created_at: string;
}

const MAX_QUESTIONS = 3;

export function useInterview(category = "interview") {
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [completed, setCompleted] = useState(false);

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

    // Get first random question
    const { question } = await getNextQuestion(category, interview.id);
    if (question) {
      setCurrentQuestion(question);
      setQuestionCount(1);
      // Save AI message
      await supabase.from("interview_messages").insert({
        interview_id: interview.id,
        role: "ai",
        content: question.question,
      });
      setMessages([
        {
          id: crypto.randomUUID(),
          role: "ai",
          content: question.question,
          created_at: new Date().toISOString(),
        },
      ]);
    }

    return interview.id;
  }, [category]);

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

        // Check if we should ask follow-up or move to next question
        const nextPrompt = currentQuestion?.follow_up || undefined;
        let questionText: string;
        let isFollowUp = false;

        if (nextPrompt) {
          // Use the follow-up first (doesn't count as a new question)
          questionText = nextPrompt;
          setCurrentQuestion(null);
          isFollowUp = true;
        } else if (questionCount >= MAX_QUESTIONS) {
          // All 3 questions done
          questionText = "采访完成！我们可以进入下一步了。";
          setCurrentQuestion(null);
          setCompleted(true);
        } else {
          // Fetch a new random question
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
    [interviewId, currentQuestion, questionCount, completed, category],
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
    maxQuestions: MAX_QUESTIONS,
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
