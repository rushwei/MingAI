# MingAI MCP Server 操作手册

## 目录

1. [概述](#概述)
2. [架构说明](#架构说明)
3. [安装与配置](#安装与配置)
4. [工具列表](#工具列表)
5. [API 调用方式](#api-调用方式)
6. [使用示例](#使用示例)
7. [部署指南](#部署指南)
8. [常见问题](#常见问题)

---

## 概述

MingAI MCP Server 是基于 [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) 实现的命理工具服务，为支持 MCP 协议的 AI 助手提供专业的中国传统命理计算能力。

### 支持的功能

| 功能 | 描述 |
|------|------|
| 八字计算 | 根据出生时间计算四柱八字、十神、藏干、大运、分柱神煞与空亡 |
| 四柱反推 | 根据输入四柱（年/月/日/时）返回候选出生时间（1900-2100） |
| 大运流年 | 计算大运、小运与流年链路 |
| 紫微斗数 | 计算紫微命盘、十二宫位、星曜分布、大限与运限 |
| 六爻占卜 | 自动起卦或选卦，分析用神、变卦、干支时间 |
| 塔罗抽牌 | 支持单牌、三牌阵、爱情牌阵、凯尔特十字 |
| 黄历查询 | 查询干支、宜忌、吉神凶煞、方位、十二时辰吉凶等完整黄历信息 |
| 奇门遁甲 | 输出九宫、八门、九星、八神、值符值使与格局判断 |
| 大六壬 | 输出四课三传、天地盘、天将、课体、神煞与旺衰信息 |

### 运行模式

- **本地模式 (stdio)**: 通过标准输入输出通信，适合配置到支持 MCP 的客户端
- **线上模式 (Streamable HTTP)**: 通过 MCP Streamable HTTP 端点提供连接，适合远程部署

---

## 架构说明

### 目录结构

```
packages/
├── core/                 # 核心共享逻辑
│   ├── src/
│   │   ├── index.ts          # 主导出
│   │   ├── tool-schema.ts    # 工具 schema
│   │   ├── tool-registry.ts  # 工具注册表
│   │   ├── tool-output.ts    # 统一输出渲染
│   │   ├── transport.ts      # MCP payload 适配
│   │   ├── types.ts          # TypeScript 类型
│   │   ├── timezone-utils.ts # 时区与时间辅助
│   │   └── handlers/         # 工具处理器
│   │       ├── bazi.ts       # 八字计算
│   │       ├── bazi-pillars-resolve.ts # 四柱反推候选时间
│   │       ├── ziwei.ts      # 紫微斗数
│   │       ├── liuyao.ts     # 六爻分析
│   │       ├── tarot.ts      # 塔罗抽牌
│   │       ├── fortune.ts    # 黄历查询
│   │       ├── liunian.ts    # 大运/流年
│   │       ├── qimen.ts      # 奇门遁甲
│   │       └── daliuren.ts   # 大六壬
│   └── dist/                 # 编译输出
│
├── mcp/                # 本地 MCP Server (stdio)
│   ├── src/index.ts          # stdio 入口
│   └── dist/index.js         # 可执行文件
│
└── mcp-server/               # 线上 MCP Server (Streamable HTTP)
    ├── src/
    │   ├── index.ts          # HTTP 入口
    │   ├── middleware.ts     # 认证/限流中间件
    │   ├── oauth/            # OAuth 2.1 provider / login / authorize page
    │   └── supabase.ts       # 受控 Supabase 客户端
    └── dist/                 # 编译输出
```

### 依赖关系

```
┌─────────────┐     ┌─────────────┐
│  mcp  │────▶│  core   │
└─────────────┘     └─────────────┘
                          ▲
┌─────────────┐           │
│ mcp-server  │───────────┘
└─────────────┘
```

### 核心依赖库

| 库 | 版本 | 用途 |
|---|---|---|
| `@modelcontextprotocol/sdk` | 1.25.3 | MCP 协议实现 |
| `lunar-javascript` | ^1.7.7 | 农历/八字/黄历计算 |
| `iztro` | ^2.5.4 | 紫微斗数排盘 |
| `liuren-ts-lib` | ^1.9.0 | 大六壬起课 |
| `taobi` | ^0.4.5 | 奇门遁甲排盘 |
| `express` | ^4.21.0 | HTTP 服务器 (仅线上模式) |
| `@supabase/supabase-js` | ^2.89.0 | MCP 在线模式鉴权与 OAuth 存储 |

---

## 安装与配置

### 前置要求

- Node.js >= 20.0.0
- pnpm >= 8.0.0

### 安装步骤

```bash
# 1. 进入项目目录
cd /Users/hhs/Develop/Project/MingAI

# 2. 安装依赖
pnpm install

# 3. 构建所有包
cd packages/core && pnpm build
cd ../mcp && pnpm build
cd ../mcp-server && pnpm build
```

### MCP 客户端配置

#### 方式一：本地模式 (stdio)

适用于本地运行，通过标准输入输出通信。

编辑配置文件（以 Cherry Studio 为例）：`设置 -> MCP 服务器 -> 从 JSON 导入`

```json
{
  "mcpServers": {
    "mingai": {
      "command": "node",
      "args": ["/Users/hhs/Develop/Project/MingAI/packages/mcp/dist/index.js"]
    }
  }
}
```

#### 方式二：线上模式 (Streamable HTTP)

适用于远程部署，通过 MCP Streamable HTTP 连接。

**本地测试：**

先启动线上 MCP 服务器：
```bash
cd packages/mcp-server && pnpm start
```

然后配置 MCP 客户端：
```json
{
  "mcpServers": {
    "mingai": {
      "type": "streamable-http",
      "url": "http://localhost:3001/mcp",
      "headers": {
        "x-api-key": "sk-mcp-mingai-xxxxxxxxxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

**远程部署（如 Zeabur）：**

```json
{
  "mcpServers": {
    "mingai": {
      "type": "streamable-http",
      "url": "https://your-domain.zeabur.app/mcp",
      "headers": {
        "x-api-key": "sk-mcp-mingai-xxxxxxxxxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

`x-api-key` 为用户级密钥，来源于 MingAI 用户页 `/user/mcp`（服务端存储在 `mcp_api_keys` 表）。

配置完成后重启 MCP 客户端，即可在对话中使用命理工具。

---

## 工具列表

当前完整工具面以 `packages/core/src/tool-schema.ts` 为准；本手册保留常用工具的详细说明，并补充当前版本新增的奇门遁甲与大六壬入口。

### 1. bazi_calculate - 八字计算

根据出生时间计算八字命盘，包含四柱、十神、藏干气性/十神、分柱神煞、分柱空亡、地支刑害合冲关系与大运等信息。

**输入参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| gender | string | ✅ | 性别：`male` 或 `female` |
| birthYear | number | ✅ | 出生年 (1900-2100)，`calendarType=lunar` 时表示农历年 |
| birthMonth | number | ✅ | 出生月 (1-12)，`calendarType=lunar` 时表示农历月 |
| birthDay | number | ✅ | 出生日，`calendarType=lunar` 时按农历月天数校验 |
| birthHour | number | ✅ | 出生时 (0-23) |
| birthMinute | number | | 出生分 (0-59)，默认 0 |
| calendarType | string | | 历法：`solar`(阳历) 或 `lunar`(农历)，默认 solar |
| isLeapMonth | boolean | | 是否闰月（仅 `calendarType=lunar` 有效，且会校验该年该月是否真实闰月），默认 false |
| birthPlace | string | | 出生地点（可选） |

**输出字段：**

```typescript
{
  gender: 'male' | 'female',
  birthPlace?: string,
  dayMaster: string,           // 日主天干
  kongWang: {                  // 全局空亡（按日柱查空亡）
    xun: string,
    kongZhi: [string, string]
  },
  fourPillars: {
    year: PillarInfo,          // 年柱
    month: PillarInfo,         // 月柱
    day: PillarInfo,           // 日柱
    hour: PillarInfo           // 时柱
  },
  daYun: {
    startAgeDetail: string,    // 起运详情
    list: Array<{
      startYear: number,
      ganZhi: string,
      tenGod: string,          // 大运天干十神
      branchTenGod: string     // 大运地支主气十神
    }>
  },
  relations: RelationInfo[]    // 地支刑害合冲关系列表
}

// PillarInfo 结构
{
  stem: string,                // 天干
  branch: string,              // 地支
  tenGod?: string,             // 十神
  hiddenStems: Array<{         // 藏干明细
    stem: string,              // 藏干天干
    qiType: '本气' | '中气' | '余气',
    tenGod: string
  }>,
  naYin?: string,              // 纳音（如"海中金"）
  diShi?: string,              // 地势/十二长生（如"长生"、"帝旺"）
  shenSha: string[],           // 本柱神煞
  kongWang: {
    isKong: boolean            // 本柱地支是否入空亡
  }
}

// RelationInfo 结构
{
  type: '合' | '冲' | '刑' | '害',
  pillars: Array<'年支' | '月支' | '日支' | '时支'>,
  description: string,
  isAuspicious: boolean
}
```

### 2. bazi_pillars_resolve - 四柱反推候选时间

输入四柱（年/月/日/时）后，返回 1900-2100 年范围内的全部候选时间。候选主字段使用农历语义，可直接用于下一步农历排盘（`bazi_calculate`）。

**输入参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| yearPillar | string | ✅ | 年柱，2字干支（如 `甲子`） |
| monthPillar | string | ✅ | 月柱，2字干支（如 `乙丑`） |
| dayPillar | string | ✅ | 日柱，2字干支（如 `丙寅`） |
| hourPillar | string | ✅ | 时柱，2字干支（如 `丁卯`） |

**输出字段：**

```typescript
{
  pillars: {
    yearPillar: string,
    monthPillar: string,
    dayPillar: string,
    hourPillar: string
  },
  count: number,
  candidates: Array<{
    candidateId: string,
    birthYear: number,         // 农历年
    birthMonth: number,        // 农历月
    birthDay: number,          // 农历日
    birthHour: number,
    birthMinute: number,
    isLeapMonth: boolean,      // 是否闰月
    solarText: string,         // 公历可读文本
    lunarText: string,         // 农历可读文本
    nextCall: {
      tool: 'bazi_calculate',
      arguments: {
        birthYear: number,      // 农历年
        birthMonth: number,     // 农历月
        birthDay: number,       // 农历日
        birthHour: number,
        birthMinute: number,
        calendarType: 'lunar',
        isLeapMonth: boolean
      },
      missing: ['gender']      // 仍需用户补充 gender
    }
  }>
}
```

### 3. ziwei_calculate - 紫微斗数

根据出生时间计算紫微命盘，包含十二宫位、星曜、四化、大限等信息。

**输入参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| gender | string | ✅ | 性别：`male` 或 `female` |
| birthYear | number | ✅ | 出生年 (1900-2100) |
| birthMonth | number | ✅ | 出生月 (1-12) |
| birthDay | number | ✅ | 出生日 (1-31) |
| birthHour | number | ✅ | 出生时 (0-23) |
| birthMinute | number | | 出生分，默认 0 |
| calendarType | string | | 历法类型，默认 solar |
| isLeapMonth | boolean | | 是否闰月，默认 false |

**输出字段：**

```typescript
{
  solarDate: string,
  lunarDate: string,
  fourPillars: { year, month, day, hour },
  soul: string,              // 命主
  body: string,              // 身主
  fiveElement: string,       // 五行局
  zodiac: string,            // 属相
  sign: string,              // 星座
  palaces: PalaceInfo[],     // 十二宫位
  decadalList: DecadalInfo[] // 大限列表
}
```

### 4. liuyao_analyze - 六爻分析

六爻卦象占卜分析，支持自动起卦或选卦。包含完整的64卦数据、六亲、六神、纳甲、旬空、月令旺衰、三合局、六冲卦、神系（原神/忌神/仇神）、时间建议等专业分析。

**输入参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| question | string | ✅ | 占卜问题 |
| method | string | | 起卦方式：`auto`(自动) 或 `select`(选卦)，默认 auto |
| hexagramName | string | | 选卦模式：卦名或卦码（如"天火同人"或"101111"） |
| changedHexagramName | string | | 选卦模式：变卦名或卦码（可选，提供后自动计算变爻） |
| date | string | | 占卜日期 (YYYY-MM-DD)，默认今天 |

**新功能特性：**

- **支持卦码输入**：`hexagramName` 可以是卦名（如"地天泰"）或6位二进制卦码（如"111000"）
- **自动计算变爻**：只需提供本卦和变卦名，系统自动计算哪些爻发生了变化

**输出字段：**

```typescript
{
  question: string,
  hexagramName: string,           // 本卦名
  hexagramGong: string,           // 卦宫
  hexagramElement: string,        // 卦五行
  hexagramBrief?: string,         // 卦辞简介
  guaCi?: string,                 // 卦辞
  xiangCi?: string,               // 象辞
  changedHexagramName?: string,   // 变卦名
  changedHexagramGong?: string,   // 变卦宫
  changedHexagramElement?: string, // 变卦五行
  changedLines: number[],         // 动爻位置(1-6)
  changedYaoCi?: string[],        // 变爻爻辞
  ganZhiTime: GanZhiTime,         // 干支时间
  kongWang?: {                    // 旬空
    xun: string,                  // 旬名（如"甲子旬"）
    kongZhi: [string, string]     // 空亡地支（两个）
  },
  fullYaos?: FullYaoInfo[],       // 完整爻信息
  changedYaos?: ChangedYaoInfo[], // 变爻详情
  yongShen: YongShenInfo,         // 用神
  fuShen?: FuShenInfo[],          // 伏神
  shenSystem?: ShenSystemInfo,    // 神系（原神/忌神/仇神）
  liuChongGuaInfo?: {             // 六冲卦信息
    isLiuChongGua: boolean,
    description?: string
  },
  sanHeAnalysis?: SanHeAnalysisInfo, // 三合局分析
  warnings?: string[],            // 凶吉警告
  timeRecommendations?: TimeRecommendation[],
  summary?: SummaryInfo
}

// GanZhiTime 结构
{
  year: { gan: string; zhi: string },
  month: { gan: string; zhi: string },
  day: { gan: string; zhi: string },
  hour: { gan: string; zhi: string }
}

// FullYaoInfo 结构
{
  position: number,               // 爻位 (1-6)
  type: number,                   // 爻类型 (0阴/1阳)
  change: string,                 // 变化状态 (stable/changing)
  liuQin: string,                 // 六亲
  liuShen: string,                // 六神
  naJia: string,                  // 纳甲地支
  wuXing: string,                 // 五行
  isShiYao: boolean,              // 是否世爻
  isYingYao: boolean,             // 是否应爻
  wangShuai: string,              // 旺衰 (wang/xiang/xiu/qiu/si)
  wangShuaiLabel: string,         // 旺衰标签 (旺/相/休/囚/死)
  kongWangState?: string,         // 空亡状态
  kongWangLabel?: string,         // 空亡标签
  strengthScore?: number,         // 强度评分
  isStrong?: boolean,             // 是否旺相
  strengthFactors?: string[],     // 强度因素
  changSheng?: string,            // 十二长生
  changeAnalysis?: {              // 变爻分析
    huaType: string,
    huaLabel: string,
    isGood: boolean
  }
}

// ChangedYaoInfo 结构（变爻简化信息）
{
  position: number,               // 爻位 (1-6)
  type: number,                   // 爻类型 (0阴/1阳)
  liuQin: string,                 // 六亲
  naJia: string,                  // 纳甲地支
  wuXing: string                  // 五行
}

// YongShenInfo 结构
{
  type: string,                   // 用神类型
  liuQin: string,                 // 六亲
  element: string,                // 五行
  position: number,               // 位置
  strengthScore: number,          // 强度评分
  isStrong: boolean,              // 是否旺相
  strengthLabel: string,          // 强度标签
  kongWangState?: string,         // 空亡状态
  factors?: string[]              // 影响因素
}

// FuShenInfo 结构
{
  liuQin: string,                 // 六亲
  wuXing: string,                 // 五行
  naJia: string,                  // 纳甲地支
  feiShenPosition: number,        // 飞神位置
  isAvailable: boolean,           // 是否可用
  availabilityReason: string      // 可用原因
}

// ShenSystemInfo 结构
{
  yuanShen?: { liuQin: string; wuXing: string; positions: number[] },
  jiShen?: { liuQin: string; wuXing: string; positions: number[] },
  chouShen?: { liuQin: string; wuXing: string; positions: number[] }
}

// SanHeAnalysisInfo 结构
{
  hasFullSanHe: boolean,
  fullSanHe?: { name: string; result: string; positions: number[] },
  hasBanHe: boolean,
  banHe?: Array<{ branches: string[]; result: string; type: string; positions: number[] }>
}

// TimeRecommendation 结构
{
  type: 'favorable' | 'unfavorable' | 'critical',
  timeframe: string,
  earthlyBranch?: string,
  description: string
}

// SummaryInfo 结构
{
  overallTrend: 'favorable' | 'neutral' | 'unfavorable',
  keyFactors: string[]
}
```

### 5. tarot_draw - 塔罗抽牌

塔罗牌抽牌占卜，支持多种牌阵。使用完整的78张韦特塔罗牌（22张大阿卡纳 + 56张小阿卡纳）。

**输入参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| spreadType | string | | 牌阵类型，默认 single |
| question | string | | 占卜问题 |
| allowReversed | boolean | | 是否允许逆位，默认 true |

**牌阵类型：**

| 类型 | 名称 | 牌数 | 位置含义 |
|------|------|:----:|----------|
| single | 单牌 | 1 | 当前状况 |
| three-card | 三牌阵 | 3 | 过去、现在、未来 |
| love | 爱情牌阵 | 3 | 你的状态、对方状态、关系发展 |
| celtic-cross | 凯尔特十字 | 10 | 完整分析 |

**输出字段：**

```typescript
{
  spreadId: string,
  spreadName: string,
  question?: string,
  cards: Array<{
    position: string,
    card: {
      name: string,
      nameChinese: string,
      keywords: string[]
    },
    orientation: 'upright' | 'reversed',
    meaning: string
  }>
}
```

### 6. almanac - 黄历查询

查询指定日期的黄历信息，可选传入日主或生日辅助计算流日十神。

**输入参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| dayMaster | string | | 日主天干（甲乙丙丁戊己庚辛壬癸） |
| birthYear | number | | 出生年（用于计算日主） |
| birthMonth | number | | 出生月 |
| birthDay | number | | 出生日 |
| birthHour | number | | 出生时 |
| date | string | | 目标日期 (YYYY-MM-DD)，默认今天 |

**输出字段：**

```typescript
{
  date: string,
  dayInfo: {
    stem: string,
    branch: string,
    ganZhi: string
  },
  tenGod?: string,
  almanac: {
    lunarDate: string,
    lunarMonth: string,
    lunarDay: string,
    zodiac: string,
    solarTerm?: string,
    suitable: string[],
    avoid: string[],
    chongSha: string,
    pengZuBaiJi: string,
    jishen: string[],
    xiongsha: string[],
    directions: {
      caiShen: string,
      xiShen: string,
      fuShen: string,
      yangGui: string,
      yinGui: string
    },
    dayOfficer: string,
    tianShen: string,
    tianShenType: string,
    tianShenLuck: string,
    lunarMansion: string,
    lunarMansionLuck: string,
    lunarMansionSong: string,
    nayin: string,
    taiShen: string,
    hourlyFortune: Array<{
      ganZhi: string,
      tianShen: string,
      tianShenType: string,
      tianShenLuck: string,
      chong: string,
      sha: string,
      suitable: string[],
      avoid: string[]
    }>
  }
}
```

### 7. bazi_dayun - 大运流年分析

根据出生时间分析当前大运、小运与流年链路。

**输入参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| gender | string | ✅ | 性别：`male` 或 `female` |
| birthYear | number | ✅ | 出生年 (1900-2100) |
| birthMonth | number | ✅ | 出生月 (1-12) |
| birthDay | number | ✅ | 出生日 (1-31) |
| birthHour | number | ✅ | 出生时 (0-23) |
| birthMinute | number | | 出生分，默认 0 |
| calendarType | string | | 历法类型，默认 solar |
| isLeapMonth | boolean | | 是否闰月，默认 false |

**输出字段：**

```typescript
{
  startAge: number,            // 首步大运起运年龄
  startAgeDetail: string,      // 精确起运描述
  xiaoYun: Array<{
    age: number,
    ganZhi: string,
    tenGod: string
  }>,
  list: Array<{
    startYear: number,
    startAge: number,
    ganZhi: string,
    tenGod: string,
    branchTenGod: string,
    branchRelations: Array<{
      type: '六合' | '六冲' | '三合' | '相刑' | '相害',
      description: string
    }>,
    liunianList: Array<{
      year: number,
      age: number,
      ganZhi: string,
      tenGod: string,
      nayin: string,
      taiSui: string[]
    }>
  }>
}
```

### 8. qimen_calculate - 奇门遁甲

根据指定时间排出奇门遁甲盘，返回九宫、八门、九星、八神、值符值使、局数、旬首与格局判断。

**关键输入：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| year/month/day/hour | number | ✅ | 排盘时间 |
| minute | number | | 分钟，默认 0 |
| timezone | string | | IANA 时区，默认 `Asia/Shanghai` |
| question | string | | 占问事项 |
| panType | string | | 当前支持 `zhuan` |
| juMethod | string | | `chaibu` / `maoshan` |
| zhiFuJiGong | string | | 直符寄宫方式 |

**关键输出：**

- `dateInfo`
- `siZhu`
- `dunType` / `juNumber` / `yuan` / `xunShou`
- `zhiFu` / `zhiShi`
- `palaces`
- `globalFormations`

### 9. daliuren - 大六壬

根据日期时刻起大六壬课，返回天地盘、四课三传、天将、课体、神煞与旺衰信息。

**关键输入：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| date | string | ✅ | 公历日期 `YYYY-MM-DD` |
| hour | number | ✅ | 小时 |
| minute | number | | 分钟，默认 0 |
| timezone | string | | IANA 时区，默认 `Asia/Shanghai` |
| question | string | | 占事 |
| birthYear | number | | 出生年，用于本命/行年 |
| gender | string | | `male` / `female` |

**关键输出：**

- `dateInfo`
- `tianDiPan`
- `siKe`
- `sanChuan`
- `tianJiang`
- `keTi`
- `shenSha`

---

## API 调用方式

### JSON-RPC 协议

MCP 使用 JSON-RPC 2.0 协议进行通信。

**请求格式：**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "方法名",
  "params": { ... }
}
```

**响应格式：**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": { ... }
}
```

### 核心方法

| 方法 | 说明 |
|------|------|
| `tools/list` | 列出所有可用工具 |
| `tools/call` | 调用指定工具 |

---

## 使用示例

### 本地测试 (stdio)

**列出所有工具：**

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | \
  node packages/mcp/dist/index.js
```

**八字计算示例：**

```bash
echo '{
  "jsonrpc":"2.0",
  "id":2,
  "method":"tools/call",
  "params":{
    "name":"bazi_calculate",
    "arguments":{
      "gender":"male",
      "birthYear":1990,
      "birthMonth":5,
      "birthDay":15,
      "birthHour":14
    }
  }
}' | node packages/mcp/dist/index.js
```

**四柱反推候选示例：**

```bash
echo '{
  "jsonrpc":"2.0",
  "id":21,
  "method":"tools/call",
  "params":{
    "name":"bazi_pillars_resolve",
    "arguments":{
      "yearPillar":"壬申",
      "monthPillar":"戊申",
      "dayPillar":"丙午",
      "hourPillar":"癸巳"
    }
  }
}' | node packages/mcp/dist/index.js
```

**返回结果：**

```json
{
  "pillars": {
    "yearPillar": "壬申",
    "monthPillar": "戊申",
    "dayPillar": "丙午",
    "hourPillar": "癸巳"
  },
  "count": 2,
  "candidates": [
    {
      "candidateId": "cand_1",
      "birthYear": 1932,
      "birthMonth": 7,
      "birthDay": 12,
      "birthHour": 9,
      "birthMinute": 0,
      "isLeapMonth": false,
      "solarText": "1932-08-13 09:00",
      "lunarText": "农历一九三二年七月十二 巳时",
      "nextCall": {
        "tool": "bazi_calculate",
        "arguments": {
          "birthYear": 1932,
          "birthMonth": 7,
          "birthDay": 12,
          "birthHour": 9,
          "birthMinute": 0,
          "calendarType": "lunar",
          "isLeapMonth": false
        },
        "missing": ["gender"]
      }
    }
  ]
}
```

**塔罗抽牌示例：**

```bash
echo '{
  "jsonrpc":"2.0",
  "id":3,
  "method":"tools/call",
  "params":{
    "name":"tarot_draw",
    "arguments":{
      "spreadType":"three-card",
      "question":"今天运势如何"
    }
  }
}' | node packages/mcp/dist/index.js
```

**六爻分析示例：**

```bash
echo '{
  "jsonrpc":"2.0",
  "id":4,
  "method":"tools/call",
  "params":{
    "name":"liuyao_analyze",
    "arguments":{
      "question":"事业发展如何"
    }
  }
}' | node packages/mcp/dist/index.js
```

**每日运势示例：**

```bash
echo '{
  "jsonrpc":"2.0",
  "id":5,
  "method":"tools/call",
  "params":{
    "name":"almanac",
    "arguments":{
      "dayMaster":"庚"
    }
  }
}' | node packages/mcp/dist/index.js
```

---

## 部署指南

### 本地部署

本地模式无需额外部署，直接配置 MCP 客户端即可使用。

### 线上部署 (Zeabur / Docker)

**1. 环境变量配置：**

| 变量 | 说明 |
|------|------|
| `SUPABASE_URL` | Supabase 项目地址 |
| `SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SYSTEM_ADMIN_EMAIL` | 系统管理员邮箱，用于 MCP Server 受控访问数据库 |
| `SUPABASE_SYSTEM_ADMIN_PASSWORD` | 系统管理员密码 |
| `MCP_ALLOWED_ORIGINS` | 浏览器 Origin 白名单（逗号分隔） |
| `MCP_ALLOWED_HOSTS` | Host 白名单（可选，逗号分隔） |
| `MCP_HOST` | MCP 监听地址，默认 `127.0.0.1`（容器建议 `0.0.0.0`） |
| `MCP_MAX_SESSIONS` | 最大并发会话数 |
| `MCP_SESSION_TTL_MS` | 会话生命周期（毫秒） |
| `MCP_SESSION_IDLE_MS` | 会话空闲超时（毫秒） |
| `MCP_MAX_SSE_PER_USER` | 每用户 SSE 并发上限 |
| `MCP_TRUST_PROXY` | 是否信任反向代理（`true/false`） |
| `PORT` | 服务端口，默认 3001 |

**2. 本地启动线上服务器：**

```bash
cd packages/mcp-server
pnpm start
```

**3. 健康检查：**

```bash
curl http://localhost:3001/health
```

**4. Docker 部署（仅 MCP）：**

```bash
cd /Users/hhs/Develop/Project/MingAI
docker build -f packages/mcp-server/Dockerfile -t mingai-mcp-server .
docker run -p 3001:3001 \
  -e SUPABASE_URL=https://your-project.supabase.co \
  -e SUPABASE_ANON_KEY=your-anon-key \
  -e MCP_HOST=0.0.0.0 \
  -e MCP_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000 \
  -e MCP_ALLOWED_HOSTS=localhost:3001,127.0.0.1:3001 \
  mingai-mcp-server
```

**5. Docker Compose（支持一键和分开部署）：**

```bash
cd /Users/hhs/Develop/Project/MingAI
cp .env.example .env

# 一键部署：Web + MCP
docker compose up -d --build

# 仅部署 Web
docker compose -f docker-compose.web.yml up -d --build

# 仅部署 MCP
docker compose -f docker-compose.mcp.yml up -d --build
```

---

## 常见问题

### Q1: MCP 客户端无法识别 MCP Server？

**解决方案：**
1. 确认配置文件路径正确
2. 确认 `dist/index.js` 文件存在
3. 重启 MCP 客户端

### Q2: 构建失败提示类型错误？

**解决方案：**
```bash
# 重新安装依赖
pnpm install

# 清理并重新构建
rm -rf packages/*/dist
cd packages/core && pnpm build
cd ../mcp && pnpm build
cd ../mcp-server && pnpm build
```

### Q5: `docker compose up -d --build` 报 `Missing Supabase environment variables`？

**原因：**
Web 镜像在 `next build` 阶段就需要读取 Supabase 变量。

**解决方案：**
```bash
cp .env.example .env
# 至少填写 SUPABASE_URL / SUPABASE_ANON_KEY
docker compose up -d --build
```

### Q3: 线上服务器返回 401 错误？

**解决方案：**
确认请求头包含有效且未被吊销的用户级 API Key（`/user/mcp` 生成；管理员可在后台吊销）：
```bash
curl -i -X POST -H "x-api-key: your-key" -H "Content-Type: application/json" -d "{}" http://localhost:3001/mcp
```

### Q4: 如何在 AI 对话中使用？

配置好 MCP 客户端后，直接在对话中提问即可，例如：
- "帮我算一下 1990年5月15日14点出生的八字"
- "用紫微斗数分析 1985年3月20日10点30分的命盘"
- "帮我起一卦，问事业发展"
- "抽一张塔罗牌"
- "查看今天的运势，我的日主是庚"

---

## OAuth 2.1 认证

MCP Server 支持 OAuth 2.1 + PKCE 认证，兼容 ChatGPT MCP 连接器等标准 OAuth 客户端。

### 认证流程

```
MCP Client → GET /.well-known/oauth-protected-resource/mcp  → 发现 OAuth 配置
           → GET /.well-known/oauth-authorization-server     → 获取 AS 元数据
           → POST /register                                  → 动态客户端注册
           → GET  /authorize                                 → 用户登录+授权页
           → POST /token                                     → 换取 JWT access_token
           → POST /mcp (Authorization: Bearer <JWT>)         → 调用 MCP 工具
```

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `MCP_JWT_SECRET` | JWT 签名密钥（至少 32 字符） | 必填 |
| `MCP_ISSUER_URL` | OAuth issuer URL | `https://mcp.mingai.fun` |
| `MCP_ALLOWED_TOKEN_AUDIENCES` | Access Token aud 白名单（逗号分隔） | `issuer, issuer/mcp` |
| `MCP_ACCESS_TOKEN_TTL` | Access token 有效期（秒） | 3600 |
| `MCP_REFRESH_TOKEN_TTL` | Refresh token 有效期（秒） | 2592000 |

### 过渡期兼容

当前同时支持两种认证方式：
- `Authorization: Bearer <JWT>` — OAuth JWT 认证（推荐）
- `x-api-key: <key>` — API Key 认证（兼容保留）

Bearer token 优先级高于 API Key。如果 Bearer token 存在但无效，不会 fallback 到 API Key。

---

## ChatGPT 接入

ChatGPT 通过 OAuth 2.1 自动完成认证，无需手动传 Key。

### API 调用示例

```json
{
  "model": "gpt-4.1",
  "tools": [{
    "type": "mcp",
    "server_label": "mingai",
    "server_url": "https://mcp.mingai.fun/mcp",
    "require_approval": "never"
  }],
  "input": "帮我算一下八字"
}
```

首次连接时 ChatGPT 会自动触发 OAuth 流程，弹出 MingAI 登录页面，使用账号密码授权即可。后续请求自动使用 access_token，过期后自动刷新。

---

## 更新日志

以下版本批次基于 `1.2.5` 之后的累计改动按功能重排，便于按大功能分批发布 npm 版本。

| 版本 | 批次说明 |
|------|----------|
| `1.5.0` | 收口共享 transport / schema / registry / SDK 导出面，统一在线服务版本与授权页工具展示 |
| `1.4.0` | 新增 `daliuren` 大六壬能力 |
| `1.3.0` | 新增 `qimen_calculate` 奇门遁甲能力 |
| `1.2.6` | 延续 `1.2.5` 做补丁发布，集中修复鉴权、缓存回源、结构化输出与边界回归 |
| `1.2.5` | 本次版本重排的旧基线版本 |

---

## 相关链接

- [MCP 官方文档](https://modelcontextprotocol.io/)
- [lunar-javascript](https://github.com/6tail/lunar-javascript)
- [iztro](https://github.com/SylarLong/iztro)
