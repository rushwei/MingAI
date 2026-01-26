# 缓存策略总览

## 目的
- 降低首屏与关键路径耗时
- 减少重复请求与重复计算
- 确保刷新与路由切换时状态可恢复

## 缓存层级
### 1) 服务端内存缓存
- 适用：高频、短 TTL 的读请求
- 工具：createMemoryCache
- 典型位置
  - 支付状态：/api/payment-status，TTL 30s
  - 签到状态：/api/checkin?action=status，TTL 60s，并发去重
  - 数据源：/api/data-sources，TTL 15s

### 2) 客户端内存缓存
- 适用：短时间内重复读取
- 工具：createMemoryCache + createSingleFlight
- 典型位置
  - 未读通知数：src/lib/notification.ts，TTL 2s
  - 支付状态：src/lib/usePaymentPause.ts，TTL 60s

### 3) localStorage（长期/会话外缓存）
- 适用：用户偏好或可短期复用的数据
- 工具：readLocalCache / writeLocalCache
- 典型位置与 TTL
  - 用户中心：profile 24h，membership 10min，level 10min
  - 模型列表：10min
  - @提及数据源/知识库：15min
  - 八字默认命盘：mingai.pref.defaultBaziChartId（永久偏好，来源：我的命盘设置默认后写入）
  - 主题：mingai.pref.theme（永久偏好，兼容旧 key: theme）
  - 社区匿名提示：mingai.pref.communityAnonymityDismissed（永久偏好，兼容旧 key）

### 4) sessionStorage（结果页状态恢复）
- 适用：命理体系结果页刷新不丢
- 工具：readSessionJSON / writeSessionJSON / updateSessionJSON
- 覆盖模块
  - 塔罗：tarot_result
  - 六爻：liuyao_question、liuyao_result
  - 合盘：hepan_result
  - MBTI：mbti_result
  - 手相：palm_result
  - 面相：face_result

### 5) 数据库缓存
- 适用：生成成本高、允许跨端复用
- 位置
  - 年度报告：annual_reports 表（服务端生成并写入）

## Key 规范
- 用户数据使用用户 ID 前缀
  - mingai.profile.{userId}
  - mingai.membership.{userId}
  - mingai.level.{userId}
  - mingai.models.{userId}.{membershipType}
  - mingai.data_sources.{userId}.v1
  - mingai.knowledge_bases.{userId}.v1
- 偏好类使用 pref 前缀
  - mingai.pref.theme
  - mingai.pref.defaultBaziChartId
  - mingai.pref.communityAnonymityDismissed

## 失效策略
- 服务端短 TTL 缓存：依赖自然过期
- 关键写入后立即清理
  - /api/checkin POST 完成后清理 status 缓存
- 客户端缓存刷新入口
  - 通知实时事件触发 bypassCache
  - @提及数据源支持 fresh=1

## 注意事项
- 不对包含敏感内容的数据做长期缓存
- sessionStorage 仅用于结果页恢复，不跨端
- 性能诊断开启时应关注缓存命中与响应分布
