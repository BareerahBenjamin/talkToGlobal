import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/settings")({
  component: Settings,
  head: () => ({ meta: [{ title: "账号设置 · 远声" }] }),
});

function Settings() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.display_name) setDisplayName(data.display_name);
      });
  }, [user]);

  const handleSaveName = async () => {
    if (!user) return;
    const name = displayName.trim();
    if (!name) {
      toast.error("昵称不能为空");
      return;
    }
    setSavingName(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: name, updated_at: new Date().toISOString() })
        .eq("id", user.id);
      if (error) throw error;
      toast.success("昵称已更新");
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async () => {
    if (password.length < 8) {
      toast.error("密码至少 8 位");
      return;
    }
    if (password !== password2) {
      toast.error("两次输入的密码不一致");
      return;
    }
    setSavingPwd(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("密码已修改");
      setPassword("");
      setPassword2("");
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSavingPwd(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader back="/profile" title="账号设置" />

      <div className="px-5 mt-4 space-y-6 pb-12">
        {/* Profile */}
        <section>
          <h2 className="text-[12.5px] font-semibold text-muted-foreground px-1 mb-2">
            个人资料
          </h2>
          <div className="bg-card rounded-[24px] p-5 shadow-soft border border-divider/60 space-y-4">
            <div>
              <label className="text-[12.5px] text-muted-foreground">
                昵称
              </label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="你的昵称"
                className="mt-1.5 w-full bg-muted rounded-[14px] px-4 py-3 text-[14px] outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>
            <div>
              <label className="text-[12.5px] text-muted-foreground">
                邮箱
              </label>
              <div className="mt-1.5 w-full bg-muted/50 rounded-[14px] px-4 py-3 text-[14px] text-muted-foreground">
                {user?.email || "—"}
              </div>
            </div>
            <button
              type="button"
              onClick={handleSaveName}
              disabled={savingName}
              className="w-full bg-primary text-primary-foreground rounded-pill py-3 text-[14px] font-semibold active:scale-[0.98] transition disabled:opacity-50"
            >
              {savingName ? "保存中..." : "保存"}
            </button>
          </div>
        </section>

        {/* Password */}
        <section>
          <h2 className="text-[12.5px] font-semibold text-muted-foreground px-1 mb-2">
            修改密码
          </h2>
          <div className="bg-card rounded-[24px] p-5 shadow-soft border border-divider/60 space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="新密码（至少 8 位）"
              className="w-full bg-muted rounded-[14px] px-4 py-3 text-[14px] outline-none focus:ring-1 focus:ring-primary/40"
            />
            <input
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              placeholder="确认新密码"
              className="w-full bg-muted rounded-[14px] px-4 py-3 text-[14px] outline-none focus:ring-1 focus:ring-primary/40"
            />
            <button
              type="button"
              onClick={handleChangePassword}
              disabled={savingPwd || !password || !password2}
              className="w-full bg-primary text-primary-foreground rounded-pill py-3 text-[14px] font-semibold active:scale-[0.98] transition disabled:opacity-50"
            >
              {savingPwd ? "修改中..." : "修改密码"}
            </button>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
