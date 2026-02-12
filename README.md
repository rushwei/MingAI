<div align="center">

# 🔮 MingAI - AI Metaphysics

**Integrating traditional metaphysics with AI**

[![Next.js](https://img.shields.io/badge/Next.js-16+-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-black?style=flat-square&logo=vercel)](https://vercel.com/)

🌐 Language: **English** | [中文](README.zh-CN.md)

[🌐 Live Demo](https://www.mingai.fun) · [🐛 Report Issues](https://github.com/hhszzzz/MingAI/issues)

</div>

---

## ✨ Highlights

- 🔮 **Multiple Metaphysics Systems** - Bazi, Liuyao, Ziwei Doushu, Tarot, MBTI, Face Reading, Palm Reading, Synastry, Dream Interpretation
- 🤖 **AI-Powered Analysis** - Export chart/divination text for AI analysis with multi-model support, deep reasoning, and visual recognition
- 🔌 **MCP Server** - Supports Model Context Protocol (MCP), allowing direct use of metaphysics tools in MCP-compatible clients
- 📚 **History, Knowledge Base, and @Mentions** - Store records across all systems, add them into your personal knowledge base, and explicitly reference data sources
- 🎛️ **AI Personalization** - Expression style, user profile, and custom instructions with context/prompt budget visualization
- 📱 **Cross-Platform Experience** - Web + iOS/Android clients
- 💬 **Community and Incentives** - Metaphysics records, anonymous discussions, and daily check-in rewards

---

## 🖥️ Feature Overview

| Module | Core Capabilities |
| :----: | :--- |
| 🎎 **Bazi Charting** | · True solar time, solar/lunar calendar charting, instant charting, Four Pillars charting<br/>· Five elements, heavenly stems & earthly branches, Ten Gods, hidden stems, star phases, Na Yin, shensha, Twelve Growth Phases, clash/harm/combine/punishment<br/>· Major luck cycles, yearly/monthly/daily luck<br/>· Traditional and blind-school analysis |
| 🌟 **Ziwei Doushu** | · Twelve palaces, three-way/four-direction structure, main/support/minor stars, Four Transformations<br/>· Strength/fall states and fortune-cycle analysis |
| 🪙 **Liuyao Divination** | · Coin casting, quick casting, selected-hexagram casting, time-based casting<br/>· Explicit and implicit moving lines<br/>· Hexagram text, line text, image text<br/>· Useful spirit, original spirit, hidden spirit, adversary spirit<br/>· Void branches, self/opponent lines, strength states, clash/combine/harm<br/>· Timing prediction |
| 🃏 **Tarot Reading** | · Single-card, three-card spread, love spread, Celtic Cross<br/>· Reversed-card judgment, full 78-card interpretation, refined card visuals<br/>· Daily guidance |
| 💑 **Synastry** | · Couple, business, and parent-child analysis<br/>· Future trend lines<br/>· Communication advice |
| 👁️ **Face & Palm Reading** | · Forehead, nose, eyes, mouth analysis<br/>· Life line, wisdom line, career line, relationship line |
| 📈 **Fortune Center** | · Daily and monthly fortune analysis based on natal charts<br/>· Daily almanac<br/>· Future trend lines |
| 🧠 **MBTI Test** | · 90+ personality questions<br/>· Comprehensive AI personality analysis |
| 🤖 **Deep AI Integration** | · Combined analysis based on past readings<br/>· Full-system metaphysics analysis<br/>· Knowledge base, attachments, and search<br/>· Mention all metaphysics systems during AI chat |

---

## 🔌 MCP Server

MingAI provides an MCP (Model Context Protocol) server, so you can directly call metaphysics tools from MCP-compatible clients.<br/>
You can use the hosted endpoint `https://mcp.mingai.fun/mcp` or deploy locally. See the MCP configuration below.

### Supported Tools

| Tool | Function | Example Prompt |
| --- | --- | --- |
| `bazi_calculate` | Generate a Bazi chart (solar/lunar supported) | "I was born at 3:00 PM on May 15, 1990. Please generate my chart." |
| `bazi_pillars_resolve` | Analyze a Four Pillars Bazi chart | "My Bazi is 丙午 庚寅 丙辰 癸巳, please analyze it." |
| `ziwei_calculate` | Generate a Ziwei Doushu chart (solar/lunar supported) | "I was born on the 8th day of the 4th lunar month in 1990, please generate my Ziwei chart." |
| `liuyao_analyze` | Liuyao divination (auto-casting / custom hexagram) | "I want to divine my career luck this year, please cast and analyze."<br/>"I want to divine my romance luck. My hexagram is Qian over Qian changing to Kun over Kun." |
| `tarot_draw` | Draw Tarot cards | "Please draw a Tarot card for my recent love fortune." |
| `daily_fortune` | Daily almanac | "How is today's almanac? Is it suitable for a proposal?" |
| `liunian_analyze` | Compute major/yearly/monthly/daily cycles from birth info | AI automatically calls this based on your Bazi, no explicit prompt required |

---

## 🚀 Quick Start

### Docker Deployment

Three deployment options are supported:

```bash
# Prepare environment variables (first time)
cp .env.example .env

# 1) One-command deployment: start both Web + MCP
docker compose up -d --build

# 2) Web only
docker compose -f docker-compose.web.yml up -d --build

# 3) MCP only
docker compose -f docker-compose.mcp.yml up -d --build
```

Default ports:
- Web: `3000` ([http://localhost:3000](http://localhost:3000))
- MCP: `3001`

### MCP OAuth Authentication (Recommended)

For MCP clients that support OAuth (for example, ChatGPT / Claude ):

You can try our online services:
1. Add a Streamable HTTP MCP server and set URL to `https://mcp.mingai.fun`.
2. Do not set config; click Connect/Authorize directly.
3. You will be redirected to MingAI's OAuth login page. Sign in and approve access.

If your MCP client does not yet support OAuth, continue using the MCP configuration online service below.

### MCP Config (Streamable HTTP)

It also supports online services.

```json
{
  "mcpServers": {
    "mingai": {
      "type": "streamable-http",
      "url": "http://localhost:3001/mcp", // You can use for online services: https://mcp.mingai.fun/mcp
      "headers": {
        "x-api-key": "sk-mcp-mingai-xxxxxxxxxxxxxxxxxxxxxxxx" // Go to https://mingai.fun to register and obtain
      }
    }
  }
}
```

### Local Development

Requirements:
- Node.js 18+
- pnpm (recommended) / npm / yarn

```bash
# Clone repository
git clone git@github.com:hhszzzz/MingAI.git
cd MingAI

# Install dependencies
pnpm install

# Configure environment variables
cp .env.example .env
# Edit .env and fill required API keys

# Start dev server
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the app.

---

## 📚 Documentation

| Document | Description |
| --- | --- |
| [PRD](docs/plans/PRD-MingAI.md) | Product Requirements Document |
| [MCP Manual](/docs/manual/MCP-Server-Manual.md) | Detailed MCP operation guide |

---

## 📝 Planned Major Updates

- Qimen Dunjia
- Seven Governors and Four Remainders
- Plum Blossom Numerology
- Name Study

---

## 🤝 Contributing

Issues and Pull Requests are welcome.

---

## 📄 License

This project is for learning and communication purposes only.

---

<div align="center">

**MingAI** - Interpret destiny with AI, preserve culture with technology

Made with ❤️ by [hhszzzz](https://github.com/hhszzzz)

</div>
