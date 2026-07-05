// Generate English X/Twitter posts (3 founder-voice styles) from confirmed Chinese text + DNA
// Styles are derived from material/twitter-hotpots-analysis.md (10 顶尖 Founder 帐号拆解)
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getUser } from "../_shared/auth.ts";
import { chatCompletion } from "../_shared/llm.ts";

// Three X/Twitter voice styles, each grounded in the founder-voice analysis.
const X_STYLES = [
  {
    key: "authority",
    label: "权威专家型",
    accounts: "@simonw @goodside @karpathy",
    guidance: `Credible-expert voice. Open from personal practice, not opinion:
"Something I've been finding very useful recently..." or "I've been seeing X → I tested Y → here's what I found."
Show the process and the result, not just a conclusion (verifiability is the highest form of influence).
Each post is a micro-framework, not a one-line take. Tone: a sharer discovering something, not an authority decreeing.`,
  },
  {
    key: "story",
    label: "创始人故事型",
    accounts: "@amasad @levelsio",
    guidance: `Founder-narrative voice. Use the reversal arc "We used to X, now we're Y".
Replace adjectives with concrete numbers ("125K MRR", "42% of the web", "0 funding") — a public number beats any rationale.
Be candid about the low points; honesty makes the win credible. Give the product a narrative bigger than itself.`,
  },
  {
    key: "sharp",
    label: "犀利观点型",
    accounts: "@rauchg @roon",
    guidance: `Sharp-take voice. Question + confirmation is the viral hook ("Can X do Y? Yes.").
Use transformation statements as fact, not "I think". Keep it short — white space = interpretation room = engagement.
Coin a term or name the trend when you can. One idea, stated with conviction, screenshot-worthy.`,
  },
];

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

    const { zh_text, dna_id, source_type, style_label } = await req.json();

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

    // Founder-voice template rules (hot_signals) as craft baseline. The real
    // hot post (if any) already shaped the confirmed Chinese, so it's not
    // re-fetched here — this stage only transcreates that Chinese into English.
    let templatesContext = "";
    const { data: rules } = await supabase
      .from("hot_signals")
      .select("title, template, example, description")
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (rules && rules.length > 0) {
      templatesContext = `## Founder Voice Rules (craft baseline — inspiration, not rigid templates)

${rules
  .map(
    (s, i) =>
      `${i + 1}. **${s.title}**\n   Template: ${s.template}\n   Example: ${s.example}\n   Note: ${s.description}`
  )
  .join("\n\n")}

### Core rules for X/Twitter:
- Use numbers instead of adjectives ("125K MRR" > "growing fast")
- Open with personal practice ("Something I've been finding very useful recently...")
- Question + confirmation = viral hook ("Can X do Y? Yes.")
- Transformation statement ("We used to X, now we're Y")
- White space = engagement (shorter tweets = more interpretation room)
- Verifiability is the highest form of influence (show process and results)${
        source_type === "market_signal"
          ? "\n- This is a market-signal response: react with a distinct, verifiable point of view, not a summary."
          : ""
      }`;
    }

    // The founder already chose a style at the Chinese stage; translate that one
    // version, preserving its voice. Fall back to authority if no style given.
    const chosenStyle =
      X_STYLES.find((s) => s.label === style_label || s.key === style_label) ??
      X_STYLES[0];

    const systemPrompt = `You are an expert at transcreating Chinese content into an authentic English post for X/Twitter, for a Chinese AI founder speaking to a global audience.

CRITICAL RULES:
1. This is TRANSCREATION, not translation. Adapt the message for X/Twitter and an overseas audience.
2. Preserve the founder's authentic voice and key points — do NOT add claims they didn't make.
3. Sound like a real person posting, not AI-generated content. No corporate jargon, no buzzword soup.
4. The post must fit within 280 characters. Line breaks are encouraged for emphasis.
5. Produce EXACTLY ONE English post that carries the SAME message and the SAME voice as the chosen style below.
6. Return a JSON object with a single "text" field.

${dnaContext ? `Founder context:\n${dnaContext}\n` : ""}
${templatesContext}`;

    const userPrompt = `Chinese source (confirmed by the founder), already written in the "${chosenStyle.label}" voice:
"${zh_text}"

Transcreate it into ONE English X/Twitter post, keeping this voice:
- style "${chosenStyle.key}" (${chosenStyle.label}, inspired by ${chosenStyle.accounts}):
${chosenStyle.guidance}

Must be <= 280 characters. Return JSON in this exact shape:
{"text": "..."}`;

    const result = await chatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { temperature: 0.75, maxTokens: 600 }
    );

    // Parse JSON from the response, tolerating fences / surrounding prose and
    // both {"text": "..."} objects and bare "..." strings.
    let enTextOut = "";
    try {
      let raw = result.content.replace(/```json?\n?/gi, "").replace(/```/g, "").trim();
      const objStart = raw.indexOf("{");
      const objEnd = raw.lastIndexOf("}");
      if (objStart !== -1 && objEnd > objStart) {
        const parsed = JSON.parse(raw.slice(objStart, objEnd + 1));
        enTextOut = String(parsed.text ?? parsed.content ?? "").trim();
      } else {
        enTextOut = raw.replace(/^["']|["']$/g, "").trim();
      }
    } catch {
      // Last resort: use the raw content as the post text.
      enTextOut = String(result.content).trim();
    }

    if (!enTextOut) {
      throw new Error(
        `LLM returned no usable X post. Body starts: ${String(result.content).slice(0, 200)}`
      );
    }

    const versions = [
      { style: chosenStyle.key, style_label: chosenStyle.label, text: enTextOut },
    ];

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
