// API client for Edge Functions
import { supabase } from "./supabase";

const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
  : "";

async function getAuthHeader(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : {};
}

async function callFunction<T>(
  name: string,
  body: Record<string, unknown>,
): Promise<T> {
  const auth = await getAuthHeader();
  const res = await fetch(`${FUNCTIONS_URL}/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? "",
      ...auth,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `Function ${name} failed (${res.status})`);
  }

  return res.json();
}

// ---- Question Bank ----

export interface Question {
  id: string;
  category: string;
  question: string;
  follow_up: string | null;
}

export async function getNextQuestion(
  category: string,
  interviewId?: string,
): Promise<{ question: Question | null }> {
  return callFunction("question-next", { category, interview_id: interviewId });
}

// ---- Chinese Generation ----

export interface ZhVersion {
  tone: string;
  text: string;
}

export async function generateZh(input: {
  source_input: string;
  source_type: string;
  dna_id?: string;
}): Promise<{ versions: ZhVersion[] }> {
  return callFunction("generate-zh", input);
}

// ---- English Translation ----

export interface EnVersion {
  platform: string;
  text: string;
}

export async function generateEn(input: {
  zh_text: string;
  dna_id?: string;
  source_type?: string;
  platforms?: string[];
}): Promise<{ versions: EnVersion[] }> {
  return callFunction("generate-en", input);
}

// ---- Hot Signals ----

export interface HotSignal {
  id: string;
  title: string;
  source_account: string | null;
  rule_type: string;
  template: string;
  example: string | null;
  description: string | null;
}

export async function getHotSignals(
  ruleType?: string,
): Promise<{ signals: HotSignal[] }> {
  return callFunction("hot-signals", { rule_type: ruleType });
}

// ---- DNA Extraction ----

export interface DnaData {
  position: string;
  voice_style: string;
  core_views: string;
  target_audience: string;
  product_story: string;
  beliefs: string[];
  avoid: string[];
}

export async function extractDna(input: {
  interview_id?: string;
  material_ids?: string[];
}): Promise<{ dna: DnaData; saved: unknown }> {
  return callFunction("extract-dna", input);
}

// ---- Transcription (mimo ASR) ----

/** Convert webm/audio blob to wav format (MiMo ASR only supports wav/mp3) */
async function blobToWav(blob: Blob): Promise<Blob> {
  const audioCtx = new AudioContext();
  const arrayBuffer = await blob.arrayBuffer();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  await audioCtx.close();

  // Encode as WAV (16-bit PCM)
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const length = audioBuffer.length;
  const bytesPerSample = 2; // 16-bit
  const dataSize = length * numChannels * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // WAV header
  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++)
      view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
  view.setUint16(32, numChannels * bytesPerSample, true);
  view.setUint16(34, 16, true); // bits per sample
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);

  // Interleave channels and write PCM samples
  const channels = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(audioBuffer.getChannelData(ch));
  }
  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      view.setInt16(offset, sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([buffer], { type: "audio/wav" });
}

export async function transcribeAudio(
  audioBlob: Blob,
  interviewId?: string,
): Promise<{ text: string; audio_path: string | null }> {
  const auth = await getAuthHeader();

  // Convert to WAV — MiMo ASR only supports wav/mp3
  const wavBlob = await blobToWav(audioBlob);

  const formData = new FormData();
  formData.append("audio", wavBlob, "recording.wav");
  if (interviewId) formData.append("interview_id", interviewId);

  const res = await fetch(`${FUNCTIONS_URL}/transcribe`, {
    method: "POST",
    headers: {
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? "",
      ...auth,
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `Transcription failed (${res.status})`);
  }

  return res.json();
}
