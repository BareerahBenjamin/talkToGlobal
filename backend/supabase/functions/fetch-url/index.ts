// Fetch a URL server-side and extract readable plain text.
// Used by the upload step so pasted links become real DNA material.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getUser } from "../_shared/auth.ts";

const MAX_BYTES = 2_000_000; // cap fetched HTML at ~2MB
const MAX_TEXT = 12_000; // cap extracted text fed downstream

function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? decodeEntities(m[1].trim()).slice(0, 200) : "";
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
}

function htmlToText(html: string): string {
  return decodeEntities(
    html
      // drop non-content blocks entirely
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      // block tags → newlines so paragraphs survive
      .replace(/<\/(p|div|section|article|h[1-6]|li|br)[^>]*>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      // strip remaining tags
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim()
    .slice(0, MAX_TEXT);
}

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

    const { url } = await req.json();

    // Validate: must be a public http(s) URL
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return new Response(
        JSON.stringify({ error: "Only http(s) URLs are supported" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch with a timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    let res: Response;
    try {
      res = await fetch(parsed.toString(), {
        headers: { "User-Agent": "TalkToGlobalBot/1.0 (+https://talktoglobal.app)" },
        signal: controller.signal,
        redirect: "follow",
      });
    } catch (err) {
      clearTimeout(timeout);
      return new Response(
        JSON.stringify({ error: `Failed to fetch URL: ${String(err)}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    clearTimeout(timeout);

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `Fetch returned ${res.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("html") && !contentType.includes("text")) {
      return new Response(
        JSON.stringify({ error: "URL is not an HTML/text page" }),
        { status: 415, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Read at most MAX_BYTES
    const buf = new Uint8Array(await res.arrayBuffer());
    const html = new TextDecoder("utf-8").decode(buf.slice(0, MAX_BYTES));

    const title = extractTitle(html);
    const text = htmlToText(html);

    if (!text) {
      return new Response(
        JSON.stringify({ error: "No readable text found on the page" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ title, text, url: parsed.toString() }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("fetch-url error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
