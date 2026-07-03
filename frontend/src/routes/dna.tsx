import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { SparkMascot } from "@/components/SparkMascot";
import { useDna } from "@/hooks/useDna";

export const Route = createFileRoute("/dna")({
  component: DNA,
  head: () => ({ meta: [{ title: "Founder DNA · 远声" }] }),
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
  const { dna, loading, updateDna } = useDna();
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [languageStyle, setLanguageStyle] = useState("亲和故事");

  useEffect(() => {
    if (dna?.language_style) {
      setLanguageStyle(dna.language_style);
    }
  }, [dna]);

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

  const getDnaValue = (key: string): string => {
    if (!dna) return "";
    const val = dna[key as keyof typeof dna];
    if (Array.isArray(val)) return val.join("\n");
    return String(val ?? "");
  };

  if (loading) {
    return (
      <AppLayout>
        <PageHeader back="/upload" title="Step 3 of 3" />
        <div className="flex-1 flex items-center justify-center">
          <SparkMascot size={100} state="thinking" />
        </div>
      </AppLayout>
    );
  }

  // No DNA yet — show empty state
  if (!dna) {
    return (
      <AppLayout>
        <PageHeader back="/upload" title="Step 3 of 3" />
        <div className="px-6 pt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-semibold leading-tight">
              你的 Founder DNA
            </h1>
            <p className="text-[13.5px] text-muted-foreground mt-2 leading-relaxed">
              还没有生成 DNA。先完成采访，Spark 会帮你提炼。
            </p>
          </div>
          <SparkMascot size={80} state="empty" />
        </div>
        <div className="px-6 mt-8">
          <Link
            to="/interview"
            search={{ type: "interview" }}
            className="block w-full text-center bg-primary text-primary-foreground rounded-pill py-4 text-[15px] font-semibold shadow-[0_10px_24px_rgba(90,127,61,0.28)]"
          >
            开始采访
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader back="/upload" title="Step 3 of 3" />
      <div className="px-6 pt-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold leading-tight">
            你的 Founder DNA
          </h1>
          <p className="text-[13.5px] text-muted-foreground mt-2 leading-relaxed">
            Spark 已经把你说的话
            <br />
            整理成一张创作者名片。
          </p>
        </div>
        <SparkMascot size={80} state="success" />
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
      </div>
    </AppLayout>
  );
}
