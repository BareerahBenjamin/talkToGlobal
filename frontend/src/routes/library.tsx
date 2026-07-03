import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { SparkMascot } from "@/components/SparkMascot";
import { useContents, type Content } from "@/hooks/useContents";

export const Route = createFileRoute("/library")({
  component: Library,
  head: () => ({ meta: [{ title: "内容库 · 远声" }] }),
});

function Library() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"All" | "Draft" | "Published">("All");

  const { contents, loading } = useContents({
    status: filter === "All" ? undefined : filter,
    q: q || undefined,
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0)
      return (
        "今天 · " +
        date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
      );
    if (diffDays === 1) return "昨天";
    if (diffDays < 7) return `${diffDays} 天前`;
    return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
  };

  const getPreview = (content: Content) => {
    if (content.edited_zh_text) return content.edited_zh_text.slice(0, 100);
    if (content.zh_versions && content.zh_versions.length > 0) {
      return content.zh_versions[0].text.slice(0, 100);
    }
    return content.source_input?.slice(0, 100) ?? "";
  };

  const getTitle = (content: Content) => {
    const text =
      content.edited_zh_text ||
      content.zh_versions?.[0]?.text ||
      content.source_input ||
      "";
    return text.slice(0, 40) || "未命名内容";
  };

  const sourceLabel = (type: string | null) => {
    switch (type) {
      case "thinking":
        return "💬 今日思考";
      case "market_signal":
        return "🔥 市场信号";
      case "product_update":
        return "🚀 产品进展";
      default:
        return "💬 内容";
    }
  };

  return (
    <AppLayout showNav>
      <header className="px-6 pt-6 flex items-center justify-between">
        <h1 className="text-[28px] font-semibold tracking-tight">内容库</h1>
        <button
          type="button"
          className="h-10 w-10 rounded-full bg-card border border-divider flex items-center justify-center text-muted-foreground"
          aria-label="搜索"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle
              cx="11"
              cy="11"
              r="7"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            <path
              d="m20 20-3.5-3.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </header>

      <div className="px-6 mt-4">
        <div className="flex items-center gap-2 bg-card rounded-[18px] border border-divider px-4 py-2.5">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            className="text-muted-foreground"
          >
            <circle
              cx="11"
              cy="11"
              r="7"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            <path
              d="m20 20-3.5-3.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索笔记标题或内容"
            className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="px-6 mt-4 flex gap-2">
        {(["All", "Draft", "Published"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-medium transition ${
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground border border-divider"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="px-5 mt-5 space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-card rounded-[20px] p-4 border border-divider/60 animate-pulse"
            >
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted rounded w-full mb-1" />
              <div className="h-3 bg-muted rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : contents.length === 0 ? (
        <div className="flex flex-col items-center text-center px-6 py-14">
          <SparkMascot size={100} state="empty" />
          <p className="text-[14px] text-muted-foreground mt-4">
            {q ? "没有找到匹配的内容" : "这里还没有内容，Spark 会一直等你。"}
          </p>
        </div>
      ) : (
        <ul className="px-5 mt-5 space-y-3">
          {contents.map((n, i) => (
            <li
              key={n.id}
              className="bg-card rounded-[20px] p-4 border border-divider/60 shadow-soft animate-fade-up"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-[15.5px] font-semibold text-foreground leading-tight flex-1">
                  {getTitle(n)}
                </h3>
                <StatusPill status={n.status} />
              </div>
              <p className="text-[13px] text-muted-foreground leading-snug mt-1.5 line-clamp-2">
                {getPreview(n)}
              </p>
              <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground mt-2">
                <span>{sourceLabel(n.source_type)}</span>
                <span>·</span>
                <span>{formatDate(n.created_at)}</span>
              </div>
              {n.dna_tags && n.dna_tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {n.dna_tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10.5px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </AppLayout>
  );
}

function StatusPill({ status }: { status: string }) {
  const isPub = status === "published";
  return (
    <span
      className="text-[10.5px] font-semibold tracking-[0.1em] uppercase px-2 py-0.5 rounded-full"
      style={{
        color: isPub ? "#5A7F3D" : "#B0770D",
        background: isPub ? "#EEF3E8" : "#FFF3D2",
      }}
    >
      {isPub ? "Published" : "Draft"}
    </span>
  );
}
