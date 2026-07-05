import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { getHotPosts, type HotPost } from "@/lib/api";

export const Route = createFileRoute("/trending")({
  component: Trending,
  head: () => ({ meta: [{ title: "热点资讯 · 远声" }] }),
});

// Compact number: 150179 -> 150k, 786 -> 786
const compact = (n: number | null): string => {
  if (n == null) return "0";
  if (n >= 1000) return `${Math.round(n / 100) / 10}k`.replace(".0k", "k");
  return String(n);
};

// "Tue May 19 15:05:42 +0000 2026" -> "2026-05-19"
const fmtDate = (raw: string | null): string => {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

function Trending() {
  const [signals, setSignals] = useState<HotPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const { posts } = await getHotPosts();
        setSignals(posts);
      } catch (err) {
        console.error("Failed to fetch hot posts:", err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  // Distinct accounts for the filter chips, in first-seen order.
  const accounts = useMemo(() => {
    const seen: string[] = [];
    for (const s of signals) {
      if (s.source_account && !seen.includes(s.source_account)) {
        seen.push(s.source_account);
      }
    }
    return seen;
  }, [signals]);

  const filtered =
    filter === "all"
      ? signals
      : signals.filter((s) => s.source_account === filter);

  return (
    <AppLayout showNav>
      <header className="px-6 pt-6">
        <h1 className="text-[28px] font-semibold tracking-tight">热点资讯</h1>
        <p className="text-[14px] text-muted-foreground mt-1">
          顶尖 Founder 近期高互动推文
        </p>
      </header>

      <div className="px-6 mt-4 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {["all", ...accounts].map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`shrink-0 whitespace-nowrap px-3.5 py-1.5 rounded-full text-[12.5px] font-medium transition ${
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground border border-divider"
            }`}
          >
            {f === "all" ? "全部" : f}
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
              <div className="h-4 bg-muted rounded w-1/2 mb-2" />
              <div className="h-3 bg-muted rounded w-full mb-1" />
              <div className="h-3 bg-muted rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <p className="text-[14px] text-muted-foreground">暂无热点数据</p>
        </div>
      ) : (
        <ul className="px-5 mt-5 space-y-3 pb-32">
          {filtered.map((s, i) => (
            <li
              key={s.id}
              className="bg-card rounded-[20px] p-5 border border-divider/60 shadow-soft animate-fade-up"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              {/* Author row */}
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[14.5px] font-semibold text-foreground truncate">
                    {s.author_name || s.source_account}
                  </div>
                  <div className="text-[11.5px] text-muted-foreground">
                    {s.source_account}
                    {s.posted_at ? ` · ${fmtDate(s.posted_at)}` : ""}
                  </div>
                </div>
              </div>

              {/* Post content */}
              {s.content && (
                <p className="text-[14px] text-foreground mt-3 leading-relaxed whitespace-pre-line">
                  {s.content}
                </p>
              )}

              {/* Engagement */}
              <div className="mt-3 flex items-center gap-4 text-[12px] text-muted-foreground">
                <span>👍 {compact(s.likes)}</span>
                <span>🔁 {compact(s.retweets)}</span>
                <span>💬 {compact(s.replies)}</span>
                {s.views && <span>👀 {s.views}</span>}
              </div>

              <div className="mt-4 pt-3 border-t border-divider flex items-center justify-between">
                {s.url ? (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[12.5px] text-muted-foreground font-medium"
                  >
                    查看原帖 ↗
                  </a>
                ) : (
                  <span />
                )}
                <Link
                  to="/interview"
                  search={{ type: "market_signal", signal_id: s.id }}
                  className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-primary"
                >
                  用这个角度创作
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5 12h14M13 6l6 6-6 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppLayout>
  );
}
