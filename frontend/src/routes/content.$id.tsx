import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { GunGunMascot } from "@/components/GunGunMascot";
import { supabase } from "@/lib/supabase";
import type { Content } from "@/hooks/useContents";

export const Route = createFileRoute("/content/$id")({
  component: ContentDetail,
  head: () => ({ meta: [{ title: "内容详情 · 远声" }] }),
});

function ContentDetail() {
  const { id } = Route.useParams();
  const [content, setContent] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("contents")
        .select("*")
        .eq("id", id)
        .single();
      if (!active) return;
      if (error || !data) {
        setNotFound(true);
      } else {
        setContent(data as Content);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const [saving, setSaving] = useState(false);

  const handleCopy = (text: string) => {
    void navigator.clipboard?.writeText(text);
    toast.success("已复制到剪贴板");
  };

  const togglePublished = async () => {
    if (!content) return;
    const next = content.status === "published" ? "draft" : "published";
    setSaving(true);
    const { error } = await supabase
      .from("contents")
      .update({ status: next, updated_at: new Date().toISOString() })
      .eq("id", content.id);
    setSaving(false);
    if (error) {
      toast.error("更新失败");
      return;
    }
    setContent({ ...content, status: next });
    toast.success(next === "published" ? "已标记为已发布" : "已改回草稿");
  };

  const zhText =
    content?.edited_zh_text ||
    content?.zh_versions?.[content?.selected_zh_index ?? 0]?.text ||
    content?.zh_versions?.[0]?.text ||
    content?.source_input ||
    "";

  if (loading) {
    return (
      <AppLayout>
        <PageHeader back="/library" title="内容详情" />
        <div className="flex flex-col items-center py-24">
          <GunGunMascot size={92} state="thinking" />
          <p className="text-[13.5px] text-muted-foreground mt-4 animate-pulse">
            正在加载...
          </p>
        </div>
      </AppLayout>
    );
  }

  if (notFound || !content) {
    return (
      <AppLayout>
        <PageHeader back="/library" title="内容详情" />
        <div className="flex flex-col items-center py-24 px-8 text-center">
          <GunGunMascot size={100} state="empty" />
          <p className="text-[14px] text-muted-foreground mt-4">
            找不到这条内容，可能已被删除。
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        back="/library"
        title="内容详情"
        right={
          <span
            className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full"
            style={{
              color: content.status === "published" ? "#5A7F3D" : "#B0770D",
              background: content.status === "published" ? "#EEF3E8" : "#FFF3D2",
            }}
          >
            {content.status === "published" ? "已发布" : "草稿"}
          </span>
        }
      />

      <div className="px-5 mt-3 pb-28 space-y-4">
        {/* Chinese */}
        {zhText && (
          <div className="bg-card rounded-[24px] p-5 shadow-soft border border-divider/60 animate-fade-up">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-foreground">
                  中文版本
                </span>
                <span className="text-[10.5px] font-semibold tracking-[0.12em] uppercase px-2 py-0.5 rounded-full text-primary bg-primary/10">
                  ZH
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(zhText)}
                className="text-[12.5px] text-primary font-medium"
              >
                复制
              </button>
            </div>
            <p className="text-[15px] leading-relaxed text-foreground whitespace-pre-line">
              {zhText}
            </p>
          </div>
        )}

        {/* English versions */}
        {content.en_versions && content.en_versions.length > 0 && (
          <>
            <div className="flex items-center gap-2 pt-1 px-1">
              <span className="text-[13px] font-semibold text-foreground">
                英文 X 推文
              </span>
              <span className="text-[11px] text-muted-foreground">
                {content.en_versions.length} 种风格
              </span>
            </div>
            {content.en_versions.map((v, i) => (
              <div
                key={i}
                className="bg-card rounded-[24px] p-5 shadow-soft border border-divider/60 animate-fade-up"
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-foreground">
                      版本 {i + 1}
                    </span>
                    <span className="text-[10.5px] font-semibold tracking-[0.12em] px-2 py-0.5 rounded-full text-[#B0770D] bg-[#FFF3D2]">
                      {v.style_label || "X"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(v.text)}
                    className="text-[12.5px] text-primary font-medium"
                  >
                    复制
                  </button>
                </div>
                <p className="text-[15px] leading-relaxed text-foreground whitespace-pre-line">
                  {v.text}
                </p>
              </div>
            ))}
          </>
        )}

        {/* Only source input, nothing generated yet */}
        {!zhText && (!content.en_versions || content.en_versions.length === 0) && (
          <div className="bg-card rounded-[24px] p-5 shadow-soft border border-divider/60 text-center">
            <p className="text-[13px] text-muted-foreground">这条内容还没有生成结果。</p>
          </div>
        )}
      </div>

      {/* Sticky publish toggle */}
      <div className="sticky bottom-0 left-0 right-0 px-5 pb-7 pt-3 bg-gradient-to-t from-background via-background to-background/0">
        <button
          type="button"
          onClick={togglePublished}
          disabled={saving}
          className={`block w-full text-center rounded-pill py-3.5 text-[14px] font-semibold active:scale-[0.98] transition disabled:opacity-50 ${
            content.status === "published"
              ? "bg-muted text-foreground"
              : "bg-primary text-primary-foreground shadow-[0_10px_24px_rgba(90,127,61,0.28)]"
          }`}
        >
          {saving
            ? "处理中..."
            : content.status === "published"
              ? "取消发布（改回草稿）"
              : "标记为已发布"}
        </button>
      </div>
    </AppLayout>
  );
}
