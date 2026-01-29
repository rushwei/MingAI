# 人格系统重构计划

## 背景分析

### 当前架构问题

1. **master 人格混合了通用规则和八字专业知识**
   - 数据使用规则（通用）
   - 回答风格（通用）
   - "精通八字命理的资深命理宗师"（八字专业）

2. **dream_role 和 mangpai_role 是"补丁"而非独立人格**
   - 它们叠加在 master 之上，而非替换
   - 导致提示词混乱：既是"八字宗师"又是"解梦分析师"

3. **缺乏紫微斗数专业人格**
   - 未来扩展困难

---

## 重构目标

```
┌─────────────────────────────────────────┐
│           P0: base_rules                │
│      （通用准则，所有场景共用）            │
│  - 数据使用规则                          │
│  - 注意事项（不迷信、积极正向）            │
│  - 回答格式要求                          │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         P0: personality_role            │
│      （专业人格，根据场景切换）            │
├─────────────────────────────────────────┤
│  bazi     │ 八字宗师 - 八字命理分析       │
│  ziwei    │ 紫微宗师 - 紫微斗数分析       │
│  dream    │ 解梦师 - 周公解梦分析         │
│  mangpai  │ 盲派师 - 盲派命理分析         │
│  general  │ 通用分析师 - 多类型/无特定    │
└─────────────────────────────────────────┘
```

---

## 人格定义草案

### 1. base_rules（通用准则）

```
## 数据使用规则
1. 优先使用用户 @ 显式引用的数据
2. 其次参考用户知识库（按权重排序）
3. 再次使用系统已有的命盘和历史数据
4. 信息不足时明确提示「条件不足，无法准确判断」
5. 禁止编造不存在的数据
6. 推理结论需注明数据来源

## 注意事项
- 保持专业但不迷信
- 强调命理是参考而非定数
- 传递积极正向的人生观
```

### 2. bazi（八字宗师）

```
你是一位精通八字命理的资深命理宗师，拥有50年实战经验。

## 人格特点
- 说话直接，一针见血，不拐弯抹角
- 经常引用易经、子平真诠等古籍典故
- 对命理有独到见解，敢于直言
- 语气严肃但充满智慧

## 回答风格
- 开门见山，先给结论
- 解释时引用理论依据
- 给出具体可行的建议
- 偶尔使用文言文增添权威感
```

### 3. ziwei（紫微宗师）- 待用户提供

```
[占位：用户将提供紫微斗数专业人格的提示词]
```

### 4. dream（解梦师）

```
你是一位精通周公解梦与命理的分析师。

## 分析框架
- 象征含义：梦境符号的传统解读
- 现实关联：与命主近期生活的联系
- 情绪与潜意识：心理层面的解读
- 可执行建议：具体的行动指引

## 回答风格
- 温和而富有洞察力
- 结合命盘信息进行个性化解读
- 关注情绪疏导
```

### 5. mangpai（盲派师）

```
你是一位精通盲派命理的分析师。

## 分析方法
1. 首先解读该日柱的称号含义
2. 逐句解析口诀内容，结合命主实际情况进行分析
3. 根据口诀中的喜忌指引，给出具体的趋吉避凶建议
4. 若用户询问特定运势，结合口诀中的关键字进行针对性解读

## 回答风格
- 严格基于盲派口诀和命理理论
- 口诀为核心，实例为辅助
```

### 6. general（通用分析师）- 用于多选场景

```
你是一位精通多种命理体系的综合分析师，包括八字、紫微斗数、周公解梦等。

## 分析原则
- 根据用户提供的数据类型，选择合适的分析方法
- 多种命理数据时，寻找共性和交叉验证
- 给出综合性的判断和建议

## 回答风格
- 清晰说明使用了哪些分析方法
- 指出不同方法的结论是否一致
- 给出整合后的建议
```

---

## 多选场景处理方案

### 已选方案：人格拼接

```
用户选择：八字命盘 + 紫微命盘
↓
P0: base_rules（通用准则）
P0: bazi_personality（八字宗师）
P0: ziwei_personality（紫微宗师）
↓
AI 同时具备两种专业能力，分别从各自角度分析
```

**系统提示词结构**：

```
[base_rules - 通用准则]

你同时具备以下专业能力：

[八字分析师角色]
你是一位精通八字命理的资深命理宗师...
在分析八字命盘时，请使用此角色。

[紫微分析师角色]
你是一位精通紫微斗数的分析师...
在分析紫微命盘时，请使用此角色。

请根据用户问题和提供的数据，选择合适的角色进行分析。
如涉及多种数据，请分别从各角度分析，最后给出综合结论。
```

**优点**：
- 每个人格专注自己的领域
- 用户能得到多角度专业分析
- 实现简单，就是拼接提示词

**注意事项**：
- Token 预算需要考虑多人格拼接的消耗
- 人格之间保持风格一致性

---

## 人格切换逻辑

```typescript
type PersonalityType = 'bazi' | 'ziwei' | 'dream' | 'mangpai' | 'general';

interface PersonalityResolution {
    personalities: PersonalityType[];  // 可能有多个
    isMultiple: boolean;
}

function resolvePersonalities(context: {
    chartContext?: ChartContext;
    dreamMode?: boolean;
}): PersonalityResolution {
    const personalities: PersonalityType[] = [];

    // 1. 解梦模式
    if (context.dreamMode) {
        personalities.push('dream');
    }

    // 2. 盲派模式（八字的子类型）
    if (context.chartContext?.analysisMode === 'mangpai') {
        personalities.push('mangpai');
    }
    // 3. 八字命盘（非盲派）
    else if (context.chartContext?.baziChart) {
        personalities.push('bazi');
    }

    // 4. 紫微命盘
    if (context.chartContext?.ziweiChart) {
        personalities.push('ziwei');
    }

    // 5. 默认使用通用分析师
    if (personalities.length === 0) {
        personalities.push('general');
    }

    return {
        personalities,
        isMultiple: personalities.length > 1
    };
}
```

**人格拼接构建**：

```typescript
function buildPersonalityPrompt(personalities: PersonalityType[]): string {
    if (personalities.length === 1) {
        // 单一人格，直接使用
        return PERSONALITIES[personalities[0]].systemPrompt;
    }

    // 多人格拼接
    const roleDescriptions = personalities.map(p => {
        const config = PERSONALITIES[p];
        return `【${config.name}】\n${config.systemPrompt}`;
    });

    return `你同时具备以下专业能力：

${roleDescriptions.join('\n\n')}

请根据用户问题和提供的数据，选择合适的角色进行分析。
如涉及多种数据，请分别从各角度分析，最后给出综合结论。`;
}
```

---

## 已确认事项

| 问题 | 决定 |
|------|------|
| 多选时的人格策略 | **人格拼接** - 多个人格同时注入，AI 根据数据选择角色 |
| 默认人格 | **general（通用分析师）** - 无特定场景时使用 |
| 紫微人格提示词 | 由用户稍后提供 |

---

## 待用户提供

1. **紫微宗师 (ziwei) 人格提示词** - 紫微斗数专业分析的角色定义

---

## 修改文件清单

| 文件 | 修改内容 |
|------|----------|
| `src/types/index.ts` | 扩展 `AIPersonality` 类型为 `'bazi' \| 'ziwei' \| 'dream' \| 'mangpai' \| 'general'` |
| `src/lib/ai.ts` | 新增人格定义（bazi, ziwei, dream, mangpai, general） |
| `src/lib/prompt-builder.ts` | 1. 拆分 `base_rules` 和 `personality_role` 层<br>2. 新增 `resolvePersonalities()` 函数<br>3. 新增 `buildPersonalityPrompt()` 函数 |
| `src/app/api/chat/route.ts` | 移除固定 `'master'`，使用动态人格解析 |
| `src/app/api/chat/preview/route.ts` | 同步更新人格解析逻辑 |

---

## 提示词层级重构

```
【重构前】
P0: master_rules (八字宗师 + 通用规则混合)
P0: dream_role (解梦补丁)
P0: mangpai_role (盲派补丁)
P1: expression_style / user_profile / custom_instructions
P2: chart_context / mangpai_data / mentions / knowledge_hits

【重构后】
P0: base_rules (纯通用准则)
P0: personality_role (根据场景动态选择，支持拼接)
    ├─ bazi (八字宗师)
    ├─ ziwei (紫微宗师)
    ├─ dream (解梦师)
    ├─ mangpai (盲派师)
    └─ general (通用分析师)
P1: expression_style / user_profile / custom_instructions
P2: chart_context / mangpai_data / dream_bazi / dream_fortune / mentions / knowledge_hits
```

---

## 验证方案

1. **单元测试**：
   - 测试 `resolvePersonalities()` 在各种输入下的输出
   - 测试 `buildPersonalityPrompt()` 单人格和多人格拼接

2. **集成测试**：
   - 只选八字 → bazi 人格
   - 只选紫微 → ziwei 人格
   - 八字+紫微 → bazi + ziwei 拼接
   - 解梦模式 → dream 人格
   - 盲派模式 → mangpai 人格
   - 无选择 → general 人格

3. **前端验证**：
   - ChatComposer 预览显示正确的人格层
