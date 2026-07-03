import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { ActionCard } from "@/components/ActionCard";
import { SparkMascot } from "@/components/SparkMascot";

export const Route = createFileRoute("/upload")({
  component: Upload,
  head: () => ({ meta: [{ title: "上传资料 · 远声" }] }),
});

function Upload() {
  return (
    <AppLayout>
      <PageHeader back="/interview" title="Step 2 of 3" />
      <div className="px-6 pt-2">
        <h1 className="text-[26px] font-semibold leading-tight">上传资料</h1>
        <p className="text-[14px] text-muted-foreground mt-2 leading-relaxed">
          让 Spark 更懂你的产品,可选一种方式。
        </p>
      </div>

      <div className="px-5 mt-8 space-y-3">
        <ActionCard
          to="/dna"
          iconBg="#EEF3E8"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M10 14L3.5 20.5M14 10l7-7M9 15a6 6 0 1 1 0-8.5M15 9a6 6 0 1 1 0 8.5"
                stroke="#5A7F3D"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          }
          title="粘贴产品介绍 / 网站链接"
          description="从一段文字或一个 URL 开始"
        />
        <ActionCard
          to="/dna"
          iconBg="#FFF3D2"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"
                stroke="#B0770D"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <path
                d="M14 3v5h5"
                stroke="#B0770D"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
            </svg>
          }
          title="上传文件"
          description="支持 PDF、Markdown、TXT"
        />
        <ActionCard
          to="/dna"
          iconBg="#F8F2E6"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 12h12M13 6l6 6-6 6"
                stroke="#6C7B67"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
          title="暂时跳过"
          description="之后随时可以在设置里补充"
        />
      </div>

      <div className="mt-auto flex flex-col items-center pb-10 pt-8">
        <SparkMascot size={72} state="idle" />
        <p className="text-[12.5px] text-muted-foreground mt-2">
          Spark 会保护你的资料隐私 🌱
        </p>
      </div>
    </AppLayout>
  );
}
