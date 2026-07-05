// Extract Founder Voice DNA from interview messages + materials
// DNA structure from material/interviewQuestions.md: 7 sections
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getUser } from "../_shared/auth.ts";
import { chatCompletion } from "../_shared/llm.ts";

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

    const { interview_id, material_ids } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Resolve interview: fall back to this user's most recent interview so the
    // client can trigger extraction without threading ids across pages.
    let interviewId = interview_id;
    if (!interviewId) {
      const { data: latest } = await supabase
        .from("interviews")
        .select("id")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      interviewId = latest?.id;
    }

    // Collect interview conversation
    let conversationText = "";
    if (interviewId) {
      const { data: messages } = await supabase
        .from("interview_messages")
        .select("role, content")
        .eq("interview_id", interviewId)
        .order("created_at", { ascending: true });

      if (messages && messages.length > 0) {
        conversationText = messages
          .map((m) => `${m.role === "ai" ? "AI 采访" : "创始人"}: ${m.content}`)
          .join("\n\n");
      }
    }

    // Collect materials. When material_ids is omitted, use ALL of this user's
    // materials (step 2 uploads), so reference files/links feed the DNA too.
    let materialsText = "";
    {
      let query = supabase
        .from("materials")
        .select("type, title, content")
        .eq("user_id", user.id);
      if (material_ids && material_ids.length > 0) {
        query = query.in("id", material_ids);
      }
      const { data: materials } = await query;

      if (materials && materials.length > 0) {
        materialsText = materials
          // skip rows with no usable text (e.g. unparsed PDF/PPT uploads)
          .filter((m) => (m.content || "").trim().length > 0)
          .map((m) => `[${m.type}] ${m.title || "无标题"}:\n${m.content || ""}`)
          .join("\n\n---\n\n");
      }
    }

    if (!conversationText && !materialsText) {
      return new Response(
        JSON.stringify({ error: "No interview or material data provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // DNA structure from material/interviewQuestions.md §4
    const systemPrompt = `你是一位 AI 品牌策略师。你的任务是从创始人采访对话和产品材料中提取 "Founder Voice DNA"。

这个 DNA 将用于后续所有内容生成，所以要准确、有洞察力、能指导写作。

你需要提取 7 个维度，每个维度的含义如下：

## 1. Founder Identity（创始人定位）
你是谁，你为什么适合讲这件事。
- Founder 身份标签
- 相关经历
- 为什么这个 founder 对这个问题有发言权
- 可被海外受众理解的 credibility

## 2. Product Reality（产品现实）
你解决的真实 workflow 问题。
- 用户是谁
- 用户原本如何解决
- 真实卡点是什么
- 产品如何改变流程

## 3. Founder POV（创始人观点）
你对行业、市场或产品的核心判断。
- 市场普遍相信什么
- Founder 不同意什么
- Founder 的核心判断是什么（sharp take）

## 4. Audience & Belief Shift（受众与信念转变）
你想影响谁，希望他们从相信 A 变成相信 B。
- 主要海外受众
- 当前误解
- 希望建立的新认知
- 希望对方采取的行动

## 5. Proof Assets（证据资产）
你有哪些真实证据可以支撑内容。
- 客户原话
- 用户反馈
- 产品 demo / 数据
- 真实案例 / 失败复盘
- Founder 亲身经历

## 6. Voice Style（表达风格）
你适合的表达气质。
- 从对话中观察到的说话方式
- 适合的表达标签（如：清晰直接、克制专业、有一点锋利、build in public 等）
- 应该避免的表达方式

## 7. Things to Avoid（内容禁区）
不应该出现的表达风险。
- 不要像公司营销稿
- 不要过度使用 AI buzzwords
- 不要假装有数据或客户背书
- 不要过度夸大
- 不要为了热点而热点

返回严格 JSON 格式。`;

    let userPrompt = "";
    if (conversationText) {
      userPrompt += `采访对话记录：\n${conversationText}\n\n`;
    }
    if (materialsText) {
      userPrompt += `产品材料：\n${materialsText}\n\n`;
    }
    userPrompt += `请提取 Founder Voice DNA，返回 JSON：
{
  "position": "创始人定位（身份标签 + credibility）",
  "voice_style": "表达风格（从对话中观察到的说话方式 + 适合的标签）",
  "core_views": "核心观点（市场共识 vs Founder 不同判断 + sharp take）",
  "target_audience": "目标受众 + 信念转变（当前误解 → 目标认知 + 期望行动）",
  "product_story": "产品叙事（真实 workflow 卡点 + before/after 对比 + 用户是谁）",
  "beliefs": ["核心信念1", "核心信念2", "核心信念3"],
  "avoid": ["内容禁区1", "内容禁区2", "内容禁区3"]
}

注意：
- position 要让海外受众能理解这个人的 credibility
- core_views 要包含市场共识和 founder 的不同判断
- target_audience 要包含信念转变（从信什么变成信什么）和期望行动
- product_story 要包含真实 workflow 卡点和 before/after 对比
- avoid 要具体，不要泛泛而谈`;

    const result = await chatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { temperature: 0.5, maxTokens: 2000 }
    );

    // Parse JSON from response. LLMs sometimes wrap the JSON in ```fences```,
    // add a sentence before/after, or return other prose — so strip fences and
    // fall back to extracting the outermost {...} block before giving up.
    let dna;
    try {
      let jsonStr = result.content
        .replace(/```json?\n?/gi, "")
        .replace(/```/g, "")
        .trim();
      try {
        dna = JSON.parse(jsonStr);
      } catch {
        const start = jsonStr.indexOf("{");
        const end = jsonStr.lastIndexOf("}");
        if (start === -1 || end === -1 || end <= start) throw new Error("no JSON object found");
        dna = JSON.parse(jsonStr.slice(start, end + 1));
      }
    } catch {
      throw new Error(
        `Failed to parse LLM response as JSON. Raw: ${String(result.content).slice(0, 300)}`
      );
    }

    // Save to database. founder_dna has no unique constraint on user_id, so
    // upsert(onConflict: "user_id") errors with 42P10. Check for an existing
    // row and update it, else insert.
    const { data: existing } = await supabase
      .from("founder_dna")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const row = {
      ...dna,
      is_confirmed: false,
      updated_at: new Date().toISOString(),
    };

    const { data: savedDna, error: saveError } = existing
      ? await supabase
          .from("founder_dna")
          .update(row)
          .eq("id", existing.id)
          .select()
          .single()
      : await supabase
          .from("founder_dna")
          .insert({ user_id: user.id, ...row })
          .select()
          .single();

    if (saveError) {
      console.error("Failed to save DNA:", saveError);
      return new Response(
        JSON.stringify({ error: `Failed to save DNA: ${saveError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ dna, saved: savedDna, usage: result.usage }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("extract-dna error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
