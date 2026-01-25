## 目标
- 订单记录页能显示通过 Key 激活产生的“0 元订单”（会员激活、积分激活）。
- 兼容历史已激活但未写入 orders 的数据。

## 现状与问题定位
- 订单页仅查询 orders 表：[orders/page.tsx](file:///Users/hhs/Develop/Project/MingAI/src/app/user/orders/page.tsx)
- Key 激活逻辑在 [activation-keys.ts](file:///Users/hhs/Develop/Project/MingAI/src/lib/activation-keys.ts#L171-L316) 里插入 orders，但字段与状态值不匹配真实表结构，导致插入失败。
- activation_keys 表对普通用户不开放 SELECT（RLS 仅管理员可读），因此客户端无法直接 join 来展示历史激活记录（见 migration：[20260123_add_activation_keys_and_purchase_links.sql](file:///Users/hhs/Develop/Project/MingAI/supabase/migrations/20260123_add_activation_keys_and_purchase_links.sql#L34-L78)）。

## 实施方案
### 1) 修复“Key 激活写订单”的落库字段
- 修改 [activation-keys.ts](file:///Users/hhs/Develop/Project/MingAI/src/lib/activation-keys.ts#L259-L310) 中 orders.insert 的 payload：
  - membership key：product_type=plus|pro，status=paid，amount=0，payment_method=activation_key，paid_at=used_at(或当前时间)
  - credits key：product_type=pay_per_use，status=paid，amount=0，payment_method=activation_key，paid_at=used_at(或当前时间)
- 同时把插入 orders 的返回 error 做显式处理（至少记录日志），避免“激活成功但订单缺失”悄悄发生。

### 2) 新增服务端聚合接口，补齐“历史已激活订单”的展示
- 新增 `GET /api/orders`（新文件：`src/app/api/orders/route.ts`）：
  - 从 Authorization Bearer token 解析当前用户
  - 查询 orders（user_id=当前用户）
  - 额外用 service-role 查询 activation_keys（used_by=当前用户 AND is_used=true）
  - 将 activation_keys 映射成与 orders 统一的展示模型（虚拟订单）：
    - id 使用 `ak_<activation_key_id>` 避免与真实订单 UUID 冲突
    - created_at/paid_at 使用 used_at
    - product_type：membership_type 或 pay_per_use
    - status 固定 paid，amount=0，payment_method=activation_key
  - 合并后按 created_at 倒序返回
- 这样即使过去已经激活过（但当时没写入 orders），订单记录页也能立即显示。

### 3) 订单记录页改为走 /api/orders，并优化“支付方式”展示
- 修改 [orders/page.tsx](file:///Users/hhs/Develop/Project/MingAI/src/app/user/orders/page.tsx)：
  - 仍使用 supabase.auth.getSession 获取 session
  - 使用 session.access_token 调用 `/api/orders`
  - 展示层补充 payment_method 映射：activation_key 显示“激活码”，simulated 显示“模拟支付”，其余保持原逻辑。

## 验证方式
- 本地启动后：
  - 用一个已有激活记录的账号访问 `/user/orders`，应能看到“激活码 / ¥0.00 / 支付成功”的订单条目。
  - 新激活一次 key，再刷新订单页，应立刻出现新条目。
  - 同时确认原有 simulated 支付产生的订单仍正常显示。

## 可选增强（本次可不做）
- 若希望订单里展示“激活积分数量/具体套餐信息”等更丰富字段，可在 orders 增加 `metadata jsonb` 字段并回填；但这需要额外 migration 与前后端联动。