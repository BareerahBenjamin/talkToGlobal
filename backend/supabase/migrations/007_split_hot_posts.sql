-- ============================================================
-- 007 — Split hot data into two tables:
--   * hot_signals  → founder-voice TEMPLATE rules (used by generators)
--   * hot_posts    → real founder posts (shown on the 热点资讯 page)
-- 006 had overwritten hot_signals with real posts; this restores the template
-- rules to hot_signals and moves the real posts into a dedicated hot_posts table.
-- ============================================================

-- 1) New table for the real founder posts (was inserted into hot_signals by 006).
create table if not exists public.hot_posts (
  id uuid primary key default gen_random_uuid(),
  source_account text,        -- @handle
  author_name text,           -- 名称
  content text,               -- 原帖内容
  posted_at text,             -- 发布时间（原始字符串）
  likes integer,              -- 赞
  retweets integer,           -- 转
  replies integer,            -- 评
  views text,                 -- 浏览量
  url text,                   -- 原帖链接
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table public.hot_posts enable row level security;

create policy "Anyone can view hot posts"
  on public.hot_posts for select
  using (true);

create index if not exists idx_hot_posts_active on public.hot_posts(is_active);
create index if not exists idx_hot_posts_account on public.hot_posts(source_account);

-- 2) Move the 15 real posts from hot_signals into hot_posts.
insert into public.hot_posts
  (source_account, author_name, content, posted_at, likes, retweets, replies, views, url, is_active)
select source_account, author_name, content, posted_at, likes, retweets, replies, views, url, is_active
from public.hot_signals
where content is not null;

-- 3) Reset hot_signals back to the TEMPLATE-rules shape and re-seed the 10 rules.
delete from public.hot_signals;

insert into public.hot_signals (title, source_account, rule_type, template, example, description) values

-- 内容架构类
('框架感发声', '@karpathy @hwchase17', 'content_structure',
 '每条推文是微型框架，不是表态。',
 'Something I''ve been finding very useful recently: [你的实践/框架]',
 '权威架构：个人实践声明 + 结构化的认知框架。长篇 thread 是建立权威的最高 ROI 手段。'),

('数字替代形容词', '@levelsio @rauchg', 'content_structure',
 '用具体数字替代模糊描述。',
 '"125K MRR" > "增长很好"，"42% of the web" > "很多"',
 '最有力的 pitch = 一个公开的收入数字。在 bio 写产品 + MRR = 24/7 的 Founder 广告牌。'),

('反转叙事', '@amasad', 'content_structure',
 '"我们曾 X → 我们变了 → 结果 Y"',
 '"我们曾经是 XXX 的工具，后来发现真正的市场是 YYY。ARR 从 200 万跌到谷底，转型后到了 1.44 亿。"',
 '把商业 pivot 公开讲，这本身是最好的内容。坦诚失败让 success 更有说服力。'),

('趋势命名', '@swyx @karpathy', 'content_structure',
 '给正在发生的事取个名字。',
 'Vibe Coding, Agentic Engineering, SaaSpocalypse',
 '最强大的发声 = 定义一个 category。用圈层语言建立身份归属。'),

('哲理 + 产品交替', '@AravSrinivas', 'content_structure',
 '一句话哲理 + 产品信号交替发，ratio ≈ 1:1',
 '"Moving fast is essentially an expression of humility as you make frequent contact with reality"',
 'CEO 个人号 ≠ 公司蓝 V。最高互动的不是产品发布，是你的世界观。'),

-- 开口方式类
('个人实践开场', '@karpathy @simonw', 'opening',
 '以个人实践声明开头，天然可信。',
 '"Something I''ve been finding very useful recently..."',
 '不写「关于 XX 的看法」，写「我一直在用 XX 做 YY」。'),

('设问确认钩子', '@rauchg', 'opening',
 '设问 + 确认 = 病毒钩子。',
 '"Can X do Y? Yes." / "The SaaSpocalypse? Both understated and overstated."',
 '一个可验证的 demo 胜过十篇 blog。用引爆性断言制造 tension，用产品交付消解 tension。'),

('转变陈述', '@rauchg @amasad', 'opening',
 '"We used to X, now we''re Y"',
 '"We used to build tools for humans, now we''re building them for agents."',
 '转变陈述是 CEO 最有力的武器。不是「我认为」，而是「事实是」。'),

('极简留白', '@roon @AravSrinivas', 'opening',
 '推文越短，解读空间越大。',
 '"fellow creators the creator seeks" — 简洁、留白、让人想解读',
 '留白 = 互动空间。偶尔的 cryptic 推文能建立「只有 we know」的社区归属感。'),

-- 证据互动类
('可验证性', '@goodside @simonw', 'evidence',
 '展示过程和结果，而不仅仅是结论。',
 '"我试了 XX，结果是 YY。这是代码/数据/截图。"',
 '最权威的发声方式 = 展示过程和结果。把工作流公开 = 建立「言出必行」的可信度。');
