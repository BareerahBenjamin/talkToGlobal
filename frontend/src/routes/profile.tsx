import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { GunGunMascot } from "@/components/GunGunMascot";
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
  const [role, setRole] = useState("");
  const [title, setTitle] = useState("");
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [titleDraft, setTitleDraft] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;

    // Fetch profile
    supabase
      .from("profiles")
      .select("display_name, avatar_url, title")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.display_name) setDisplayName(data.display_name);
        if (data?.avatar_url) setAvatarUrl(data.avatar_url);
        if (data?.title) setTitle(data.title);
      });

    // Derive the role/title from the founder's DNA position (first clause), so
    // it reflects the actual person instead of a hardcoded default.
    supabase
      .from("founder_dna")
      .select("position")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        const pos = (data?.position || "").trim();
        if (pos) {
          const firstClause = pos.split(/[，,。.！!；;\n]/)[0].trim();
          setRole(firstClause.slice(0, 24));
        }
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

  const openEdit = () => {
    setNameDraft(displayName === "Founder" ? "" : displayName);
    setTitleDraft(title);
    setEditing(true);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const nextName = nameDraft.trim();
    const nextTitle = titleDraft.trim();
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: nextName || null,
        title: nextTitle || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    setSavingProfile(false);
    if (error) {
      toast.error("保存失败");
      return;
    }
    setDisplayName(nextName || "Founder");
    setTitle(nextTitle);
    setEditing(false);
    toast.success("已保存");
  };

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/";
  };

  const handleAvatarChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("请选择图片文件");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("图片不能超过 5MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);
      // Cache-bust so the <img> refreshes after an overwrite.
      const url = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: url, updated_at: new Date().toISOString() })
        .eq("id", user.id);
      if (updateError) throw updateError;

      setAvatarUrl(url);
      toast.success("头像已更新");
    } catch (err) {
      toast.error(String(err));
    } finally {
      setUploading(false);
    }
  };

  const statsDisplay = [
    { label: "草稿", value: stats.drafts },
    { label: "已发布", value: stats.published },
    { label: "连续天数", value: stats.streak },
  ];

  const rows = [
    {
      label: "我的资料",
      to: "/dna",
      search: { from: "profile" },
      icon: (
        <path
          d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM5 20c1.2-3 3.9-4.5 7-4.5s5.8 1.5 7 4.5"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      ),
    },
    {
      label: "账号设置",
      to: "/settings",
      icon: (
        <>
          <circle
            cx="12"
            cy="12"
            r="3"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <path
            d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </>
      ),
    },
    {
      label: "订阅与套餐",
      to: "/profile",
      badge: "Pro 版",
      icon: (
        <path
          d="M5 8l3.5 3L12 6l3.5 5L19 8l-1.5 9h-11L5 8Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      ),
    },
    {
      label: "帮助中心",
      to: "/help",
      icon: (
        <>
          <circle
            cx="12"
            cy="12"
            r="9"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <path
            d="M9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.8-.9 1.4v.3"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <circle cx="12" cy="16.5" r="0.6" fill="currentColor" />
        </>
      ),
    },
    {
      label: "关于我们",
      to: "/about",
      icon: (
        <>
          <circle
            cx="12"
            cy="12"
            r="9"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <path
            d="M12 11v5M12 8v.02"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </>
      ),
    },
  ] as const;

  return (
    <AppLayout showNav>
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => !savingProfile && setEditing(false)}
        >
          <div
            className="w-full max-w-[430px] bg-card rounded-t-[28px] p-6 pb-8 animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[16px] font-bold text-foreground">编辑资料</div>
            <label className="block text-[12.5px] text-muted-foreground mt-5 mb-1.5">
              昵称
            </label>
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="你的昵称"
              maxLength={30}
              className="w-full bg-cream rounded-[16px] px-4 py-3 text-[15px] outline-none border border-transparent focus:border-primary/40 transition"
              autoFocus
            />
            <label className="block text-[12.5px] text-muted-foreground mt-4 mb-1.5">
              头衔 / 角色
            </label>
            <input
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              placeholder={role || "如：AI 开发工具创始人"}
              maxLength={30}
              className="w-full bg-cream rounded-[16px] px-4 py-3 text-[15px] outline-none border border-transparent focus:border-primary/40 transition"
            />
            <p className="text-[11.5px] text-muted-foreground mt-1.5">
              留空则显示你的 Founder DNA 定位
            </p>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setEditing(false)}
                disabled={savingProfile}
                className="flex-1 text-center bg-muted text-foreground rounded-pill py-3 text-[14px] font-medium active:scale-[0.98] transition disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="flex-1 text-center bg-primary text-primary-foreground rounded-pill py-3 text-[14px] font-semibold active:scale-[0.98] transition disabled:opacity-50"
              >
                {savingProfile ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Green banner header */}
      <div className="relative">
        <div
          className="h-[176px] w-full"
          style={{
            background: "linear-gradient(160deg, #5A7F3D 0%, #6E9548 100%)",
          }}
        />
        <div className="absolute inset-x-0 top-9 flex flex-col items-center">
          <button
            type="button"
            onClick={() => !uploading && fileInputRef.current?.click()}
            className="relative h-[76px] w-[76px] rounded-full bg-card p-1 shadow-[0_10px_24px_rgba(30,43,26,0.18)] active:scale-[0.97] transition"
            aria-label="更换头像"
          >
            <div className="h-full w-full rounded-full bg-cream flex items-center justify-center overflow-hidden">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="h-full w-full object-cover"
                  draggable={false}
                />
              ) : (
                <GunGunMascot size={56} state="idle" showHands={false} />
              )}
            </div>
            {/* Camera badge */}
            <span className="absolute bottom-0 right-0 h-6 w-6 rounded-full bg-primary flex items-center justify-center border-2 border-card">
              {uploading ? (
                <span className="h-3 w-3 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M4 8h3l1.5-2h7L17 8h3v11H4V8Z"
                    stroke="#fff"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                  <circle cx="12" cy="13" r="3" stroke="#fff" strokeWidth="1.8" />
                </svg>
              )}
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={openEdit}
            className="mt-2.5 flex flex-col items-center active:opacity-80 transition"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-[18px] font-bold text-primary-foreground">
                {displayName}
              </span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                  className="text-primary-foreground/70"
                />
              </svg>
            </div>
            <div className="text-[12.5px] text-primary-foreground/80 mt-0.5">
              {title || role || "远声用户"}
            </div>
          </button>
        </div>
      </div>

      {/* Stats */}
      <section className="px-5 -mt-3">
        <div className="grid grid-cols-3 gap-3">
          {statsDisplay.map((s) => (
            <div
              key={s.label}
              className="bg-card rounded-[20px] py-4 text-center border border-divider/60 shadow-soft"
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

      {/* Menu */}
      <section className="px-5 mt-5">
        <div className="bg-card rounded-[24px] border border-divider/60 overflow-hidden">
          {rows.map((r, i) => (
            <Link
              key={r.label}
              to={r.to}
              search={"search" in r ? r.search : undefined}
              className={`flex items-center gap-3 px-5 py-4 hover:bg-muted/60 transition ${
                i > 0 ? "border-t border-divider" : ""
              }`}
            >
              <span className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-primary shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  {r.icon}
                </svg>
              </span>
              <span className="flex-1 text-[14.5px] text-foreground">
                {r.label}
              </span>
              {"badge" in r && r.badge && (
                <span className="text-[11px] font-semibold text-accent bg-[#FFF3D2] px-2 py-0.5 rounded-full">
                  {r.badge}
                </span>
              )}
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                className="text-muted-foreground shrink-0"
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
            className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/60 transition border-t border-divider"
          >
            <span className="h-9 w-9 rounded-full bg-[#FBEAEA] flex items-center justify-center text-destructive shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M15 12H4m0 0 3.5-3.5M4 12l3.5 3.5M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="flex-1 text-left text-[14.5px] text-destructive">
              退出登录
            </span>
          </button>
        </div>
      </section>

      <div className="px-6 pt-6 text-center text-[11.5px] text-muted-foreground">
        v0.3 · Made with 🌱 by 远声 team
      </div>
    </AppLayout>
  );
}
