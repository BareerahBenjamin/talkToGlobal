-- 远声 / Talk To Global — Initial Schema
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- profiles — 用户画像（auth.users 的扩展）
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', 'Founder'));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- founder_dna — 创始人 Voice DNA
-- ============================================================
create table public.founder_dna (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  position text,            -- 创始人定位
  voice_style text,         -- 表达风格
  core_views text,          -- 核心观点
  target_audience text,     -- 目标受众
  product_story text,       -- 产品叙事
  beliefs text[],           -- 核心信念列表
  avoid text[],             -- 内容禁区
  language_style text default '亲和故事',
  is_confirmed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.founder_dna enable row level security;

create policy "Users can view own DNA"
  on public.founder_dna for select
  using (auth.uid() = user_id);

create policy "Users can insert own DNA"
  on public.founder_dna for insert
  with check (auth.uid() = user_id);

create policy "Users can update own DNA"
  on public.founder_dna for update
  using (auth.uid() = user_id);

create policy "Users can delete own DNA"
  on public.founder_dna for delete
  using (auth.uid() = user_id);

-- ============================================================
-- materials — 上传的材料
-- ============================================================
create table public.materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('text', 'file', 'url')),
  title text,
  content text,
  file_path text,
  file_type text,
  created_at timestamptz default now()
);

alter table public.materials enable row level security;

create policy "Users can view own materials"
  on public.materials for select
  using (auth.uid() = user_id);

create policy "Users can insert own materials"
  on public.materials for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own materials"
  on public.materials for delete
  using (auth.uid() = user_id);

-- ============================================================
-- interviews — 采访会话
-- ============================================================
create table public.interviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text default 'in_progress' check (status in ('in_progress', 'completed')),
  started_at timestamptz default now(),
  completed_at timestamptz
);

alter table public.interviews enable row level security;

create policy "Users can view own interviews"
  on public.interviews for select
  using (auth.uid() = user_id);

create policy "Users can insert own interviews"
  on public.interviews for insert
  with check (auth.uid() = user_id);

create policy "Users can update own interviews"
  on public.interviews for update
  using (auth.uid() = user_id);

-- ============================================================
-- interview_messages — 采访对话记录
-- ============================================================
create table public.interview_messages (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.interviews(id) on delete cascade,
  role text not null check (role in ('ai', 'user')),
  content text not null,
  audio_path text,
  created_at timestamptz default now()
);

alter table public.interview_messages enable row level security;

create policy "Users can view own interview messages"
  on public.interview_messages for select
  using (exists (
    select 1 from public.interviews
    where interviews.id = interview_messages.interview_id
    and interviews.user_id = auth.uid()
  ));

create policy "Users can insert own interview messages"
  on public.interview_messages for insert
  with check (exists (
    select 1 from public.interviews
    where interviews.id = interview_messages.interview_id
    and interviews.user_id = auth.uid()
  ));

-- ============================================================
-- contents — 生成的内容（核心表）
-- ============================================================
create table public.contents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  -- 来源
  source_type text check (source_type in ('thinking', 'market_signal', 'product_update')),
  source_input text,
  -- DNA 快照
  dna_snapshot jsonb,
  -- 中文版本
  zh_versions jsonb,
  selected_zh_index int,
  edited_zh_text text,
  -- 英文版本
  en_versions jsonb,
  -- 状态
  status text default 'draft' check (status in ('draft', 'published', 'archived')),
  dna_tags text[],
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.contents enable row level security;

create policy "Users can view own contents"
  on public.contents for select
  using (auth.uid() = user_id);

create policy "Users can insert own contents"
  on public.contents for insert
  with check (auth.uid() = user_id);

create policy "Users can update own contents"
  on public.contents for update
  using (auth.uid() = user_id);

create policy "Users can delete own contents"
  on public.contents for delete
  using (auth.uid() = user_id);

-- ============================================================
-- question_bank — 采访问题库
-- ============================================================
create table public.question_bank (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('thinking', 'market_signal', 'product_update')),
  question text not null,
  follow_up text,
  sort_order int default 0
);

-- question_bank 是公共数据，不需要 RLS
alter table public.question_bank enable row level security;

create policy "Anyone can view questions"
  on public.question_bank for select
  using (true);

-- ============================================================
-- Indexes
-- ============================================================
create index idx_founder_dna_user on public.founder_dna(user_id);
create index idx_materials_user on public.materials(user_id);
create index idx_interviews_user on public.interviews(user_id);
create index idx_interview_messages_interview on public.interview_messages(interview_id);
create index idx_contents_user on public.contents(user_id);
create index idx_contents_status on public.contents(user_id, status);
create index idx_question_bank_category on public.question_bank(category);
