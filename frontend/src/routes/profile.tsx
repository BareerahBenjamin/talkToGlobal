import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { SparkMascot } from "@/components/SparkMascot";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/profile")({
  component: Profile,
  head: () => ({ meta: [{ title: "个人中心 · 远声" }] }),
});

function Profile() {
  const { user, signOut } = useAuth();
  const [stats, setStats] = useState({ drafts: 0, published: 0, streak: 0 });
  const [displayName, setDisplayName] = useState("Founder");

  useEffect(() => {
    if (!user) return;

    // Fetch profile
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.display_name) setDisplayName(data.display_name);
      });

    // Fetch stats
    const fetchStats = async () => {
      const { count: drafts } = await supabase
        .from("contents")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "draft");

      const { count: published } = await supabase
        .from("contents")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "published");

      // Simple streak calculation: count consecutive days with content
      const { data: recentContents } = await supabase
        .from("contents")
        .select("created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30);

      let streak = 0;
      if (recentContents && recentContents.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dates = new Set(
          recentContents.map((c) => {
            const d = new Date(c.created_at);
            d.setHours(0, 0, 0, 0);
            return d.getTime();
          }),
        );

        for (let i = 0; i < 30; i++) {
          const checkDate = new Date(today);
          checkDate.setDate(checkDate.getDate() - i);
          if (dates.has(checkDate.getTime())) {
            streak++;
          } else {
            break;
          }
        }
      }

      setStats({ drafts: drafts ?? 0, published: published ?? 0, streak });
    };

    fetchStats();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/";
  };

  const statsDisplay = [
    { label: "Drafts", value: stats.drafts },
    { label: "Published", value: stats.published },
    { label: "Day streak", value: stats.streak },
  ];

  const rows = [
    { label: "编辑 Founder DNA", to: "/dna" },
    { label: "语音输入设置", to: "/profile" },
    { label: "语言与翻译", to: "/profile" },
    { label: "通知", to: "/profile" },
    { label: "关于远声", to: "/profile" },
  ] as const;

  return (
    <AppLayout showNav>
      <header className="px-6 pt-6 flex items-center justify-between">
        <h1 className="text-[28px] font-semibold tracking-tight">我的</h1>
      </header>

      <section className="px-5 mt-4">
        <div className="bg-card rounded-[24px] p-5 shadow-soft border border-divider/60 flex items-center gap-4">
          <SparkMascot size={72} state="idle" />
          <div className="flex-1 min-w-0">
            <div className="text-[17px] font-semibold">{displayName}</div>
            <div className="text-[12.5px] text-muted-foreground mt-0.5">
              {user?.email || user?.phone || "未登录"}
            </div>
            <div className="text-[11.5px] text-muted-foreground mt-0.5">
              Turning ideas into global voices since{" "}
              {user?.created_at
                ? new Date(user.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })
                : "now"}
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-3">
          {statsDisplay.map((s) => (
            <div
              key={s.label}
              className="bg-card rounded-[20px] py-4 text-center border border-divider/60"
            >
              <div className="text-[22px] font-semibold text-primary">
                {s.value}
              </div>
              <div className="text-[11.5px] text-muted-foreground mt-0.5">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-5 mt-6">
        <div className="bg-card rounded-[24px] border border-divider/60 overflow-hidden">
          {rows.map((r, i) => (
            <Link
              key={r.label}
              to={r.to}
              className={`flex items-center justify-between px-5 py-4 hover:bg-muted/60 transition ${
                i > 0 ? "border-t border-divider" : ""
              }`}
            >
              <span className="text-[14.5px] text-foreground">{r.label}</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                className="text-muted-foreground"
              >
                <path
                  d="M9 6l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          ))}

          {/* Sign out */}
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/60 transition border-t border-divider"
          >
            <span className="text-[14.5px] text-destructive">退出登录</span>
          </button>
        </div>
      </section>

      <div className="px-6 pt-8 text-center text-[11.5px] text-muted-foreground">
        v0.3 · Made with 🌱 by 远声 team
      </div>
    </AppLayout>
  );
}
