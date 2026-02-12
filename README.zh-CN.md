<div align="center">

# 🔮 MingAI - AI命理

**将传统命理文化与AI深度融合**

[![Next.js](https://img.shields.io/badge/Next.js-16+-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-black?style=flat-square&logo=vercel)](https://vercel.com/)

🌐 语言 / Language: [English](README.md) | **中文**

[🌐 在线体验](https://www.mingai.fun) · [🐛 报告问题](https://github.com/hhszzzz/MingAI/issues)

</div>

---

## ✨ 产品亮点

- 🔮 **多命理体系** - 八字、六爻、紫微、塔罗、MBTI、面相、手相、合盘、周公解梦
- 🤖 **AI智能分析** - 支持导出命理体系文本进行AI分析，多模型支持，深度推理，视觉识别
- 🔌 **MCP Server** - 支持 Model Context Protocol（MCP），可在支持MCP的客户端中直接调用命理工具
- 📚 **历史记录、知识库与@提及** - 支持存储所有命理体系的记录，可将命理体系纳入个人知识库，显式引用命理体系数据源
- 🎛️ **AI个性化** - 表达风格/用户画像/自定义指令 + 上下文、提示词预算可视化
- 📱 **多端体验** - Web + iOS/Android 客户端
- 💬 **社区与激励** - 命理记录、匿名讨论、签到激励

---

## 🖥️ 命理功能预览

| 功能模块 | 核心特性 |
| :----: | :--- |
| 🎎 **八字排盘** | · 真太阳时、阳历农历排盘、即时排盘、四柱排盘<br/>· 五行天干地支、十神、藏干、星运、纳音、神煞、十二长生、刑害合冲<br/>· 大运、流年、流月、流日<br/>· 传统分析、盲派分析 |
| 🌟 **紫微斗数** | · 十二宫位、三方四正 · 主星、辅星、杂曜、四化<br/>· 旺衰落陷、运限分析 |
| 🪙 **六爻占卜** | · 硬币起卦、快速起卦、选卦起卦、时间起卦<br/>· 爻变明动、暗动<br/>· 卦辞、爻辞、象辞<br/>· 用神、原神、伏神、仇神<br/>· 空亡 · 世应、旺衰状态、刑冲合害<br/>· 应期推测 |
| 🃏 **塔罗占卜** | · 单牌、三牌阵、爱情牌阵、凯尔特十字<br/>· 逆位判定、78张完整牌面解读、精美卡牌<br/>· 每日运势指引 |
| 💑 **关系合盘** | · 情侣、商业、亲子<br/>· 未来运势走线<br/>· 沟通建议 |
| 👁️ **面相、手相** | · 天庭、鼻相、眼相、口相<br/>· 生命线、智慧线、事业线、感情线 |
| 📈 **运势中心** | · 基于命盘的每日、每月运势分析<br/>· 每日黄历<br/>· 未来运势走线 |
| 🧠 **MBTI性格测试** | · 90+道性格测试题<br/>· 综合AI分析性格 |
| 🤖 **高度AI集成** | · 根据过往占卜综合分析<br/>· 命理体系全分析<br/>· 知识库、附件、搜索<br/>· 支持AI对话时提及所有命理体系 |

---

## 🔌 MCP Server

MingAI 提供 MCP (Model Context Protocol) Server，可在支持 MCP 的客户端中直接调用命理工具。<br/>
可配置在线服务 https://mcp.mingai.fun/mcp ，也可本地部署。详细配置见下方MCP配置

### 支持的工具

| 工具 | 功能 | 提问例子 |
| --- | --- | --- |
| `bazi_calculate` | 八字排盘（支持阳历/农历） | "我是1990年5月15日15点生，请帮我排盘" |
| `bazi_pillars_resolve` | 八字四柱排盘 | "我的八字是丙午庚寅丙辰癸巳，请帮我分析" |
| `ziwei_calculate` | 紫微斗数排盘（支持阳历/农历） | "我是农历1990年4月初八生，请排紫微盘" |
| `liuyao_analyze` | 六爻占卜（支持起卦/自主选卦） | "我想占卜今年的事业运，请帮我起卦分析"、<br/>"我想占卜桃花运，我起的卦是乾为天变地为坤" |
| `tarot_draw` | 塔罗抽牌 | "请为我抽一张塔罗牌，关于近期的爱情运势" |
| `daily_fortune` | 每日黄历 | "今天的黄历怎么样？适合求婚吗？" |
| `liunian_analyze` | 根据出生时间计算大运流年流月流日 | AI会自动分析你的八字调用计算，无需提问 |

---

## 🚀 快速开始

### docker部署

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

默认端口：
- Web: `3000` （[http://localhost:3000](http://localhost:3000)）
- MCP: `3001`

必填环境变量：
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SYSTEM_ADMIN_EMAIL`（完整服务端任务/管理能力必填）
- `SUPABASE_SYSTEM_ADMIN_PASSWORD`（完整服务端任务/管理能力必填）

可选环境变量：
- `WEB_PORT`：映射到 Web 容器 3000 端口
- `MCP_PORT`：映射到 MCP 容器 3001 端口
- `MCP_ALLOWED_ORIGINS`：MCP 浏览器 Origin 白名单（逗号分隔，调试时可用 `*`）
- `MCP_ALLOWED_HOSTS`：MCP Host 白名单（可选，逗号分隔）
- `MCP_MAX_SESSIONS`、`MCP_SESSION_TTL_MS`、`MCP_SESSION_IDLE_MS`、`MCP_MAX_SSE_PER_USER`、`MCP_TRUST_PROXY`

MCP 鉴权说明：
- MCP 不再使用单一 `MCP_API_KEY` 环境变量。
- 访问密钥改为用户级 `mcp_api_keys`（可在 MingAI 用户页 `/user/mcp` 生成）。

本地启动说明：
- 仅跑 Web UI/前端联调（不启 MCP、不走服务端管理/后台接口）：只填 `SUPABASE_URL` + `SUPABASE_ANON_KEY` 即可。
- MCP 全链路（用户 Key 管理 + MCP Server 鉴权）已不依赖 service role 密钥。
- 完整服务端管理/系统任务能力改为使用系统管理员会话（`SUPABASE_SYSTEM_ADMIN_EMAIL` + `SUPABASE_SYSTEM_ADMIN_PASSWORD`）。

### MCP 配置 (Streamable HTTP)

```json
{
  "mcpServers": {
    "mingai": {
      "type": "streamable-http",
      "url": "http://localhost:3001/mcp", // 支持配置在线服务 https://mcp.mingai.fun/mcp
      "headers": {
        "x-api-key": "sk-mcp-mingai-xxxxxxxxxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

### 开发环境部署

环境要求：
- Node.js 18+
- pnpm (推荐) / npm / yarn

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

## 📚 文档

| 文档 | 说明 |
| --- | --- |
| [PRD](docs/plans/PRD-MingAI.md) | 产品需求文档 |
| [MCP操作手册](/docs/manual/MCP-Server-Manual.md) | MCP详细操作手册 |

---

## 📝 后续主要更新内容

- 奇门遁甲
- 七政四余
- 梅花易数
- 姓名学

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
