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

MingAI provides an MCP (Model Context Protocol) server, so you can directly call metaphysics tools from MCP-compatible clients.

### Quick Setup

Add to your Claude Desktop / Cherry Studio MCP config — no manual download needed, just requires [Node.js](https://nodejs.org) 18+:

```json
{
  "mcpServers": {
    "mingai": {
      "command": "npx",
      "args": ["-y", "@mingai/mcp"]
    }
  }
}
```

### Supported Tools

| Tool | Function | Example Prompt |
| --- | --- | --- |
| `bazi_calculate` | Generate a Bazi chart (solar/lunar supported, 51 shensha types, stem combinations, branch half-combinations) | "I was born at 3:00 PM on May 15, 1990. Please generate my chart." |
| `bazi_pillars_resolve` | Reverse-lookup birth time from Four Pillars | "My Bazi is 丙午 庚寅 丙辰 癸巳, please analyze it." |
| `bazi_dayun` | Compute major luck cycles (10-year periods with annual transits, Tai Sui annotations, minor luck) | AI automatically calls this based on your Bazi |
| `ziwei_calculate` | Generate a Ziwei Doushu chart (Life/Body Master stars, Small Limit, Scholar Stars, San Fang Si Zheng) | "I was born on the 8th day of the 4th lunar month in 1990, please generate my Ziwei chart." |
| `ziwei_horoscope` | Ziwei fortune periods (decadal/yearly/monthly/daily with transit stars) | "What are my Ziwei fortune periods for 2026?" |
| `ziwei_flying_star` | Flying star analysis (four transformations, surrounded palaces) | "Analyze the flying stars of my Life Palace." |
| `liuyao` | Liuyao divination (auto-casting / custom hexagram / time-based / number-based, with nuclear/opposite/reversed hexagrams) | "I want to divine my career luck this year." |
| `tarot` | Draw Tarot cards (9 spreads, 78 cards with independent reversed keywords, astrological/elemental correspondences) | "Please draw a Tarot card for my recent love fortune." |
| `almanac` | Daily almanac & calendar query (directions, 12 hourly fortunes, 28 mansions) | "How is today's almanac? Is it suitable for a proposal?" |
| `qimen_calculate` | Qimen Dunjia charting (palaces, gates, stars, gods, dun type, ju number, explicit timezone) | "Use Qimen Dunjia to see whether today's negotiation is favorable." |
| `daliuren` | Da Liu Ren charting (four lessons, three transmissions, heavenly plate, generals, explicit timezone) | "Use Da Liu Ren to analyze the outcome of this matter." |

### SDK

If you want to call the calculation engine directly in your own Node.js project (without MCP), use the core library:

```bash
npm install @mingai/core
```

See [@mingai/core on npm](https://www.npmjs.com/package/@mingai/core) and [packages/core/README.md](packages/core/README.md) for full API docs and subpath exports.

### GitHub Packages Mirror

The npmjs package names stay as `@mingai/core` and `@mingai/mcp`. If you want to install the GitHub Packages mirror from this repository, use the GitHub owner scope plus a MingAI-specific package prefix instead:

- `@hhszzzz/mingai-core`
- `@hhszzzz/mingai-mcp`

```bash
echo "@hhszzzz:registry=https://npm.pkg.github.com" >> .npmrc
echo "//npm.pkg.github.com/:_authToken=YOUR_GITHUB_PAT" >> .npmrc
npm install @hhszzzz/mingai-core
```

Outside GitHub Actions, that PAT should include at least `read:packages`. For CI inside GitHub, the built-in `GITHUB_TOKEN` is enough. Repository owners can publish the mirror packages from `.github/workflows/publish-github-packages.yml`.

---

## 🚀 Quick Start

### Docker Deployment

Two deployment options are supported:

```bash
# Prepare environment variables (first time)
cp .env.example .env

# 1) One-command deployment: start both Web + MCP
docker compose up -d --build

# 2) Web only
docker compose -f docker-compose.web.yml up -d --build
```

Default ports:
- Web: `3000` ([http://localhost:3000](http://localhost:3000))
- MCP: `3001`

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
