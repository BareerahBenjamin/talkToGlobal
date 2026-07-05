import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { GunGunMascot } from "@/components/GunGunMascot";
import { useInterview } from "@/hooks/useInterview";
import { useContentGeneration } from "@/hooks/useContents";
import { useDna } from "@/hooks/useDna";
import { supabase } from "@/lib/supabase";
import type { ZhVersion, EnVersion } from "@/lib/api";

export const Route = createFileRoute("/interview")({
  component: Interview,
  head: () => ({ meta: [{ title: "采访 · 远声" }] }),
  validateSearch: (
    search: Record<string, unknown>,
  ): { type: string; signal_id?: string } => {
    const signal_id = search.signal_id as string | undefined;
    return {
      type: (search.type as string) || "interview",
      ...(signal_id ? { signal_id } : {}),
    };
  },
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

// Does the browser expose the Web Audio API (used for both the waveform and
// the PCM-recorder fallback)? Safari needs the webkit prefix.
function hasAudioContext(): boolean {
  if (typeof window === "undefined") return false;
  return !!((window as any).AudioContext || (window as any).webkitAudioContext);
}

// Encode accumulated mono Float32 PCM chunks into a 16-bit WAV blob. Used by
// the PCM-recorder fallback so we never depend on MediaRecorder or on
// decodeAudioData being able to parse an exotic container.
function encodePcmToWav(chunks: Float32Array[], sampleRate: number): Blob {
  let length = 0;
  for (const c of chunks) length += c.length;
  const pcm = new Float32Array(length);
  let offset = 0;
  for (const c of chunks) {
    pcm.set(c, offset);
    offset += c.length;
  }

  const buffer = new ArrayBuffer(44 + length * 2);
  const view = new DataView(buffer);
  const writeStr = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, length * 2, true);
  let p = 44;
  for (let i = 0; i < length; i++) {
    const s = Math.max(-1, Math.min(1, pcm[i]));
    view.setInt16(p, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    p += 2;
  }
  return new Blob([buffer], { type: "audio/wav" });
}

// Detect why recording may be unavailable so we can show an actionable message
// instead of a generic "不支持录音". The most common mobile-web failure is
// opening the link inside an in-app WebView (WeChat etc.), which does not expose
// getUserMedia — the fix is to open the page in the system browser.
function detectRecordingBlock():
  | { kind: "in_app"; app: string }
  | { kind: "insecure" }
  | { kind: "unsupported" }
  | null {
  if (typeof navigator === "undefined") return { kind: "unsupported" };

  const ua = navigator.userAgent || "";
  const inApp = /MicroMessenger/i.test(ua)
    ? "微信"
    : /(Weibo|WeiBo)/i.test(ua)
      ? "微博"
      : /(FeiShu|Lark)/i.test(ua)
        ? "飞书"
        : /(QQ\/|QQTheme)/i.test(ua)
          ? "QQ"
          : /DingTalk/i.test(ua)
            ? "钉钉"
            : null;

  // We can record in-page as long as we can open the mic AND have either
  // MediaRecorder OR the Web Audio API (many domestic Android browsers ship
  // getUserMedia + AudioContext but NOT MediaRecorder — the PCM recorder
  // fallback covers them, so they should NOT be pushed to the file input).
  const canRecord =
    !!navigator.mediaDevices?.getUserMedia &&
    (typeof MediaRecorder !== "undefined" || hasAudioContext());
  if (canRecord) return null;

  // Insecure context (http:// over a LAN IP) also strips mediaDevices.
  if (typeof window !== "undefined" && window.isSecureContext === false) {
    return { kind: "insecure" };
  }
  if (inApp) return { kind: "in_app", app: inApp };
  return { kind: "unsupported" };
}

// Teaser questions shown on the first-use interview screen
const PREVIEW_QUESTIONS: Record<string, string[]> = {
  interview: [
    "你的产品最想改变什么？",
    "第一批用户会怎样描述你？",
    "为什么是现在做这件事？",
  ],
  thinking: [
    "今天最让你有感触的一件事？",
    "你想不通、但一直在琢磨的问题？",
    "如果只说一句，你想让人记住什么？",
  ],
  market_signal: [
    "这条市场信号触动了你什么？",
    "你和主流看法哪里不一样？",
    "它对你的用户意味着什么？",
  ],
  product_progress: [
    "这次进展你最想让人知道什么？",
    "背后踩过哪些坑？",
    "它让用户的体验发生了什么变化？",
  ],
};

function Interview() {
  const { type: interviewType, signal_id: signalId } = Route.useSearch();
  const navigate = useNavigate();
  const category = TYPE_TO_CATEGORY[interviewType] || "interview";
  const isContentMode = interviewType !== "interview";

  const {
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
  const [starting, setStarting] = useState(false);
  const [pendingRecord, setPendingRecord] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [step, setStep] = useState<
    "interview" | "generating" | "zh-select" | "zh-confirm" | "en"
  >("interview");
  const [zhVersions, setZhVersions] = useState<ZhVersion[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [editedZh, setEditedZh] = useState("");
  const [enVersions, setEnVersions] = useState<EnVersion[]>([]);
  const [enFailed, setEnFailed] = useState(false);
  const [savedContentId, setSavedContentId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<{
    avatar_url: string | null;
    display_name: string | null;
  }>({ avatar_url: null, display_name: null });
  const [editingEn, setEditingEn] = useState<number | null>(null);
  const [enDrafts, setEnDrafts] = useState<Record<number, string>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const [interimText, setInterimText] = useState("");
  // Client-only: warn when recording is unavailable (e.g. WeChat WebView).
  const [recBlock, setRecBlock] = useState<ReturnType<
    typeof detectRecordingBlock
  > | null>(null);
  useEffect(() => {
    setRecBlock(detectRecordingBlock());
  }, []);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputTextRef = useRef("");
  const waveBarRefs = useRef<HTMLSpanElement[]>([]);
  // Native OS-recorder fallback (works in in-app WebViews like WeChat where
  // getUserMedia/MediaRecorder are unavailable).
  const audioFileRef = useRef<HTMLInputElement>(null);
  // Holds a mic stream opened synchronously inside the tap gesture, so iOS
  // Safari still trusts it after the (async) startInterview() network call.
  const pendingStreamRef = useRef<MediaStream | null>(null);
  // PCM-recorder fallback (browsers with getUserMedia + AudioContext but no
  // MediaRecorder, e.g. many domestic Android browsers).
  const pcmNodeRef = useRef<ScriptProcessorNode | null>(null);
  const pcmChunksRef = useRef<Float32Array[]>([]);
  const pcmSampleRateRef = useRef<number>(44100);
  const recordModeRef = useRef<"media" | "pcm" | null>(null);

  // Keep inputTextRef in sync with state (#1 fix: stale closure)
  useEffect(() => {
    inputTextRef.current = inputText;
  }, [inputText]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load the signed-in user's avatar + name for the chat bubbles.
  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("profiles")
        .select("avatar_url, display_name")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (active && data) setUserProfile(data);
        });
    });
    return () => {
      active = false;
    };
  }, []);

  const handleStart = async () => {
    try {
      await startInterview();
      setStarted(true);
    } catch (err) {
      console.error("Start interview failed:", err);
      toast.error(String(err));
    }
  };

  // First-use screen: start the interview, then begin recording once the
  // session exists. We flip a flag and let an effect start recording on the
  // next render — by then interviewId is set, so voiceAnswer/sendAnswer (and
  // the recorder.onstop closure that calls them) capture the live interview id.
  const handleStartAndRecord = async () => {
    if (starting) return;
    setStarting(true);

    // Open the mic FIRST, synchronously inside the tap gesture. iOS Safari
    // only grants getUserMedia when the call originates from a user gesture;
    // awaiting the startInterview network call first would break that chain.
    // In blocked contexts (WeChat WebView) there is no mic API — we skip this
    // and fall back to the native OS recorder inside the panel.
    let micPromise: Promise<MediaStream> | null = null;
    if (!recBlock && navigator.mediaDevices?.getUserMedia) {
      micPromise = navigator.mediaDevices.getUserMedia({ audio: true });
      // Attach a catch now so a rejection never becomes an unhandled rejection.
      micPromise.catch(() => {});
    }

    try {
      await startInterview();
      setStarted(true);

      if (micPromise) {
        try {
          pendingStreamRef.current = await micPromise;
          setPendingRecord(true);
        } catch (err) {
          console.error("Microphone access denied:", err);
          const name = (err as { name?: string })?.name;
          if (name === "NotAllowedError" || name === "SecurityError") {
            toast.error("麦克风权限被拒绝，请在浏览器设置中允许后重试");
          } else if (name === "NotFoundError") {
            toast.error("未检测到麦克风");
          } else {
            toast.error("无法开始录音，可用下方系统录音或文字输入");
          }
        }
      }
      // recBlock (WeChat/insecure): land in the panel; the native OS-recorder
      // button handles recording there.
    } catch (err) {
      console.error("Start interview failed:", err);
      toast.error(String(err));
      // Release the mic we opened if the interview failed to start.
      micPromise
        ?.then((s) => s.getTracks().forEach((t) => t.stop()))
        .catch(() => {});
    } finally {
      setStarting(false);
    }
  };

  // Native OS-recorder fallback: the user records with the system recorder and
  // hands us an audio file. Reuses the same transcribe pipeline as live
  // recording. Only mounted inside the interview panel, so interviewId exists.
  const handleAudioFilePick = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    if (file.size === 0) {
      toast.error("没有录到声音，请重试");
      return;
    }
    try {
      await voiceAnswer(file);
    } catch (err) {
      console.error("Audio file transcription failed:", err);
      toast.error("语音识别失败，请重试或改用文字输入");
    }
  };

  // Kick off recording after the interview session is live (fresh closures).
  useEffect(() => {
    if (pendingRecord && interviewId && currentQuestion && !recording) {
      setPendingRecord(false);
      const stream = pendingStreamRef.current;
      pendingStreamRef.current = null;
      void toggleRecording(stream ?? undefined);
    }
    // toggleRecording intentionally omitted: it is recreated each render and
    // the version captured here already sees the up-to-date interviewId.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingRecord, interviewId, currentQuestion, recording]);

  // "先跳过，稍后再录" on Step 1. For the first-use interview this advances the
  // onboarding to the upload step; content modes have no next step, so we just
  // enter the interview in text mode instead.
  const handleSkip = () => {
    if (isContentMode) {
      void handleStart();
    } else {
      navigate({ to: "/upload" });
    }
  };

  // Content-mode "或点击文字输入": enter the interview in text mode and focus
  // the composer so the user can start typing right away.
  const handleTextInput = async () => {
    await handleStart();
    // The in-progress view (with the text input) mounts after `started` flips;
    // focus on the next frame once the input exists.
    requestAnimationFrame(() => textInputRef.current?.focus());
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
  const dataBufRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const updateWaves = useCallback(() => {
    if (!analyserRef.current) return;

    if (
      !dataBufRef.current ||
      dataBufRef.current.length !== analyserRef.current.frequencyBinCount
    ) {
      dataBufRef.current = new Uint8Array(
        new ArrayBuffer(analyserRef.current.frequencyBinCount),
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

  // Tear down the shared audio graph (mic stream, AudioContext, PCM node).
  // Used by both the MediaRecorder and PCM-fallback recording paths.
  const teardownAudioGraph = useCallback(() => {
    if (pcmNodeRef.current) {
      try {
        pcmNodeRef.current.disconnect();
      } catch {
        /* ignore */
      }
      pcmNodeRef.current.onaudioprocess = null;
      pcmNodeRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch {
        /* ignore */
      }
      audioCtxRef.current = null;
    }
  }, []);

  // Send the finished recording: prefer the live speech-recognition text if we
  // got any, otherwise transcribe the recorded audio on the backend.
  const finalizeAudio = useCallback(
    async (blob: Blob) => {
      const finalText = inputTextRef.current.trim();
      try {
        if (finalText) {
          await sendAnswer(finalText);
        } else if (blob.size > 0) {
          await voiceAnswer(blob);
        } else {
          toast.error("没有录到声音，请重试或改用文字输入");
        }
      } catch (err) {
        console.error("Failed to process recording:", err);
        toast.error("语音识别失败，请重试或改用文字输入");
      } finally {
        setInputText("");
      }
    },
    [sendAnswer, voiceAnswer],
  );

  // Stop whichever recorder is active and hand the audio off to finalizeAudio.
  const stopRecording = useCallback(() => {
    if (recordModeRef.current === "pcm") {
      const chunks = pcmChunksRef.current;
      const sr = pcmSampleRateRef.current;
      pcmChunksRef.current = [];
      recordModeRef.current = null;
      teardownAudioGraph();
      stopRecordingCleanup();
      void finalizeAudio(encodePcmToWav(chunks, sr));
    } else if (recordModeRef.current === "media") {
      recordModeRef.current = null;
      mediaRecorderRef.current?.stop(); // its onstop tears down + finalizes
      stopRecordingCleanup();
    }
  }, [teardownAudioGraph, finalizeAudio, stopRecordingCleanup]);

  const toggleRecording = async (preAcquiredStream?: MediaStream) => {
    if (recording) {
      stopRecording();
      return;
    }
    const block = detectRecordingBlock();
    if (block && !preAcquiredStream) {
      // No stream to fall back on → explain why and bail.
      if (block.kind === "in_app") {
        toast.error(
          `${block.app}内置浏览器不支持录音，请点击右上角「···」选择「在浏览器打开」后再使用语音`,
          { duration: 6000 },
        );
      } else if (block.kind === "insecure") {
        toast.error(
          "录音需要 HTTPS 安全环境，请用 https 域名打开，或改用文字输入",
        );
      } else {
        toast.error("此浏览器不支持录音，请改用文字输入");
      }
      return;
    }
    try {
      const stream =
        preAcquiredStream ??
        (await navigator.mediaDevices.getUserMedia({ audio: true }));
      streamRef.current = stream;

      // Set up Web Audio API for volume analysis (Safari needs the webkit prefix)
      const AudioCtx =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioCtxRef.current = audioCtx;
      // iOS may create the context in a "suspended" state when it isn't opened
      // inside a gesture; resume so the waveform analyser actually gets data.
      if (audioCtx.state === "suspended") {
        audioCtx.resume().catch(() => {});
      }
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      if (typeof MediaRecorder !== "undefined") {
        // --- Preferred path: MediaRecorder (Chrome, Safari, Firefox …) ---
        recordModeRef.current = "media";
        // iOS Safari does NOT support audio/webm — it uses audio/mp4. Fall back
        // to the browser default.
        const preferredTypes = [
          "audio/webm",
          "audio/mp4",
          "audio/aac",
          "audio/ogg",
        ];
        const supportedType =
          typeof MediaRecorder.isTypeSupported === "function"
            ? preferredTypes.find((t) => MediaRecorder.isTypeSupported(t))
            : undefined;
        const recorder = supportedType
          ? new MediaRecorder(stream, { mimeType: supportedType })
          : new MediaRecorder(stream);
        chunksRef.current = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        recorder.onstop = async () => {
          const blobType = recorder.mimeType || supportedType || "audio/webm";
          const blob = new Blob(chunksRef.current, { type: blobType });
          teardownAudioGraph();
          await finalizeAudio(blob);
        };
        mediaRecorderRef.current = recorder;
        recorder.start();
      } else {
        // --- Fallback path: raw PCM capture via Web Audio ---
        // Many domestic Android browsers ship getUserMedia + AudioContext but
        // no MediaRecorder. ScriptProcessorNode is deprecated but is the only
        // capture API these older engines support (no AudioWorklet), so it is
        // exactly right here. We record clean 16-bit PCM → WAV in-page, with no
        // dependency on MediaRecorder or on decodeAudioData parsing a container.
        recordModeRef.current = "pcm";
        pcmChunksRef.current = [];
        pcmSampleRateRef.current = audioCtx.sampleRate;
        const node = audioCtx.createScriptProcessor(4096, 1, 1);
        node.onaudioprocess = (e: AudioProcessingEvent) => {
          // Copy — the event buffer is reused across callbacks.
          pcmChunksRef.current.push(
            new Float32Array(e.inputBuffer.getChannelData(0)),
          );
        };
        source.connect(node);
        // Must connect to destination for onaudioprocess to fire; we never
        // write the output buffer, so it stays silent (no echo).
        node.connect(audioCtx.destination);
        pcmNodeRef.current = node;
      }

      setRecording(true);
      setSeconds(0);
      const start = Date.now();
      timerRef.current = setInterval(() => {
        // (#2 fix: store in ref so manual stop can clear it)
        setSeconds(Math.floor((Date.now() - start) / 1000));
      }, 250);

      // Start wave animation
      animFrameRef.current = requestAnimationFrame(updateWaves);

      // Start real-time speech recognition (best-effort; absent on most mobile)
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
          // Restart if still recording (either mode)
          if (recordModeRef.current && recognitionRef.current) {
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
        if (recordModeRef.current) stopRecording();
      }, 90_000);
    } catch (err) {
      console.error("Microphone access denied:", err);
      teardownAudioGraph();
      recordModeRef.current = null;
      const name = (err as { name?: string })?.name;
      if (name === "NotAllowedError" || name === "SecurityError") {
        toast.error("麦克风权限被拒绝，请在浏览器设置中允许后重试");
      } else if (name === "NotFoundError") {
        toast.error("未检测到麦克风");
      } else {
        toast.error("无法开始录音，请改用文字输入");
      }
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
      const versions = await generateChinese(
        answers,
        category,
        dna?.id,
        signalId,
      );
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

  // Generate English for the already-saved draft. Retries once on a transient
  // failure; sets enFailed so the UI can show a retry button instead of a
  // permanent "translating..." spinner.
  const runGenerateEnglish = async (contentId: string) => {
    setEnFailed(false);
    const chosenStyle = picked !== null ? zhVersions[picked]?.tone : undefined;
    let en: EnVersion[] | null = null;
    for (let attempt = 1; attempt <= 2 && !en; attempt++) {
      try {
        en = await generateEnglish(editedZh, dna?.id, category, chosenStyle);
      } catch (err) {
        console.error(`generate English failed (attempt ${attempt}):`, err);
      }
    }
    if (!en) {
      setEnFailed(true);
      toast.error("英文生成失败，请点“重试”再试一次");
      return;
    }
    setEnVersions(en);
    try {
      await updateContent(contentId, { en_versions: en });
    } catch (err) {
      console.error("persist en_versions failed:", err);
    }
  };

  const handleConfirmZh = async () => {
    setStep("en");
    setEnFailed(false);
    const answers = messages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join("\n\n");

    // 1) Save the draft. A failure here is a DB/constraint problem, distinct
    //    from the English generation step — report it clearly.
    let contentId: string;
    try {
      const content = await saveContent({
        source_type: category,
        source_input: answers,
        zh_versions: zhVersions,
        selected_zh_index: picked,
        edited_zh_text: editedZh,
        dna_snapshot: dna,
        status: "draft",
      });
      contentId = content.id;
      setSavedContentId(content.id);
    } catch (err) {
      console.error("save draft failed:", err);
      toast.error(`保存草稿失败：${String(err)}`);
      setStep("zh-confirm");
      return;
    }

    // 2) Generate English (with retry).
    await runGenerateEnglish(contentId);
  };

  const handleCopy = (text: string) => {
    void navigator.clipboard?.writeText(text);
    toast.success("已复制到剪贴板");
  };

  // Text of an English version, honoring any inline edit
  const enText = (i: number) => enDrafts[i] ?? enVersions[i]?.text ?? "";

  const handlePublishX = async () => {
    const text = enText(0);
    if (!text) return;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    // Mark the content as published so it shows under the library's 已发布 filter.
    if (savedContentId) {
      const mergedEn = enVersions.map((v, i) =>
        enDrafts[i] != null ? { ...v, text: enDrafts[i] } : v,
      );
      try {
        await updateContent(savedContentId, {
          status: "published",
          en_versions: mergedEn,
        });
        toast.success("已标记为已发布");
      } catch {
        /* opening X already succeeded; ignore status update failure */
      }
    }
  };

  const handleSaveDraft = async () => {
    if (savedContentId) {
      const mergedEn = enVersions.map((v, i) =>
        enDrafts[i] != null ? { ...v, text: enDrafts[i] } : v,
      );
      await updateContent(savedContentId, {
        status: "draft",
        en_versions: mergedEn,
      });
      toast.success("已保存到内容库");
      navigate({ to: "/" });
    }
  };

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // Pre-start
  if (!started) {
    const previewQuestions =
      PREVIEW_QUESTIONS[interviewType] || PREVIEW_QUESTIONS.interview;
    return (
      <AppLayout>
        <PageHeader back="/" title={isContentMode ? "" : "Step 1 of 3"} />
        <div className="px-6 pt-2">
          <h1 className="text-[30px] font-bold text-foreground leading-[1.15] tracking-tight">
            AI 正在采访你
          </h1>
          <p className="text-[15px] text-muted-foreground mt-3 leading-relaxed">
            说说你的想法，我会帮你整理成全球表达。
          </p>
        </div>

        {/* 滚滚 beside preview question cards */}
        <div className="px-5 mt-8 flex items-start gap-4">
          <div className="shrink-0 pt-6">
            <GunGunMascot size={92} state="idle" />
          </div>
          <div className="flex-1 space-y-3.5">
            {previewQuestions.map((q, i) => (
              <div
                key={i}
                className="bg-card rounded-[22px] px-5 py-4 shadow-soft border border-divider/50 animate-fade-up"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <p className="text-[15.5px] text-foreground leading-snug">
                  {q}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Recording control */}
        <div className="flex-1" />
        <div className="px-6 pb-10 flex flex-col items-center">
          {recBlock?.kind === "in_app" && (
            <div className="mb-4 w-full rounded-[16px] bg-accent/12 border border-accent/30 px-4 py-3 text-[13px] leading-relaxed text-foreground">
              {recBlock.app}
              内不支持实时录音，点按钮进入后可用系统录音；想要实时波形可点右上角「···」→「在浏览器打开」。
            </div>
          )}
          {recBlock?.kind === "insecure" && (
            <div className="mb-4 w-full rounded-[16px] bg-accent/12 border border-accent/30 px-4 py-3 text-[13px] leading-relaxed text-foreground">
              当前环境不支持实时录音，点按钮进入后可用系统录音，或用 https
              域名打开。
            </div>
          )}
          <p className="text-[14px] text-muted-foreground text-center">
            按住或点击按钮开始录音
          </p>
          <div className="text-[15px] font-medium text-muted-foreground mt-4 tabular-nums">
            00:00
          </div>
          <button
            type="button"
            onClick={handleStartAndRecord}
            disabled={starting}
            className="mt-5 h-20 w-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-[0_12px_28px_rgba(90,127,61,0.32)] active:scale-95 transition disabled:opacity-60"
            aria-label="开始录音"
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
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
          <button
            type="button"
            onClick={isContentMode ? handleTextInput : handleSkip}
            disabled={starting}
            className="mt-6 text-[14px] text-muted-foreground underline underline-offset-4 decoration-muted-foreground/40 disabled:opacity-60"
          >
            {isContentMode ? "或点击文字输入" : "先跳过，稍后再录"}
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
          <GunGunMascot size={120} state="generating" />
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
          <GunGunMascot size={56} state="thinking" />
          <div className="flex-1">
            <div className="text-[15px] font-semibold">选一个最像你的风格</div>
            <div className="text-[12.5px] text-muted-foreground mt-0.5">
              三种 X 推文风格，选中后只翻译这一条
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

  // Chinese + English on one page
  if (step === "en") {
    const enLoading = enVersions.length === 0;
    return (
      <AppLayout>
        <PageHeader back="/" title="内容已生成" />
        <p className="text-center text-[12.5px] text-muted-foreground px-10 -mt-1">
          确认的中文 + 对应风格的英文推文，一键复制发布
        </p>

        <div className="px-5 mt-5 pb-40 space-y-4">
          {/* Confirmed Chinese */}
          <div className="bg-card rounded-[24px] p-5 shadow-soft border border-divider/60 animate-fade-up">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[13px] font-semibold text-foreground">
                已确认中文版本
              </span>
              <span className="text-[10.5px] font-semibold tracking-[0.12em] uppercase px-2 py-0.5 rounded-full text-primary bg-primary/10">
                ZH
              </span>
            </div>
            <p className="text-[15px] leading-relaxed text-foreground whitespace-pre-line">
              {editedZh}
            </p>
          </div>

          {/* English X post */}
          <div className="flex items-center gap-2 pt-1 px-1">
            <span className="text-[13px] font-semibold text-foreground">
              英文 X 推文
            </span>
            <span className="text-[11px] text-muted-foreground">
              {picked !== null && zhVersions[picked]
                ? `${zhVersions[picked].tone} · 与所选风格一致`
                : "与所选风格一致"}
            </span>
          </div>

          {enLoading ? (
            enFailed ? (
              <div className="flex flex-col items-center py-14">
                <GunGunMascot size={92} state="empty" />
                <p className="text-[13.5px] text-muted-foreground mt-4 text-center">
                  英文生成失败了，可能是网络波动
                </p>
                <button
                  type="button"
                  onClick={() =>
                    savedContentId && runGenerateEnglish(savedContentId)
                  }
                  disabled={generating}
                  className="mt-5 px-6 bg-primary text-primary-foreground rounded-pill py-3 text-[14px] font-semibold active:scale-[0.98] transition disabled:opacity-50"
                >
                  {generating ? "重试中..." : "重试"}
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center py-14">
                <GunGunMascot size={92} state="generating" />
                <p className="text-[13.5px] text-muted-foreground mt-4 animate-pulse">
                  正在转译成地道英文...
                </p>
              </div>
            )
          ) : (
            enVersions.map((v, i) => (
              <div
                key={i}
                className="bg-card rounded-[24px] p-5 shadow-soft border border-divider/60 animate-fade-up"
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10.5px] font-semibold tracking-[0.12em] px-2 py-0.5 rounded-full text-[#B0770D] bg-[#FFF3D2]">
                      {v.style_label || "X"}
                    </span>
                    <span className="text-[10.5px] font-semibold tracking-[0.12em] uppercase px-2 py-0.5 rounded-full text-primary bg-primary/10">
                      EN
                    </span>
                  </div>
                </div>

                {editingEn === i ? (
                  <textarea
                    value={enText(i)}
                    onChange={(e) =>
                      setEnDrafts((p) => ({ ...p, [i]: e.target.value }))
                    }
                    rows={6}
                    className="w-full bg-transparent text-[15px] leading-relaxed text-foreground outline-none resize-none"
                  />
                ) : (
                  <p className="text-[15px] leading-relaxed text-foreground whitespace-pre-line">
                    {enText(i)}
                  </p>
                )}

                <div className="mt-4 pt-3 border-t border-divider flex items-center gap-5">
                  <button
                    type="button"
                    onClick={() => handleCopy(enText(i))}
                    className="text-[12.5px] text-primary font-medium"
                  >
                    复制
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingEn(editingEn === i ? null : i)}
                    className="text-[12.5px] text-muted-foreground font-medium"
                  >
                    {editingEn === i ? "完成" : "编辑"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Sticky actions */}
        <div className="sticky bottom-0 left-0 right-0 px-5 pb-7 pt-3 bg-gradient-to-t from-background via-background to-background/0 space-y-3">
          <button
            type="button"
            onClick={handlePublishX}
            disabled={enLoading}
            className="flex w-full items-center justify-center gap-2 bg-primary text-primary-foreground rounded-pill py-4 text-[15px] font-semibold shadow-[0_10px_24px_rgba(90,127,61,0.28)] active:scale-[0.98] transition disabled:opacity-50"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            发布到 X
          </button>
          <button
            type="button"
            onClick={handleSaveDraft}
            className="block w-full text-center bg-muted text-foreground rounded-pill py-3.5 text-[14px] font-medium active:scale-[0.98] transition"
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
          <GunGunMascot size={120} state="success" />
          <h1 className="text-[26px] font-semibold text-foreground leading-tight mt-4 text-center">
            采访完成
          </h1>
          <p className="text-[14px] text-muted-foreground mt-2 text-center">
            回答了 {questionCount} 个问题
          </p>
        </div>
        <div className="px-6 pb-10 space-y-3">
          <Link
            to="/upload"
            onClick={() => completeInterview()}
            className="block w-full text-center bg-primary text-primary-foreground rounded-pill py-4 text-[15px] font-semibold shadow-[0_10px_24px_rgba(90,127,61,0.28)] active:scale-[0.98] transition"
          >
            下一步：上传资料
          </Link>
          <Link
            to="/dna"
            onClick={() => completeInterview()}
            className="block w-full text-center text-[13px] text-muted-foreground"
          >
            跳过，直接生成 Founder DNA
          </Link>
        </div>
      </AppLayout>
    );
  }

  // Interview in progress
  return (
    <AppLayout>
      {/* Header: close + centered title */}
      <header className="relative flex items-center justify-center px-5 pt-4 pb-1 h-14">
        <Link
          to="/"
          className="absolute left-4 inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground/60 hover:bg-muted transition"
          aria-label="关闭"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
        </Link>
        <div className="text-[17px] font-bold text-foreground">
          {isContentMode
            ? TYPE_LABELS[interviewType] || "采访"
            : "AI 正在采访你"}
        </div>
      </header>
      <p className="text-center text-[12.5px] text-muted-foreground px-10 leading-relaxed">
        说说你的想法，我会帮你整理成全球表达
      </p>

      {/* Status pill */}
      <div className="flex items-center justify-center mt-3">
        <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          {!isContentMode && maxQuestions > 1
            ? `采访中 · ${questionCount}/${maxQuestions}`
            : "采访中"}
        </span>
      </div>

      {/* Messages: 滚滚 (AI) = green bubble on the left, user = white card on the right */}
      <div className="flex-1 overflow-y-auto px-5 mt-4 space-y-3 pb-2">
        {messages.map((msg) =>
          msg.role === "ai" ? (
            <div
              key={msg.id}
              className="flex items-end gap-2 justify-start animate-fade-up"
            >
              <img
                src="/gungun/idle.png"
                alt="滚滚"
                width={32}
                height={32}
                draggable={false}
                className="w-8 h-8 rounded-full object-contain bg-muted p-0.5 shrink-0 select-none"
              />
              <div className="max-w-[78%] bg-primary text-primary-foreground rounded-[20px] rounded-bl-[6px] px-4 py-3 shadow-[0_8px_20px_rgba(90,127,61,0.24)]">
                <p className="text-[14px] leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ) : (
            <div
              key={msg.id}
              className="flex items-end gap-2 justify-end animate-fade-up"
            >
              <div className="max-w-[78%] bg-card border border-divider shadow-soft rounded-[20px] rounded-br-[6px] px-4 py-3">
                <p className="text-[14px] leading-relaxed text-foreground">
                  {msg.content}
                </p>
              </div>
              {userProfile.avatar_url ? (
                <img
                  src={userProfile.avatar_url}
                  alt={userProfile.display_name ?? "我"}
                  width={32}
                  height={32}
                  draggable={false}
                  className="w-8 h-8 rounded-full object-cover shrink-0 select-none"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-accent/15 text-accent flex items-center justify-center shrink-0 text-[13px] font-semibold">
                  {userProfile.display_name?.trim().charAt(0) || "我"}
                </div>
              )}
            </div>
          ),
        )}
        {loading && (
          <div className="flex items-end gap-2 justify-start animate-fade-up">
            <img
              src="/gungun/thinking.png"
              alt="滚滚"
              width={32}
              height={32}
              draggable={false}
              className="w-8 h-8 rounded-full object-contain bg-muted p-0.5 shrink-0 select-none"
            />
            <div className="bg-primary/90 text-primary-foreground rounded-[20px] rounded-bl-[6px] px-4 py-3">
              <span className="text-[13.5px] animate-pulse">
                正在思考中 ···
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Live transcription while recording */}
      {recording && (interimText || inputText) && (
        <div className="px-6 pb-1">
          <div className="bg-primary/5 rounded-[14px] px-4 py-3 text-[14px] text-foreground min-h-[40px]">
            {inputText && <span className="text-foreground">{inputText}</span>}
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

      {/* Bottom control: waveform + big mic (voice-first) + text fallback */}
      <div className="sticky bottom-0 left-0 right-0 px-5 pb-7 pt-2 bg-gradient-to-t from-background via-background to-background/0 flex flex-col items-center">
        {recording && (
          <>
            <div className="h-12 w-full flex items-center justify-center gap-[3px]">
              {Array.from({ length: 22 }).map((_, i) => (
                <span
                  key={i}
                  ref={(el) => {
                    waveBarRefs.current[i] = el!;
                  }}
                  className="block w-[3px] rounded-full bg-primary/70 transition-[height] duration-75"
                  style={{ height: "4px" }}
                />
              ))}
            </div>
            <div className="text-[13px] font-medium text-muted-foreground mt-1 tabular-nums">
              {fmt(seconds)}
            </div>
          </>
        )}

        {!recording &&
          (recBlock?.kind === "in_app" || recBlock?.kind === "insecure") && (
            <div className="mb-3 w-full rounded-[16px] bg-accent/12 border border-accent/30 px-4 py-3 text-[13px] leading-relaxed text-foreground">
              {recBlock.kind === "in_app"
                ? `${recBlock.app}内不支持实时录音，点下方按钮用系统录音，或点右上角「···」→「在浏览器打开」体验更佳。`
                : "当前环境不支持实时录音，点下方按钮用系统录音，或用 https 域名打开。"}
            </div>
          )}

        {/* Hidden native-recorder input — fallback for browsers without the
            mic API (WeChat, many domestic Android browsers). NOTE: no `capture`
            attribute — per spec `capture` is a *camera* hint, so on Android it
            wrongly opens the camera/gallery for audio inputs. Plain
            accept="audio/*" opens the audio chooser / system sound recorder. */}
        <input
          ref={audioFileRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleAudioFilePick}
        />

        <button
          type="button"
          onClick={() =>
            recBlock ? audioFileRef.current?.click() : toggleRecording()
          }
          disabled={loading}
          className={`mt-2 h-[74px] w-[74px] rounded-full flex items-center justify-center transition active:scale-95 disabled:opacity-50 ${
            recording
              ? "bg-accent shadow-[0_0_0_8px_rgba(246,166,35,0.16)]"
              : "bg-primary shadow-[0_12px_28px_rgba(90,127,61,0.32)]"
          }`}
          aria-label={recording ? "停止录音" : "开始录音"}
        >
          {recording ? (
            <svg width="26" height="26" viewBox="0 0 24 24">
              <rect x="7" y="7" width="10" height="10" rx="2.5" fill="#fff" />
            </svg>
          ) : (
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              className="text-white"
            >
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
          )}
        </button>
        <p className="text-[13px] text-muted-foreground mt-3">
          {recording
            ? "点击停止录音"
            : recBlock
              ? "点击用系统录音"
              : "点击开始录音"}
        </p>

        {/* Text fallback */}
        {!recording && (
          <div className="mt-4 w-full flex items-center gap-2 bg-card rounded-[18px] border border-divider px-4 py-2.5">
            <input
              ref={textInputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && !e.shiftKey && handleSendText()
              }
              placeholder="也可以打字回答..."
              className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-muted-foreground"
              disabled={loading}
            />
            {inputText.trim() && (
              <button
                type="button"
                onClick={handleSendText}
                disabled={loading}
                className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0"
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
        )}
      </div>
    </AppLayout>
  );
}
