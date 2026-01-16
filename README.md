<div align="center">

# 🔮 MingAI - AI命理

**将传统命理文化与AI深度融合**

[![Next.js](https://img.shields.io/badge/Next.js-16+-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-black?style=flat-square&logo=vercel)](https://vercel.com/)

[🌐 在线体验](https://www.mingai.fun) · [📖 产品文档](docs/plans/PRD-MingAI-v1.9.md) · [🐛 报告问题](https://github.com/hhszzzz/MingAI/issues)

</div>

---

## ✨ 产品亮点

- 🔮 **多命理体系** - 八字命理、紫微斗数、关系合盘、塔罗占卜、六爻占卜、MBTI性格测试
- 🤖 **AI智能分析** - 多模型支持(DeepAI/Gemini/Qwen/DeepSeek/GLM)，深度推理，命盘综合分析
- 📅 **个性化运势** - 基于个人命盘的每日/每月运势分析、运势走势图、黄历宜忌
- 🎨 **现代化UI** - 深色/浅色主题，响应式设计，移动端优先
- 🔐 **隐私优先** - Row Level Security 数据隔离，用户数据安全可控

---

## 🖥️ 功能预览

|            八字排盘            |            紫微斗数            |             AI对话             |
| :----------------------------: | :----------------------------: | :----------------------------: |
| 四柱八字 · 十神解读 · 神煞分析 | 十二宫位 · 星曜系统 · 运限分析 | 深度推理 · 命盘分析 · 搜索增强 |

|            运势中心            |         关系合盘         |        塔罗/六爻/MBTI        |
| :----------------------------: | :----------------------: | :--------------------------: |
| 每日/每月运势 · 黄历 · AI问答  | 情侣/商业/亲子 · 走势曲线 | 多牌阵 · 传统起卦 · 性格分析 |

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
| **AI模型**   | DeepAI/Gemini/Qwen/DeepSeek/GLM | 多模型支持  |
| **八字算法** | lunar-javascript         | 农历/干支计算     |
| **紫微算法** | iztro                    | 紫微斗数排盘      |
| **邮件服务** | Resend                   | 交易邮件          |
| **部署平台** | Vercel + Zeabur          | 边缘部署          |

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
│   │   ├── fortune-hub/       # 运势中心
│   │   ├── hepan/             # 关系合盘
│   │   ├── tarot/             # 塔罗占卜
│   │   ├── liuyao/            # 六爻占卜
│   │   ├── mbti/              # MBTI测试
│   │   ├── user/              # 用户中心
│   │   └── admin/             # 管理后台
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
│   │   ├── tarot.ts          # 塔罗牌逻辑
│   │   ├── liuyao.ts         # 六爻算法
│   │   ├── hepan.ts          # 合盘算法
│   │   ├── mbti.ts           # MBTI逻辑
│   │   ├── ai.ts             # AI调用
│   │   └── credits.ts        # 积分管理
│   └── types/                 # TypeScript 类型
├── docs/                      # 项目文档
│   ├── plans/                # 产品规划
│   └── deliverables/         # 开发报告
├── supabase/                  # 数据库迁移
└── public/                    # 静态资源
```

### 数据库设计

| 表名                    | 用途               |
| ----------------------- | ------------------ |
| `users`                 | 用户信息与会员状态 |
| `bazi_charts`           | 八字命盘存储       |
| `ziwei_charts`          | 紫微命盘存储       |
| `hepan_charts`          | 关系合盘记录       |
| `conversations`         | 对话历史           |
| `tarot_readings`        | 塔罗占卜记录       |
| `liuyao_divinations`    | 六爻占卜记录       |
| `mbti_readings`         | MBTI测试结果       |
| `notifications`         | 站内通知           |
| `feature_subscriptions` | 功能订阅           |
| `orders`                | 订单记录           |
| `rate_limits`           | 速率限制           |

---

## 📋 功能清单

### ✅ 已完成功能

#### Phase 1-3: 核心功能
- [x] 用户认证系统（邮箱注册/登录/重置密码/安全限制）
- [x] 深色/浅色主题切换
- [x] 八字排盘（真太阳时、四柱、五行、十神、神煞、地支关系）
- [x] 紫微斗数（十二宫、星曜、四化、运限、三方四正）
- [x] AI对话（流式输出、消息编辑、重新生成、命盘选择器）
- [x] 每日/每月运势（日历视图、黄历宜忌、AI问答）
- [x] 会员体系（Free/Plus/Pro + 按量付费）
- [x] 消息推送通知系统

#### Phase 4: 功能扩展
- [x] 关系合盘（情侣/商业/亲子、走势曲线、沟通建议）
- [x] 塔罗占卜（多牌阵、78张完整解读、逆位判定、仪式感动画）
- [x] 六爻占卜（传统铜钱起卦、变卦路径、世应用神详解）
- [x] MBTI性格测试（16种人格、AI智能分析）
- [x] 运势中心（聚合所有命理功能入口）

#### Phase 5: 体验优化
- [x] AI统一历史（所有AI分析记录集成到对话历史）
- [x] 紫微/八字显示优化（运限直接显示、地支关系、神煞吉凶）
- [x] 会员模型分级（Free/Plus/Pro 不同模型权限）
- [x] 默认命盘设置
- [x] 移动端优化

### 🔜 开发计划

#### Phase 6: 社区与AI增强
- [ ] 命理社区（匿名讨论）
- [ ] 需求投票系统
- [ ] AI个性化记忆
- [ ] AI知识库支持

#### Phase 7: 高级功能
- [ ] 面相分析（AI图像识别）
- [ ] 手相分析（AI图像识别）
- [ ] 微信生态集成
- [ ] 游戏化激励系统

---

## 💰 会员体系

| 等级     | 价格     | 对话次数 | 恢复规则            | 模型权限           |
| -------- | -------- | -------- | ------------------- | ------------------ |
| **Free** | ¥0       | 3次      | 每日+1，上限3次     | 基础模型           |
| **Plus** | ¥29.9/月 | 50次     | 每日+5，上限50次    | 推理模型           |
| **Pro**  | ¥99/月   | 200次    | 每小时+1，上限200次 | 高级模型(DeepAI+)  |

**按量付费**：¥9.9 = 1次对话

---

## 📚 文档

| 文档                                                              | 说明         |
| ----------------------------------------------------------------- | ------------ |
| [PRD](docs/plans/PRD-MingAI-v1.9.md)                              | 产品需求文档 |
| [Phase 1 报告](docs/deliverables/Phase1-MVP-Completion-Report.md) | MVP完成报告  |
| [Phase 2 报告](docs/deliverables/Phase2-Completion-Report.md)     | 体验增强报告 |
| [Phase 3 报告](docs/deliverables/Phase3-Completion-Report.md)     | 功能完善报告 |
| [Phase 4 报告](docs/deliverables/Phase4-Completion-Report.md)     | 功能扩展报告 |
| [Phase 5 报告](docs/deliverables/Phase5-Completion-Report.md)     | 体验优化报告 |

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
pnpm test         # 运行测试
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
