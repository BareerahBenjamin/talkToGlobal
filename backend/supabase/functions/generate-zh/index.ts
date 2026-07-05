// Generate Chinese candidate versions from user input + DNA + hot signals templates
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getUser } from "../_shared/auth.ts";
import { chatCompletion } from "../_shared/llm.ts";

// Three X/Twitter voice styles (Chinese), mirroring generate-en's X_STYLES so
// the founder picks the style at the Chinese stage; only the chosen one is later
// translated. Grounded in material/twitter-hotpots-analysis.md.
const TONE_STYLES = [
  {
    tone: "权威专家型",
    desc: `可信专家声音。从个人实践切入，而不是空谈观点（"最近我一直在用一个方法……" / "我看到 X → 试了 Y → 发现……"）。展示过程和结果，而不只给结论。像一个正在分享发现的人，而不是高高在上下定论。`,
  },
  {
    tone: "创始人故事型",
    desc: `创始人叙事声音。用"我们以前 X，现在 Y"的转变弧线。用具体数字代替形容词（"月收入 12.5 万" 胜过 "增长很快"）。坦诚讲低谷，真实让成绩更可信。给产品一个比它本身更大的叙事。`,
  },
  {
    tone: "犀利观点型",
    desc: `犀利观点声音。设问 + 确认是病毒钩子（"X 能做到 Y 吗？能。"）。把转变当作事实陈述，而不是"我觉得"。简短，留白就是解读空间。一个观点，笃定表达，值得被截图。`,
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

    const { source_input, source_type, dna_id, signal_id } = await req.json();

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

    // Founder-voice template rules (hot_signals) apply to ALL content types.
    // A real founder post (hot_posts) is referenced ONLY for market-signal
    // content, and ONLY the specific post the user picked (signal_id) — i.e.
    // "回应" that one hot take.
    let templatesContext = "";
    {
      const rulesPromise = supabase
        .from("hot_signals")
        .select("title, template, example, description")
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      const postPromise =
        source_type === "market_signal" && signal_id
          ? supabase
              .from("hot_posts")
              .select("source_account, author_name, content, likes")
              .eq("id", signal_id)
              .maybeSingle()
          : Promise.resolve({ data: null });

      const [{ data: rules }, { data: post }] = await Promise.all([
        rulesPromise,
        postPromise,
      ]);

      const ruleBlock =
        rules && rules.length > 0
          ? `## 顶尖 Founder 发声模版（参考，勿生搬硬套）

${rules
  .map(
    (s, i) =>
      `${i + 1}. **${s.title}**\n   模版: ${s.template}\n   示例: ${s.example}\n   说明: ${s.description}`
  )
  .join("\n\n")}`
          : "";

      const postBlock = post
        ? `## 你要回应的这条热点推文（针对它表达观点，不要复述、不要照抄）

${post.author_name || post.source_account}（${post.source_account}，${post.likes ?? 0} 赞）：
"${(post.content || "").slice(0, 500)}"`
        : "";

      if (ruleBlock || postBlock) {
        templatesContext = [ruleBlock, postBlock]
          .filter(Boolean)
          .join("\n\n")
          .concat(`

### 关键规则：
- 用数字替代形容词（"125K MRR" > "增长很好"）
- 以个人实践开场（"Something I've been finding very useful recently..."）
- 设问 + 确认 = 病毒钩子（"Can X do Y? Yes."）
- 转变陈述（"We used to X, now we're Y"）
- 留白 = 互动（推文越短，解读空间越大）
- 可验证性是最高级的影响力（展示过程和结果）${
            source_type === "market_signal"
              ? "\n- 这是对市场信号的回应：给出有区分度、可验证的观点，而不是复述信号本身。"
              : ""
          }`);
      }
    }

    const sourceLabel =
      source_type === "thinking"
        ? "今日思考"
        : source_type === "market_signal"
        ? "市场信号回应"
        : "产品进展";

    const systemPrompt = `你是一位帮助中国 AI 创始人创作海外社交媒体内容的 AI 助手。
你的任务是根据创始人的原始输入，生成 3 个不同风格的中文 X/Twitter 推文候选版本。

用户会在中文阶段就选定一个风格，之后只把选中的这一个翻译成英文发布，所以每个中文版本本身就要是一条“可以直接发的推文”，风格鲜明、可辨识。

要求：
1. 每个版本忠实于创始人的观点和经历，不要编造数据或客户背书
2. 三个版本分别对应下面三种风格，风格差异要明显，但都保持创始人的真实声音
3. 每个版本都要符合 X/Twitter 的表达习惯：短句、有钩子、可截图、用数字代替空泛形容词
4. 每个版本控制在 100-200 字中文
5. 返回 JSON 数组格式

${dnaContext ? `创始人 DNA 信息：\n${dnaContext}` : ""}

来源类型: ${sourceLabel}

${templatesContext}`;

    const styleDescriptions = TONE_STYLES.map(
      (s, i) => `${i + 1}. 「${s.tone}」\n${s.desc}`
    ).join("\n\n");

    const userPrompt = `创始人说：
"${source_input}"

请生成 3 个不同风格的中文 X 推文，每个风格一条：

${styleDescriptions}

返回 JSON 数组（tone 必须严格用下面的值）：
[
  {"tone": "权威专家型", "text": "..."},
  {"tone": "创始人故事型", "text": "..."},
  {"tone": "犀利观点型", "text": "..."}
]`;

    const result = await chatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { temperature: 0.85, maxTokens: 1500 }
    );

    // Parse JSON from response (handle markdown code blocks / surrounding prose)
    let versions;
    try {
      let raw = result.content.replace(/```json?\n?/gi, "").replace(/```/g, "").trim();
      const arrStart = raw.indexOf("[");
      const arrEnd = raw.lastIndexOf("]");
      if (arrStart !== -1 && arrEnd > arrStart) {
        raw = raw.slice(arrStart, arrEnd + 1);
      }
      versions = JSON.parse(raw);
    } catch {
      throw new Error(
        `Failed to parse LLM response as JSON. Body starts: ${String(result.content).slice(0, 200)}`
      );
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
