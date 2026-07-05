-- 远声 / Talk To Global — Seed Data
-- Source: material/interviewQuestions.md (MVP 5-8 min interview, 10 questions)
-- Source: material/twitter-hotpots-analysis.md (10 founder voice rules)

-- Clear existing data for clean re-seed
delete from public.question_bank;
-- NOTE: hot_signals is fully managed by migration 006 (real founder posts);
-- do NOT delete/re-seed it here or the migration's data would be wiped.

-- ============================================================
-- question_bank — MVP 采访问题库（10 题，控制在 5-8 分钟）
-- ============================================================

-- Q1｜产品朴素介绍
insert into public.question_bank (category, question, follow_up, sort_order, purpose) values
  ('interview', '你现在在做什么产品？请用最朴素的话，讲给一个不懂你行业的人听。',
   '能再具体一点吗？比如你的用户每天会怎么用它？', 1,
   '避免一上来得到"AI 赋能 XX""一站式解决方案"这类空泛表达。系统需识别：产品是什么、服务谁、解决什么问题、是否已经过度抽象');

-- Q2｜Founder 真实触发点
insert into public.question_bank (category, question, follow_up, sort_order, purpose) values
  ('interview', '你为什么会做这个产品？不是市场机会，而是你自己真实经历里哪个瞬间让你觉得：这件事必须有人做？',
   '那个瞬间之后，你做的第一件事是什么？', 2,
   '提取 Founder origin story，找到 founder 为什么是这个产品的可信讲述者。系统需识别：真实经历、个人动机、行业观察、与产品之间的关系');

-- Q3｜具体 Workflow 卡点
insert into public.question_bank (category, question, follow_up, sort_order, purpose) values
  ('interview', '你的产品解决的不是一个功能问题，而是哪个具体 workflow 卡点？',
   '这个卡点造成的最大损失是什么？', 3,
   '把产品从"功能卖点"拉回真实业务流程。系统需识别：用户原本在哪个流程中卡住、这个卡点为什么重要、产品如何嵌入现有流程');

-- Q4｜用户 Before 状态
insert into public.question_bank (category, question, follow_up, sort_order, purpose) values
  ('interview', '用户在没有你之前，是怎么解决这个问题的？他们为什么痛苦？',
   '他们为什么一直没有换掉那个方案？', 4,
   '找到 before 状态，用于后续生成内容中的真实场景和对比。系统需识别：用户原有解决方式、手动/低效/昂贵/混乱/不稳定的地方、用户为什么愿意改变');

-- Q5｜一手用户洞察
insert into public.question_bank (category, question, follow_up, sort_order, purpose) values
  ('interview', '你最近从客户或用户那里听到的一个重要洞察是什么？',
   '这个洞察改变了你对产品的什么看法？', 5,
   '提取只有这个 founder 能讲的一手材料。系统需识别：客户原话、反直觉发现、产品方向变化、市场真实反馈');

-- Q6｜不同于市场共识的判断
insert into public.question_bank (category, question, follow_up, sort_order, purpose) values
  ('interview', '这个赛道里，大多数人现在相信什么？你不同意什么？',
   '你是什么时候开始有这个不同判断的？', 6,
   '生成 Founder POV，而不是普通产品介绍。系统需识别：市场共识、Founder 的不同判断、是否有 sharp take 的潜力');

-- Q7｜目标海外受众
insert into public.question_bank (category, question, follow_up, sort_order, purpose) values
  ('interview', '你最想影响哪类海外受众？比如：海外早期用户、投资人、合作伙伴、开发者、企业客户、AI builders、媒体/KOL、潜在员工？',
   '这类受众现在最关心什么？', 7,
   '确定内容不是"发给所有人"，而是服务具体 audience');

-- Q8｜Belief Shift
insert into public.question_bank (category, question, follow_up, sort_order, purpose) values
  ('interview', '你希望他们看完你的内容后，从相信什么变成相信什么？',
   '你觉得这个认知转变最难的一步是什么？', 8,
   '把内容生成从"表达自己"升级为"改变目标受众认知"。系统需识别：当前误解、目标信念、认知转变路径');

-- Q9｜希望对方采取的行动
insert into public.question_bank (category, question, follow_up, sort_order, purpose) values
  ('interview', '你希望他们采取什么行动？比如：关注你、预约 demo、加入 waitlist、私信合作、转发讨论、试用产品？',
   '你觉得什么样的内容最能驱动这个行动？', 9,
   '让内容服务业务目标，而不是随机发声');

-- Q10｜表达边界与反向风格
insert into public.question_bank (category, question, follow_up, sort_order, purpose) values
  ('interview', '你不希望自己的海外表达听起来像什么？比如：销售、公司 PR、AI 味、鸡血成功学、过度包装、过度技术？',
   '有没有哪个海外创始人的声音是你比较喜欢的？', 10,
   '负向约束比直接问 voice style 更有效，能帮助生成内容更像 founder 本人');

-- ============================================================
-- question_bank — 聊聊今天思考（thinking 类别，5 题）
-- ============================================================

-- T1｜今日观察
insert into public.question_bank (category, question, follow_up, sort_order, purpose) values
  ('thinking', '今天脑子里最挥之不去的一个想法是什么？不用整理，像语音备忘录一样说出来就行。',
   '这个想法是从哪里来的？是客户聊天、产品开发、还是你自己突然意识到的？', 1,
   '打开创始人的思考入口，提取 raw thought 和 topic seed');

-- T2｜灵感来源
insert into public.question_bank (category, question, follow_up, sort_order, purpose) values
  ('thinking', '最近有没有哪个瞬间让你觉得：这个事情和我之前想的不一样？',
   '那个瞬间之后，你的想法有什么变化？', 2,
   '提取 founder 的真实观察和认知变化');

-- T3｜产品感悟
insert into public.question_bank (category, question, follow_up, sort_order, purpose) values
  ('thinking', '你在做产品的过程中，最近有什么新的体会？',
   '这个体会和你做产品的初心有什么关系？', 3,
   '提取 product insight 和 founder 的一手经验');

-- T4｜行业判断
insert into public.question_bank (category, question, follow_up, sort_order, purpose) values
  ('thinking', '你最近对这个行业有什么新的判断？哪怕是不成熟但想说的。',
   '你从哪里看到这个信号的？', 4,
   '提取 founder 的行业观察和独立判断');

-- T5｜反常识
insert into public.question_bank (category, question, follow_up, sort_order, purpose) values
  ('thinking', '你最想反驳的一种常见看法是什么？',
   '你的看法和大多数人有什么不同？', 5,
   '提取 contrarian take 和 founder POV');


-- ============================================================
-- hot_signals — 真实 Founder 推文（账号/原文/时间/转赞评/链接）
-- Source: material/x-hotpots.md
-- 数据由 migration 006_hot_signals_posts.sql 写入。seed 在迁移之后运行，
-- 这里不再重复插入，以免覆盖迁移中的真实帖子。
-- （migration 006 里已含 `delete from public.hot_signals;` + 15 条 insert）
-- ============================================================
