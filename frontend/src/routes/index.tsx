import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { SparkMascot } from "@/components/SparkMascot";
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
    desc: "把脑子里散乱的想法说出来",
    tag: "TODAY",
    bg: "linear-gradient(160deg, #5A7F3D 0%, #6E9548 100%)",
    fg: "#F8FAF5",
    illo: (
      <svg width="80" height="80" viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="30" fill="#FFD76A" opacity="0.9" />
        <circle cx="42" cy="46" r="2.5" fill="#1E2B1A" />
        <circle cx="58" cy="46" r="2.5" fill="#1E2B1A" />
        <path
          d="M42 58 Q50 66 58 58"
          stroke="#1E2B1A"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    ),
  },
  {
    type: "market_signal",
    title: "回应市场信号",
    desc: "把一条新闻或推文转成你的观点",
    tag: "TRENDING",
    bg: "#FFFFFF",
    fg: "#1E2B1A",
    illo: (
      <svg width="72" height="72" viewBox="0 0 100 100" fill="none">
        <rect x="18" y="26" width="64" height="48" rx="10" fill="#F8F2E6" />
        <path
          d="M28 42h44M28 52h30M28 62h20"
          stroke="#B0770D"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    type: "product_progress",
    title: "分享产品进展",
    desc: "把 changelog 变成一段温度感的英文",
    tag: "SHIP",
    bg: "#FFFFFF",
    fg: "#1E2B1A",
    illo: (
      <svg width="72" height="72" viewBox="0 0 100 100" fill="none">
        <path
          d="M30 70l40-40M40 30h30v30"
          stroke="#5A7F3D"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx="50"
          cy="50"
          r="26"
          stroke="#87B55A"
          strokeWidth="2"
          strokeDasharray="3 5"
        />
      </svg>
    ),
  },
];

function Home() {
  const { user, signUp, signIn } = useAuth();
  const { dna, loading: dnaLoading } = useDna();
  const { contents } = useContents({ status: "draft" });
  const recentDrafts = contents.slice(0, 3);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
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

  // Not logged in → show login/register
  if (!user) {
    return (
      <AppLayout>
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <SparkMascot size={120} state="idle" />
          <h1 className="text-[22px] font-semibold text-foreground mt-6 text-center">
            远声
          </h1>
          <p className="text-[14px] text-muted-foreground mt-2 text-center">
            {isSignUp ? "创建账号开始使用" : "登录继续使用"}
          </p>
        </div>
        <div className="px-6 pb-10 space-y-3">
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
        </div>
      </AppLayout>
    );
  }

  // Logged in but no DNA → redirect to interview
  if (!dnaLoading && !dna) {
    return (
      <AppLayout>
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <SparkMascot size={120} state="idle" />
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
          <h1 className="text-[32px] font-semibold tracking-tight mt-1">
            {greeting()}
          </h1>
          <p className="text-[14px] text-muted-foreground mt-1">
            今天想聊点什么?
          </p>
        </div>
        <div className="pt-1">
          <SparkMascot size={64} state="idle" />
        </div>
      </header>

      <section className="px-5 mt-8 space-y-4">
        {entries.map((e, i) => (
          <Link
            key={e.title}
            to="/interview"
            search={{ type: e.type }}
            className={`block rounded-[28px] border border-divider/60 shadow-soft p-5 active:scale-[0.99] transition ${
              i === 0 ? "min-h-[170px]" : ""
            }`}
            style={{ background: e.bg, color: e.fg }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <span
                  className="inline-block text-[10.5px] font-semibold tracking-[0.14em] px-2.5 py-1 rounded-full"
                  style={{
                    background: i === 0 ? "rgba(255,255,255,0.16)" : "#EEF3E8",
                    color: i === 0 ? "#F8FAF5" : "#5A7F3D",
                  }}
                >
                  {e.tag}
                </span>
                <h3 className="text-[19px] font-semibold mt-3 leading-tight">
                  {e.title}
                </h3>
                <p
                  className="text-[13.5px] mt-1.5 leading-snug"
                  style={{
                    color: i === 0 ? "rgba(248,250,245,0.85)" : "#6C7B67",
                  }}
                >
                  {e.desc}
                </p>
              </div>
              <div className="shrink-0">{e.illo}</div>
            </div>
          </Link>
        ))}
      </section>

      <section className="px-6 mt-8">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-[13px] font-semibold text-foreground">
            最近的草稿
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
                    <SparkMascot size={28} state="idle" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-medium truncate">
                      {text.slice(0, 40)}
                    </div>
                    <div className="text-[11.5px] text-muted-foreground mt-0.5">
                      {formatDate(draft.created_at)} · Draft
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
