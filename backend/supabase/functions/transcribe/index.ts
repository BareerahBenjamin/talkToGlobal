// Speech-to-text via MiMo V2.5 ASR
// API: POST https://api.xiaomimimo.com/v1/chat/completions
// Auth: api-key header
// Body: JSON with messages[{role, content[{type: "input_audio", input_audio: {data: "data:audio/wav;base64,..."}}]}]
// Supported audio: wav, mp3 (base64 encoded, max 10MB)
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getUser } from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user, error: authError } = await getUser(req);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: authError }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;
    const interviewId = formData.get("interview_id") as string | null;

    if (!audioFile) {
      return new Response(
        JSON.stringify({ error: "audio file is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Upload audio to Supabase Storage
    const fileName = `${user.id}/${Date.now()}.webm`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("interview-audio")
      .upload(fileName, audioFile, {
        contentType: audioFile.type || "audio/webm",
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
    }

    // MiMo V2.5 ASR config
    const mimoApiKey = Deno.env.get("MIMO_ASR_API_KEY");
    const mimoBaseUrl = (Deno.env.get("MIMO_ASR_BASE_URL") || "https://api.xiaomimimo.com").replace(/\/+$/, "");
    const mimoModel = Deno.env.get("MIMO_ASR_MODEL") || "mimo-v2.5-asr";

    if (!mimoApiKey) {
      return new Response(
        JSON.stringify({ error: "MIMO_ASR_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize URL: support base_url with or without /v1
    const mimoEndpoint = mimoBaseUrl.endsWith("/v1")
      ? `${mimoBaseUrl}/chat/completions`
      : `${mimoBaseUrl}/v1/chat/completions`;

    // Convert audio to base64 data URL (chunked to avoid stack overflow)
    const audioBuffer = await audioFile.arrayBuffer();
    const bytes = new Uint8Array(audioBuffer);
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    const audioBase64 = btoa(binary);
    const mimeType = audioFile.type || "audio/webm";
    const dataUrl = `data:${mimeType};base64,${audioBase64}`;

    // Call MiMo V2.5 ASR — chat completions format
    const mimoRes = await fetch(mimoEndpoint, {
      method: "POST",
      headers: {
        "api-key": mimoApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: mimoModel,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "input_audio",
                input_audio: {
                  data: dataUrl,
                },
              },
            ],
          },
        ],
        asr_options: {
          language: "zh",
        },
      }),
    });

    if (!mimoRes.ok) {
      const errText = await mimoRes.text();
      console.error("MiMo ASR error:", errText);
      return new Response(
        JSON.stringify({ error: `MiMo ASR error: ${errText}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mimoData = await mimoRes.json();
    // Response format: {choices: [{message: {content: "transcribed text"}}]}
    const transcription =
      mimoData.choices?.[0]?.message?.content ||
      mimoData.text ||
      "";

    // Save as interview message if interview_id provided
    if (interviewId && transcription) {
      await supabase.from("interview_messages").insert({
        interview_id: interviewId,
        role: "user",
        content: transcription,
        audio_path: uploadData?.path || null,
      });
    }

    return new Response(
      JSON.stringify({
        text: transcription,
        audio_path: uploadData?.path || null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("transcribe error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
