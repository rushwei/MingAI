<div align="center">

# 🔮 MingAI - AI命理

**将传统命理文化与AI深度融合**

[![Next.js](https://img.shields.io/badge/Next.js-16+-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-black?style=flat-square&logo=vercel)](https://vercel.com/)

[🌐 在线体验](https://www.mingai.fun) · [📖 产品文档](docs/plans/PRD-MingAI.md)  · [🐛 报告问题](https://github.com/hhszzzz/MingAI/issues)

</div>

---

## ✨ 产品亮点

- 🔮 **多命理体系** - 八字、紫微、塔罗、六爻、MBTI、面相、手相、合盘、周公解梦全覆盖
- 🤖 **AI智能分析** - 多模型支持(DeepAI/Gemini/Qwen/DeepSeek/GLM/Kimi)，深度推理，视觉识别
- 🔌 **MCP Server** - 支持 Model Context Protocol（MCP），可在支持MCP的客户端中直接调用命理工具
- 📚 **知识库与@提及** - 个人知识库 + 显式引用数据源，AI 可解释
- 🎛️ **AI个性化** - 表达风格/用户画像/自定义指令 + 提示词预算可视化
- 💳 **订阅与运营** - Key 激活、购买链接配置、支付开关、AI模型/来源管理
- 📱 **多端体验** - Web + iOS/Android 客户端，移动端优先
- 💬 **社区与激励** - 匿名讨论、签到等级、成就系统
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
cp .env.example .env
# 编辑 .env 填入必要的 API Keys

# 启动开发服务器
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

---

## 🏗️ 技术架构

### 技术栈

| 类别         | 技术                                | 说明                     |
| ------------ | ----------------------------------- | ------------------------ |
| **前端框架** | Next.js 16+ (App Router)            | 全栈React框架            |
| **开发语言** | TypeScript 5.x                      | 严格类型检查             |
| **样式方案** | Tailwind CSS 4.x                    | 原子化CSS                |
| **UI组件**   | Lucide React                        | 图标库                   |
| **移动端**   | Capacitor 8                         | iOS/Android 客户端       |
| **数据库**   | Supabase (PostgreSQL + pgvector/FTS) | BaaS平台 + 向量检索      |
| **认证**     | Supabase Auth                       | 邮箱验证/密码重置        |
| **AI模型**   | DeepAI/Gemini/Qwen/DeepSeek/GLM/Kimi | 多模型支持               |
| **RAG**      | FTS + Trigram + Vector + Reranker   | 知识库检索               |
| **八字算法** | lunar-javascript                    | 农历/干支计算            |
| **紫微算法** | iztro                               | 紫微斗数排盘             |
| **邮件服务** | Resend                              | 交易邮件                 |
| **部署平台** | Vercel + Zeabur                     | 边缘部署                 |
| **MCP Server** | Model Context Protocol              | 7个命理功能集成      |

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
│   │   ├── face/              # 面相分析
│   │   ├── palm/              # 手相分析
│   │   ├── community/         # 命理社区
│   │   ├── records/           # 命理记账
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
│   │   ├── prompt-builder.ts # 提示词构建
│   │   ├── knowledge-base/   # 知识库
│   │   ├── data-sources/     # 统一数据源
│   │   ├── mentions.ts       # @提及解析
│   │   └── credits.ts        # 积分管理
│   ├── tests/                 # 测试文件
│   ├── types/                 # TypeScript 类型
│   └── workers/               # Web Workers
├── docs/                      # 项目文档
│   ├── plans/                # 产品规划
│   └── deliverables/         # 开发报告
├── packages/                  # 独立包
│   ├── mcp-core/             # MCP 核心逻辑
│   │   ├── src/
│   │   │   ├── tools.ts      # 工具定义
│   │   │   └── handlers/     # 工具处理器
│   │   └── package.json
│   ├── mcp-local/            # MCP 本地运行
│   │   ├── src/index.ts      # stdio 入口
│   │   └── package.json
│   └── mcp-server/           # MCP 远程服务
│       ├── src/index.ts      # SSE 服务入口
│       ├── Dockerfile        # 容器部署
│       └── package.json
├── supabase/                  # 数据库迁移/表
├── android/                   # Android 客户端 (Capacitor)
├── ios/                       # iOS 客户端 (Capacitor)
├── scripts/                   # 构建脚本
├── .github/                   # GitHub Actions
└── public/                    # 静态资源
```

### 数据库设计

| 表名 | 用途 |
| --- | --- |
| `users` | 用户档案、会员等级、管理员标记 |
| `user_settings` | 偏好设置（默认命盘/侧边栏/AI偏好/知识库搜索） |
| `app_settings` | 全局配置（支付开关等） |
| `activation_keys` / `purchase_links` | Key 激活与购买链接 |
| `ai_models` / `ai_model_sources` / `ai_model_stats` | AI 模型管理与统计 |
| `knowledge_bases` / `knowledge_entries` / `archived_sources` | 知识库与归档 |
| `conversations` | AI 对话历史与来源追踪 |
| `bazi_charts` / `ziwei_charts` / `tarot_readings` / `liuyao_divinations` / `hepan_charts` / `mbti_readings` | 命理与占卜数据 |
| `face_readings` / `palm_readings` | 视觉分析记录 |
| `community_posts` / `community_comments` / `community_votes` / `community_reports` | 命理社区 |
| `ming_records` / `ming_notes` | 命理记账与小记 |
| `reminder_subscriptions` / `scheduled_reminders` / `annual_reports` | 提醒与年度报告 |
| `credit_transactions` / `user_levels` / `daily_checkins` / `user_achievements` | 积分与成长体系 |
| `orders` / `notifications` / `rate_limits` / `login_attempts` | 订单/通知/限流/安全 |

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

#### Phase 6: 社区与AI增强
- [x] 盲派八字分析（六十甲子惊天客口诀）
- [x] 命理社区（匿名发帖、评论、投票、举报）
- [x] 命理记账（事件记录、小记功能）
- [x] 六爻功能升级（旺衰、伏神、动爻变化、刑冲合害）
- [x] AI模型选择优化

#### Phase 7: 高级功能
- [x] 面相分析（视觉AI、五官运势、流年气色）
- [x] 手相分析（三大主线、手型分析、掌丘解读）
- [x] 游戏化激励（等级、经验、签到、成就）
- [x] 推送与年度报告（节气提醒、运势提醒、PDF导出）

#### Phase 8: 移动端与AI体验优化
- [x] iOS/Android 客户端（Capacitor）
- [x] 订阅体系升级（Key 激活、购买链接、支付开关）
- [x] 知识库（创建/归档/上传/检索）
- [x] @提及 + 统一数据源 API
- [x] AI 个性化（风格/画像/指令）+ 提示词预算/来源展示
- [x] 管理员 AI 服务管理（模型/来源/统计）
- [x] 周公解梦模式

#### Phase 8.5: 重构与体验优化
- [x] 八字即时排盘、四柱排盘
- [x] 六爻选卦起卦、卦象信息复制
- [x] 移动端自定义底部栏与菜单
- [x] 黑夜模式支持随系统切换
- [x] AI流式输出与响应速度优化
- [x] 出生地点覆盖全区/县
- [x] 历史记录UI优化
- [x] 项目性能与加载速度优化

#### Phase 8.6: 支持MCP

### 🔜 开发计划

#### Phase 9: 后续功能
- [ ] 易经占卜
- [ ] 姓名学分析
- [ ] 择吉日功能
- [ ] 微信生态集成（登录、支付、分享）

---

## 💰 会员体系

| 等级     | 价格     | 额度上限 | 恢复规则            | 模型权限                                  |
| -------- | -------- | -------- | ------------------- | ----------------------------------------- |
| **Free** | ¥0       | 3        | 每日+1，上限3        | 基础模型（DeepSeek/GLM-4.6/Kimi）         |
| **Plus** | ¥29.9/月 | 50       | 每日+5，上限50       | 推理模型（DeepSeek Pro/GLM-4.7/Gemini）   |
| **Pro**  | ¥99/月   | 200      | 每小时+1，上限200    | 全模型可用（含 DeepAI）                   |

**额度说明**：1额度 = 1次对话  
**按量付费**：¥9.9 = 1额度  
**订阅方式**：Key 激活（`sk-xxxx`），购买链接由管理员配置

---

## 🔌 MCP Server

MingAI 提供 MCP (Model Context Protocol) Server，可在支持 MCP 的客户端中直接调用命理工具。

### 支持的工具

| 工具 | 功能 |
| --- | --- |
| `bazi_calculate` | 八字时间排盘（四柱、分柱神煞、全局空亡+分柱命中、刑害合冲） |
| `bazi_pillars_resolve` | 四柱反推候选时间（1900-2100，候选主字段为农历，可直接农历排盘） |
| `ziwei_calculate` | 紫微斗数排盘 |
| `liuyao_analyze` | 六爻分析 |
| `tarot_draw` | 塔罗抽牌 |
| `daily_fortune` | 每日运势 |
| `liunian_analyze` | 流年流月分析 |

### MCP 配置

详细的[操作手册](/docs/manual/MCP-Server-Manual.md)

#### 方式一：本地运行 (Local)

```json
{
  "mcpServers": {
    "mingai": {
      "command": "npx",
      "args": ["tsx", "/path/to/MingAI/packages/mcp-local/src/index.ts"],
    }
  }
}
```

#### 方式二：远程服务器 (Server)

```json
{
  "mcpServers": {
    "mingai": {
      "url": "https://localhost:3000/sse",
      "headers": {
        "x-api-key": "你的API密钥"
      }
    }
  }
}
```

### 容器部署

支持三种方式：

```bash
# 准备环境变量（首次）
cp .env.example .env

# 1) 一键部署：同时启动 Web + MCP
docker compose up -d --build

# 2) 仅部署 Web
docker compose -f docker-compose.web.yml up -d --build

# 3) 仅部署 MCP
docker compose -f docker-compose.mcp.yml up -d --build
```

镜像用途：
- `Dockerfile`：生产 Web 镜像（运行用）
- `packages/mcp-server/Dockerfile`：生产 MCP 镜像（运行用）

默认端口：
- Web: `3000`
- MCP: `3001`

可选环境变量：
- `WEB_PORT`：映射到 Web 容器 3000 端口
- `MCP_PORT`：映射到 MCP 容器 3001 端口
- `MCP_API_KEY`：MCP 服务鉴权密钥（客户端通过 `x-api-key` 传递）

---

## 📚 文档

| 文档                                                              | 说明         |
| ----------------------------------------------------------------- | ------------ |
| [PRD](docs/plans/PRD-MingAI.md)                                   | 产品需求文档 |
| [Phase 1 报告](docs/deliverables/Phase1-MVP-Completion-Report.md) | MVP完成报告  |
| [Phase 2 报告](docs/deliverables/Phase2-Completion-Report.md)     | 体验增强报告 |
| [Phase 3 报告](docs/deliverables/Phase3-Completion-Report.md)     | 功能完善报告 |
| [Phase 4 报告](docs/deliverables/Phase4-Completion-Report.md)     | 功能扩展报告 |
| [Phase 5 报告](docs/deliverables/Phase5-Completion-Report.md)     | 体验优化报告 |
| [Phase 6 报告](docs/deliverables/Phase6-Completion-Report.md)     | 社区与AI增强 |
| [Phase 7 报告](docs/deliverables/Phase7-Completion-Report.md)     | 高级功能报告 |
| [Phase 8 报告](docs/deliverables/Phase8-Completion-Report.md)     | 移动端与AI体验 |

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
