# AI服务统一化与塔罗结果页重构计划

## 概述

本计划解决两个主要问题：
1. **AI服务统一化**：6个功能模块都硬编码调用DeepSeek，需要改为支持用户选择模型（参考AI对话框的实现）
2. **塔罗结果页重构**：新建结果页，修改历史记录逻辑为"翻牌才保存"

---

## 第一部分：AI服务统一化

### 1.1 核心逻辑（参考 `/api/chat/route.ts`）

Chat API 的模型选择流程：
```typescript
// 1. 前端传入 model 参数
const { model, reasoning } = body;

// 2. 获取模型配置
const requestedModelId = model || DEFAULT_MODEL_ID;
const modelConfig = getModelConfig(requestedModelId);

// 3. 获取会员等级
const membershipType = await getEffectiveMembershipType(userId);

// 4. 检查模型权限
if (!isModelAllowedForMembership(modelConfig, membershipType)) {
    return { error: '当前会员等级无法使用该模型' };
}

// 5. 检查推理权限
const reasoningAllowed = isReasoningAllowedForMembership(modelConfig, membershipType);
const reasoningEnabled = reasoningAllowed ? !!reasoning : false;

// 6. 调用统一AI服务
const content = await callAI(messages, personality, requestedModelId, context, { reasoning: reasoningEnabled });
```

### 1.2 存储方式（无需新增数据库字段）

`conversations` 表的 `source_data` 是 JSONB 字段，直接在其中存储 `model_id`：

```typescript
// 调用 createAIAnalysisConversation 时
sourceData: {
    // ... 原有字段（cards, question, spread_id 等）
    model_id: 'deepseek-v3',  // 新增：记录使用的模型
}
```

### 1.3 创建可复用的模型选择器组件

**新建文件**: `src/components/ui/ModelSelector.tsx`

从 `ChatComposer.tsx` 提取模型选择器逻辑：
- 从 `/api/models` 获取模型列表（带缓存）
- 显示供应商图标（DeepSeek, GLM, Gemini, Qwen, DeepAI）
- 处理会员权限限制（显示锁定状态和升级提示）
- **支持推理模式切换**（参考ChatComposer的推理按钮）
- 支持紧凑模式（用于功能页面）

**推理模式逻辑**（参考ChatComposer）：
```typescript
// 判断当前模型是否支持推理
const reasoningAllowed = currentModelConfig?.reasoningAllowed ?? currentModelConfig?.supportsReasoning;
const canToggleReasoning = reasoningAllowed && currentModelConfig?.supportsReasoning && !currentModelConfig?.isReasoningDefault;
const isReasoningForced = reasoningAllowed && currentModelConfig?.isReasoningDefault;
```

### 1.4 重构各功能模块 API

需要修改的 API 文件（共5个）：

| 文件 | 当前问题 |
|------|----------|
| `/src/app/api/tarot/route.ts` | 硬编码 `callDeepSeekAI()` |
| `/src/app/api/liuyao/route.ts` | 硬编码 `callDeepSeekAI()` |
| `/src/app/api/hepan/route.ts` | 硬编码 `callDeepSeekAI()` |
| `/src/app/api/mbti/route.ts` | 硬编码 `callDeepSeekAI()` |
| `/src/app/api/bazi/analysis/route.ts` | 硬编码 DeepSeek 调用 |

**每个 API 的改造模式**：
1. 删除本地 `callDeepSeekAI()` 函数
2. 接收请求中的 `modelId` 和 `reasoning` 参数
3. 导入统一AI服务：
   ```typescript
   import { callAI } from '@/lib/ai';
   import { DEFAULT_MODEL_ID, getModelConfig } from '@/lib/ai-config';
   import { getEffectiveMembershipType } from '@/lib/membership-server';
   import { isModelAllowedForMembership, isReasoningAllowedForMembership } from '@/lib/ai-access';
   ```
4. 验证模型权限和推理权限后调用 `callAI()`
5. 在 `sourceData` 中添加 `model_id` 和 `reasoning` 字段

### 1.5 更新前端页面

需要修改的页面：

| 页面 | 修改内容 |
|------|----------|
| `/src/app/liuyao/result/page.tsx` | 添加模型选择器 |
| `/src/app/hepan/result/page.tsx` | 添加模型选择器 |
| `/src/app/mbti/result/page.tsx` | 添加模型选择器 |
| `/src/components/bazi/result/AIWuxingAnalysis.tsx` | 添加模型选择器 |
| `/src/components/bazi/result/AIPersonalityAnalysis.tsx` | 添加模型选择器 |

**前端改造模式**：
1. 添加模型状态：`const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL_ID)`
2. 添加 `<ModelSelector>` 组件
3. API 请求时传入 `modelId` 参数
4. 显示历史记录时从 `source_data.model_id` 读取模型名称

### 1.6 历史记录显示模型名称

修改 `HistoryDrawer` 组件，从 `source_data.model_id` 读取并显示模型名称。

---

## 第二部分：塔罗结果页重构

### 2.1 当前问题

当前塔罗页面 (`/tarot/page.tsx`) 是单页应用：
- 选择牌阵时立即调用 `spread` action 并保存到 `tarot_readings` 表
- 用户即使不翻牌直接退出，记录也已保存

### 2.2 新的页面结构

```
/tarot               - 首页：牌阵选择、问题输入
/tarot/result        - 结果页：抽牌、翻牌、AI解读
```

### 2.3 新的数据流

1. **首页 `/tarot`**：
   - 用户选择牌阵和输入问题
   - 点击牌阵 → 跳转到 `/tarot/result?spreadId=xxx&question=xxx`
   - **不保存任何数据**

2. **结果页 `/tarot/result`**：
   - 页面加载时调用 `draw-only` action 抽牌（不保存）
   - 显示牌背面
   - 用户点击翻牌 → **首次翻牌时调用 `save` action 保存记录**
   - 显示模型选择器
   - 用户点击"获取AI解读" → 调用 `interpret` action

3. **历史记录**：
   - 只显示已翻牌的记录
   - 点击历史项 → 通过 sessionStorage 传递数据 → 跳转到结果页

### 2.4 API 变更

修改 `/api/tarot/route.ts`：

```typescript
case 'draw-only':
  // 只抽牌，不保存
  const result = drawForSpread(spreadId, allowReversed);
  return { success: true, data: { cards: result.cards, spread: result.spread } };

case 'save':
  // 用户翻牌时调用，保存记录
  // 接收 cards, spreadId, question
  // 返回 readingId
```

### 2.5 新建结果页

**新建文件**: `/src/app/tarot/result/page.tsx`

从现有 `page.tsx` 提取结果展示部分：
- 牌阵展示
- 翻牌逻辑（首次翻牌时保存）
- 模型选择器
- AI 解读
- 分享卡片

---

## 实施顺序

### Phase 1: 基础设施
1. 创建 `ModelSelector` 组件

### Phase 2: API 重构
2. 重构 `/api/tarot/route.ts`（添加 draw-only、save action + 统一AI调用）
3. 重构 `/api/liuyao/route.ts`
4. 重构 `/api/hepan/route.ts`
5. 重构 `/api/mbti/route.ts`
6. 重构 `/api/bazi/analysis/route.ts`

### Phase 3: 塔罗重构
7. 新建 `/tarot/result/page.tsx`
8. 修改 `/tarot/page.tsx` 为牌阵选择页

### Phase 4: 前端集成
9. 六爻结果页添加模型选择器
10. 合盘结果页添加模型选择器
11. MBTI结果页添加模型选择器
12. 八字分析组件添加模型选择器

### Phase 5: 历史记录增强
13. HistoryDrawer 显示模型名称

---

## 关键文件清单

### 需要修改的文件
- `src/app/api/tarot/route.ts` - 统一AI调用 + 新action
- `src/app/api/liuyao/route.ts` - 统一AI调用
- `src/app/api/hepan/route.ts` - 统一AI调用
- `src/app/api/mbti/route.ts` - 统一AI调用
- `src/app/api/bazi/analysis/route.ts` - 统一AI调用
- `src/app/tarot/page.tsx` - 简化为牌阵选择
- `src/app/liuyao/result/page.tsx` - 添加模型选择器
- `src/app/hepan/result/page.tsx` - 添加模型选择器
- `src/app/mbti/result/page.tsx` - 添加模型选择器
- `src/components/bazi/result/AIWuxingAnalysis.tsx` - 添加模型选择器
- `src/components/bazi/result/AIPersonalityAnalysis.tsx` - 添加模型选择器
- `src/components/layout/HistoryDrawer.tsx` - 显示模型名称

### 需要新建的文件
- `src/components/ui/ModelSelector.tsx` - 模型选择器组件
- `src/app/tarot/result/page.tsx` - 塔罗结果页

---

## 验证方案

### 功能验证
1. 各功能模块能选择不同AI模型
2. AI分析结果正确记录使用的模型（在source_data中）
3. 历史记录显示模型名称
4. 会员权限正确限制模型访问

### 塔罗流程验证
1. 选择牌阵后跳转到结果页，数据库无新记录
2. 翻开第一张牌后，数据库出现新记录
3. 不翻牌直接返回，数据库无记录
4. 历史记录只显示已翻牌的记录
