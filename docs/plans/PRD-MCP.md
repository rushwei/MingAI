# MingAI MCP Server 实现计划

## 概述

为 MingAI 项目实现 MCP (Model Context Protocol) Server，支持：
1. **本地模式 (stdio)** - 用户在本地运行，配置到 Claude Desktop
2. **线上模式 (SSE/HTTP)** - 部署到 Zeabur，支持远程调用

---

## 1. 目录结构

```
MingAI/
├── src/                          # 现有 Next.js 应用
│   └── lib/                      # 现有计算库
│       ├── bazi.ts              # 八字计算
│       ├── ziwei.ts             # 紫微斗数
│       ├── liuyao.ts            # 六爻
│       ├── tarot.ts             # 塔罗
│       └── fortune.ts           # 运势
│
├── packages/
│   ├── mcp-core/                # 共享 MCP 逻辑
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts         # 主导出
│   │       ├── tools.ts         # 工具定义
│   │       ├── handlers/        # 工具处理器
│   │       │   ├── index.ts
│   │       │   ├── bazi.ts
│   │       │   ├── ziwei.ts
│   │       │   ├── liuyao.ts
│   │       │   ├── tarot.ts
│   │       │   └── fortune.ts
│   │       └── types.ts         # 类型定义
│   │
│   ├── mcp-local/               # 本地 MCP Server (stdio)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       └── index.ts         # stdio 入口
│   │
│   └── mcp-server/              # 线上 MCP Server (SSE)
│       ├── package.json
│       ├── tsconfig.json
│       ├── Dockerfile
│       ├── zeabur.json
│       └── src/
│           ├── index.ts         # HTTP 入口
│           └── middleware.ts    # 认证、限流
│
└── pnpm-workspace.yaml          # Workspace 配置
```

---

## 2. MCP 工具定义

### 2.1 bazi_calculate - 八字计算

**功能**: 根据出生时间计算八字命盘

**输入参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| gender | 'male' \| 'female' | 是 | 性别 |
| birthYear | number | 是 | 出生年 (1900-2100) |
| birthMonth | number | 是 | 出生月 (1-12) |
| birthDay | number | 是 | 出生日 (1-31) |
| birthHour | number | 是 | 出生时 (0-23) |
| birthMinute | number | 否 | 出生分 (0-59)，默认 0 |
| calendarType | 'solar' \| 'lunar' | 否 | 历法，默认 solar |
| isLeapMonth | boolean | 否 | 是否闰月，默认 false |
| birthPlace | string | 否 | 出生地点 |

**输出格式**: JSON 格式（字段与 `generateBaziChartText()` 使用的数据一致）
```typescript
{
  gender: 'male' | 'female', // 性别
  birthPlace?: string,       // 出生地点
  dayMaster: string,         // 日主 (甲乙丙丁...)
  fourPillars: {
    year: {
      stem: string,          // 天干
      branch: string,        // 地支
      tenGod?: string,       // 十神
      hiddenStems: string[]  // 藏干
    },
    month: { stem, branch, tenGod?, hiddenStems },
    day: { stem, branch, hiddenStems },
    hour: { stem, branch, tenGod?, hiddenStems }
  },
  daYun: {
    startAgeDetail: string,  // 起运详情 "3岁2个月15天"
    list: Array<{
      startYear: number,      // 起运年份
      ganZhi: string         // 干支
    }>
  }
}
```

**实现**: 调用 `calculateBazi()` + `calculateProfessionalData()` 提取字段

### 2.2 ziwei_calculate - 紫微斗数

**功能**: 根据出生时间计算紫微命盘

**输入参数**: 同 bazi_calculate

**输出格式**: JSON 格式（字段与 `generateZiweiChartText()` 使用的数据一致）
```typescript
{
  solarDate: string,           // 阳历日期
  lunarDate: string,           // 农历日期
  fourPillars: {
    year: string,              // 年柱 "庚午"
    month: string,             // 月柱
    day: string,               // 日柱
    hour: string               // 时柱
  },
  soul: string,                // 命主
  body: string,                // 身主
  fiveElement: string,         // 五行局
  zodiac: string,              // 属相
  sign: string,                // 星座
  palaces: Array<{
    name: string,              // 宫名
    heavenlyStem: string,      // 天干
    earthlyBranch: string,     // 地支
    isBodyPalace: boolean,     // 是否身宫
    majorStars: Array<{
      name: string,
      brightness?: string,     // 庙/旺/得/利/平/不/陷
      mutagen?: string         // 禄/权/科/忌
    }>,
    minorStars: Array<{ name, brightness? }>,
    adjStars?: Array<{ name }>
  }>,
  decadalList: Array<{
    startAge: number,
    endAge: number,
    heavenlyStem: string,
    palace: { earthlyBranch, name }
  }>
}
```

**实现**: 调用 `calculateZiwei()` + `getDecadalList()` 提取字段

### 2.3 liuyao_analyze - 六爻分析

**功能**: 六爻卦象分析

**输入参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| question | string | 是 | 占卜问题 |
| method | 'auto' \| 'select' | 否 | 起卦方式，默认 auto |
| hexagramName | string | 否 | 选卦模式：卦名（如"天火同人"、"乾为天"） |
| changedHexagramName | string | 否 | 选卦模式：变卦名（动爻根据本卦与变卦自动计算） |
| date | string | 否 | 占卜日期 (ISO)，默认今天 |

**输出格式**: JSON 格式（字段与 `liuyaoProvider.formatForAI()` 使用的数据一致）
```typescript
{
  question: string,
  hexagramCode: string,           // 本卦代码 "111000"
  hexagramName: string,           // 本卦名
  changedHexagramCode?: string,   // 变卦代码
  changedHexagramName?: string,   // 变卦名
  changedLines: number[],         // 动爻位置
  ganZhiTime: {
    year: { gan, zhi },
    month: { gan, zhi },
    day: { gan, zhi },
    hour: { gan, zhi }
  },
  yongShen: {
    type: string,                 // 用神类型
    element: string,              // 五行
    position: number,             // 位置
    strength: string              // 旺衰
  },
  yongShenAnalysis?: string,      // 用神分析
  fuShen?: Array<...>,            // 伏神
  shenSystem?: {...},             // 原神/忌神/仇神
  liuChongGuaInfo?: {
    isLiuChongGua: boolean,
    description?: string
  },
  sanHeAnalysis?: {...},          // 三合局
  timeRecommendations?: Array<...>, // 时间建议
  summary?: {...},                // 总结
  fullAnalysis: object            // 完整分析数据
}
```

**实现**: 调用 `performFullAnalysis()` 提取字段

### 2.4 tarot_draw - 塔罗抽牌

**功能**: 塔罗牌抽牌

**输入参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| spreadType | string | 否 | 牌阵类型，默认 single |
| question | string | 否 | 占卜问题 |
| allowReversed | boolean | 否 | 允许逆位，默认 true |

**牌阵类型**: single, three-card, love, celtic-cross

**输出格式**: JSON 格式（字段与 `tarotProvider.formatForAI()` 使用的数据一致）
```typescript
{
  spreadId: string,
  spreadName: string,
  question?: string,
  cards: Array<{
    position: string,            // 位置含义
    card: {
      name: string,              // 英文名
      nameChinese: string,       // 中文名
      keywords: string[]         // 关键词
    },
    orientation: 'upright' | 'reversed',
    meaning: string              // 正位/逆位含义
  }>
}
```

**实现**: 调用 `drawForSpread()` 提取字段

### 2.5 daily_fortune - 每日运势

**功能**: 计算个性化每日运势

**输入参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| dayMaster | string | 否 | 日主天干 (甲乙丙丁...) |
| birthYear/Month/Day/Hour | number | 否 | 或提供出生时间 |
| date | string | 否 | 目标日期，默认今天 |

**输出格式**: JSON 格式
```typescript
{
  date: string,
  dayInfo: {
    stem: string,
    branch: string,
    ganZhi: string
  },
  tenGod?: string,               // 流日十神
  scores: {
    overall: number,             // 0-100
    career: number,
    love: number,
    wealth: number,
    health: number,
    social: number
  },
  advice: string[],
  luckyColor?: string,
  luckyDirection?: string,
  almanac: {                     // 今日黄历
    lunarDate: string,           // 农历日期
    lunarMonth: string,          // 农历月份
    lunarDay: string,            // 农历日
    zodiac: string,              // 生肖
    solarTerm?: string,          // 节气（如有）
    suitable: string[],          // 宜
    avoid: string[],             // 忌
    chongSha: string,            // 冲煞
    pengZuBaiJi: string[],       // 彭祖百忌
    jishen: string[],            // 吉神宜趋
    xiongsha: string[]           // 凶神宜忌
  }
}
```

**实现**: 调用现有运势计算逻辑提取字段

### 2.6 liunian_analyze - 流年流月分析

**功能**: 分析当前大运、流年、流月对命主的影响

**输入参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| gender | 'male' \| 'female' | 是 | 性别 |
| birthYear | number | 是 | 出生年 (1900-2100) |
| birthMonth | number | 是 | 出生月 (1-12) |
| birthDay | number | 是 | 出生日 (1-31) |
| birthHour | number | 是 | 出生时 (0-23) |
| birthMinute | number | 否 | 出生分 (0-59)，默认 0 |
| calendarType | 'solar' \| 'lunar' | 否 | 历法，默认 solar |
| isLeapMonth | boolean | 否 | 是否闰月，默认 false |
| targetYear | number | 否 | 目标年份，默认当前年 |
| targetMonth | number | 否 | 目标月份 (1-12) |

**输出格式**: JSON 格式
```typescript
{
  currentDaYun: {
    startAge: number,        // 起运年份
    endAge: number,          // 结束年份
    ganZhi: string,          // 大运干支
    tenGod: string           // 大运十神
  },
  liunian: {
    year: number,            // 流年年份
    ganZhi: string,          // 流年干支
    tenGod: string           // 流年十神
  },
  liuyue?: {
    month: number,           // 流月月份
    ganZhi: string,          // 流月干支
    tenGod: string           // 流月十神
  },
  analysis: {
    trend: 'favorable' | 'neutral' | 'unfavorable',
    keyFactors: string[]     // 关键因素分析
  }
}
```

**实现**: 调用 `lunar-javascript` 计算大运、流年、流月干支，分析十神吉凶趋势

---

## 3. 核心实现

### 3.1 mcp-core 包

**关键设计**: MCP 工具的输出直接复用现有的 `formatForAI` 方法和 `generateXxxChartText` 函数，确保输出格式与项目中传给 AI 的内容完全一致。

**文件**: `packages/mcp-core/src/handlers/bazi.ts`

```typescript
import { calculateBazi, calculateProfessionalData } from '../../../src/lib/bazi';

export async function handleBaziCalculate(input: BaziInput) {
  const formData = { ...input, birthMinute: input.birthMinute || 0 };
  const chart = calculateBazi(formData);
  const proData = calculateProfessionalData(formData);

  return {
    gender: chart.gender,
    birthPlace: chart.birthPlace,
    dayMaster: chart.dayMaster,
    fourPillars: {
      year: {
        stem: chart.fourPillars.year.stem,
        branch: chart.fourPillars.year.branch,
        tenGod: chart.fourPillars.year.tenGod,
        hiddenStems: chart.fourPillars.year.hiddenStems
      },
      month: {
        stem: chart.fourPillars.month.stem,
        branch: chart.fourPillars.month.branch,
        tenGod: chart.fourPillars.month.tenGod,
        hiddenStems: chart.fourPillars.month.hiddenStems
      },
      day: {
        stem: chart.fourPillars.day.stem,
        branch: chart.fourPillars.day.branch,
        hiddenStems: chart.fourPillars.day.hiddenStems
      },
      hour: {
        stem: chart.fourPillars.hour.stem,
        branch: chart.fourPillars.hour.branch,
        tenGod: chart.fourPillars.hour.tenGod,
        hiddenStems: chart.fourPillars.hour.hiddenStems
      }
    },
    daYun: {
      startAgeDetail: proData.startAgeDetail,
      list: proData.daYun.map(d => ({ startAge: d.startAge, ganZhi: d.ganZhi }))
    }
  };
}
```

**文件**: `packages/mcp-core/src/handlers/ziwei.ts`

```typescript
import { calculateZiwei, getDecadalList } from '../../../src/lib/ziwei';

export async function handleZiweiCalculate(input: ZiweiInput) {
  const chart = calculateZiwei(input);
  const decadalList = getDecadalList(chart);

  return {
    solarDate: chart.solarDate,
    lunarDate: chart.lunarDate,
    fourPillars: {
      year: `${chart.yearStem}${chart.yearBranch}`,
      month: `${chart.monthStem}${chart.monthBranch}`,
      day: `${chart.dayStem}${chart.dayBranch}`,
      hour: `${chart.hourStem}${chart.hourBranch}`
    },
    soul: chart.soul,
    body: chart.body,
    fiveElement: chart.fiveElement,
    zodiac: chart.zodiac,
    sign: chart.sign,
    palaces: chart.palaces.map(p => ({
      name: p.name,
      heavenlyStem: p.heavenlyStem,
      earthlyBranch: p.earthlyBranch,
      isBodyPalace: p.isBodyPalace,
      majorStars: p.majorStars,
      minorStars: p.minorStars,
      adjStars: p.adjStars
    })),
    decadalList
  };
}
```

**文件**: `packages/mcp-core/src/handlers/tarot.ts`

```typescript
import { drawForSpread, TAROT_SPREADS } from '../../../src/lib/tarot';

export async function handleTarotDraw(input: TarotInput) {
  const spreadId = input.spreadType || 'single';
  const result = drawForSpread(spreadId, input.allowReversed ?? true);
  const spread = TAROT_SPREADS.find(s => s.id === spreadId);

  return {
    spreadId,
    spreadName: spread?.name || spreadId,
    question: input.question,
    cards: result.cards.map((drawn, index) => ({
      position: drawn.position || `第${index + 1}张`,
      card: {
        name: drawn.card.name,
        nameChinese: drawn.card.nameChinese,
        keywords: drawn.card.keywords
      },
      orientation: drawn.orientation,
      meaning: drawn.orientation === 'reversed'
        ? drawn.card.reversedMeaning
        : drawn.card.uprightMeaning
    }))
  };
}
```

**文件**: `packages/mcp-core/src/handlers/liuyao.ts`

```typescript
import {
  performFullAnalysis,
  generateHexagram,
  getHexagramByName
} from '../../../src/lib/liuyao';

export async function handleLiuyaoAnalyze(input: LiuyaoInput) {
  const date = input.date ? new Date(input.date) : new Date();

  let hexagramCode: string;
  let changedLines: number[] = input.changedLines || [];
  let changedHexagramCode: string | undefined;

  if (input.method === 'select' && input.hexagramName) {
    // 选卦起卦：根据卦名查找卦象代码
    const hexagram = getHexagramByName(input.hexagramName);
    if (!hexagram) {
      throw new Error(`未找到卦象：${input.hexagramName}`);
    }
    hexagramCode = hexagram.code;

    // 如果提供了变卦名，也查找变卦代码
    if (input.changedHexagramName) {
      const changedHex = getHexagramByName(input.changedHexagramName);
      if (changedHex) {
        changedHexagramCode = changedHex.code;
      }
    }
  } else {
    // 自动起卦
    const result = generateHexagram();
    hexagramCode = result.hexagramCode;
    changedLines = result.changedLines;
  }

  // 完整分析
  const analysis = performFullAnalysis(
    hexagramCode,
    changedLines,
    date,
    input.question,
    changedHexagramCode
  );

  return {
    question: input.question,
    hexagramCode: analysis.hexagramCode,
    hexagramName: analysis.hexagramName,
    changedHexagramCode: analysis.changedHexagramCode,
    changedHexagramName: analysis.changedHexagramName,
    changedLines: analysis.changedLines,
    ganZhiTime: analysis.ganZhiTime,
    yongShen: analysis.yongShen,
    yongShenAnalysis: analysis.yongShenAnalysis,
    fuShen: analysis.fuShen,
    shenSystem: analysis.shenSystem,
    liuChongGuaInfo: analysis.liuChongGuaInfo,
    sanHeAnalysis: analysis.sanHeAnalysis,
    timeRecommendations: analysis.timeRecommendations,
    summary: analysis.summary,
    fullAnalysis: analysis
  };
}
```

**文件**: `packages/mcp-core/src/handlers/fortune.ts`

```typescript
import { calculateDailyFortune, getAlmanac } from '../../../src/lib/fortune';
import { calculateBazi } from '../../../src/lib/bazi';

export async function handleDailyFortune(input: FortuneInput) {
  const targetDate = input.date ? new Date(input.date) : new Date();

  let dayMaster = input.dayMaster;

  // 如果提供了出生时间，计算日主
  if (!dayMaster && input.birthYear) {
    const chart = calculateBazi({
      birthYear: input.birthYear,
      birthMonth: input.birthMonth,
      birthDay: input.birthDay,
      birthHour: input.birthHour || 12,
      gender: 'male'
    });
    dayMaster = chart.dayMaster;
  }

  const fortune = calculateDailyFortune(targetDate, dayMaster);
  const almanac = getAlmanac(targetDate);

  return {
    date: targetDate.toISOString().split('T')[0],
    dayInfo: {
      stem: fortune.dayStem,
      branch: fortune.dayBranch,
      ganZhi: `${fortune.dayStem}${fortune.dayBranch}`
    },
    tenGod: fortune.tenGod,
    scores: {
      overall: fortune.overallScore,
      career: fortune.careerScore,
      love: fortune.loveScore,
      wealth: fortune.wealthScore,
      health: fortune.healthScore,
      social: fortune.socialScore
    },
    advice: fortune.advice,
    luckyColor: fortune.luckyColor,
    luckyDirection: fortune.luckyDirection,
    almanac: {
      lunarDate: almanac.lunarDate,
      lunarMonth: almanac.lunarMonth,
      lunarDay: almanac.lunarDay,
      zodiac: almanac.zodiac,
      solarTerm: almanac.solarTerm,
      suitable: almanac.suitable,
      avoid: almanac.avoid,
      chongSha: almanac.chongSha,
      pengZuBaiJi: almanac.pengZuBaiJi,
      jishen: almanac.jishen,
      xiongsha: almanac.xiongsha
    }
  };
}
```

### 3.2 本地 MCP Server (stdio)

**文件**: `packages/mcp-local/src/index.ts`

```typescript
#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { tools, handleToolCall } from '@mingai/mcp-core';

const server = new Server(
  { name: 'mingai-mcp', version: '1.0.0' },
  { capabilities: { tools:  } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map(t => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const result = await handleToolCall(request.params.name, request.params.arguments);
  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

### 3.3 线上 MCP Server (SSE)

**文件**: `packages/mcp-server/src/index.ts`

```typescript
import express from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { tools, handleToolCall } from '@mingai/mcp-core';
import { authMiddleware, rateLimitMiddleware } from './middleware';

const app = express();

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get('/sse', authMiddleware, rateLimitMiddleware, async (req, res) => {
  const transport = new SSEServerTransport('/message', res);
  const server = new Server(
    { name: 'mingai-mcp-online', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );
  // ... 同本地版本的 handler 设置
  await server.connect(transport);
});

app.post('/message', authMiddleware, (req, res) => {
  // SSEServerTransport 内部处理
});

app.listen(process.env.PORT || 3001);
```

**文件**: `packages/mcp-server/src/middleware.ts`

```typescript
export function authMiddleware(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  if (!apiKey || apiKey !== process.env.MCP_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

export function rateLimitMiddleware(req, res, next) {
  // 简单内存限流，生产环境用 Redis
  // 60 requests/minute
  next();
}
```

---

## 4. 部署配置

### 4.1 Claude Desktop 配置 (本地)

**文件**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "mingai": {
      "command": "npx",
      "args": ["-y", "@mingai/mcp-local"]
    }
  }
}
```

或本地开发：
```json
{
  "mcpServers": {
    "mingai": {
      "command": "node",
      "args": ["/path/to/MingAI/packages/mcp-local/dist/index.js"]
    }
  }
}
```

### 4.2 Claude Desktop 配置 (SSE 模式)

**环境变量配置**: 项目根目录 `.env`

```bash
MCP_API_KEY=your-secret-key
PORT=3001
```

**启动服务**:

```bash
cd packages/mcp-server
pnpm dev
```

**Claude Desktop 配置**:

```json
{
  "mcpServers": {
    "mingai-sse": {
      "url": "http://localhost:3001/sse",
      "headers": {
        "x-api-key": "your-secret-key"
      }
    }
  }
}
```

**注意**: SSE 模式需要先手动启动服务，Claude Desktop 不会自动启动。

### 4.3 Zeabur 部署 (线上)

**文件**: `packages/mcp-server/zeabur.json`

```json
{
  "name": "mingai-mcp-server",
  "build": {
    "type": "nodejs"
  },
  "env": {
    "MCP_API_KEY": "@MCP_API_KEY",
    "PORT": "3001"
  }
}
```

**文件**: `packages/mcp-server/Dockerfile`

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY dist ./dist
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

### 4.3 pnpm workspace 配置

**文件**: `pnpm-workspace.yaml`

```yaml
packages:
  - 'packages/*'
```

---

## 5. 实现步骤

### 第一阶段：基础架构

1. 创建 `packages/` 目录结构
2. 配置 `pnpm-workspace.yaml`
3. 创建 `mcp-core` 包基础结构
4. 安装 MCP SDK: `@modelcontextprotocol/sdk`

### 第二阶段：核心逻辑

1. 实现 `mcp-core/src/tools.ts` - 工具定义
2. 实现 `mcp-core/src/handlers/bazi.ts` - 八字处理器
3. 实现 `mcp-core/src/handlers/ziwei.ts` - 紫微处理器
4. 实现 `mcp-core/src/handlers/liuyao.ts` - 六爻处理器
5. 实现 `mcp-core/src/handlers/tarot.ts` - 塔罗处理器
6. 实现 `mcp-core/src/handlers/fortune.ts` - 运势处理器

### 第三阶段：本地 Server

1. 创建 `mcp-local` 包
2. 实现 stdio 入口
3. 本地测试

### 第四阶段：线上 Server

1. 创建 `mcp-server` 包
2. 实现 SSE/HTTP 入口
3. 添加认证和限流中间件
4. 配置 Dockerfile 和 zeabur.json
5. 部署到 Zeabur

---

## 6. 关键文件清单

### 新建文件

| 文件 | 功能 |
|------|------|
| `pnpm-workspace.yaml` | Workspace 配置 |
| `packages/mcp-core/package.json` | 核心包配置 |
| `packages/mcp-core/tsconfig.json` | TS 配置 |
| `packages/mcp-core/src/index.ts` | 主导出 |
| `packages/mcp-core/src/tools.ts` | 工具定义 |
| `packages/mcp-core/src/types.ts` | 类型定义 |
| `packages/mcp-core/src/handlers/index.ts` | 处理器导出 |
| `packages/mcp-core/src/handlers/bazi.ts` | 八字处理器 |
| `packages/mcp-core/src/handlers/ziwei.ts` | 紫微处理器 |
| `packages/mcp-core/src/handlers/liuyao.ts` | 六爻处理器 |
| `packages/mcp-core/src/handlers/tarot.ts` | 塔罗处理器 |
| `packages/mcp-core/src/handlers/fortune.ts` | 运势处理器 |
| `packages/mcp-local/package.json` | 本地包配置 |
| `packages/mcp-local/tsconfig.json` | TS 配置 |
| `packages/mcp-local/src/index.ts` | stdio 入口 |
| `packages/mcp-server/package.json` | 线上包配置 |
| `packages/mcp-server/tsconfig.json` | TS 配置 |
| `packages/mcp-server/src/index.ts` | HTTP 入口 |
| `packages/mcp-server/src/middleware.ts` | 中间件 |
| `packages/mcp-server/Dockerfile` | Docker 配置 |
| `packages/mcp-server/zeabur.json` | Zeabur 配置 |

---

## 7. 验证方式

### 本地测试

```bash
# 1. 构建
cd packages/mcp-core && pnpm build
cd packages/mcp-local && pnpm build

# 2. 测试 stdio
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node packages/mcp-local/dist/index.js

# 3. 配置 Claude Desktop 并测试
```

### 线上测试

```bash
# 1. 本地启动
cd packages/mcp-server && pnpm dev

# 2. 测试健康检查
curl http://localhost:3001/health

# 3. 测试 SSE 连接
curl -H "x-api-key: your-key" http://localhost:3001/sse

# 4. 部署到 Zeabur 后测试
```

### 功能测试

在 Claude Desktop 中测试：
- "帮我算一下 1990-05-15 14:00 出生的八字"
- "用紫微斗数分析 1985-03-20 10:30 的命盘"
- "帮我起一卦，问事业发展"
- "抽一张塔罗牌"
- "查看今天的运势"

---

## 8. 注意事项

1. **依赖处理**: `lunar-javascript` 和 `iztro` 需要在 mcp-core 中正确引用
2. **路径别名**: 需要配置 tsconfig paths 或使用相对路径
3. **类型导出**: 确保 src/types 中的类型可被 mcp-core 使用
4. **构建顺序**: mcp-core → mcp-local/mcp-server
5. **环境变量**: 线上版本需要配置 MCP_API_KEY
