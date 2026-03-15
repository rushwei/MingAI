# @mingai/mcp-core

MingAI 命理计算核心库，提供八字、紫微斗数、六爻、塔罗等计算能力。

可作为 SDK 直接在 Node.js 项目中调用，也是 [@mingai/mcp](https://www.npmjs.com/package/@mingai/mcp) 的底层依赖。

## 安装

```bash
npm install @mingai/mcp-core
```

## 使用示例

```typescript
import { handleToolCall } from '@mingai/mcp-core';

// 八字排盘（支持真太阳时）
const bazi = await handleToolCall('bazi_calculate', {
  gender: 'male',
  birthYear: 1990,
  birthMonth: 1,
  birthDay: 15,
  birthHour: 9,
  longitude: 116.4, // 可选：出生地经度，启用真太阳时校正
});

// 紫微斗数排盘（含宫干自化、流年虚岁、斗君等）
const ziwei = await handleToolCall('ziwei_calculate', {
  gender: 'male',
  birthYear: 2003,
  birthMonth: 9,
  birthDay: 2,
  birthHour: 10,
  birthMinute: 30,
  longitude: 116.4, // 可选：出生地经度，启用真太阳时校正
});

// 六爻排卦
const liuyao = await handleToolCall('liuyao', {
  question: '事业发展如何',
  yongShenTargets: ['官鬼'],
});
```

## 可用工具

| 工具 | 说明 |
|------|------|
| `bazi_calculate` | 八字排盘 |
| `bazi_pillars_resolve` | 八字反查（四柱 → 出生时间候选） |
| `bazi_dayun` | 八字大运计算 |
| `ziwei_calculate` | 紫微斗数排盘（含长生12神、博士12神、四化分布等） |
| `ziwei_horoscope` | 紫微运限（大限/小限/流年/流月/流日/流时） |
| `ziwei_flying_star` | 紫微飞星分析（飞化/自化/四化落宫/三方四正） |
| `liuyao` | 六爻排卦分析 |
| `tarot` | 塔罗抽牌 |
| `almanac` | 黄历查询 |

## API

```typescript
import { tools, handleToolCall, formatAsMarkdown } from '@mingai/mcp-core';

// tools - 所有工具的定义数组（含 inputSchema / outputSchema）
// handleToolCall(name, args) - 调用指定工具，返回结构化结果
// formatAsMarkdown(name, result) - 将结果格式化为 Markdown 文本
```

## 如果你想在 AI 客户端中使用

不需要直接安装 mcp-core，请使用 [@mingai/mcp](https://www.npmjs.com/package/@mingai/mcp)，它是开箱即用的 MCP Server：

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

## 更新日志

### 1.2.4 (2026-03-15)

**全工具硬算法功能大幅扩充：**

**八字 (bazi_calculate):**
- ✨ 新增天干五合检测（相邻柱甲己/乙庚/丙辛/丁壬/戊癸合化）
- ✨ 新增地支半合检测（8种半合模式，排除已成三合）
- ✨ 神煞扩充至51种（太极贵人、文昌、禄神、飞刃、驿马、桃花、华盖、将星、劫煞、亡神、灾煞、孤辰寡宿、红鸾天喜、魁罡、阴差阳错、十恶大败、三奇、天罗地网等）
- 🐛 三合局神煞改为同时检查年支和日支

**大运流年 (bazi_dayun):**
- ✨ 新增大运与原局地支关系分析（六合/六冲/三合/相刑/相害）
- ✨ 每步大运含10年流年详情（干支、十神、纳音、地支关系）
- ✨ 新增太岁标注（值/冲/合/刑/害/破太岁）
- ✨ 新增小运排列（时柱起算，阳男阴女顺排）

**六爻 (liuyao):**
- ✨ 新增互卦、错卦、综卦计算
- ✨ 新增卦身计算（世爻阳从子起/阴从午起）
- ✨ 新增时间起卦（梅花易数，先天八卦数）
- ✨ 新增数字起卦（2数法/3数法）

**紫微斗数 (ziwei_calculate + ziwei_horoscope):**
- ✨ 新增命主星（时辰查表）、身主星（年支查表）
- ✨ 新增小限（三合局起始宫，男顺女逆，12年循环）
- ✨ 新增博士十二星（禄存起始，阳男阴女/阴男阳女方向）
- ✨ 新增流年星曜（流禄/流羊/流陀/流昌/流曲）
- ✨ 每宫输出三方四正宫位

**塔罗 (tarot):**
- ✨ 新增5种牌阵（马蹄形/抉择/身心灵/处境分析/是否）
- ✨ 78张牌全部添加独立逆位关键词
- ✨ 22张大阿卡纳添加星座/行星对应
- ✨ 全部牌添加元素对应（火/水/风/土）

**黄历 (almanac):**
- ✨ 新增方位系统（财神/喜神/福神/阳贵/阴贵）
- ✨ 新增建除十二值星、黄道黑道日、天神
- ✨ 新增12时辰吉凶（干支/天神/冲煞/宜忌）
- ✨ 新增二十八星宿、纳音

### 1.1.4 (2026-03-13)

**六爻增强：**
- ✨ `liuyao` 的 `date` 字段现为必填，且必须包含时间部分（格式：`YYYY-MM-DDTHH:MM` 或 `YYYY-MM-DD HH:MM:SS`），时辰影响时柱与空亡计算
- 🗑️ 移除 `seed` 输入参数，改为基于日期时辰自动生成确定性随机序列（相同日期时辰可复现）

