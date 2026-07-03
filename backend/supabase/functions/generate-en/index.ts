// Generate English transcreation from confirmed Chinese text + DNA + hot signals templates
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getUser } from "../_shared/auth.ts";
import { chatCompletion } from "../_shared/llm.ts";

const PLATFORM_SPECS = {
  x: {
    name: "X / Twitter",
    maxChars: 280,
    style: "concise, punchy, uses line breaks for emphasis, hashtags at end",
    tone: "direct, opinionated, slightly provocative",
  },
  linkedin: {
    name: "LinkedIn",
    maxChars: 1300,
    style: "professional but personal, storytelling, uses paragraphs",
    tone: "thoughtful, authoritative, warm",
  },
};

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

    const { zh_text, dna_id, source_type, platforms = ["x", "linkedin"] } = await req.json();

    if (!zh_text) {
      return new Response(
        JSON.stringify({ error: "zh_text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch DNA
    let dnaContext = "";
    if (dna_id) {
      const { data: dna } = await supabase
        .from("founder_dna")
        .select("*")
        .eq("id", dna_id)
        .single();

      if (dna) {
        dnaContext = `
Founder profile: ${dna.position || "Unknown"}
Voice style: ${dna.voice_style || "Unknown"}
Core views: ${dna.core_views || "Unknown"}
Target audience: ${dna.target_audience || "Unknown"}
Avoid: ${(dna.avoid || []).join(", ")}`;
      }
    }

    // Fetch hot signals templates for market_signal content
    let templatesContext = "";
    if (source_type === "market_signal") {
      const { data: signals } = await supabase
        .from("hot_signals")
        .select("title, template, example, description")
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (signals && signals.length > 0) {
        templatesContext = `
## Top Founder Voice Templates (from @karpathy @rauchg @amasad @levelsio etc.)

Use these as inspiration, not rigid templates. The goal is authentic founder voice:

${signals.map((s, i) => `${i + 1}. **${s.title}**
   Template: ${s.template}
   Example: ${s.example}
   Note: ${s.description}`).join("\n\n")}

### Key rules for X/Twitter:
- Use numbers instead of adjectives ("125K MRR" > "growing fast")
- Open with personal practice ("Something I've been finding very useful recently...")
- Question + confirmation = viral hook ("Can X do Y? Yes.")
- Transformation statement ("We used to X, now we're Y")
- White space = engagement (shorter tweets = more interpretation room)
- Verifiability is the highest form of influence (show process and results)`;
      }
    }

    // Generate for each platform
    const platformSpecs = platforms
      .filter((p: string) => PLATFORM_SPECS[p as keyof typeof PLATFORM_SPECS])
      .map((p: string) => ({
        key: p,
        ...PLATFORM_SPECS[p as keyof typeof PLATFORM_SPECS],
      }));

    const systemPrompt = `You are an expert at transcreating Chinese content into authentic English social media posts for global audiences.

CRITICAL RULES:
1. This is TRANSCREATION, not translation. Adapt the message for the target platform and audience.
2. Preserve the founder's authentic voice and key points — do NOT add claims they didn't make.
3. Sound like a real person posting, not like AI-generated content.
4. No corporate jargon, no buzzword soup.
5. Return a JSON array with one entry per platform.

${dnaContext ? `Founder context:\n${dnaContext}` : ""}

${templatesContext}`;

    const platformDescriptions = platformSpecs
      .map(
        (p: any) =>
          `- ${p.name}: max ${p.maxChars} chars, style: ${p.style}, tone: ${p.tone}`
      )
      .join("\n");

    const userPrompt = `Chinese source (confirmed by the founder):
"${zh_text}"

Generate English versions for these platforms:
${platformDescriptions}

Return JSON array:
[
  {"platform": "x", "text": "..."},
  {"platform": "linkedin", "text": "..."}
]`;

    const result = await chatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { temperature: 0.7, maxTokens: 1500 }
    );

    // Parse JSON from response
    let versions;
    try {
      const jsonStr = result.content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      versions = JSON.parse(jsonStr);
    } catch {
      throw new Error("Failed to parse LLM response as JSON");
    }

    return new Response(JSON.stringify({ versions, usage: result.usage }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-en error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
