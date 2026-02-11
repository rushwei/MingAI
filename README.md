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
- 🤖 **AI智能分析** - 支持导出命理体系文本进行AI分析，多模型支持，深度推理，视觉识别
- 🔌 **MCP Server** - 支持 Model Context Protocol（MCP），可在支持MCP的客户端中直接调用命理工具
- 📚 **历史记录、知识库与@提及** - 支持存储所有命理体系的记录，可将命理体系纳入个人知识库，显式引用命理体系数据源
- 🎛️ **AI个性化** - 表达风格/用户画像/自定义指令 + 提示词预算可视化
- 💳 **订阅与运营** - Key 激活、购买链接配置、支付开关、AI模型/来源管理
- 📱 **多端体验** - Web + iOS/Android 客户端
- 💬 **社区与激励** - 匿名讨论、签到等级、成就系统
- 🔐 **隐私优先** - Row Level Security 数据隔离，用户数据安全可控

---

## 🖥️ 命理功能预览

| 功能模块 | 核心特性 |
| :---: | :--- |
| **八字排盘** | 真太阳时阳历农历排盘/即时排盘/四柱排盘 · 五行天干地支 · 十神/藏干/星运/纳音/神煞/十二长生 · 大运/流年/流月/流日 · 刑害合冲 · 传统分析/盲派分析六十甲子惊天客 |
| **紫微斗数** | 十二宫位/三方四正 · 主星/辅星/杂曜 · 四化 · 旺衰落陷 · 运限分析 |
| **六爻占卜** | 硬币起卦/快速起卦/选卦起卦/时间起卦 · 爻变明动/暗动 · 卦辞/爻辞/象辞 · 用神/原神/伏神/仇神 · 空亡 · 世应 · 旺衰状态/刑冲合害 · 应期推测 |
| **塔罗占卜** | 单牌/三牌阵/爱情牌阵/凯尔特十字 · 逆位判定/78张完整牌面解读 · 每日运势指引 · 精美卡牌 |
| **关系合盘** | 情侣/商业/亲子 · 未来运势走线 · 沟通建议 |
| **面相/手相** | 专业面相/手相分析模型 · 天庭/鼻相/眼相/口相 · 生命线/智慧线/事业线/感情线|
| **运势中心** | 基于命盘的每日/每月运势分析 · 每日黄历 · 未来运势走线 |
| **MBTI性格测试** | 90+道性格测试题 · 综合AI分析性格  |
| **高度AI集成** | 根据过往占卜综合分析 · 命理体系全分析 · 知识库/附件/搜索 · 支持AI对话时提及所有命理体系 |

---

## 🔌 MCP Server

MingAI 提供 MCP (Model Context Protocol) Server，可在支持 MCP 的客户端中直接调用命理工具。

### 支持的工具

| 工具 | 功能（完整覆盖命理功能预览的所有特性） |
| --- | --- |
| `bazi_calculate` | 八字排盘（支持阳历/农历） |
| `bazi_pillars_resolve` | 八字四柱排盘 |
| `ziwei_calculate` | 紫微斗数排盘（支持阳历/农历） |
| `liuyao_analyze` | 六爻占卜（支持起卦/自主选卦） |
| `tarot_draw` | 塔罗抽牌 |
| `daily_fortune` | 每日黄历 |
| `liunian_analyze` | 根据出生时间计算大运流年流月流日 |

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

可选环境变量：
- `WEB_PORT`：映射到 Web 容器 3000 端口
- `MCP_PORT`：映射到 MCP 容器 3001 端口
- `MCP_API_KEY`：MCP 服务鉴权密钥（客户端通过 `x-api-key` 传递）

### MCP 配置 (Streamable HTTP)

```json
{
  "mcpServers": {
    "mingai": {
      "type": "streamable-http",
      "url": "http://localhost:3001/mcp", // 支持配置在线服务 https://mcp.mingai.fun/mcp
      "headers": {
        "x-api-key": "your-api-key" // 无api-key, headers可以去掉（在线服务无api-key）
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

| 文档                                                              | 说明         |
| ----------------------------------------------------------------- | ------------ |
| [PRD](docs/plans/PRD-MingAI.md)                                   | 产品需求文档 |
| [MCP操作手册](/docs/manual/MCP-Server-Manual.md) | MCP详细操作手册  |

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
