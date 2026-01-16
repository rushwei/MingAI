# 六爻算法实现计划

根据 [liuyao-PRD.md](../../docs/plans/liuyao-PRD.md) 需求文档，为六爻系统实现完整的传统分析算法。

> [!TIP]
> **日柱换日规则**：确认采用**子初换日**规则（晚上23:00开始算新日）。`lunar-javascript` 库默认支持此规则。

---

## Proposed Changes

### 核心算法库

项目已有 `lunar-javascript` 库，将复用 [bazi.ts](../../src/lib/bazi.ts) 中的现有功能。

#### [MODIFY] [liuyao.ts](../../src/lib/liuyao.ts)

新增以下功能模块：

**1. 干支时间体系模块 (P0)** - 复用 lunar-javascript
```typescript
import { Solar } from 'lunar-javascript';

interface GanZhiTime {
  year: { gan: string; zhi: string };   // 年柱
  month: { gan: string; zhi: string };  // 月柱（按节气）
  day: { gan: string; zhi: string };    // 日柱
  hour: { gan: string; zhi: string };   // 时柱
}

// 使用 lunar-javascript 的 EightChar 类计算
function calculateGanZhiTime(date: Date): GanZhiTime;
```

**2. 旬空（空亡）体系 (P0)** - 复用 lunar-javascript
```typescript
interface KongWang {
  xun: string;                    // 所属旬（如"甲子旬"）
  kongDizhi: [DiZhi, DiZhi];      // 空亡地支
}

// lunar-javascript 提供 getDayXunKong() 方法
function getXunKong(date: Date): KongWang;
function checkYaoKongWang(yaoZhi: DiZhi, kongWang: KongWang, monthZhi: DiZhi, dayZhi: DiZhi): YaoKongWangState;
```

**3. 月建/日辰作用判定 (P0)**
```typescript
type YaoAction = 'sheng' | 'ke' | 'fu' | 'chong' | 'he' | 'po' | 'none';
interface YaoInfluence {
  monthAction: YaoAction;   // 月建对爻的作用
  dayAction: YaoAction;     // 日辰对爻的作用
}

function getYueJianRiChenInfluence(yaoZhi: DiZhi, monthZhi: DiZhi, dayZhi: DiZhi): YaoInfluence;
```

**4. 旺衰判定体系 (P0)**
```typescript
type WangShuai = 'wang' | 'xiang' | 'xiu' | 'qiu' | 'si';  // 旺相休囚死
interface YaoStrength {
  wangShuai: WangShuai;    // 旺衰状态
  score: number;           // 综合强度评分 (0-100)
  factors: string[];       // 影响因素说明
}

function calculateYaoWangShuai(
  yaoWuXing: WuXing,
  monthWuXing: WuXing,
  dayWuXing: WuXing,
  isChanging: boolean,
  kongWang: YaoKongWangState
): YaoStrength;
```

**5. 动爻变化分析 (P1)**
```typescript
type HuaType = 'huaJin' | 'huaTui' | 'huiTouSheng' | 'huiTouKe' | 'huaMu' | 'huaJue' | 'none';

function analyzeYaoChange(
  originalYao: FullYaoInfo,
  changedYao: FullYaoInfo
): HuaType;
```

**6. 六合/六冲/刑害破关系 (P1)**
```typescript
interface DiZhiRelation {
  liuHe: boolean;
  liuChong: boolean;
  xing: boolean;
  hai: boolean;
  po: boolean;
}

function getDiZhiRelation(zhi1: DiZhi, zhi2: DiZhi): DiZhiRelation;
```

**7. 伏神系统 (P1)**
```typescript
interface FuShen {
  position: number;        // 伏神对应爻位
  liuQin: LiuQin;         // 伏神六亲
  wuXing: WuXing;         // 伏神五行
  naJia: DiZhi;           // 伏神纳甲
  isAvailable: boolean;   // 是否可用
  reason?: string;        // 不可用原因
}

function calculateFuShen(hexagramCode: string, fullYaos: FullYaoInfo[]): FuShen[];
```

**8. 原神/忌神/仇神体系 (P2)**
```typescript
interface ShenSystem {
  yuanShen?: { position: number; liuQin: LiuQin };  // 原神
  jiShen?: { position: number; liuQin: LiuQin };    // 忌神
  chouShen?: { position: number; liuQin: LiuQin };  // 仇神
}

function identifyShenSystem(yongShen: YongShen, fullYaos: FullYaoInfo[]): ShenSystem;
```

**9. 完整六爻分析结果接口**
```typescript
interface LiuYaoAnalysis {
  ganZhiTime: GanZhiTime;
  kongWang: KongWang;
  fullYaos: FullYaoInfoExtended[];  // 扩展爻信息（包含旺衰等）
  yongShen: YongShen;
  fuShen?: FuShen[];
  shenSystem?: ShenSystem;
  timeRecommendations: TimeRecommendation[];
  summary: AnalysisSummary;  // 综合分析摘要
}
```

---

### 界面组件

#### [MODIFY] [TraditionalAnalysis.tsx](../../src/components/liuyao/TraditionalAnalysis.tsx)

- 添加干支时间显示区块
- 添加空亡状态显示列
- 添加旺衰状态显示列
- 添加伏神显示区块
- 添加原神/忌神/仇神显示

#### [MODIFY] [page.tsx](../../src/app/liuyao/result/page.tsx)

- 调用新的完整分析函数
- 传递扩展数据给 TraditionalAnalysis

---

## Verification Plan

### Automated Tests

现有测试文件：
- `src/tests/liuyao-coin-toss-final.test.ts` - 铜钱动画测试
- `src/tests/liuyao-hexagram-display.test.ts` - 卦象显示测试
- `src/tests/liuyao-route.test.ts` - API 路由测试

**运行现有测试确保不破坏功能：**
```powershell
cd MingAI
npx tsx --test src/tests/liuyao-*.test.ts
```

**新增单元测试** `src/tests/liuyao-algorithms.test.ts`：
- 干支计算测试（使用已知日期验证）
- 空亡计算测试
- 旺衰判定测试
- 六合六冲关系测试

### Manual Verification

1. **启动开发服务器**：
   ```powershell
   cd MingAI
   npm run dev
   ```

2. **访问六爻页面** `http://localhost:3000/liuyao`，完成起卦流程

3. **在结果页面检查**：
   - [ ] 干支时间是否正确显示（年月日时）
   - [ ] 空亡地支是否正确计算并标记
   - [ ] 各爻旺衰状态是否合理
   - [ ] 伏神信息是否正确显示（当用神不上卦时）
   - [ ] 时间建议是否基于新算法更新
