-- ============================================================
-- 006 — Replace hot_signals template rules with REAL founder posts
-- Source: material/x-hotpots.md (抓取于 2026-07-04, X/Twitter 时间线)
-- Each account contributes its top-3 original posts by likes.
-- ============================================================

-- 1) Add columns for real-post metadata. Keep the old columns (title/template/
--    example/description/rule_type) so existing readers don't break, but relax
--    their constraints since real posts don't have rule_type/template.
alter table public.hot_signals
  add column if not exists author_name text,   -- 名称（如 "Andrej Karpathy"）
  add column if not exists content text,       -- 原帖内容
  add column if not exists posted_at text,     -- 发布时间（原始字符串）
  add column if not exists likes integer,      -- 赞
  add column if not exists retweets integer,   -- 转
  add column if not exists replies integer,    -- 评
  add column if not exists views text,         -- 浏览量（原始，带 k）
  add column if not exists url text;           -- 原帖链接

-- Real posts have no rule_type / template, so drop the blocking constraints.
alter table public.hot_signals alter column title drop not null;
alter table public.hot_signals alter column template drop not null;
alter table public.hot_signals drop constraint if exists hot_signals_rule_type_check;

create index if not exists idx_hot_signals_author on public.hot_signals(source_account);

-- 2) Replace all content with the 15 real posts.
delete from public.hot_signals;

insert into public.hot_signals
  (source_account, author_name, content, posted_at, likes, retweets, replies, views, url, is_active)
values
-- ===== @karpathy · Andrej Karpathy =====
('@karpathy', 'Andrej Karpathy',
 'Personal update: I''ve joined Anthropic. I think the next few years at the frontier of LLMs will be especially formative. I am very excited to join the team here and get back to R&D. I remain deeply passionate about education and plan to resume my work on it in time.',
 'Tue May 19 15:05:42 +0000 2026', 150179, 11106, 7981, '27689k',
 'https://x.com/karpathy/status/2056753169888334312', true),

('@karpathy', 'Andrej Karpathy',
 'LLM Knowledge Bases

Something I''m finding very useful recently: using LLMs to build personal knowledge bases for various topics of research interest. In this way, a large fraction of my recent token throughput is going less into manipulating code, and more into manipulating knowledge (stored as markdown and images). The latest LLMs are quite good at it.

TLDR: raw data from a given number of sources is collected, then compiled by an LLM into a .md wiki, then operated on by various CLIs by the LLM to do Q&A and to incrementally enhance the wiki, and all of it viewable in Obsidian. You rarely ever write or edit the wiki manually, it''s the domain of the LLM. I think there is room here for an incredible new product instead of a hacky collection of scripts.',
 'Thu Apr 02 20:42:21 +0000 2026', 60297, 7317, 2904, '21548k',
 'https://x.com/karpathy/status/2039805659525644595', true),

('@karpathy', 'Andrej Karpathy',
 'This is the the quote I''ve been citing a lot recently.

> 引用 @yacineMTB: you can outsource your thinking but you cannot outsource your understanding',
 'Thu Apr 30 17:43:06 +0000 2026', 46874, 4388, 854, '2638k',
 'https://x.com/karpathy/status/2049907410303865030', true),

-- ===== @AravSrinivas · Aravind Srinivas =====
('@AravSrinivas', 'Aravind Srinivas',
 'The best way to build a high pain tolerance is to remind yourself that the pain is temporary',
 'Fri Jun 26 05:54:21 +0000 2026', 2934, 256, 117, '115k',
 'https://x.com/AravSrinivas/status/2070385155290877991', true),

('@AravSrinivas', 'Aravind Srinivas',
 'Every enterprise will have its own model-harness-sandbox-eval flywheel with token value per watt optimization. This is the future. Simple reason: tacit knowledge about the domain and customers and their workflows that the company uniquely understands and has built trust around.',
 'Sat Jun 27 18:34:06 +0000 2026', 1787, 153, 115, '223k',
 'https://x.com/AravSrinivas/status/2070938739350900944', true),

('@AravSrinivas', 'Aravind Srinivas',
 'Moving fast is essentially an expression of humility as you make frequent contact with reality',
 'Sat Jun 27 05:40:27 +0000 2026', 1686, 116, 77, '84k',
 'https://x.com/AravSrinivas/status/2070744046709191071', true),

-- ===== @rauchg · Guillermo Rauch =====
('@rauchg', 'Guillermo Rauch',
 'Excited to partner with the best 🏎️

> 引用 @vercel: We are joining @MercedesAMGF1 as a multi-year strategic partner. First stop: British GP.

If it''s fast, it''s on Vercel.',
 'Wed Jul 01 13:32:20 +0000 2026', 1391, 34, 93, '117k',
 'https://x.com/rauchg/status/2072312348539293836', true),

('@rauchg', 'Guillermo Rauch',
 'v0 is the new npm and the new github.

Over time, you need fewer ''templates'' and large piles of code. I haven''t cloned a repo in a very long time.

You need the instructions and best practices on how to build the best things.',
 'Wed Jul 01 18:54:51 +0000 2026', 1109, 58, 66, '87k',
 'https://x.com/rauchg/status/2072393515657568553', true),

('@rauchg', 'Guillermo Rauch',
 'At dinner, tech executive is relaying his company''s @vercel feedback, and then his 12-year-old son''s @vercel feedback 😁

Vercel is for everyone.',
 'Wed Jul 01 01:00:59 +0000 2026', 786, 6, 48, '53k',
 'https://x.com/rauchg/status/2072123264843886709', true),

-- ===== @amasad · Amjad Masad =====
('@amasad', 'Amjad Masad',
 'AI is expensive to run partly because most workloads today run on generic hardware designed pre-LLMs. Etched is the first system designed from the ground up for modern inference.

> 引用 @Etched: We''re coming out of stealth. We''ve built our first racks after a successful A0 tapeout, $1B+ in customer contracts, and $800m raised. Our first racks ship this summer.',
 'Tue Jun 30 16:19:49 +0000 2026', 1572, 82, 53, '172k',
 'https://x.com/amasad/status/2071992110132117740', true),

('@amasad', 'Amjad Masad',
 'Now that building is easy, we''ve been increasingly focused on getting entrepreneurs to market, helping them reach their first customer and first dollar.

Whop is one of the best places on the internet to monetize your creations — and now you can sell your Replit apps on there.',
 'Wed Jul 01 18:21:23 +0000 2026', 613, 34, 30, '70k',
 'https://x.com/amasad/status/2072385092824260748', true),

('@amasad', 'Amjad Masad',
 'Try video generation on Replit

> 引用 @heybrosai: This is generated from @Replit animation. I am completely impressed by the level of localisation and the quality of the render.',
 'Fri Jul 03 11:20:35 +0000 2026', 198, 7, 23, '34k',
 'https://x.com/amasad/status/2073003971287863717', true),

-- ===== @levelsio · Pieter Levels =====
('@levelsio', 'Pieter Levels',
 'Korea''s bus stops have AC to keep you cool in the heat 😎

> 引用 @ronaldlangeveld: The European mind will never understand how even bus stops in Korea have AC.',
 'Thu Jul 02 09:59:59 +0000 2026', 3539, 121, 51, '438k',
 'https://x.com/levelsio/status/2072621299260612902', true),

('@levelsio', 'Pieter Levels',
 'Europe Simulator is coming to NYC this summer!

> 引用 @NYCMayor: New York: it''s hot out there, and the power grid is working overtime to keep us cool. Set your AC to 78 degrees, turn off lights/electronics you''re not using, and unplug what you can.',
 'Wed Jul 01 21:39:41 +0000 2026', 2267, 55, 26, '143k',
 'https://x.com/levelsio/status/2072434996757893173', true),

('@levelsio', 'Pieter Levels',
 'Nah it''s good

Everyone in West Europe faking sickness and burnout to get years paid free!

> 引用 @AutismCapital: Starting January 1st 2027 Germany is now requiring a doctor''s note before they give you time off for a sick day.',
 'Thu Jul 02 11:46:23 +0000 2026', 1339, 30, 40, '179k',
 'https://x.com/levelsio/status/2072648074078392781', true);
