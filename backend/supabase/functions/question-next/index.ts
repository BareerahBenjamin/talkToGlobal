// Get the next interview question from the question bank
// Interview questions (category='interview'): random pick, 3 per session
// Daily mode questions (thinking/market_signal/product_update): random
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getUser } from "../_shared/auth.ts";

const VALID_CATEGORIES = ["thinking", "market_signal", "product_update", "interview"];

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

    const { category, interview_id } = await req.json();

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return new Response(
        JSON.stringify({ error: `Invalid category. Must be: ${VALID_CATEGORIES.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get already-asked question IDs for this interview
    let askedIds: string[] = [];
    if (interview_id) {
      const { data: messages } = await supabase
        .from("interview_messages")
        .select("content")
        .eq("interview_id", interview_id)
        .eq("role", "ai");

      // Match asked questions by content
      if (messages && messages.length > 0) {
        const askedContents = messages.map((m) => m.content);
        const { data: askedQuestions } = await supabase
          .from("question_bank")
          .select("id")
          .in("question", askedContents);
        askedIds = askedQuestions?.map((q) => q.id) ?? [];
      }
    }

    // Build query
    let query = supabase
      .from("question_bank")
      .select("*")
      .eq("category", category);

    if (askedIds.length > 0) {
      query = query.not("id", "in", `(${askedIds.join(",")})`);
    }

    const { data: questions, error: qError } = await query;

    if (qError) throw qError;
    if (!questions || questions.length === 0) {
      return new Response(
        JSON.stringify({ question: null, message: "No more questions in this category" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // All categories: random pick
    const question = questions[Math.floor(Math.random() * questions.length)];

    return new Response(JSON.stringify({ question }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("question-next error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
