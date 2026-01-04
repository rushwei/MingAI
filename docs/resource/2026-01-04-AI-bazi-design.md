# AI 算命网站设计方案

**创建日期**: 2026-01-04
**版本**: v1.0

---

## 1. 项目概述

### 1.1 产品定位

一个以八字为核心、AI 驱动的现代命理服务平台。

### 1.2 核心功能

| 功能 | 描述 |
|------|------|
| 八字排盘 | 基于 lunar-javascript 的专业八字排盘 |
| 专业解读 | AI 生成的深度八字分析、流年运势 |
| 每日运势 | 日历视图、五维评分、当日建议 |
| AI 对话 | 多角色（宗师/疗愈师/学者）对话系统 |
| 用户系统 | 手机号/微信注册登录 |
| 付费系统 | 先试用后付费，微信/支付宝支付 |

---

## 2. 技术架构

### 2.1 技术栈

| 类别 | 技术选择 |
|------|----------|
| 全栈框架 | Next.js 14+ (App Router) |
| 语言 | TypeScript |
| UI | Tailwind CSS + Lucide React |
| 数据库 | Supabase (PostgreSQL) |
| 八字算法 | lunar-javascript |
| AI | 多模型 (OpenAI + Claude) |
| 支付 | 微信支付 + 支付宝 |

### 2.2 系统架构图

```
┌─────────────────────────────────────────────────────────┐
│              Next.js 14 (App Router)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  营销首页    │  │  排盘/解读   │  │  用户中心    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                            │                            │
│              ┌──────────────────────────┐              │
│              │   Server Actions 层      │              │
│              └──────────────────────────┘              │
│                            │                            │
│     ┌──────────────────────┼──────────────────────┐    │
│     ▼                      ▼                      ▼    │
│ ┌────────┐          ┌────────┐          ┌────────┐   │
│ │Supabase│          │AI API  │          │支付网关 │   │
│ └────────┘          └────────┘          └────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 2.3 目录结构

```
/src
  /app              # Next.js App Router
    /page.tsx       # 营销首页
    /bazi/          # 八字排盘页面
      /page.tsx
      /result/[id]/
    /daily/         # 每日运势
    /chat/          # AI对话
    /user/          # 用户中心
    /api/           # Webhook
  /components       # React 组件
    /ui/            # 基础UI
    /bazi/          # 八字组件
    /chat/          # 对话组件
  /lib              # 工具函数
    /supabase.ts    # Supabase 客户端
    /bazi.ts        # 八字排盘逻辑
    /ai.ts          # AI 调用封装
    /paid.ts        # 付费逻辑
  /types            # TypeScript 类型定义
```

---

## 3. 数据模型

### 3.1 用户表 (users)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) UNIQUE,
  wechat_openid VARCHAR(100),
  nickname VARCHAR(50),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.2 八字命盘表 (bazi_charts)

```sql
CREATE TABLE bazi_charts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  name VARCHAR(50),
  gender VARCHAR(10),
  birth_date DATE NOT NULL,
  birth_time TIME NOT NULL,
  timezone FLOAT DEFAULT 8,
  solar_or_lunar VARCHAR(10),
  birth_place VARCHAR(100),

  -- 排盘结果 (JSON 存储)
  four_pillars JSONB,
  ten_gods JSONB,
  five_elements JSONB,
  day_master VARCHAR(10),
  hidden_stems JSONB,

  is_unlocked BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.3 AI 对话表 (ai_conversations)

```sql
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  bazi_chart_id UUID REFERENCES bazi_charts(id),
  character_type VARCHAR(20),
  title VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES ai_conversations(id),
  role VARCHAR(10),
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.4 每日运势表 (daily_fortune)

```sql
CREATE TABLE daily_fortune (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  bazi_chart_id UUID REFERENCES bazi_charts(id),
  date DATE NOT NULL,

  overall_score INT,
  career_score INT,
  love_score INT,
  wealth_score INT,
  health_score INT,
  advice TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);
```

### 3.5 订单表 (orders)

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  bazi_chart_id UUID REFERENCES bazi_charts(id),
  product_type VARCHAR(20),
  product_id VARCHAR(50),
  amount DECIMAL(10,2),
  status VARCHAR(20),
  payment_method VARCHAR(20),
  out_trade_no VARCHAR(100),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. 核心功能流程

### 4.1 八字排盘流程

1. 用户在输入页面填写：姓名、性别、出生日期、出生时间、出生地点
2. 调用 Server Action `createChart`，使用 lunar-javascript 计算
3. 保存到数据库，返回结果页面（免费展示基础信息）
4. 引导用户付费解锁深度解读

### 4.2 AI 对话流程

1. 用户选择 AI 人格（宗师/疗愈师/学者）
2. 检查付费状态（可用次数/会员）
3. 进入对话，支持流式输出
4. AI 记住命盘上下文，支持追问

### 4.3 每日运势流程

1. 用户访问每日页面
2. 检查是否有今日运势数据
3. 无数据时调用 AI 生成（5维度评分 + 建议）
4. 保存并展示日历视图

### 4.4 付费流程

1. 用户选择产品（单次/月度/年度）
2. 创建订单，状态 pending
3. 跳转支付（微信/支付宝）
4. 支付回调更新订单状态，解锁权限

---

## 5. AI Prompt 设计

### 5.1 八字解读 Prompt

```typescript
const BAZI_INTERPRETATION_PROMPT = `
你是一位精通八字命理的资深命理师，拥有30年实战经验。

## 命盘信息
- 日主：\${dayMaster}
- 五行分布：\${fiveElements}
- 用神：\${usefulGod}

## 解读要求
1. 用通俗易懂的语言解释八字含义
2. 结合大运流年分析运势走向
3. 提供具体的可执行建议
4. 保持专业但不迷信的态度

## 输出结构
1. 【命格总评】
2. 【性格特点】
3. 【事业运势】
4. 【情感婚姻】
5. 【财运分析】
6. 【健康提示】
7. 【流年运势】
8. 【开运建议】
`;
```

### 5.2 AI 人格 Prompt

| 人格 | 风格 |
|------|------|
| **严厉宗师** | 说话直接、一针见血、引用古籍 |
| **温柔疗愈师** | 温暖鼓励、共情用户、朋友式聊天 |
| **神秘学者** | 玄妙诗意、隐喻象征、沉稳安心 |

### 5.3 每日运势 Prompt

```typescript
const DAILY_FORTUNE_PROMPT = `
八字：\${baziString}
今日干支：\todayPillars

请用 JSON 格式返回：
{
  "overall": 75,
  "career": 70,
  "love": 80,
  "wealth": 65,
  "health": 85,
  "advice": ["建议1", "建议2", "建议3"]
}
`;
```

### 5.4 多模型策略

| 场景 | 推荐模型 | 原因 |
|------|----------|------|
| 深度解读 | Claude | 中文理解和长文本推理更强 |
| 日常对话 | GPT-4o | 响应速度快 |
| 短分析 | Claude Haiku | 成本低 |

---

## 6. 付费方案

| 产品 | 价格 | 权益 |
|------|------|------|
| 单次解锁 | ¥29 | 解锁单次八字深度解读 |
| 月度会员 | ¥39/月 | 无限 AI 对话 + 每日运势 |
| 年度会员 | ¥399/年 | 所有功能 + 优先客服 |

---

## 7. 下一步

1. 初始化 Next.js 项目
2. 配置 Supabase
3. 实现八字排盘核心功能
4. 对接 AI API
5. 开发支付模块
