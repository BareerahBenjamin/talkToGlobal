import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { GunGunMascot } from "@/components/GunGunMascot";
import { useDna } from "@/hooks/useDna";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/dna")({
  component: DNA,
  head: () => ({ meta: [{ title: "Founder DNA · 远声" }] }),
  validateSearch: (search: Record<string, unknown>): { from?: string } => {
    const from = search.from as string | undefined;
    return from ? { from } : {};
  },
});

const SECTIONS = [
  {
    key: "position",
    label: "创始人定位",
    emoji: "👤",
    accent: "#EEF3E8",
    dot: "#5A7F3D",
  },
  {
    key: "voice_style",
    label: "表达风格",
    emoji: "🗣️",
    accent: "#FFF3D2",
    dot: "#F6A623",
  },
  {
    key: "core_views",
    label: "核心观点",
    emoji: "💡",
    accent: "#F8F2E6",
    dot: "#B0770D",
  },
  {
    key: "target_audience",
    label: "目标受众",
    emoji: "👥",
    accent: "#E9F0DE",
    dot: "#87B55A",
  },
  {
    key: "product_story",
    label: "产品叙事",
    emoji: "📖",
    accent: "#FDEBD0",
    dot: "#F6A623",
  },
] as const;

function DNA() {
  const navigate = useNavigate();
  const { from } = Route.useSearch();
  // Opened from the profile ("我的资料") rather than the first-use onboarding
  // step. Changes the header/back target and hides onboarding-only affordances.
  const fromProfile = from === "profile";
  const headerBack = fromProfile ? "/profile" : "/upload";
  const headerTitle = fromProfile ? "我的资料" : "Step 3 of 3";
  const { dna, loading, updateDna, generateFromInterview } = useDna();
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [languageStyle, setLanguageStyle] = useState("亲和故事");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const triedRef = useRef(false);

  useEffect(() => {
    if (dna?.language_style) {
      setLanguageStyle(dna.language_style);
    }
  }, [dna]);

  // Auto-generate DNA from the interview + uploaded materials on first arrival.
  // Backend falls back to the user's latest interview + all materials, so no
  // ids need to be threaded across the interview → upload → dna pages.
  const runGenerate = useCallback(async () => {
    setGenError(null);
    setGenerating(true);
    try {
      // no args → extract-dna uses latest interview + all of the user's materials
      await generateFromInterview("");
    } catch (err) {
      setGenError(String(err));
    } finally {
      setGenerating(false);
    }
  }, [generateFromInterview]);

  // A DNA row counts as "real" only if it has content and isn't the test stub.
  // The test-skip path seeds "（测试）..." placeholders, which must not block
  // AI auto-generation.
  const isStubDna = (d: typeof dna): boolean =>
    !!d && String(d.position ?? "").startsWith("（测试）");

  useEffect(() => {
    // Only auto-generate during the first-use onboarding flow. When the page is
    // opened from the profile ("我的资料"), just show existing DNA or an empty
    // prompt — don't silently kick off generation.
    if (
      !fromProfile &&
      !loading &&
      (!dna || isStubDna(dna)) &&
      !triedRef.current
    ) {
      triedRef.current = true;
      void runGenerate();
    }
  }, [loading, dna, runGenerate, fromProfile]);

  const handleEdit = (key: string, currentValue: string) => {
    setEditKey(key);
    setEditValue(currentValue || "");
  };

  const handleSave = async () => {
    if (!editKey) return;
    try {
      await updateDna({ [editKey]: editValue });
      setEditKey(null);
      toast.success("已保存");
    } catch {
      toast.error("保存失败");
    }
  };

  const handleConfirm = async () => {
    try {
      await updateDna({ is_confirmed: true, language_style: languageStyle });
      toast.success("DNA 已确认");
      navigate({ to: "/" });
    } catch {
      toast.error("确认失败");
    }
  };

  // Re-run AI extraction over the latest interview + materials, overwriting the
  // current DNA row. Needed when the row holds test-stub / stale data — the
  // auto-generate effect only fires when no DNA row exists at all.
  const handleRegenerate = async () => {
    await runGenerate();
    if (genError) {
      toast.error("生成失败，请重试");
    } else {
      toast.success("已用 AI 重新生成");
    }
  };

  // Test-only shortcut: skip generation, seed a stub DNA row so the home page
  // (which only requires a DNA row to exist) lets us into daily mode.
  const handleSkipForTest = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const stub = {
        position: "（测试）创始人定位",
        voice_style: "（测试）表达风格",
        core_views: "（测试）核心观点",
        target_audience: "（测试）目标受众",
        product_story: "（测试）产品叙事",
        beliefs: [],
        avoid: [],
        language_style: languageStyle,
        is_confirmed: true,
        updated_at: new Date().toISOString(),
      };

      // founder_dna has no unique constraint on user_id, so upsert(onConflict)
      // would fail. Check for an existing row and update it, else insert.
      const { data: existing } = await supabase
        .from("founder_dna")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      const { error } = existing
        ? await supabase.from("founder_dna").update(stub).eq("id", existing.id)
        : await supabase
            .from("founder_dna")
            .insert({ user_id: user.id, ...stub });

      if (error) throw error;
      toast.success("已跳过（测试）");
      navigate({ to: "/" });
    } catch (err) {
      toast.error(`跳过失败：${String(err)}`);
    }
  };

  const getDnaValue = (key: string): string => {
    if (!dna) return "";
    const val = dna[key as keyof typeof dna];
    if (Array.isArray(val)) return val.join("\n");
    return String(val ?? "");
  };

  if (loading || generating) {
    return (
      <AppLayout>
        <PageHeader back={headerBack} title={headerTitle} />
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <GunGunMascot size={110} state="generating" />
          <h1 className="text-[20px] font-bold text-foreground mt-6">
            正在生成你的 Founder DNA
          </h1>
          <p className="text-[13.5px] text-muted-foreground mt-2 text-center animate-pulse">
            {generating
              ? "AI 正在阅读你的采访和资料，提炼核心定位..."
              : "加载中..."}
          </p>
          {!fromProfile && (
            <button
              type="button"
              onClick={handleSkipForTest}
              className="mt-8 text-[13px] text-muted-foreground underline underline-offset-4 decoration-muted-foreground/40"
            >
              先跳过（测试）
            </button>
          )}
        </div>
      </AppLayout>
    );
  }

  // No DNA — either generation failed, or there's no interview/material data yet
  if (!dna) {
    return (
      <AppLayout>
        <PageHeader back={headerBack} title={headerTitle} />
        <div className="px-6 pt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-semibold leading-tight">
              你的 Founder DNA
            </h1>
            <p className="text-[13.5px] text-muted-foreground mt-2 leading-relaxed">
              {genError
                ? "生成失败了。可以重试，或先补充采访内容。"
                : "还没有可用的采访内容。先完成采访，滚滚 会帮你提炼。"}
            </p>
          </div>
          <GunGunMascot size={80} state="empty" />
        </div>
        <div className="px-6 mt-8 space-y-3">
          {genError && (
            <button
              type="button"
              onClick={() => void runGenerate()}
              className="block w-full text-center bg-primary text-primary-foreground rounded-pill py-4 text-[15px] font-semibold shadow-[0_10px_24px_rgba(90,127,61,0.28)] active:scale-[0.98] transition"
            >
              重新生成
            </button>
          )}
          <Link
            to="/interview"
            search={{ type: "interview" }}
            className={`block w-full text-center rounded-pill py-4 text-[15px] font-semibold transition ${
              genError
                ? "bg-muted text-foreground"
                : "bg-primary text-primary-foreground shadow-[0_10px_24px_rgba(90,127,61,0.28)]"
            }`}
          >
            {genError ? "去补充采访" : "开始采访"}
          </Link>
          {!fromProfile && (
            <button
              type="button"
              onClick={handleSkipForTest}
              className="block w-full text-center text-[13px] text-muted-foreground underline underline-offset-4 decoration-muted-foreground/40 pt-1"
            >
              先跳过（测试）
            </button>
          )}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader back={headerBack} title={headerTitle} />
      <div className="px-6 pt-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold leading-tight">
            你的 Founder DNA
          </h1>
          <p className="text-[13.5px] text-muted-foreground mt-2 leading-relaxed">
            这是我们为你提炼的
            <br />
            核心定位，可随时编辑。
          </p>
        </div>
        <GunGunMascot size={80} state="success" />
      </div>

      <div className="px-5 mt-6 space-y-3 pb-8">
        {SECTIONS.map((s, i) => {
          const value = getDnaValue(s.key);
          const isEditing = editKey === s.key;

          return (
            <div
              key={s.key}
              className="bg-card rounded-[24px] p-5 shadow-soft border border-divider/60 animate-fade-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: s.dot }}
                  />
                  <span className="text-[11.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    {s.label}
                  </span>
                </div>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => handleEdit(s.key, value)}
                    className="h-8 w-8 -mr-2 -mt-2 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition"
                    aria-label={`编辑 ${s.label}`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M4 20h4l10-10-4-4L4 16v4Z"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="mt-3">
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    rows={3}
                    className="w-full bg-muted rounded-[14px] p-3 text-[15px] text-foreground outline-none resize-none focus:ring-1 focus:ring-primary/40"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setEditKey(null)}
                      className="flex-1 py-2 rounded-full text-[13px] font-medium bg-muted text-foreground"
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      className="flex-1 py-2 rounded-full text-[13px] font-medium bg-primary text-primary-foreground"
                    >
                      保存
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-[15px] text-foreground mt-3 leading-relaxed whitespace-pre-line">
                  {value || "未设置"}
                </p>
              )}
            </div>
          );
        })}

        {/* Language style selector */}
        <div className="bg-card rounded-[24px] p-5 shadow-soft border border-divider/60 animate-fade-up">
          <div className="flex items-center gap-2 mb-3">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span className="text-[11.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              语言风格
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {["平实专业", "亲和故事", "锐利观点", "学术严谨"].map((style) => (
              <button
                key={style}
                type="button"
                onClick={async () => {
                  setLanguageStyle(style);
                  try {
                    await updateDna({ language_style: style });
                  } catch {
                    // ignore
                  }
                }}
                className={`px-4 py-2 rounded-full text-[13px] font-medium transition ${
                  languageStyle === style
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground border border-divider"
                }`}
              >
                {style}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 left-0 right-0 px-6 pb-8 pt-4 bg-gradient-to-t from-background via-background to-background/0">
        <button
          type="button"
          onClick={handleConfirm}
          className="block text-center w-full bg-primary text-primary-foreground rounded-pill py-4 text-[15px] font-semibold shadow-[0_10px_24px_rgba(90,127,61,0.28)] active:scale-[0.98] transition"
        >
          确认 DNA，进入日常模式
        </button>
        <button
          type="button"
          onClick={handleRegenerate}
          className="flex items-center justify-center gap-1.5 w-full text-center text-[13px] text-primary font-medium pt-3.5"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 12a8 8 0 0 1 13.7-5.7L20 8M20 4v4h-4M20 12a8 8 0 0 1-13.7 5.7L4 16M4 20v-4h4"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          用 AI 重新生成
        </button>
      </div>
    </AppLayout>
  );
}
