# 奇门遁甲功能 Full Spec

## 1. 背景与问题

- 当前现状：MingAI 已支持八字、紫微、六爻、塔罗等命理功能，但缺少奇门遁甲
- 触发原因：用户需求，奇门遁甲是三式之首，是重要的命理术数工具
- 主要痛点：市面上缺少高质量的在线奇门遁甲排盘+AI解读工具

## 2. 目标与非目标

### 2.1 目标

- 实现完整的奇门遁甲排盘功能（转盘法 + 拆补法定局）
- 提供 Web 端排盘输入页和九宫格结果展示页
- 提供 MCP 工具供 AI 调用排盘
- 支持 AI 智能解读排盘结果
- 支持格局判断、五行旺相休囚死、空亡、马星等辅助分析

### 2.2 非目标

- 飞盘排盘法（后续迭代）
- 置润法定局（不推荐使用）
- 日家奇门（仅实现时家奇门）
- 年家/月家奇门

## 3. 方案设计

### 3.1 变更范围

- 影响模块：
  - `packages/mcp-core/src/` — 新增 qimen handler、types、tool、formatter
  - `src/app/qimen/` — 新增前端页面
  - `src/components/qimen/` — 新增 UI 组件
  - `src/app/api/qimen/` — 新增 API 路由
  - `src/lib/divination/qimen.ts` — 新增薄封装层
  - `src/app/fortune-hub/page.tsx` — 注册入口
  - `supabase/migrations/` — 新增 qimen_charts 表
- 影响接口：新增 `/api/qimen` 路由
- 影响数据结构：新增 `qimen_charts` 表，`conversations.source_type` 新增 `'qimen'`

### 3.2 核心技术方案

**排盘引擎**：使用 npm 包 `taobi`（v0.4.5）作为核心排盘引擎
- 已实现：转盘排盘七步流程、拆补法/茅山法定局、VSOP87D 天文算法节气计算
- 需补充：格局判断、空亡、马星、旺相休囚死、入墓、击刑等解盘功能

**补充实现**（在 mcp-core handler 中）：
1. 格局判断模块 — 伏吟/反吟、奇仪吉凶格、入墓、击刑
2. 五行旺相休囚死 — 根据月令判断
3. 空亡计算 — 日空亡、时空亡
4. 驿马计算 — 根据日支三合局
5. 宫位综合评分

### 3.3 数据库与迁移

- 需要 migration：是
- 涉及对象：
  - 新增 `qimen_charts` 表
  - `conversations.source_type` 新增 `'qimen'` 值
- RLS：与其他命理表一致，用户只能查看自己的记录

```sql
CREATE TABLE qimen_charts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question TEXT,
  chart_time TIMESTAMPTZ NOT NULL,
  chart_data JSONB NOT NULL,
  dun_type TEXT NOT NULL CHECK (dun_type IN ('yang', 'yin')),
  ju_number INTEGER NOT NULL CHECK (ju_number BETWEEN 1 AND 9),
  pan_type TEXT NOT NULL DEFAULT 'zhuan' CHECK (pan_type IN ('zhuan', 'fei')),
  ju_method TEXT NOT NULL DEFAULT 'chaibu' CHECK (ju_method IN ('chaibu', 'zhirun', 'maoshan')),
  conversation_id UUID REFERENCES conversations(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_qimen_charts_user ON qimen_charts(user_id);
ALTER TABLE qimen_charts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own qimen charts"
  ON qimen_charts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own qimen charts"
  ON qimen_charts FOR INSERT WITH CHECK (auth.uid() = user_id);
```

## 4. MCP 工具定义

### 4.1 qimen_calculate

```typescript
{
  name: 'qimen_calculate',
  description: '奇门遁甲排盘 - 根据指定时间排出完整的奇门遁甲盘面，包括天地人神四层盘面、九星八门八神、格局判断、五行旺衰等',
  inputSchema: {
    type: 'object',
    properties: {
      year: { type: 'number', description: '公历年' },
      month: { type: 'number', description: '公历月 (1-12)' },
      day: { type: 'number', description: '公历日' },
      hour: { type: 'number', description: '时 (0-23)' },
      minute: { type: 'number', description: '分 (0-59)', default: 0 },
      question: { type: 'string', description: '占事问题（选填）' },
      panType: { type: 'string', enum: ['zhuan'], description: '盘式：zhuan=转盘', default: 'zhuan' },
      juMethod: { type: 'string', enum: ['chaibu', 'maoshan'], description: '定局法：chaibu=拆补法, maoshan=茅山法', default: 'chaibu' },
      zhiFuJiGong: { type: 'string', enum: ['ji_liuyi', 'ji_wugong'], description: '六甲直符寄宫：ji_liuyi=寄六仪, ji_wugong=寄戊宫', default: 'ji_liuyi' },
    },
    required: ['year', 'month', 'day', 'hour'],
  },
}
```

## 5. 前端页面设计

### 5.1 排盘输入页 (`/qimen`)

参考截图1，包含：
- 占事输入框
- 正时/活时切换（正时=当前时间，活时=自选时间）
- 公历日期时间选择器
- 设置区域：盘式（转盘）、定局（拆补）、六甲直符寄宫（寄六仪/寄戊宫）
- "起课"按钮

### 5.2 排盘结果页 (`/qimen/result`)

参考截图2，包含：
- 顶部信息栏：日期、节气范围、四柱、旬首、阳/阴遁局数、值符、值使
- 五行旺相休囚死颜色图例
- 九宫格排盘展示（3x3 grid），每宫显示：
  - 格局标注（如"朱雀入墓"、"太白入网"）
  - 天干 + 八神
  - 九星 + 天干
  - 八门 + 天干
  - 五行颜色标注
- 底部：概要/意象/批注 tab（AI 解读区域）
- 马星、空亡标记

## 6. 验收标准

- 功能验收：排盘结果与主流奇门遁甲软件一致（以 2026-03-15 16:51 阳遁七局为验证基准）
- 接口验收：MCP 工具可正常调用并返回完整盘面数据
- 性能验收：排盘计算 < 500ms
- 回归范围：不影响现有命理功能

## 7. 测试计划

- 单元测试：核心排盘算法（定局、地盘、天盘、八门、八神、格局判断）
- 验证数据：2026-03-15 16:51 → 阳遁七局，值符天冲，值使伤门
- 手动验证：Web 页面排盘结果与截图对比

## 8. 里程碑与任务拆分

- M1：MCP Core 排盘算法实现（taobi 集成 + 格局判断补充）
- M2：Web 前端页面（输入页 + 结果页 + API 路由）
- M3：数据库迁移 + AI 解读集成 + fortune-hub 注册

## 9. 关联信息

- 算法调研：`docs/specs/2026-03-15-qimen-algorithm-research.md`
- 核心依赖：`taobi@0.4.5`（npm，MPL-2.0）
- 参考项目：qfdk/qimen（MIT，151 stars）、Taogram/taobi（MPL-2.0，51 stars）
