-- 远声 / Talk To Global — Hot Signals + Question Bank Update
-- Source: material/interviewQuestions.md, material/twitter-hotpots-analysis.md

-- ============================================================
-- question_bank — 新增 purpose 字段（MVP 问题的目的说明）
-- ============================================================
alter table public.question_bank add column if not exists purpose text;

-- 更新 category 约束，新增 'interview' 类型（MVP 采访专用）
alter table public.question_bank drop constraint if exists question_bank_category_check;
alter table public.question_bank add constraint question_bank_category_check
  check (category in ('thinking', 'market_signal', 'product_update', 'interview'));

-- ============================================================
-- hot_signals — Twitter 热点模版库
-- 从 material/twitter-hotpots-analysis.md 提炼的 10 条 Founder 发声规则
-- ============================================================
create table public.hot_signals (
  id uuid primary key default gen_random_uuid(),
  title text not null,                    -- 规则名称（如 "框架感发声"）
  source_account text,                    -- 来源帐号（如 "@karpathy"）
  rule_type text check (rule_type in ('content_structure', 'opening', 'evidence')),
  template text not null,                 -- 可复用的模版
  example text,                           -- 示例推文
  description text,                       -- 详细说明
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table public.hot_signals enable row level security;

create policy "Anyone can view hot signals"
  on public.hot_signals for select
  using (true);

create index idx_hot_signals_type on public.hot_signals(rule_type);
create index idx_hot_signals_active on public.hot_signals(is_active);
