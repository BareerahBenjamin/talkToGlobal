import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { SparkMascot } from "@/components/SparkMascot";
import { useInterview } from "@/hooks/useInterview";
import { useContentGeneration } from "@/hooks/useContents";
import { useDna } from "@/hooks/useDna";
import type { ZhVersion, EnVersion } from "@/lib/api";

export const Route = createFileRoute("/interview")({
  component: Interview,
  head: () => ({ meta: [{ title: "采访 · 远声" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    type: (search.type as string) || "interview",
  }),
});

const TYPE_TO_CATEGORY: Record<string, string> = {
  interview: "interview",
  thinking: "thinking",
  market_signal: "market_signal",
  product_progress: "product_update",
};

const TYPE_LABELS: Record<string, string> = {
  interview: "建立 Founder DNA",
  thinking: "聊聊今天思考",
  market_signal: "回应市场信号",
  product_progress: "分享产品进展",
};

function Interview() {
  const { type: interviewType } = Route.useSearch();
  const navigate = useNavigate();
  const category = TYPE_TO_CATEGORY[interviewType] || "interview";
  const isContentMode = interviewType !== "interview";

  const {
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
  } = useInterview(category);

  const {
    generating,
    generateChinese,
    generateEnglish,
    saveContent,
    updateContent,
  } = useContentGeneration();
  const { dna } = useDna();

  const [inputText, setInputText] = useState("");
  const [started, setStarted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [step, setStep] = useState<
    "interview" | "generating" | "zh-select" | "zh-confirm" | "en"
  >("interview");
  const [zhVersions, setZhVersions] = useState<ZhVersion[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [editedZh, setEditedZh] = useState("");
  const [enVersions, setEnVersions] = useState<EnVersion[]>([]);
  const [savedContentId, setSavedContentId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const [interimText, setInterimText] = useState("");
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputTextRef = useRef("");
  const waveBarRefs = useRef<HTMLSpanElement[]>([]);

  // Keep inputTextRef in sync with state (#1 fix: stale closure)
  useEffect(() => {
    inputTextRef.current = inputText;
  }, [inputText]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleStart = async () => {
    try {
      await startInterview();
      setStarted(true);
    } catch (err) {
      console.error("Start interview failed:", err);
      toast.error(String(err));
    }
  };

  const handleSendText = async () => {
    if (!inputText.trim()) return;
    const text = inputText.trim();
    setInputText("");
    await sendAnswer(text);
  };

  // Cleanup all recording resources on unmount (#3 fix)
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (recognitionRef.current) recognitionRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoStopRef.current) clearTimeout(autoStopRef.current);
    };
  }, []);

  // Reusable stop-cleanup helper (#2 fix: eliminate duplication)
  const stopRecordingCleanup = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (autoStopRef.current) {
      clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
    analyserRef.current = null;
    setRecording(false);
    setInterimText("");
    // Reset wave bars to default height via direct DOM (#4 fix)
    waveBarRefs.current.forEach((el) => {
      if (el) el.style.height = "4px";
    });
  }, [setRecording]);

  // Update wave heights via direct DOM manipulation (#4 + #9 fix)
  const dataBufRef = useRef<Uint8Array | null>(null);
  const updateWaves = useCallback(() => {
    if (!analyserRef.current) return;

    if (
      !dataBufRef.current ||
      dataBufRef.current.length !== analyserRef.current.frequencyBinCount
    ) {
      dataBufRef.current = new Uint8Array(
        analyserRef.current.frequencyBinCount,
      );
    }
    analyserRef.current.getByteFrequencyData(dataBufRef.current);

    const step = Math.floor(dataBufRef.current.length / 22);
    for (let i = 0; i < 22; i++) {
      const value = dataBufRef.current[i * step];
      const h = 4 + (value / 255) * 28;
      const el = waveBarRefs.current[i];
      if (el) el.style.height = `${h}px`;
    }

    animFrameRef.current = requestAnimationFrame(updateWaves);
  }, []);

  const toggleRecording = async () => {
    if (recording) {
      mediaRecorderRef.current?.stop();
      stopRecordingCleanup();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up Web Audio API for volume analysis
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        audioCtx.close();
        audioCtxRef.current = null;

        // Read from ref to get latest value (#1 fix: stale closure)
        const finalText = inputTextRef.current.trim();
        try {
          if (finalText) {
            await sendAnswer(finalText);
          } else if (blob.size > 0) {
            await voiceAnswer(blob);
          }
        } catch (err) {
          console.error("Failed to process recording:", err);
          toast.error("发送失败，请重试");
        } finally {
          setInputText(""); // Always clear (#7 fix)
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setSeconds(0);
      const start = Date.now();
      timerRef.current = setInterval(() => {
        // (#2 fix: store in ref so manual stop can clear it)
        setSeconds(Math.floor((Date.now() - start) / 1000));
      }, 250);

      // Start wave animation
      animFrameRef.current = requestAnimationFrame(updateWaves);

      // Start real-time speech recognition
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = "zh-CN";
        recognition.interimResults = true;
        recognition.continuous = true;

        recognition.onresult = (event: any) => {
          let interim = "";
          let final = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              final += transcript;
            } else {
              interim += transcript;
            }
          }
          setInterimText(interim);
          if (final) {
            setInputText((prev) => (prev ? prev + " " + final : final));
          }
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
        };

        recognition.onend = () => {
          // Restart if still recording
          if (recorder.state === "recording" && recognitionRef.current) {
            try {
              recognition.start();
            } catch {
              // Ignore restart errors
            }
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
      } else {
        console.warn("SpeechRecognition not supported in this browser");
      }

      // 90-second auto-stop (#2 fix: use ref-based cleanup)
      autoStopRef.current = setTimeout(() => {
        if (recorder.state === "recording") {
          recorder.stop();
          stopRecordingCleanup();
        }
      }, 90_000);
    } catch (err) {
      console.error("Microphone access denied:", err);
    }
  };

  // When interview completes in content mode, generate Chinese versions
  useEffect(() => {
    if (completed && isContentMode && step === "interview") {
      handleGenerateChinese();
    }
  }, [completed, isContentMode, step]); // #8 fix: added step

  const handleGenerateChinese = async () => {
    setStep("generating");
    try {
      const answers = messages
        .filter((m) => m.role === "user")
        .map((m) => m.content)
        .join("\n\n");
      const versions = await generateChinese(answers, category, dna?.id);
      setZhVersions(versions);
      setStep("zh-select");
    } catch {
      toast.error("生成失败，请重试");
      setStep("interview");
    }
  };

  const handlePickVersion = (index: number) => {
    setPicked(index);
    setEditedZh(zhVersions[index].text);
    setStep("zh-confirm");
  };

  const handleConfirmZh = async () => {
    setStep("en");
    try {
      const answers = messages
        .filter((m) => m.role === "user")
        .map((m) => m.content)
        .join("\n\n");
      const content = await saveContent({
        source_type: interviewType,
        source_input: answers,
        zh_versions: zhVersions,
        selected_zh_index: picked,
        edited_zh_text: editedZh,
        dna_snapshot: dna,
        status: "draft",
      });
      setSavedContentId(content.id);
      const en = await generateEnglish(editedZh, dna?.id, interviewType);
      setEnVersions(en);
      await updateContent(content.id, { en_versions: en });
    } catch {
      toast.error("英文生成失败");
    }
  };

  const handleCopy = (text: string) => {
    void navigator.clipboard?.writeText(text);
    toast.success("已复制到剪贴板");
  };

  const handleSaveDraft = async () => {
    if (savedContentId) {
      await updateContent(savedContentId, { status: "draft" });
      toast.success("已保存到内容库");
      navigate({ to: "/" });
    }
  };

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // Pre-start
  if (!started) {
    return (
      <AppLayout>
        <PageHeader back="/" title="" />
        <div className="px-6 pt-2">
          <h1 className="text-[26px] font-semibold text-foreground leading-tight">
            {TYPE_LABELS[interviewType] || "采访"}
          </h1>
          <p className="text-[14px] text-muted-foreground mt-2 leading-relaxed">
            {isContentMode
              ? "回答几个问题，帮你提炼观点"
              : "回答几个问题，帮你建立 Founder DNA"}
          </p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <SparkMascot size={120} state="idle" />
          <p className="text-[14px] text-muted-foreground mt-4 text-center">
            {isContentMode
              ? "可以用语音或文字回答"
              : "可以用语音或文字回答，3 个问题"}
          </p>
        </div>
        <div className="px-6 pb-10">
          <button
            type="button"
            onClick={handleStart}
            className="block w-full text-center bg-primary text-primary-foreground rounded-pill py-4 text-[15px] font-semibold shadow-[0_10px_24px_rgba(90,127,61,0.28)] active:scale-[0.98] transition"
          >
            开始采访
          </button>
        </div>
      </AppLayout>
    );
  }

  // Generating Chinese
  if (step === "generating") {
    return (
      <AppLayout>
        <PageHeader back="/" title="" />
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <SparkMascot size={120} state="generating" />
          <p className="text-[14px] text-muted-foreground mt-4 text-center animate-pulse">
            正在根据你的回答生成内容...
          </p>
        </div>
      </AppLayout>
    );
  }

  // Select Chinese version
  if (step === "zh-select") {
    return (
      <AppLayout>
        <PageHeader back="/" title="" />
        <div className="px-6 mt-1 flex items-center gap-3">
          <SparkMascot size={56} state="thinking" />
          <div className="flex-1">
            <div className="text-[15px] font-semibold">选一个最像你的表达</div>
            <div className="text-[12.5px] text-muted-foreground mt-0.5">
              三个不同气质的中文草稿
            </div>
          </div>
        </div>
        <div className="px-5 mt-6 space-y-4 pb-32">
          {zhVersions.map((v, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handlePickVersion(i)}
              className="w-full text-left bg-card rounded-[24px] p-5 shadow-soft border border-divider/60 active:scale-[0.99] transition animate-fade-up"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-semibold tracking-[0.14em] uppercase text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                  V{i + 1} · {v.tone}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  ~{v.text.length} 字
                </span>
              </div>
              <p className="text-[15px] leading-relaxed text-foreground mt-3">
                {v.text}
              </p>
              <div className="mt-4 text-[12.5px] text-primary font-medium">
                选这个
              </div>
            </button>
          ))}
        </div>
      </AppLayout>
    );
  }

  // Confirm Chinese
  if (step === "zh-confirm" && picked !== null) {
    return (
      <AppLayout>
        <PageHeader back="/" title="" />
        <div className="px-5 mt-6 pb-32 space-y-4">
          <div className="bg-card rounded-[24px] p-5 shadow-soft border border-divider/60 animate-fade-up">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[13px] font-semibold text-foreground">
                中文版本
              </span>
              <span className="text-[10.5px] font-semibold tracking-[0.12em] uppercase px-2 py-0.5 rounded-full text-primary bg-primary/10">
                ZH
              </span>
            </div>
            <textarea
              value={editedZh}
              onChange={(e) => setEditedZh(e.target.value)}
              rows={6}
              className="w-full bg-transparent text-[15px] leading-relaxed text-foreground outline-none resize-none"
            />
            <p className="text-[12.5px] text-muted-foreground mt-2">
              可以直接修改文字
            </p>
          </div>
          <button
            type="button"
            onClick={() => setStep("zh-select")}
            className="w-full text-center bg-muted text-foreground rounded-pill py-3.5 text-[14px] font-medium"
          >
            换一个版本
          </button>
          <button
            type="button"
            onClick={handleConfirmZh}
            disabled={generating}
            className="block w-full text-center bg-primary text-primary-foreground rounded-pill py-4 text-[15px] font-semibold shadow-[0_10px_24px_rgba(90,127,61,0.28)] active:scale-[0.98] transition disabled:opacity-50"
          >
            {generating ? "生成中..." : "确认并生成英文版本"}
          </button>
        </div>
      </AppLayout>
    );
  }

  // English result
  if (step === "en") {
    return (
      <AppLayout>
        <PageHeader back="/" title="" />
        <div className="px-5 mt-6 pb-32 space-y-4">
          {/* Chinese version */}
          <div className="bg-card rounded-[24px] p-5 shadow-soft border border-divider/60 animate-fade-up">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[13px] font-semibold text-foreground">
                中文版本
              </span>
              <span className="text-[10.5px] font-semibold tracking-[0.12em] uppercase px-2 py-0.5 rounded-full text-primary bg-primary/10">
                ZH
              </span>
            </div>
            <p className="text-[15px] leading-relaxed text-foreground">
              {editedZh}
            </p>
          </div>

          {/* English X version */}
          {enVersions.map((v, i) => (
            <div
              key={i}
              className="bg-card rounded-[24px] p-5 shadow-soft border border-divider/60 animate-fade-up"
              style={{ animationDelay: `${(i + 1) * 70}ms` }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-foreground">
                    X / Twitter
                  </span>
                  <span className="text-[10.5px] font-semibold tracking-[0.12em] uppercase px-2 py-0.5 rounded-full text-[#B0770D] bg-[#FFF3D2]">
                    EN
                  </span>
                </div>
              </div>
              <p className="text-[15px] leading-relaxed text-foreground whitespace-pre-line">
                {v.text}
              </p>
              <div className="mt-4 pt-3 border-t border-divider">
                <button
                  type="button"
                  onClick={() => handleCopy(v.text)}
                  className="text-[12.5px] text-primary font-medium"
                >
                  复制
                </button>
              </div>
            </div>
          ))}

          {/* Save button */}
          <button
            type="button"
            onClick={handleSaveDraft}
            className="block w-full text-center bg-primary text-primary-foreground rounded-pill py-4 text-[15px] font-semibold shadow-[0_10px_24px_rgba(90,127,61,0.28)] active:scale-[0.98] transition"
          >
            保存到内容库
          </button>
        </div>
      </AppLayout>
    );
  }

  // DNA interview completed
  if (!isContentMode && completed) {
    return (
      <AppLayout>
        <PageHeader back="/" title="" />
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <SparkMascot size={120} state="success" />
          <h1 className="text-[26px] font-semibold text-foreground leading-tight mt-4 text-center">
            采访完成
          </h1>
          <p className="text-[14px] text-muted-foreground mt-2 text-center">
            回答了 {questionCount} 个问题
          </p>
        </div>
        <div className="px-6 pb-10 space-y-3">
          <Link
            to="/dna"
            onClick={() => completeInterview()}
            className="block w-full text-center bg-primary text-primary-foreground rounded-pill py-4 text-[15px] font-semibold shadow-[0_10px_24px_rgba(90,127,61,0.28)] active:scale-[0.98] transition"
          >
            查看 Founder DNA
          </Link>
          <Link
            to="/upload"
            className="block w-full text-center text-[13px] text-muted-foreground"
          >
            补充材料（可选）
          </Link>
        </div>
      </AppLayout>
    );
  }

  // Interview in progress
  return (
    <AppLayout>
      <PageHeader back="/" title={`${questionCount}/${maxQuestions}`} />
      <div className="px-6 pt-2">
        <h1 className="text-[26px] font-semibold text-foreground leading-tight">
          {TYPE_LABELS[interviewType] || "采访"}
        </h1>
        <div className="mt-3 h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${(questionCount / maxQuestions) * 100}%` }}
          />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 mt-4 space-y-3 pb-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`rounded-[18px] px-4 py-3 text-[13.5px] animate-fade-up ${
              msg.role === "ai"
                ? "bg-card border border-divider shadow-soft text-foreground"
                : "bg-primary/10 text-foreground"
            }`}
          >
            <span className="text-[10.5px] font-medium text-muted-foreground block mb-1">
              {msg.role === "ai" ? "Spark" : "你"}
            </span>
            {msg.content}
          </div>
        ))}
        {loading && (
          <div className="rounded-[18px] px-4 py-3 bg-card border border-divider">
            <span className="text-[10.5px] font-medium text-muted-foreground block mb-1">
              Spark
            </span>
            <span className="text-[13.5px] text-muted-foreground animate-pulse">
              思考中...
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Recording visualization + real-time transcription */}
      {recording && (
        <div className="px-6 py-2 flex flex-col items-center">
          {/* Show real-time transcription text */}
          {(interimText || inputText) && (
            <div className="w-full mb-3 px-2">
              <div className="bg-primary/5 rounded-[12px] px-4 py-3 text-[14px] text-foreground min-h-[40px]">
                {inputText && (
                  <span className="text-foreground">{inputText}</span>
                )}
                {interimText && (
                  <span className="text-muted-foreground italic">
                    {inputText ? " " : ""}
                    {interimText}
                  </span>
                )}
                {!inputText && !interimText && (
                  <span className="text-muted-foreground">正在听...</span>
                )}
              </div>
            </div>
          )}
          <div className="h-12 flex items-center justify-center gap-1">
            {Array.from({ length: 22 }).map((_, i) => (
              <span
                key={i}
                ref={(el) => {
                  waveBarRefs.current[i] = el!;
                }}
                className="block w-[3px] rounded-full bg-warm transition-[height] duration-75"
                style={{ height: "4px" }}
              />
            ))}
          </div>
          <div className="text-[13px] font-medium text-muted-foreground mt-2 tabular-nums">
            {fmt(seconds)}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="sticky bottom-0 left-0 right-0 px-5 pb-6 pt-3 bg-gradient-to-t from-background via-background to-background/0">
        <div className="flex items-center gap-2 bg-card rounded-[18px] border border-divider px-4 py-2.5">
          <input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && !e.shiftKey && handleSendText()
            }
            placeholder={recording ? "正在实时转录..." : "说说你的想法..."}
            className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-muted-foreground"
            disabled={loading || recording}
          />
          <button
            type="button"
            onClick={toggleRecording}
            disabled={loading}
            className={`h-9 w-9 rounded-full flex items-center justify-center transition ${
              recording
                ? "bg-accent shadow-[0_0_0_6px_rgba(246,166,35,0.18)]"
                : "bg-muted"
            }`}
            aria-label={recording ? "停止录音" : "开始录音"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <rect
                x="9"
                y="3"
                width="6"
                height="12"
                rx="3"
                fill="currentColor"
              />
              <path
                d="M5 11a7 7 0 0 0 14 0M12 18v3"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
          {inputText.trim() && (
            <button
              type="button"
              onClick={handleSendText}
              disabled={loading || recording} // #5 fix
              className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
              aria-label="发送"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 12h14M13 6l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
