# Agent Changes Log

**最后更新**: 2026-01-09

---

## 安全漏洞修复 Round 3 (2026-01-09)

根据代码审查报告 `docs/review/log/2026-01-09_global_review_round3.json` 修复了1个问题。

### P1: 按量付费套餐配置不一致

**问题**: UI端 (`PayPerUse.tsx`) 提供 1/5/10/20 次及自定义数量选项，但服务端只接受 10/30/100 次固定套餐，导致所有购买请求返回 400。

**修复文件**: `src/app/api/membership/purchase-credits/route.ts`

```diff
- const creditPackages = [
-     { count: 10, price: 9.9, name: '10次对话' },
-     { count: 30, price: 19.9, name: '30次对话' },
-     { count: 100, price: 49.9, name: '100次对话' },
- ];
+ // 按量付费套餐配置（与 PayPerUse.tsx 保持一致）
+ const PRICE_PER_CREDIT = 9.9;
+ const creditPackages = [
+     { count: 1, price: 9.9 },
+     { count: 5, price: 45 },      // 省¥4.5
+     { count: 10, price: 89 },     // 省¥10
+     { count: 20, price: 168 },    // 省¥30
+ ];

- const pkg = creditPackages.find(p => p.count === count && p.price === amount);
- if (!pkg) {
+ // 验证套餐是否存在，或者是自定义数量（按 9.9元/次 计算）
+ const pkg = creditPackages.find(p => p.count === count && p.price === amount);
+ const isValidCustom = !pkg && (
+     count >= 1 && 
+     count <= 999 && 
+     Math.abs(amount - Math.round(count * PRICE_PER_CREDIT * 10) / 10) < 0.01
+ );
+ if (!pkg && !isValidCustom) {
```

**修复内容**:
- 预设套餐与UI端一致：1次(¥9.9)、5次(¥45)、10次(¥89)、20次(¥168)
- 支持自定义数量：1-999次，按 9.9元/次 计算并验证价格

---

## 验证结果

✅ `npm run build` 构建成功
