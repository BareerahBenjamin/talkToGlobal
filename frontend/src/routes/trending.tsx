import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { getHotSignals, type HotSignal } from "@/lib/api";

export const Route = createFileRoute("/trending")({
  component: Trending,
  head: () => ({ meta: [{ title: "热点资讯 · 远声" }] }),
});

const RULE_TYPE_LABELS: Record<string, string> = {
  content_structure: "内容架构",
  opening: "开口方式",
  evidence: "证据互动",
};

function Trending() {
  const [signals, setSignals] = useState<HotSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const { signals } = await getHotSignals();
        setSignals(signals);
      } catch (err) {
        console.error("Failed to fetch hot signals:", err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const filtered =
    filter === "all" ? signals : signals.filter((s) => s.rule_type === filter);

  return (
    <AppLayout showNav>
      <header className="px-6 pt-6">
        <h1 className="text-[28px] font-semibold tracking-tight">热点资讯</h1>
        <p className="text-[14px] text-muted-foreground mt-1">
          顶尖 Founder 发声规则
        </p>
      </header>

      <div className="px-6 mt-4 flex gap-2 overflow-x-auto">
        {["all", "content_structure", "opening", "evidence"].map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-medium transition whitespace-nowrap ${
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground border border-divider"
            }`}
          >
            {f === "all" ? "全部" : RULE_TYPE_LABELS[f] || f}
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
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10.5px] font-semibold tracking-[0.1em] uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {RULE_TYPE_LABELS[s.rule_type] || s.rule_type}
                </span>
                {s.source_account && (
                  <span className="text-[11px] text-muted-foreground">
                    {s.source_account}
                  </span>
                )}
              </div>
              <h3 className="text-[15px] font-semibold text-foreground leading-tight">
                {s.title}
              </h3>
              <p className="text-[13.5px] text-muted-foreground mt-1.5 leading-relaxed">
                {s.template}
              </p>
              {s.example && (
                <div className="mt-3 p-3 bg-muted/50 rounded-[14px]">
                  <p className="text-[12.5px] text-foreground leading-relaxed italic">
                    {s.example}
                  </p>
                </div>
              )}
              {s.description && (
                <p className="text-[12px] text-muted-foreground mt-2">
                  {s.description}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </AppLayout>
  );
}
