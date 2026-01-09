<div align="center">

# 🔮 MingAI - AI智能命理平台

**将传统命理文化与前沿AI技术深度融合**

[![Next.js](https://img.shields.io/badge/Next.js-16+-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-black?style=flat-square&logo=vercel)](https://vercel.com/)

[🌐 在线体验](https://www.mingai.fun) · [📖 产品文档](docs/plans/PRD-MingAI-v1.5.md) · [🐛 报告问题](https://github.com/hhszzzz/MingAI/issues)

</div>

---

## ✨ 产品亮点

- 🔮 **多命理体系** - 八字命理、紫微斗数，塔罗占卜、六爻占卜（开发中）
- 🤖 **AI智能对话** - 基于 DeepSeek/GLM-4.6 的流式对话，支持命盘综合分析
- 📅 **个性化运势** - 基于命盘的每日/每月运势分析，含黄历宜忌
- 🎨 **现代化UI** - 深色/浅色主题，响应式设计，移动端优先
- 🔐 **隐私优先** - Row Level Security 数据隔离，用户数据安全可控

---

## 🖥️ 功能预览

|            八字排盘            |            紫微斗数            |             AI对话             |
| :----------------------------: | :----------------------------: | :----------------------------: |
| 四柱八字 · 十神解读 · 神煞分析 | 十二宫位 · 星曜系统 · 运限分析 | 流式输出 · 记忆对话 · 命盘分析 |

|            每日运势            |         会员体系         |      消息通知       |
| :----------------------------: | :----------------------: | :-----------------: |
| 黄历宜忌 · AI问答 · 个性化分析 | Free/Plus/Pro · 按量付费 | 站内通知 · 邮件提醒 |

---

## 🚀 快速开始

### 环境要求

- Node.js 18+
- pnpm (推荐) / npm / yarn

### 安装与运行

```bash
# 克隆项目
git clone git@github.com:hhszzzz/MingAI.git
cd MingAI

# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入必要的 API Keys

# 启动开发服务器
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

### 环境变量配置

```env
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# AI API - DeepSeek
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_API_BASE_URL=https://api.deepseek.com/v1

# AI API - GLM-4.6 (硅基流动)
GLM_API_KEY=your_glm_api_key
GLM_API_BASE_URL=https://api.siliconflow.cn/v1

# 邮件服务 - Resend
RESEND_API_KEY=your_resend_api_key
RESEND_FROM=noreply@yourdomain.com

# 管理员
ADMIN_SECRET=your_admin_secret
```

---

## 🏗️ 技术架构

### 技术栈

| 类别         | 技术                     | 说明              |
| ------------ | ------------------------ | ----------------- |
| **前端框架** | Next.js 16+ (App Router) | 全栈React框架     |
| **开发语言** | TypeScript 5.x           | 严格类型检查      |
| **样式方案** | Tailwind CSS 4.x         | 原子化CSS         |
| **UI组件**   | Lucide React             | 图标库            |
| **数据库**   | Supabase (PostgreSQL)    | BaaS平台          |
| **认证**     | Supabase Auth            | 邮箱验证/密码重置 |
| **AI模型**   | DeepSeek + GLM-4.6       | 双模型支持        |
| **八字算法** | lunar-javascript         | 农历/干支计算     |
| **紫微算法** | iztro                    | 紫微斗数排盘      |
| **邮件服务** | Resend                   | 交易邮件          |
| **部署平台** | Vercel                   | 边缘部署          |

### 项目结构

```
MingAI/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API 路由
│   │   ├── bazi/              # 八字命理
│   │   ├── ziwei/             # 紫微斗数
│   │   ├── chat/              # AI 对话
│   │   ├── daily/             # 每日运势
│   │   ├── monthly/           # 每月运势
│   │   ├── user/              # 用户中心
│   │   └── ...
│   ├── components/            # React 组件
│   │   ├── ui/               # 基础UI组件
│   │   ├── layout/           # 布局组件
│   │   ├── auth/             # 认证组件
│   │   ├── bazi/             # 八字组件
│   │   ├── ziwei/            # 紫微组件
│   │   ├── chat/             # 对话组件
│   │   └── membership/       # 会员组件
│   ├── lib/                   # 工具函数
│   │   ├── bazi.ts           # 八字算法
│   │   ├── ziwei.ts          # 紫微算法
│   │   ├── ai.ts             # AI调用
│   │   ├── auth.ts           # 认证逻辑
│   │   ├── credits.ts        # 积分管理
│   │   └── ...
│   └── types/                 # TypeScript 类型
├── docs/                      # 项目文档
│   ├── plans/                # 产品规划
│   ├── deliverables/         # 开发报告
│   └── resource/             # 资源文件
├── supabase/                  # 数据库迁移
└── public/                    # 静态资源
```

### 数据库设计

| 表名                  | 用途               |
| --------------------- | ------------------ |
| `users`               | 用户信息与会员状态 |
| `bazi_charts`         | 八字命盘存储       |
| `ziwei_charts`        | 紫微命盘存储       |
| `conversations`       | 对话历史           |
| `user_credits`        | 用户积分余额       |
| `notifications`       | 站内通知           |
| `feature_subscribers` | 功能订阅           |
| `orders`              | 订单记录           |
| `rate_limits`         | 速率限制           |
| `login_attempts`      | 登录尝试           |

---

## 📋 功能清单

### ✅ 已完成功能

#### Phase 1: MVP 核心
- [x] 用户认证系统（邮箱注册/登录/重置密码）
- [x] 深色/浅色主题切换
- [x] 响应式侧边导航栏
- [x] 八字排盘（真太阳时、四柱、五行、十神）
- [x] AI多人格对话（玄机宗师）
- [x] 基础会员体系

#### Phase 2: 体验增强
- [x] 紫微斗数完整实现（十二宫、星曜、运限）
- [x] AI对话增强（流式输出、消息编辑、重新生成）
- [x] 记忆式对话与历史管理
- [x] 命盘选择器（八字/紫微快捷选择）
- [x] 积分系统与速率限制
- [x] 每日/每月运势日历

#### Phase 3: 功能完善
- [x] 登录安全增强（验证码、密码强度、失败限制）
- [x] 八字优化（神煞完善、AI五行分析、人格分析）
- [x] 紫微UI美化与运限优化
- [x] 订阅体系优化（Free/Plus/Pro + 按量付费）
- [x] 黄历宜忌与AI问答
- [x] 消息推送通知系统

### 🔜 开发计划

#### Phase 4: 功能扩展
- [ ] 关系合盘（情侣/商业/亲子）
- [ ] 塔罗牌占卜
- [ ] 六爻占卜
- [ ] MBTI性格测试
- [ ] 运势可分享卡片

#### Phase 5: 高级功能
- [ ] 面相分析（AI图像识别）
- [ ] 手相分析（AI图像识别）
- [ ] 微信生态集成
- [ ] 游戏化激励系统

---

## 💰 会员体系

| 等级     | 价格     | 对话次数 | 恢复规则            |
| -------- | -------- | -------- | ------------------- |
| **Free** | ¥0       | 3次      | 每日+1，上限3次     |
| **Plus** | ¥29.9/月 | 50次     | 每日+5，上限50次    |
| **Pro**  | ¥299/年  | 200次    | 每小时+1，上限200次 |

**按量付费**：¥9.9 = 1次对话

---

## 📚 文档

| 文档                                                              | 说明         |
| ----------------------------------------------------------------- | ------------ |
| [PRD](docs/plans/PRD-MingAI-v1.5.md)                              | 产品需求文档 |
| [Phase 1 报告](docs/deliverables/Phase1-MVP-Completion-Report.md) | MVP完成报告  |
| [Phase 2 报告](docs/deliverables/Phase2-Completion-Report.md)     | 体验增强报告 |
| [Phase 3 报告](docs/deliverables/Phase3-Completion-Report.md)     | 功能完善报告 |

---

## 🛠️ 开发命令

```bash
# 开发
pnpm dev          # 启动开发服务器

# 构建
pnpm build        # 生产构建
pnpm start        # 启动生产服务器

# 代码质量
pnpm lint         # ESLint 检查
pnpm type-check   # TypeScript 类型检查
```

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📄 许可证

本项目仅供学习交流使用。

---

<div align="center">

**MingAI** - 用AI解读命运，用科技传承文化

Made with ❤️ by [hhszzzz](https://github.com/hhszzzz)

</div>
