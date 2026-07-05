import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { GunGunMascot } from "@/components/GunGunMascot";
import { useAuth } from "@/hooks/useAuth";
import { useDna } from "@/hooks/useDna";
import { useContents } from "@/hooks/useContents";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({ meta: [{ title: "远声" }] }),
});

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "夜深了";
  if (h < 12) return "早上好";
  if (h < 18) return "下午好";
  return "晚上好";
}

const entries = [
  {
    type: "thinking",
    title: "聊聊今天思考",
    desc: "记录灵感、想法或反思",
    bg: "linear-gradient(160deg, #5A7F3D 0%, #6E9548 100%)",
    fg: "#F8FAF5",
    badge: "rgba(255,255,255,0.18)",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <path
          d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7A2.5 2.5 0 0 1 17.5 16H9l-4 3.5V16H6.5"
          stroke="#F8FAF5"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    type: "market_signal",
    title: "回应市场信号",
    desc: "针对新闻 / 趋势发表观点",
    bg: "#FFFFFF",
    fg: "#1E2B1A",
    badge: "#EEF3E8",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <path
          d="M4 15l4-4 3 3 5-6 4 5"
          stroke="#5A7F3D"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    type: "product_progress",
    title: "分享产品进展",
    desc: "更新里程碑、功能或成绩",
    bg: "linear-gradient(160deg, #FFE39A 0%, #F6C453 100%)",
    fg: "#5A4211",
    badge: "rgba(255,255,255,0.5)",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <path
          d="M4 9v6h3l6 4V5L7 9H4Z"
          stroke="#5A4211"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M17 9a4 4 0 0 1 0 6"
          stroke="#5A4211"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

function Home() {
  const { user, signUp, signIn, loading: authLoading } = useAuth();
  const { dna, loading: dnaLoading } = useDna();
  const { contents } = useContents({ status: "draft" });
  const recentDrafts = contents.slice(0, 3);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );

  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = "请输入邮箱";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = "邮箱格式不正确";
    }

    if (!password) {
      newErrors.password = "请输入密码";
    } else if (password.length < 8) {
      newErrors.password = "密码至少 8 位";
    } else if (password.length > 72) {
      newErrors.password = "密码不能超过 72 位";
    } else {
      const hasUpper = /[A-Z]/.test(password);
      const hasLower = /[a-z]/.test(password);
      const hasDigit = /[0-9]/.test(password);
      if ([hasUpper, hasLower, hasDigit].filter(Boolean).length < 2) {
        newErrors.password = "需包含大写字母、小写字母、数字中的至少两种";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setErrors({});
    try {
      const { error } = isSignUp
        ? await signUp(email.trim(), password)
        : await signIn(email.trim(), password);
      if (error) throw error;
      toast.success(isSignUp ? "注册成功" : "登录成功");
    } catch (err) {
      const msg = String(err);
      if (msg.includes("Invalid login credentials")) {
        setErrors({ password: "邮箱或密码错误" });
      } else if (msg.includes("User already registered")) {
        setErrors({ email: "该邮箱已注册，请直接登录" });
      } else if (msg.includes("Password should be at least")) {
        setErrors({ password: "密码至少 8 位" });
      } else {
        toast.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Auth still resolving (e.g. restoring a session on a new device) — show a
  // neutral loading state rather than flashing the login or onboarding screens.
  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <GunGunMascot size={96} state="idle" />
        </div>
      </AppLayout>
    );
  }

  // Not logged in → branded welcome + login/register
  if (!user) {
    return (
      <AppLayout>
        <div className="flex-1 flex flex-col items-center justify-center px-8 pt-10">
          {/* Logo mark */}
          <img
            src="/favicon.png"
            alt="Talk To Global"
            className="h-[84px] w-[84px] rounded-[24px] shadow-[0_14px_32px_rgba(90,127,61,0.32)]"
          />
          <h1 className="text-[26px] font-bold text-foreground mt-6 tracking-tight">
            Talk To Global
          </h1>
          <p className="text-[14px] text-muted-foreground mt-3 text-center leading-relaxed">
            把你的技术想法
            <br />
            变成全球用户所看得懂的表达
          </p>
        </div>

        <div className="px-6 pb-10 space-y-3">
          {!authOpen ? (
            <>
              <button
                type="button"
                onClick={() => {
                  toast("手机登录即将开放，请先用邮箱登录", { icon: "🌱" });
                  setAuthOpen(true);
                }}
                className="block w-full text-center bg-primary text-primary-foreground rounded-pill py-4 text-[15px] font-semibold shadow-[0_10px_24px_rgba(90,127,61,0.28)] active:scale-[0.98] transition"
              >
                手机号登录 / 注册
              </button>
              <button
                type="button"
                onClick={() => setAuthOpen(true)}
                className="block w-full text-center bg-card text-foreground border border-divider rounded-pill py-4 text-[15px] font-semibold active:scale-[0.98] transition"
              >
                使用邮箱登录
              </button>
            </>
          ) : (
            <>
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email)
                      setErrors((p) => ({ ...p, email: undefined }));
                  }}
                  placeholder="邮箱"
                  className={`w-full bg-card rounded-[18px] px-4 py-3.5 border text-[14px] outline-none transition ${
                    errors.email
                      ? "border-destructive"
                      : "border-divider focus:border-primary/40"
                  }`}
                  autoFocus
                />
                {errors.email && (
                  <p className="text-[12px] text-destructive mt-1 ml-1">
                    {errors.email}
                  </p>
                )}
              </div>
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password)
                      setErrors((p) => ({ ...p, password: undefined }));
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  placeholder="密码"
                  className={`w-full bg-card rounded-[18px] px-4 py-3.5 border text-[14px] outline-none transition ${
                    errors.password
                      ? "border-destructive"
                      : "border-divider focus:border-primary/40"
                  }`}
                />
                {errors.password && (
                  <p className="text-[12px] text-destructive mt-1 ml-1">
                    {errors.password}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !email.trim() || !password.trim()}
                className="block w-full text-center bg-primary text-primary-foreground rounded-pill py-4 text-[15px] font-semibold shadow-[0_10px_24px_rgba(90,127,61,0.28)] active:scale-[0.98] transition disabled:opacity-50"
              >
                {submitting ? "处理中..." : isSignUp ? "注册" : "登录"}
              </button>
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="block w-full text-center text-[13px] text-muted-foreground"
              >
                {isSignUp ? "已有账号？去登录" : "没有账号？去注册"}
              </button>
            </>
          )}
        </div>
      </AppLayout>
    );
  }

  // Logged in, DNA still loading → neutral loading (avoid onboarding flash)
  if (dnaLoading) {
    return (
      <AppLayout>
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <GunGunMascot size={96} state="thinking" />
        </div>
      </AppLayout>
    );
  }

  // Logged in but no DNA → redirect to interview
  if (!dnaLoading && !dna) {
    return (
      <AppLayout>
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <GunGunMascot size={120} state="idle" />
          <h1 className="text-[22px] font-semibold text-foreground mt-6 text-center">
            欢迎来到远声
          </h1>
          <p className="text-[14px] text-muted-foreground mt-2 text-center">
            先做一个简短的采访，帮你建立 Founder DNA
          </p>
        </div>
        <div className="px-6 pb-10">
          <Link
            to="/interview"
            search={{ type: "interview" }}
            className="block w-full text-center bg-primary text-primary-foreground rounded-pill py-4 text-[15px] font-semibold shadow-[0_10px_24px_rgba(90,127,61,0.28)] active:scale-[0.98] transition"
          >
            开始采访
          </Link>
        </div>
      </AppLayout>
    );
  }

  // Daily mode — logged in with DNA
  return (
    <AppLayout showNav>
      <header className="px-6 pt-6 flex items-start justify-between">
        <div>
          <div className="text-[13px] text-muted-foreground">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </div>
          <h1 className="text-[30px] font-bold tracking-tight mt-1">
            今天想聊什么?
          </h1>
          <p className="text-[14px] text-muted-foreground mt-1.5">
            {greeting()}，选一个场景开启表达
          </p>
        </div>
        <div className="pt-1">
          <GunGunMascot size={64} state="idle" />
        </div>
      </header>

      <section className="px-5 mt-7 space-y-3.5">
        {entries.map((e) => {
          const linkProps =
            e.type === "market_signal"
              ? ({ to: "/trending" } as const)
              : ({ to: "/interview", search: { type: e.type } } as const);
          return (
            <Link
              key={e.title}
              {...linkProps}
              className="block rounded-[26px] border border-divider/50 shadow-soft p-5 active:scale-[0.99] transition"
              style={{ background: e.bg, color: e.fg }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-[19px] font-bold leading-tight">
                    {e.title}
                  </h3>
                  <p
                    className="text-[13.5px] mt-1.5 leading-snug"
                    style={{ color: e.fg, opacity: 0.78 }}
                  >
                    {e.desc}
                  </p>
                </div>
                <div
                  className="h-12 w-12 rounded-[16px] flex items-center justify-center shrink-0"
                  style={{ background: e.badge }}
                >
                  {e.icon}
                </div>
              </div>
            </Link>
          );
        })}
      </section>

      <section className="px-6 mt-8">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-[13px] font-semibold text-foreground">
            最近记录
          </h4>
          <Link
            to="/library"
            className="text-[12.5px] text-primary font-medium"
          >
            查看全部
          </Link>
        </div>

        {recentDrafts.length > 0 ? (
          <div className="space-y-2">
            {recentDrafts.map((draft) => {
              const text =
                draft.edited_zh_text ||
                draft.zh_versions?.[0]?.text ||
                draft.source_input ||
                "";
              return (
                <div
                  key={draft.id}
                  className="bg-card rounded-[20px] p-4 border border-divider/60 flex items-center gap-3"
                >
                  <div className="h-10 w-10 rounded-[14px] bg-cream flex items-center justify-center">
                    <GunGunMascot size={28} state="idle" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-medium truncate">
                      {text.slice(0, 40)}
                    </div>
                    <div className="text-[11.5px] text-muted-foreground mt-0.5">
                      {formatDate(draft.created_at)} · 草稿
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-card rounded-[20px] p-4 border border-divider/60 text-center">
            <p className="text-[13px] text-muted-foreground">
              还没有草稿，点击上方入口开始创作
            </p>
          </div>
        )}
      </section>
    </AppLayout>
  );
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "今天";
  if (diffDays === 1) return "昨天";
  return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}
