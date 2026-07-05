import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { GunGunMascot } from "@/components/GunGunMascot";

export const Route = createFileRoute("/about")({
  component: About,
  head: () => ({ meta: [{ title: "关于我们 · 远声" }] }),
});

const PRINCIPLES = [
  {
    title: "先确认中文，再出英文",
    desc: "永远先给你中文草稿确认意思和语气，再转创作成英文。",
  },
  {
    title: "转译，而非翻译",
    desc: "英文会为海外受众和平台习惯重新表达，而不是逐字直译。",
  },
  {
    title: "Founder DNA 为底座",
    desc: "你的定位、观点、风格是所有内容生成的策略基础。",
  },
  {
    title: "绝不自动发布",
    desc: "所有内容只为你准备好，是否发布由你决定。",
  },
];

function About() {
  return (
    <AppLayout>
      <PageHeader back="/profile" title="关于我们" />

      <div className="px-5 mt-4 pb-14">
        {/* Hero */}
        <div className="flex flex-col items-center text-center pt-2">
          <GunGunMascot size={110} state="idle" />
          <h1 className="text-[24px] font-bold text-foreground mt-4">
            远声 · Talk To Global
          </h1>
          <p className="text-[14px] text-muted-foreground mt-2 leading-relaxed px-4">
            把你的技术想法，变成全球用户所看得懂的表达。
          </p>
        </div>

        {/* Intro */}
        <div className="mt-8 bg-card rounded-[24px] p-5 shadow-soft border border-divider/60">
          <p className="text-[13.5px] text-foreground leading-relaxed">
            远声是一个 AI 创始人 IP 助手，专为中国 AI
            创始人打造。滚滚会采访你、理解你，
            帮你把中文的思考转译成可信、地道的 X / Twitter 与 LinkedIn 内容，
            让世界听见你的声音。
          </p>
        </div>

        {/* Principles */}
        <h2 className="text-[12.5px] font-semibold text-muted-foreground px-1 mt-7 mb-2">
          我们的产品原则
        </h2>
        <div className="space-y-2.5">
          {PRINCIPLES.map((p, i) => (
            <div
              key={i}
              className="bg-card rounded-[20px] p-4 border border-divider/60 flex gap-3"
            >
              <span className="h-6 w-6 shrink-0 rounded-full bg-primary/10 text-primary text-[12px] font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <div>
                <div className="text-[14px] font-medium text-foreground">
                  {p.title}
                </div>
                <div className="text-[12.5px] text-muted-foreground mt-0.5 leading-snug">
                  {p.desc}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center space-y-1">
          <div className="text-[12.5px] text-muted-foreground">版本 v0.3</div>
          <div className="text-[11.5px] text-muted-foreground">
            Made with 🌱 by 远声 team
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
