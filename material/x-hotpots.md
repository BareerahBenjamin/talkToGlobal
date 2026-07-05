# Founder IP 出海 · X(Twitter) 热点库

> 用途：Founder IP 出海项目「热点库」内置语料。每人取时间线中**原创**（非转发）帖里点赞最高的 3 条。
> 抓取时间：2026-07-04 ｜ 数据源：X/Twitter 时间线
> ⚠️ 说明：X 公开接口**不返回「收藏数」**，故「藏」一栏用 **转发数（Retweets）** 代替——这是 X 上更有意义的传播指标；同时附「浏览量 Views」供参考。

---

## @karpathy · Andrej Karpathy

**身份**：AI 工程/教育顶流，前 Tesla AI / OpenAI　｜　**关注点**：怎么把复杂 AI 概念讲成人话；技术判断力

### 1. Andrej Karpathy（发布于 Tue May 19 15:05:42 +0000 2026）

> Personal update: I've joined Anthropic. I think the next few years at the frontier of LLMs will be especially formative. I am very excited to join the team here and get back to R&amp;D. I remain deeply passionate about education and plan to resume my work on it in time.

- 👍 赞：**150k**（150179）　🔁 转（代「藏」）：**11k**（11106）　💬 评：**8.0k**（7981）　👀 看：27689k
- 🔗 原贴：https://x.com/karpathy/status/2056753169888334312

### 2. Andrej Karpathy（发布于 Thu Apr 02 20:42:21 +0000 2026）

> LLM Knowledge Bases
> 
> Something I'm finding very useful recently: using LLMs to build personal knowledge bases for various topics of research interest. In this way, a large fraction of my recent token throughput is going less into manipulating code, and more into manipulating knowledge (stored as markdown and images). The latest LLMs are quite good at it. So:
> 
> Data ingest:
> I index source documents (articles, papers, repos, datasets, images, etc.) into a raw/ directory, then I use an LLM to incrementally "compile" a wiki, which is just a collection of .md files in a directory structure. The wiki includes summaries of all the data in raw/, backlinks, and then it categorizes data into concepts, writes articles for them, and links them all. To convert web articles into .md files I like to use the Obsidian Web Clipper extension, and then I also use a hotkey to download all the related images to local so that my LLM can easily reference them.
> 
> IDE:
> I use Obsidian as the IDE "frontend" where I can view the raw data, the the compiled wiki, and the derived visualizations. Important to note that the LLM writes and maintains all of the data of the wiki, I rarely touch it directly. I've played with a few Obsidian plugins to render and view data in other ways (e.g. Marp for slides).
> 
> Q&A:
> Where things get interesting is that once your wiki is big enough (e.g. mine on some recent research is ~100 articles and ~400K words), you can ask your LLM agent all kinds of complex questions against the wiki, and it will go off, research the answers, etc. I thought I had to reach for fancy RAG, but the LLM has been pretty good about auto-maintaining index files and brief summaries of all the documents and it reads all the important related data fairly easily at this ~small scale.
> 
> Output:
> Instead of getting answers in text/terminal, I like to have it render markdown files for me, or slide shows (Marp format), or matplotlib images, all of which I then view again in Obsidian. You can imagine many other visual output formats depending on the query. Often, I end up "filing" the outputs back into the wiki to enhance it for further queries. So my own explorations and queries always "add up" in the knowledge base.
> 
> Linting:
> I've run some LLM "health checks" over the wiki to e.g. find inconsistent data, impute missing data (with web searchers), find interesting connections for new article candidates, etc., to incrementally clean up the wiki and enhance its overall data integrity. The LLMs are quite good at suggesting further questions to ask and look into.
> 
> Extra tools:
> I find myself developing additional tools to process the data, e.g. I vibe coded a small and naive search engine over the wiki, which I both use directly (in a web ui), but more often I want to hand it off to an LLM via CLI as a tool for larger queries. 
> 
> Further explorations:
> As the repo grows, the natural desire is to also think about synthetic data generation + finetuning to have your LLM "know" the data in its weights instead of just context windows.
> 
> TLDR: raw data from a given number of sources is collected, then compiled by an LLM into a .md wiki, then operated on by various CLIs by the LLM to do Q&A and to incrementally enhance the wiki, and all of it viewable in Obsidian. You rarely ever write or edit the wiki manually, it's the domain of the LLM. I think there is room here for an incredible new product instead of a hacky collection of scripts.

- 👍 赞：**60k**（60297）　🔁 转（代「藏」）：**7.3k**（7317）　💬 评：**2.9k**（2904）　👀 看：21548k
- 🔗 原贴：https://x.com/karpathy/status/2039805659525644595

### 3. Andrej Karpathy（发布于 Thu Apr 30 17:43:06 +0000 2026）

> This is the the quote I've been citing a lot recently.
> 
> > 🔁 引用 @yacineMTB：you can outsource your thinking
> but you cannot outsource your understanding

- 👍 赞：**47k**（46874）　🔁 转（代「藏」）：**4.4k**（4388）　💬 评：**854**（854）　👀 看：2638k
- 🔗 原贴：https://x.com/karpathy/status/2049907410303865030

---

## @AravSrinivas · Aravind Srinivas

**身份**：Perplexity 联合创始人 & CEO　｜　**关注点**：AI 产品愿景、CEO 如何参与公共讨论

### 1. Aravind Srinivas（发布于 Fri Jun 26 05:54:21 +0000 2026）

> The best way to build a high pain tolerance is to remind yourself that the pain is temporary

- 👍 赞：**2.9k**（2934）　🔁 转（代「藏」）：**256**（256）　💬 评：**117**（117）　👀 看：115k
- 🔗 原贴：https://x.com/AravSrinivas/status/2070385155290877991

### 2. Aravind Srinivas（发布于 Sat Jun 27 18:34:06 +0000 2026）

> Every enterprise will have its own model-harness-sandbox-eval flywheel with token value per watt optimization. This is the future. Simple reason: tacit knowledge about the domain and customers and their workflows that the company uniquely understands and has built trust around.

- 👍 赞：**1.8k**（1787）　🔁 转（代「藏」）：**153**（153）　💬 评：**115**（115）　👀 看：223k
- 🔗 原贴：https://x.com/AravSrinivas/status/2070938739350900944

### 3. Aravind Srinivas（发布于 Sat Jun 27 05:40:27 +0000 2026）

> Moving fast is essentially an expression of humility as you make frequent contact with reality

- 👍 赞：**1.7k**（1686）　🔁 转（代「藏」）：**116**（116）　💬 评：**77**（77）　👀 看：84k
- 🔗 原贴：https://x.com/AravSrinivas/status/2070744046709191071

---

## @rauchg · Guillermo Rauch

**身份**：Vercel 创始人 & CEO　｜　**关注点**：AI-native devtool、产品进展、builder 文化

### 1. Guillermo Rauch（发布于 Wed Jul 01 13:32:20 +0000 2026）

> Excited to partner with the best 🏎️
> 
> > 🔁 引用 @vercel：We are joining @MercedesAMGF1 as a multi-year strategic partner. First stop: British GP.
> 
> If it's fast, it's on Vercel. https://t.co/1zPKK0Nn3E

- 👍 赞：**1.4k**（1391）　🔁 转（代「藏」）：**34**（34）　💬 评：**93**（93）　👀 看：117k
- 🔗 原贴：https://x.com/rauchg/status/2072312348539293836

### 2. Guillermo Rauch（发布于 Wed Jul 01 18:54:51 +0000 2026）

> https://t.co/pYz1Gn97jD is the new npm and the new github.
> 
> Over time, you need fewer 'templates' and large piles of code. I haven't cloned a repo in a very long time.
> 
> You need the instructions and best practices on how to build the best things.

- 👍 赞：**1.1k**（1109）　🔁 转（代「藏」）：**58**（58）　💬 评：**66**（66）　👀 看：87k
- 🔗 原贴：https://x.com/rauchg/status/2072393515657568553

### 3. Guillermo Rauch（发布于 Wed Jul 01 01:00:59 +0000 2026）

> At dinner, tech executive is relaying his company’s @vercel feedback, and then his 12-year-old son’s @vercel feedback 😁 
> 
> Vercel is for everyone.

- 👍 赞：**786**（786）　🔁 转（代「藏」）：**6**（6）　💬 评：**48**（48）　👀 看：53k
- 🔗 原贴：https://x.com/rauchg/status/2072123264843886709

---

## @amasad · Amjad Masad

**身份**：Replit 创始人 & CEO　｜　**关注点**：AI coding、future of work、产品发布叙事

### 1. Amjad Masad（发布于 Tue Jun 30 16:19:49 +0000 2026）

> AI is expensive to run partly because most workloads today run on generic hardware designed pre-LLMs. Etched is the first system designed from the ground up for modern inference.
> 
> > 🔁 引用 @Etched：We're coming out of stealth.
> 
> We've built our first racks after a successful A0 tapeout, $1B+ in customer contracts, and $800m raised.
> 
> Early customer tests show us achieving SOTA throughput, latency, and power efficiency on inference workloads.
> 
> Our first racks ship this summer. https://t.co/FLccrkLTza

- 👍 赞：**1.6k**（1572）　🔁 转（代「藏」）：**82**（82）　💬 评：**53**（53）　👀 看：172k
- 🔗 原贴：https://x.com/amasad/status/2071992110132117740

### 2. Amjad Masad（发布于 Wed Jul 01 18:21:23 +0000 2026）

> Now that building is easy, we’ve been increasingly focused on getting entrepreneurs to market, helping them reach their first customer and first dollar.
> 
> Whop is one of the best places on the internet to monetize your creations — and now you can sell your Replit apps on there.
> 
> > 🔁 引用 @whop：Replit 🤝 Whop
> 
> Build your app on Replit. Earn on Whop. https://t.co/uOCoB9QIPG

- 👍 赞：**613**（613）　🔁 转（代「藏」）：**34**（34）　💬 评：**30**（30）　👀 看：70k
- 🔗 原贴：https://x.com/amasad/status/2072385092824260748

### 3. Amjad Masad（发布于 Fri Jul 03 11:20:35 +0000 2026）

> Try video generation on Replit
> 
> > 🔁 引用 @heybrosai：This is generated from @Replit animation. I am completely impressed by the level of localisation and the quality of the render. https://t.co/xkpwafpv6S

- 👍 赞：**198**（198）　🔁 转（代「藏」）：**7**（7）　💬 评：**23**（23）　👀 看：34k
- 🔗 原贴：https://x.com/amasad/status/2073003971287863717

---

## @levelsio · Pieter Levels

**身份**：独立开发者（Nomad List / PhotoAI 等）　｜　**关注点**：Indie builder 怎么讲产品、收入、争议和市场判断

### 1. Pieter Levels（发布于 Thu Jul 02 09:59:59 +0000 2026）

> Korea's bus stops have AC to keep you cool in the heat 😎
> 
> > 🔁 引用 @ronaldlangeveld：The European mind will never understand how even bus stops in Korea have AC. https://t.co/221Y3mlE7v

- 👍 赞：**3.5k**（3539）　🔁 转（代「藏」）：**121**（121）　💬 评：**51**（51）　👀 看：438k
- 🔗 原贴：https://x.com/levelsio/status/2072621299260612902

### 2. Pieter Levels（发布于 Wed Jul 01 21:39:41 +0000 2026）

> Europe Simulator is coming to NYC this summer!
> 
> > 🔁 引用 @NYCMayor：New York: it's hot out there, and the power grid is working overtime to keep us cool.
> 
> Set your AC to 78 degrees, turn off lights/electronics you're not using, and unplug what you can.
> 
> Our City is doing its part too: maintaining the 78 degrees rule in our buildings, dimming/turning off our lights during peak electricity demand, asking private partners to do the same, and powering down non-essential equipment.
> 
> A stable grid means the AC stays on, and lives are saved. Let's ease demand — and get through the heat — together.

- 👍 赞：**2.3k**（2267）　🔁 转（代「藏」）：**55**（55）　💬 评：**26**（26）　👀 看：143k
- 🔗 原贴：https://x.com/levelsio/status/2072434996757893173

### 3. Pieter Levels（发布于 Thu Jul 02 11:46:23 +0000 2026）

> Nah it's good
> 
> Everyone in West Europe faking sickness and burnout to get years paid free!
> 
> > 🔁 引用 @AutismCapital：Starting January 1st 2027 Germany is now requiring a doctor's note before they give you time off for a sick day. 
> 
> Europe continues to invent new and innovative ways to suck daily. Unbelievable.

- 👍 赞：**1.3k**（1339）　🔁 转（代「藏」）：**30**（30）　💬 评：**40**（40）　👀 看：179k
- 🔗 原贴：https://x.com/levelsio/status/2072648074078392781

---

