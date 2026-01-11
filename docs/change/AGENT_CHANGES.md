# MingAI Phase 4 Unfinished Tasks - Implementation Plan

## Overview

Implementing 11 unfinished tasks across 4 feature areas from PRD v1.7 Phase 4.

**Chart Library:** Recharts (user preference)
**Liuyao Depth:** Full traditional with 六亲/六神/世应/用神

---

## Progress Status

| Feature          | Status          | Tasks                                                   |
| ---------------- | --------------- | ------------------------------------------------------- |
| ✅ 塔罗牌分享卡片 | **COMPLETED**   | Share card with html2canvas                             |
| ✅ 每日/每月运势  | **COMPLETED**   | Charts, key dates, interpretation modes                 |
| ✅ 关系合盘       | **COMPLETED**   | Conflict triggers, communication templates, trend chart |
| 🔄 六爻占卜       | **IN PROGRESS** | 六亲/六神/世应/用神 analysis                            |

---

## Completed Steps (Steps 0-3)

### ✅ Step 0: Install Recharts
```bash
pnpm add recharts  # Done
```

### ✅ Step 1: Tarot Share Card
- Created `src/components/tarot/TarotShareCard.tsx`
- Integrated into `src/app/tarot/page.tsx`

### ✅ Step 2: Fortune Enhancement
- Created `src/components/fortune/FortuneTrendChart.tsx`
- Created `src/components/fortune/InterpretationModeToggle.tsx`
- Created `src/lib/fortune-interpretations.ts`
- Enhanced `src/lib/fortune.ts` with EnhancedKeyDate
- Updated `src/app/daily/page.tsx` with trend chart + mode toggle
- Updated `src/app/monthly/page.tsx` with enhanced key dates

### ✅ Step 3: Hepan Enhancement
- Created `src/lib/communication-templates.ts`
- Created `src/components/hepan/CompatibilityTrendChart.tsx`
- Extended `src/lib/hepan.ts` with TriggerFactor, calculateCompatibilityTrend
- Updated `src/components/hepan/ConflictPoints.tsx` with triggers/templates
- Updated `src/app/hepan/result/page.tsx` with trend chart

---

## Remaining Work: Step 4 - Liuyao Traditional Analysis

**PRD Tasks:**
1. 世应用神详解
2. 六亲六神分析
3. 卦辞/爻辞权重提示
4. 时间节点建议

### 4.1 Create Hexagram Texts Library

**New File:** `src/lib/hexagram-texts.ts`

Contains 卦辞/爻辞 for all 64 hexagrams with emphasis weights.

```typescript
export interface HexagramText {
    name: string;          // 卦名
    gua: string;           // 卦辞 (整体解释)
    xiang: string;         // 象辞 (象曰...)
    yao: YaoText[];        // 6爻爻辞
}

export interface YaoText {
    position: number;      // 1-6
    text: string;          // 爻辞内容
    emphasis: 'low' | 'medium' | 'high';  // 权重
    timing?: string;       // 时间暗示 (如有)
}

export const HEXAGRAM_TEXTS: Record<string, HexagramText>
```

**Key hexagrams to include (prioritized):**
- 乾为天、坤为地 (基础)
- 水雷屯、山水蒙 (初生/启蒙)
- 坎为水、离为火 (重卦)
- 地天泰、天地否 (吉凶代表)
- 水火既济、火水未济 (终始)

### 4.2 Create Eight Palaces Library

**New File:** `src/lib/eight-palaces.ts`

八宫系统和纳甲配置。

```typescript
export type PalaceName = '乾宫' | '坎宫' | '艮宫' | '震宫' | '巽宫' | '离宫' | '坤宫' | '兑宫';

export interface Palace {
    name: PalaceName;
    element: WuXing;
    trigram: string;           // 八卦代码
    hexagrams: string[];       // 本宫8卦顺序
    naJia: Record<number, string>;  // 各爻纳甲 (爻位 → 地支)
}

export const EIGHT_PALACES: Record<string, Palace>

// 查找卦所属宫
export function findPalace(hexagramCode: string): Palace

// 获取纳甲地支
export function getNaJia(palace: Palace, yaoPosition: number, yaoType: YaoType): string
```

### 4.3 Extend liuyao.ts with Traditional Elements

**Modify:** `src/lib/liuyao.ts`

Add the following types and functions:

```typescript
// === New Types ===
export type LiuQin = '父母' | '兄弟' | '子孙' | '妻财' | '官鬼';
export type LiuShen = '青龙' | '朱雀' | '勾陈' | '螣蛇' | '白虎' | '玄武';

export interface FullYaoInfo extends Yao {
    liuQin: LiuQin;        // 六亲
    liuShen: LiuShen;      // 六神
    naJia: string;         // 纳甲地支
    wuXing: WuXing;        // 五行
    isShiYao: boolean;     // 是否世爻
    isYingYao: boolean;    // 是否应爻
    yaoText?: string;      // 爻辞
    emphasis?: 'low' | 'medium' | 'high';
}

export interface YongShen {
    type: LiuQin;          // 用神类型
    position: number;      // 用神所在爻位
    element: WuXing;       // 用神五行
    strength: 'weak' | 'moderate' | 'strong';
    analysis: string;
}

export interface TimeRecommendation {
    type: 'favorable' | 'unfavorable' | 'critical';
    timeframe: string;     // "近期"/"月内"/"特定日"
    earthlyBranch?: string;
    description: string;
}

// === New Functions ===

// 计算六神 (根据日干)
export function calculateLiuShen(dayStem: string): LiuShen[]

// 计算六亲 (爻五行与卦宫五行的关系)
export function calculateLiuQin(yaoElement: WuXing, gongElement: WuXing): LiuQin

// 计算世应位置 (根据卦在八宫中的位置)
export function calculateShiYingPosition(hexagramCode: string): { shi: number; ying: number }

// 确定用神 (根据问事类型)
export function determineYongShen(
    questionType: string,
    fullYaos: FullYaoInfo[],
    shiYing: { shi: number; ying: number }
): YongShen

// 计算时间建议 (基于用神状态)
export function calculateTimeRecommendations(
    yongShen: YongShen,
    fullYaos: FullYaoInfo[]
): TimeRecommendation[]

// 综合计算完整爻信息
export function calculateFullYaoInfo(
    yaos: Yao[],
    hexagramCode: string,
    dayStem: string
): FullYaoInfo[]
```

**六亲计算规则：**
| 关系 | 生克         |
| ---- | ------------ |
| 兄弟 | 与卦宫同五行 |
| 父母 | 生卦宫者     |
| 子孙 | 卦宫所生     |
| 妻财 | 卦宫所克     |
| 官鬼 | 克卦宫者     |

**六神配置（根据日干）：**
| 日干 | 初爻→上爻                          |
| ---- | ---------------------------------- |
| 甲乙 | 青龙、朱雀、勾陈、螣蛇、白虎、玄武 |
| 丙丁 | 朱雀、勾陈、螣蛇、白虎、玄武、青龙 |
| 戊   | 勾陈、螣蛇、白虎、玄武、青龙、朱雀 |
| 己   | 螣蛇、白虎、玄武、青龙、朱雀、勾陈 |
| 庚辛 | 白虎、玄武、青龙、朱雀、勾陈、螣蛇 |
| 壬癸 | 玄武、青龙、朱雀、勾陈、螣蛇、白虎 |

### 4.4 Create TraditionalAnalysis Component

**New File:** `src/components/liuyao/TraditionalAnalysis.tsx`

Display full traditional analysis in collapsible sections.

```tsx
interface TraditionalAnalysisProps {
    fullYaos: FullYaoInfo[];
    yongShen: YongShen;
    timeRecommendations: TimeRecommendation[];
    hexagramText: HexagramText;
}

// Sections:
// 1. 卦辞/象辞 display with emphasis markers
// 2. 用神分析 with strength indicator
// 3. 六爻详解 table (六亲/六神/纳甲/世应)
// 4. 时间建议 with favorable/unfavorable periods
```

### 4.5 Update HexagramDisplay Component

**Modify:** `src/components/liuyao/HexagramDisplay.tsx`

Add optional traditional labels:

```tsx
interface HexagramDisplayProps {
    // existing props...
    fullYaos?: FullYaoInfo[];     // 新增：完整爻信息
    showTraditional?: boolean;    // 新增：是否显示传统标签
}

// When showTraditional=true, display:
// - 六亲 label to the left of each yao
// - 六神 label to the right of each yao
// - 世/应 markers (圆圈标记)
// - 用神 highlight (golden border)
```

### 4.6 Update Liuyao Result Page

**Modify:** `src/app/liuyao/result/page.tsx`

- Calculate fullYaos using calculateFullYaoInfo()
- Pass to HexagramDisplay with showTraditional={true}
- Add TraditionalAnalysis component below hexagram
- Add collapsible sections for detailed analysis

### 4.7 Update Liuyao API Route

**Modify:** `src/app/api/liuyao/route.ts`

- Accept dayStem parameter (or calculate from current date)
- Include traditional analysis data in AI prompt
- Return enhanced interpretation with time recommendations

---

## Files to Create/Modify

### New Files (3):
1. `src/lib/hexagram-texts.ts` - 卦辞/爻辞 for 64 hexagrams
2. `src/lib/eight-palaces.ts` - 八宫/纳甲 system
3. `src/components/liuyao/TraditionalAnalysis.tsx` - Analysis display

### Modified Files (4):
1. `src/lib/liuyao.ts` - Add 六亲/六神/世应/用神 functions
2. `src/components/liuyao/HexagramDisplay.tsx` - Add traditional labels
3. `src/app/liuyao/result/page.tsx` - Integrate traditional analysis
4. `src/app/api/liuyao/route.ts` - Include day stem, enhance prompt

---

## Verification Steps

### Liuyao Traditional
1. Navigate to `/liuyao/divine`
2. Complete divination with a question
3. View result page and verify:
   - 六亲 labels appear (父母/兄弟/子孙/妻财/官鬼)
   - 六神 labels appear (青龙/朱雀/勾陈/螣蛇/白虎/玄武)
   - 世爻/应爻 markers visible
   - 用神 highlighted with golden accent
   - 卦辞/爻辞 displayed with emphasis markers
   - Time recommendations section shows favorable periods
4. Get AI interpretation and verify it references traditional elements

---

## Implementation Order

1. `src/lib/hexagram-texts.ts` - Foundation data
2. `src/lib/eight-palaces.ts` - Palace/NaJia data
3. `src/lib/liuyao.ts` - Core calculation functions
4. `src/components/liuyao/HexagramDisplay.tsx` - Visual updates
5. `src/components/liuyao/TraditionalAnalysis.tsx` - New component
6. `src/app/liuyao/result/page.tsx` - Integration
7. `src/app/api/liuyao/route.ts` - API enhancement
