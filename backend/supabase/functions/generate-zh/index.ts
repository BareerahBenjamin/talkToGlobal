// Generate Chinese candidate versions from user input + DNA + hot signals templates
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getUser } from "../_shared/auth.ts";
import { chatCompletion } from "../_shared/llm.ts";

const TONE_STYLES = [
  { tone: "温暖真诚", desc: "用真实故事和情感打动读者，像朋友聊天" },
  { tone: "锋利观点", desc: "简短有力，一句话一个观点，适合 X/Twitter" },
  { tone: "轻松日常", desc: "口语化，有幽默感，像发朋友圈" },
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

    const { source_input, source_type, dna_id } = await req.json();

    if (!source_input) {
      return new Response(
        JSON.stringify({ error: "source_input is required" }),
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
创始人定位: ${dna.position || "未知"}
表达风格: ${dna.voice_style || "未知"}
核心观点: ${dna.core_views || "未知"}
目标受众: ${dna.target_audience || "未知"}
产品叙事: ${dna.product_story || "未知"}
核心信念: ${(dna.beliefs || []).join("、")}
内容禁区: ${(dna.avoid || []).join("、")}
语言风格偏好: ${dna.language_style || "亲和故事"}`;
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
## 顶尖 Founder 发声模版（来自 @karpathy @rauchg @amasad @levelsio 等 10 个帐号拆解）

这些模版可以参考，但不要生硬套用。核心是用创始人的真实声音：

${signals.map((s, i) => `${i + 1}. **${s.title}**
   模版: ${s.template}
   示例: ${s.example}
   说明: ${s.description}`).join("\n\n")}

### 关键规则：
- 用数字替代形容词（"125K MRR" > "增长很好"）
- 以个人实践开场（"Something I've been finding very useful recently..."）
- 设问 + 确认 = 病毒钩子（"Can X do Y? Yes."）
- 转变陈述（"We used to X, now we're Y"）
- 留白 = 互动（推文越短，解读空间越大）
- 可验证性是最高级的影响力（展示过程和结果）`;
      }
    }

    const sourceLabel =
      source_type === "thinking"
        ? "今日思考"
        : source_type === "market_signal"
        ? "市场信号回应"
        : "产品进展";

    const systemPrompt = `你是一位帮助中国 AI 创始人创作海外社交媒体内容的 AI 助手。
你的任务是根据创始人的原始输入，生成 3 个不同风格的中文候选版本。

要求：
1. 每个版本要忠实于创始人的观点和经历，不要编造
2. 每个版本用不同的语言风格，但都要保持创始人的真实声音
3. 中文版本要适合后续翻译成英文发布到 X/Twitter 和 LinkedIn
4. 每个版本 100-200 字
5. 返回 JSON 数组格式

${dnaContext ? `创始人 DNA 信息：\n${dnaContext}` : ""}

来源类型: ${sourceLabel}

${templatesContext}`;

    const userPrompt = `创始人说：
"${source_input}"

请生成 3 个不同风格的中文版本，返回 JSON 数组：
[
  {"tone": "温暖真诚", "text": "..."},
  {"tone": "锋利观点", "text": "..."},
  {"tone": "轻松日常", "text": "..."}
]`;

    const result = await chatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { temperature: 0.85, maxTokens: 1500 }
    );

    // Parse JSON from response (handle markdown code blocks)
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
    console.error("generate-zh error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
