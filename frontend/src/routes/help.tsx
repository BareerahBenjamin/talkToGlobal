import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/help")({
  component: Help,
  head: () => ({ meta: [{ title: "帮助中心 · 远声" }] }),
});

const FAQS = [
  {
    q: "远声是做什么的？",
    a: "远声帮中国 AI 创始人把中文的技术思考，转译成海外用户看得懂、且有可信度的 X / Twitter、LinkedIn 内容。核心是采访你 → 提炼 Founder DNA → 把中文思路转创作成地道英文表达。",
  },
  {
    q: "为什么先做采访，而不是直接写？",
    a: "好的表达来自真实的你。滚滚会先用几个问题采访你，理解你的定位、观点和风格，生成 Founder DNA 作为之后所有内容的策略底座，避免千篇一律的 AI 味。",
  },
  {
    q: "Founder DNA 是什么？可以改吗？",
    a: "Founder DNA 是你的创作者名片：创始人定位、表达风格、核心观点、目标受众、产品叙事等。它由采访和你上传的资料提炼而来，每一项都可以点击编辑，也可以随时重新生成。",
  },
  {
    q: "上传的资料会被怎么使用？",
    a: "粘贴的文字、txt / Markdown 文件、以及网页链接的正文会被纳入 DNA 的提炼；PDF / PPT 的正文解析还在开发中，目前上传后会如实标注。所有资料仅用于帮你生成内容。",
  },
  {
    q: "为什么要先确认中文，再出英文？",
    a: "转译不是翻译。我们会先给你几版不同气质的中文草稿，让你确认「意思和语气」对了，再据此转创作成符合平台习惯的英文，确保英文既地道又是你想表达的。",
  },
  {
    q: "内容会自动发布吗？",
    a: "不会。所有内容都只为你准备好，供你复制或一键跳转到 X 发布，你始终拥有最终决定权。",
  },
];

function Help() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <AppLayout>
      <PageHeader back="/profile" title="帮助中心" />

      <div className="px-5 mt-4 pb-12">
        <p className="text-[13.5px] text-muted-foreground px-1 mb-4 leading-relaxed">
          常见问题，帮你更快上手远声。
        </p>

        <div className="space-y-2.5">
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            return (
              <div
                key={i}
                className="bg-card rounded-[20px] border border-divider/60 shadow-soft overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
                >
                  <span className="text-[14.5px] font-medium text-foreground">
                    {item.q}
                  </span>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    className={`text-muted-foreground shrink-0 transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  >
                    <path
                      d="M6 9l6 6 6-6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 -mt-1">
                    <p className="text-[13.5px] text-muted-foreground leading-relaxed">
                      {item.a}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Contact */}
        <div className="mt-6 bg-cream rounded-[20px] p-5 text-center">
          <p className="text-[13.5px] text-foreground font-medium">
            还没解决你的问题？
          </p>
          <p className="text-[12.5px] text-muted-foreground mt-1">
            联系我们：support@talktoglobal.app
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
