# Phase 4 功能扩展实施计划

根据 [PRD-MingAI-v1.7.md](file:///Users/hhs/Develop/Project/MingAI/docs/plans/PRD-MingAI-v1.7.md) 中定义的 Phase 4 功能需求，制定以下实施计划。

---

## User Review Required

> [!IMPORTANT]
> Phase 4 功能较多，建议分阶段开发。请确认以下开发优先级顺序是否符合预期。

**建议开发顺序**：

1. **P1 - 运势功能增强**（可分享图文卡片、多维运势类型）
2. **P2 - MBTI 性格测试**（新功能，相对独立）
3. **P3 - 塔罗牌功能**（需要完整的牌组系统和 AI 解读）
4. **P4 - 六爻占卜**（需要传统卦象算法和解卦系统）
5. **P5 - 关系合盘**（需要多人命盘对比分析）
6. **P6 - 运势中心**（聚合页面，需在其他功能完成后开发）

> [!WARNING]
> 塔罗牌和六爻占卜功能需要大量的基础数据（78 张塔罗牌含义、64 卦详解等），建议预先准备好数据资源。

---

## 功能模块详述

### 模块 1: 运势功能增强

#### 1.1 可分享图文卡片

- 生成今日运势/今日黄历的精美图片
- 通用模板设计，支持分享到社交平台

#### [NEW] `src/components/fortune/ShareCard.tsx`

- 运势分享卡片组件
- 支持不同运势类型的模板

#### [NEW] `src/lib/share-card.ts`

- 图片生成逻辑（使用 html2canvas）✅ 用户确认

#### [NEW] `src/app/api/fortune/share/route.ts`

- 服务端图片生成 API

---

#### 1.2 多维运势类型

#### [MODIFY] [src/lib/fortune.ts](file:///Users/hhs/Develop/Project/MingAI/src/lib/fortune.ts)

- 扩展运势计算支持：时运、爱情、财运、健康、事业、人际关系

#### [MODIFY] [src/app/daily/page.tsx](file:///Users/hhs/Develop/Project/MingAI/src/app/daily/page.tsx)

- 增加运势类型切换 Tab

#### [MODIFY] `src/components/daily/*`

- 支持多运势类型展示

---

#### 1.3 波动节点标记与关键日摘要

#### [MODIFY] [src/lib/fortune.ts](file:///Users/hhs/Develop/Project/MingAI/src/lib/fortune.ts)

- 增加运势波动分析算法
- 关键日期识别逻辑

#### [MODIFY] [src/app/monthly/page.tsx](file:///Users/hhs/Develop/Project/MingAI/src/app/monthly/page.tsx)

- 月历视图标注波动节点
- 显示关键日摘要

---

#### 1.4 白话/专业/术语三层切换

#### [NEW] `src/components/ui/TermToggle.tsx`

- 三层解释切换组件

#### [MODIFY] 运势相关页面

- 集成切换功能

---

### 模块 2: MBTI 性格测试

#### [NEW] `src/app/mbti/page.tsx`

- MBTI 测试主页面

#### [NEW] `src/app/mbti/result/page.tsx`

- MBTI 测试结果页面

#### [NEW] `src/lib/mbti.ts`

- MBTI 测试题库
- 性格计算逻辑
- 16 种性格类型详解

#### [NEW] `src/components/mbti/QuestionCard.tsx`

- 测试题目卡片组件

#### [NEW] `src/components/mbti/PersonalityCard.tsx`

- MBTI 性格类型展示卡片

#### [NEW] `src/app/api/mbti/analysis/route.ts`

- AI 智能性格分析 API

---

### 模块 3: 塔罗牌功能

#### [NEW] [src/app/tarot/page.tsx](file:///Users/hhs/Develop/Project/MingAI/src/app/tarot/page.tsx)

- 塔罗牌主页面（牌阵选择）

#### [NEW] `src/app/tarot/draw/page.tsx`

- 抽牌页面（含仪式感动画）

#### [NEW] `src/app/tarot/result/page.tsx`

- 解读结果页面

#### [NEW] `src/lib/tarot.ts`

- 78 张塔罗牌完整数据
- 大阿尔克纳（22 张）
- 小阿尔克纳（56 张）
- 经典牌阵定义
- 逆位判定逻辑

#### [NEW] `src/components/tarot/TarotCard.tsx`

- 塔罗牌卡片组件（含翻牌动画）

#### [NEW] `src/components/tarot/SpreadLayout.tsx`

- 牌阵布局组件

#### [NEW] `src/components/tarot/DailyCard.tsx`

- 每日一牌组件

#### [NEW] `src/app/api/tarot/interpret/route.ts`

- AI 塔罗解读 API

#### 数据库新增表

```sql
CREATE TABLE tarot_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  spread_type TEXT NOT NULL,
  cards JSONB NOT NULL,
  question TEXT,
  ai_interpretation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 模块 4: 六爻占卜

#### [NEW] [src/app/liuyao/page.tsx](file:///Users/hhs/Develop/Project/MingAI/src/app/liuyao/page.tsx)

- 六爻主页面（起卦方式选择）

#### [NEW] `src/app/liuyao/divine/page.tsx`

- 起卦页面（铜钱模拟动画）

#### [NEW] `src/app/liuyao/result/page.tsx`

- 解卦结果页面

#### [NEW] `src/lib/liuyao.ts`

- 64 卦完整数据
- 卦辞、爻辞
- 六亲六神计算
- 世应用神分析
- 变卦路径计算

#### [NEW] `src/components/liuyao/CoinToss.tsx`

- 铜钱起卦组件（含动画）

#### [NEW] `src/components/liuyao/HexagramDisplay.tsx`

- 卦象显示组件

#### [NEW] `src/components/liuyao/YaoLine.tsx`

- 爻线组件（显示变爻）

#### [NEW] `src/app/api/liuyao/interpret/route.ts`

- AI 解卦 API

#### 数据库新增表

```sql
CREATE TABLE liuyao_divinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  question TEXT NOT NULL,
  hexagram_code TEXT NOT NULL,
  changed_lines JSONB,
  ai_interpretation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 模块 5: 关系合盘

#### [NEW] `src/app/hepan/page.tsx`

- 合盘主页面（类型选择）

#### [NEW] `src/app/hepan/create/page.tsx`

- 创建合盘页面（输入双方信息）

#### [NEW] `src/app/hepan/result/page.tsx`

- 合盘结果页面

#### [NEW] `src/lib/hepan.ts`

- 合盘分析算法
- 情侣合婚分析
- 商业合伙分析
- 亲子关系分析

#### [NEW] `src/components/hepan/CompatibilityChart.tsx`

- 兼容性评分图表

#### [NEW] `src/components/hepan/ConflictPoints.tsx`

- 冲突触发点展示

#### [NEW] `src/components/hepan/TrendChart.tsx`

- 半年/一年走势曲线

#### [NEW] `src/app/api/hepan/analyze/route.ts`

- AI 合盘分析 API

#### 数据库新增表

```sql
CREATE TABLE hepan_charts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  type TEXT NOT NULL CHECK (type IN ('love', 'business', 'family')),
  person1_chart_id UUID,
  person2_chart_id UUID,
  compatibility_score INTEGER,
  ai_analysis TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 模块 6: 运势中心

#### [NEW] `src/app/fortune-hub/page.tsx`

- 运势中心聚合页面
- 入口导航：八字、紫微、塔罗、六爻
- 每日综合运势展示

---

## 侧边栏导航更新

#### [MODIFY] [src/components/layout/Sidebar.tsx](file:///Users/hhs/Develop/Project/MingAI/src/components/layout/Sidebar.tsx)

- 添加新功能入口：
  - MBTI 性格测试
  - 塔罗占卜
  - 六爻占卜
  - 关系合盘
  - 运势中心

---

## Verification Plan

### 自动化测试

项目当前无测试框架，建议后续添加。

### 手动验证

#### 构建验证

```bash
cd /Users/hhs/Develop/Project/MingAI
npm run build
```

确保无 TypeScript 编译错误。

#### 功能验证

每个模块完成后，启动开发服务器：

```bash
npm run dev
```

然后在浏览器中访问对应页面进行手动测试。

#### 用户手动测试（建议）

- **运势分享卡片**：生成图片 → 保存/分享 → 验证图片质量
- **MBTI 测试**：完成测试 → 查看结果 → AI 分析
- **塔罗牌**：选择牌阵 → 抽牌 → 查看解读
- **六爻占卜**：起卦 → 查看卦象 → AI 解卦
- **关系合盘**：输入双方信息 → 查看分析结果

---

## 开发阶段划分

| 阶段 | 功能模块      | 预计工期 |
| ---- | ------------- | -------- |
| 4A   | 运势功能增强  | 2-3 天   |
| 4B   | MBTI 性格测试 | 1-2 天   |
| 4C   | 塔罗牌功能    | 3-4 天   |
| 4D   | 六爻占卜      | 3-4 天   |
| 4E   | 关系合盘      | 2-3 天   |
| 4F   | 运势中心      | 1 天     |

---

## 依赖新增（预估）

| 包名           | 用途                                                         |
| -------------- | ------------------------------------------------------------ |
| `html2canvas`  | 运势卡片图片生成 ✅                                           |
| 塔罗牌图片资源 | [krates98/tarotcardapi](https://github.com/krates98/tarotcardapi) - 78 张高质量塔罗牌图片 ✅ |

---

## 总结

Phase 4 涵盖 6 个主要功能模块，建议优先开发**运势功能增强**和 **MBTI 测试**，这两个功能相对独立且复杂度较低。塔罗牌和六爻占卜需要准备大量基础数据，建议预留足够时间。

请确认：

1. 开发优先级顺序是否符合预期？
2. 是否需要调整功能范围或添加新需求？
3. 塔罗牌图片资源的来源（自行设计 / 购买 / 开源资源）？