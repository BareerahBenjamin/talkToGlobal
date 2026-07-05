import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { ActionCard } from "@/components/ActionCard";
import { GunGunMascot } from "@/components/GunGunMascot";
import { useMaterials } from "@/hooks/useMaterials";
import { fetchUrl } from "@/lib/api";

export const Route = createFileRoute("/upload")({
  component: Upload,
  head: () => ({ meta: [{ title: "上传资料 · 远声" }] }),
});

function Upload() {
  const navigate = useNavigate();
  const {
    materials,
    uploading,
    fetchMaterials,
    addTextMaterial,
    uploadFile,
    deleteMaterial,
  } = useMaterials();

  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void fetchMaterials();
  }, [fetchMaterials]);

  const isUrl = (s: string) => /^https?:\/\/\S+$/i.test(s.trim());

  const handleSavePaste = async () => {
    const content = pasteText.trim();
    if (!content) return;
    setSaving(true);
    try {
      if (isUrl(content)) {
        // Fetch the page server-side so the link becomes real DNA material.
        try {
          const { title, text } = await fetchUrl(content);
          await addTextMaterial(title || content, text, "url");
          toast.success("已抓取网页内容");
        } catch (err) {
          // Fall back to storing the raw URL so nothing is lost.
          await addTextMaterial(content, content, "url");
          toast.error(`网页抓取失败，仅保存链接：${String(err)}`);
        }
      } else {
        await addTextMaterial(
          content.slice(0, 24) || "产品介绍",
          content,
          "text",
        );
        toast.success("已添加");
      }
      setPasteText("");
      setShowPaste(false);
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSaving(false);
    }
  };

  // File types we can currently read the text of; others are stored but not parsed.
  const PARSEABLE = ["txt", "md", "markdown"];

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    try {
      await uploadFile(file);
      toast.success("文件已上传");
    } catch (err) {
      toast.error(String(err));
    }
  };

  return (
    <AppLayout>
      <PageHeader back="/interview" title="Step 2 of 3" />
      <div className="px-6 pt-2">
        <h1 className="text-[26px] font-bold leading-tight tracking-tight">
          上传资料（可选）
        </h1>
        <p className="text-[14px] text-muted-foreground mt-2 leading-relaxed">
          让 AI 更了解你，生成更精准的内容
        </p>
      </div>

      <div className="px-5 mt-7 space-y-3">
        {/* Paste text / URL */}
        <ActionCard
          onClick={() => setShowPaste((v) => !v)}
          iconBg="#EEF3E8"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M10 14L3.5 20.5M14 10l7-7M9 15a6 6 0 1 1 0-8.5M15 9a6 6 0 1 1 0 8.5"
                stroke="#5A7F3D"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          }
          title="粘贴产品介绍 / 网站链接"
          description="让 AI 快速了解你的产品"
        />

        {showPaste && (
          <div className="bg-card rounded-[24px] p-4 shadow-soft border border-divider/60 animate-fade-up">
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={4}
              autoFocus
              placeholder="粘贴一段产品介绍，或一个网站链接..."
              className="w-full bg-transparent text-[14px] leading-relaxed text-foreground outline-none resize-none placeholder:text-muted-foreground"
            />
            <div className="flex items-center justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  setShowPaste(false);
                  setPasteText("");
                }}
                className="px-4 py-2 rounded-pill text-[13px] text-muted-foreground"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSavePaste}
                disabled={saving || !pasteText.trim()}
                className="px-5 py-2 rounded-pill bg-primary text-primary-foreground text-[13px] font-semibold disabled:opacity-50"
              >
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        )}

        {/* Upload file */}
        <ActionCard
          onClick={() => fileInputRef.current?.click()}
          iconBg="#FFF3D2"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"
                stroke="#B0770D"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <path
                d="M14 3v5h5"
                stroke="#B0770D"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
            </svg>
          }
          title={uploading ? "上传中..." : "上传文件"}
          description="TXT / Markdown 直接纳入；PDF / PPT 正文解析开发中"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.ppt,.pptx,.doc,.docx,.txt,.md,.markdown"
          className="hidden"
          onChange={handleFile}
        />

        {/* Uploaded materials list */}
        {materials.length > 0 && (
          <div className="pt-1 space-y-2">
            {materials.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 bg-card rounded-[16px] px-4 py-3 border border-divider/60 animate-fade-up"
              >
                <span className="text-[15px]">
                  {m.type === "file" ? "📄" : m.type === "url" ? "🔗" : "📝"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-medium text-foreground truncate">
                    {m.title || m.content?.slice(0, 30) || "资料"}
                  </div>
                  <div className="text-[11.5px] text-muted-foreground">
                    {m.type === "file"
                      ? PARSEABLE.includes(m.file_type ?? "")
                        ? `${m.file_type?.toUpperCase()} · 已纳入`
                        : `${m.file_type?.toUpperCase()} · 正文解析开发中`
                      : m.type === "url"
                        ? (m.content || "").trim().length > 0 &&
                          m.content !== m.title
                          ? "链接 · 已抓取"
                          : "链接"
                        : "文本 · 已纳入"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void deleteMaterial(m.id)}
                  className="text-muted-foreground/60 shrink-0"
                  aria-label="删除"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M6 6l12 12M18 6L6 18"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Skip / continue */}
        <ActionCard
          onClick={() => navigate({ to: "/dna" })}
          iconBg="#F8F2E6"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 12h12M13 6l6 6-6 6"
                stroke="#6C7B67"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
          title={materials.length > 0 ? "完成，下一步" : "跳过这一步"}
          description="稍后也可以补充"
        />
      </div>

      <div className="mt-auto flex flex-col items-center pb-10 pt-8">
        <GunGunMascot size={72} state="idle" />
        <p className="text-[12.5px] text-muted-foreground mt-2">
          滚滚 会保护你的资料隐私 🌱
        </p>
      </div>
    </AppLayout>
  );
}
