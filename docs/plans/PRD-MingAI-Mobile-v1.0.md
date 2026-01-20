# MingAI Mobile 产品需求文档 (PRD)

**产品名称**: MingAI Mobile - AI智能命理平台移动端
**版本**: v1.0
**创建日期**: 2026-01-20
**最后更新**: 2026-01-20
**文档状态**: 初稿
**关联文档**: [PRD-MingAI-v2.0.md](./PRD-MingAI-v2.0.md)

---

## 1. 产品概述

### 1.1 产品愿景

将MingAI的AI命理服务延伸至移动端，为用户提供**随时随地、触手可及**的命理咨询体验。通过原生应用的优势（推送通知、离线访问、流畅交互），打造更具粘性和便捷性的命理服务平台。

### 1.2 产品定位

| 维度 | 描述 |
|------|------|
| **目标市场** | 中国大陆及海外华人市场（iOS优先） |
| **产品形态** | 原生移动应用（Expo React Native） |
| **核心价值** | 便捷的移动端命理服务 + 原生推送提醒 + 离线访问能力 |
| **与Web端关系** | 功能子集 + 移动端增强特性，共享用户数据和会员体系 |

### 1.3 目标用户画像

| 用户类型 | 特征 | 移动端核心需求 |
|---------|------|---------------|
| **通勤用户** | 25-40岁，碎片化时间充裕 | 快速查看每日运势、AI问答 |
| **重度用户** | 已使用Web端，需要多端同步 | 命盘同步、对话历史、推送提醒 |
| **新用户** | 通过App Store发现 | 简洁入门流程、免费试用 |
| **隐私敏感用户** | 不希望在公共电脑访问 | 私密的个人设备访问 |

### 1.4 平台策略

| 平台 | 优先级 | 说明 |
|------|--------|------|
| **iOS** | P0 | 首发平台，App Store上架 |
| **Android** | P1 | iOS验证后跟进，Google Play上架 |

---

## 2. 技术架构

### 2.1 技术栈选型

| 类别 | 技术选型 | 版本 | 说明 |
|------|---------|------|------|
| **框架** | Expo (Managed + Dev Client) | SDK 52+ | 降低原生开发门槛，支持OTA更新 |
| **语言** | TypeScript | 5.x | 与Web端保持一致 |
| **路由** | Expo Router | 4.x | 文件系统路由，类似Next.js App Router |
| **状态管理** | Zustand + TanStack Query | 最新稳定版 | 客户端状态 + 服务端状态分离 |
| **UI组件** | NativeWind + React Native Paper | - | Tailwind风格 + Material组件 |
| **数据库** | Supabase | 复用现有 | 与Web端共享 |
| **本地存储** | AsyncStorage + WatermelonDB | - | 偏好设置 + 离线数据 |
| **推送** | expo-notifications | - | FCM (Android) + APNs (iOS) |
| **支付** | expo-in-app-purchases | - | 应用内购买 |
| **图表** | react-native-chart-kit | - | 运势图表、五行分布 |
| **动画** | react-native-reanimated | 3.x | 流畅的原生动画 |
| **图片** | expo-image-picker | - | 面相/手相拍照上传 |

### 2.2 Monorepo结构设计

```
mingai/                              # 项目根目录
├── apps/
│   ├── web/                         # 现有Next.js Web应用
│   │   ├── src/
│   │   │   ├── app/                # App Router页面
│   │   │   ├── components/         # Web组件
│   │   │   ├── lib/                # 业务逻辑（部分提取到shared）
│   │   │   └── types/              # 类型定义（提取到shared）
│   │   ├── public/
│   │   └── package.json
│   │
│   └── mobile/                      # 新增Expo移动端应用
│       ├── app/                     # Expo Router页面
│       │   ├── (tabs)/             # Tab导航页面
│       │   │   ├── index.tsx       # 首页（今日运势）
│       │   │   ├── divination.tsx  # 占卜中心
│       │   │   ├── chat.tsx        # AI对话
│       │   │   └── profile.tsx     # 个人中心
│       │   ├── bazi/               # 八字相关页面
│       │   ├── ziwei/              # 紫微相关页面
│       │   ├── tarot/              # 塔罗相关页面
│       │   ├── liuyao/             # 六爻相关页面
│       │   └── _layout.tsx         # 根布局
│       ├── components/             # 移动端组件
│       │   ├── bazi/
│       │   ├── ziwei/
│       │   ├── chat/
│       │   └── ui/
│       ├── hooks/                  # 自定义Hooks
│       ├── stores/                 # Zustand状态
│       ├── services/               # API调用封装
│       ├── assets/                 # 图片、字体等
│       ├── app.json                # Expo配置
│       ├── eas.json                # EAS Build配置
│       └── package.json
│
├── packages/
│   ├── shared/                      # 共享代码包
│   │   ├── types/                  # TypeScript类型定义
│   │   │   ├── index.ts            # 主入口
│   │   │   ├── bazi.ts             # 八字相关类型
│   │   │   ├── ziwei.ts            # 紫微相关类型
│   │   │   ├── user.ts             # 用户相关类型
│   │   │   └── chat.ts             # 对话相关类型
│   │   ├── constants/              # 常量定义
│   │   │   ├── wuxing.ts           # 五行常量
│   │   │   ├── tiangan.ts          # 天干常量
│   │   │   ├── dizhi.ts            # 地支常量
│   │   │   ├── shishen.ts          # 十神常量
│   │   │   ├── tarot.ts            # 塔罗牌数据
│   │   │   ├── hexagrams.ts        # 六爻卦辞
│   │   │   └── mbti.ts             # MBTI题目和类型
│   │   ├── utils/                  # 工具函数
│   │   │   ├── colors.ts           # 五行颜色映射
│   │   │   ├── date.ts             # 日期格式化
│   │   │   └── validation.ts       # 数据验证
│   │   └── package.json
│   │
│   └── config/                      # 共享配置
│       ├── eslint/
│       ├── typescript/
│       └── package.json
│
├── supabase/                        # 数据库配置（现有）
│   ├── migrations/
│   └── tabel_export_from_supabase.sql
│
├── turbo.json                       # Turborepo配置
├── pnpm-workspace.yaml              # pnpm工作区配置
└── package.json                     # 根package.json
```

### 2.3 共享代码策略

#### 可直接复用的代码

| 来源文件 | 目标位置 | 说明 |
|---------|---------|------|
| `src/types/index.ts` | `packages/shared/types/` | 所有TypeScript类型定义 |
| `src/lib/tarot.ts` 数据部分 | `packages/shared/constants/tarot.ts` | 78张塔罗牌数据 |
| `src/lib/hexagram-texts.ts` | `packages/shared/constants/hexagrams.ts` | 六爻卦辞 |
| `src/lib/mbti.ts` 数据部分 | `packages/shared/constants/mbti.ts` | MBTI题目和类型定义 |
| `src/lib/cities.ts` | `packages/shared/constants/cities.ts` | 城市列表 |
| `src/lib/bazi.ts` 常量部分 | `packages/shared/constants/` | 五行、天干、地支、十神等常量 |

#### 需要后端化的代码

| 模块 | 原因 | 解决方案 |
|------|------|---------|
| `src/lib/bazi.ts` 计算函数 | `lunar-javascript`不兼容RN | 创建API `/api/mobile/bazi/calculate` |
| `src/lib/ziwei.ts` | `iztro`不兼容RN | 创建API `/api/mobile/ziwei/calculate` |
| `src/lib/liuyao.ts` 时间计算 | 依赖`lunar-javascript` | 创建API `/api/mobile/liuyao/time-info` |

### 2.4 API层设计

#### 移动端专用API端点

```
src/app/api/
├── mobile/                          # 移动端专用API
│   ├── bazi/
│   │   └── calculate/
│   │       └── route.ts            # POST: 八字计算
│   ├── ziwei/
│   │   └── calculate/
│   │       └── route.ts            # POST: 紫微计算
│   ├── liuyao/
│   │   └── time-info/
│   │       └── route.ts            # POST: 干支时间信息
│   ├── push/
│   │   ├── register/
│   │   │   └── route.ts            # POST: 注册推送Token
│   │   └── settings/
│   │       └── route.ts            # PUT: 更新推送设置
│   └── device/
│       └── route.ts                # POST: 设备信息上报
│
├── chat/route.ts                   # 复用现有（已支持SSE）
├── tarot/route.ts                  # 复用现有
├── mbti/route.ts                   # 复用现有
├── hepan/route.ts                  # 复用现有
└── ...其他现有API
```

#### API请求/响应示例

**八字计算API**

```typescript
// POST /api/mobile/bazi/calculate
// Request
{
  "birthYear": 1990,
  "birthMonth": 5,
  "birthDay": 15,
  "birthHour": 10,
  "isLunar": false,
  "gender": "male",
  "location": "北京市"
}

// Response
{
  "success": true,
  "data": {
    "fourPillars": {
      "year": { "stem": "庚", "branch": "午", "element": "金", "hiddenStems": ["丁", "己"] },
      "month": { "stem": "辛", "branch": "巳", "element": "金", "hiddenStems": ["丙", "庚", "戊"] },
      "day": { "stem": "甲", "branch": "子", "element": "木", "hiddenStems": ["癸"] },
      "hour": { "stem": "己", "branch": "巳", "element": "土", "hiddenStems": ["丙", "庚", "戊"] }
    },
    "dayMaster": "甲木",
    "fiveElements": { "wood": 2, "fire": 3, "earth": 2, "metal": 3, "water": 1 },
    "tenGods": { ... },
    "shenSha": { ... },
    "daYun": [ ... ],
    "lunarDate": { "year": "庚午", "month": "四月", "day": "廿二" }
  }
}
```

#### 认证机制

- 继续使用Supabase Auth
- 移动端使用`@supabase/supabase-js`客户端
- JWT Token自动刷新
- 设备ID关联用于推送Token管理

#### 流式输出适配

```typescript
// 移动端SSE处理
import { EventSource } from 'react-native-sse';

const eventSource = new EventSource(
  `${API_URL}/api/chat`,
  {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    method: 'POST',
    body: JSON.stringify({ message, chartContext })
  }
);

eventSource.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  // 追加到消息内容
});
```

### 2.5 状态管理方案

#### Zustand Store设计

```typescript
// stores/userStore.ts
interface UserStore {
  user: User | null;
  membership: MembershipLevel;
  credits: number;
  isLoading: boolean;

  setUser: (user: User | null) => void;
  updateCredits: (delta: number) => void;
  refreshUser: () => Promise<void>;
}

// stores/themeStore.ts
interface ThemeStore {
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

// stores/chatStore.ts
interface ChatStore {
  currentConversationId: string | null;
  draftMessage: string;
  selectedChart: BaziChart | ZiweiChart | null;

  setCurrentConversation: (id: string | null) => void;
  setDraftMessage: (message: string) => void;
  setSelectedChart: (chart: BaziChart | ZiweiChart | null) => void;
}
```

#### TanStack Query Hooks

```typescript
// hooks/useBaziCharts.ts
export const useBaziCharts = () => {
  return useQuery({
    queryKey: ['bazi-charts'],
    queryFn: fetchBaziCharts,
    staleTime: 5 * 60 * 1000, // 5分钟缓存
  });
};

// hooks/useConversations.ts
export const useConversations = () => {
  return useInfiniteQuery({
    queryKey: ['conversations'],
    queryFn: ({ pageParam = 0 }) => fetchConversations(pageParam),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
};

// hooks/useDailyFortune.ts
export const useDailyFortune = (chartId: string, date: string) => {
  return useQuery({
    queryKey: ['daily-fortune', chartId, date],
    queryFn: () => fetchDailyFortune(chartId, date),
    staleTime: 24 * 60 * 60 * 1000, // 24小时缓存
  });
};
```

### 2.6 数据库扩展

#### 新增表：push_devices

```sql
-- 推送设备表
CREATE TABLE push_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  push_token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios', 'android')),
  device_id text,
  device_name text,
  os_version text,
  app_version text,
  is_active boolean DEFAULT true,
  last_used_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, push_token)
);

-- 索引
CREATE INDEX idx_push_devices_user_id ON push_devices(user_id);
CREATE INDEX idx_push_devices_platform ON push_devices(platform);
CREATE INDEX idx_push_devices_is_active ON push_devices(is_active);

-- RLS策略
ALTER TABLE push_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own devices"
  ON push_devices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own devices"
  ON push_devices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own devices"
  ON push_devices FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own devices"
  ON push_devices FOR DELETE
  USING (auth.uid() = user_id);
```

#### 新增表：push_notifications_log

```sql
-- 推送通知日志表
CREATE TABLE push_notifications_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  device_id uuid REFERENCES push_devices(id) ON DELETE SET NULL,
  notification_type text NOT NULL,
  title text NOT NULL,
  body text,
  data jsonb,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered')),
  error_message text,
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 索引
CREATE INDEX idx_push_log_user_id ON push_notifications_log(user_id);
CREATE INDEX idx_push_log_status ON push_notifications_log(status);
CREATE INDEX idx_push_log_type ON push_notifications_log(notification_type);
```

---

## 3. 功能需求详述

### 3.1 P0 MVP功能（Phase 1-2）

#### 3.1.1 用户认证

| 功能项 | 描述 | 优先级 |
|--------|------|--------|
| 邮箱登录 | 邮箱 + 密码登录 | P0 |
| 邮箱注册 | 邮箱验证码注册 | P0 |
| 密码重置 | 邮箱重置密码 | P0 |
| 会话管理 | Token自动刷新、多设备登录 | P0 |
| 生物识别 | Face ID / Touch ID 快捷登录 | P1 |

#### 3.1.2 八字排盘

| 功能项 | 描述 | 优先级 |
|--------|------|--------|
| 排盘表单 | 出生日期时间、性别、地点输入 | P0 |
| 新历/农历切换 | 支持两种历法输入 | P0 |
| 时辰选择器 | 十二时辰快捷选择 | P0 |
| 四柱展示 | 年月日时四柱横向展示 | P0 |
| 五行分布 | 圆形进度条展示五行强弱 | P0 |
| 十神解读 | 十神列表与基础解释 | P0 |
| 神煞显示 | 按柱分类的神煞展示 | P1 |
| 大运列表 | 横向可滚动大运列表 | P0 |
| 流年流月 | 选择大运查看流年流月 | P1 |
| 命盘保存 | 保存到云端 | P0 |
| 命盘管理 | 查看、编辑、删除、设为默认 | P0 |

#### 3.1.3 AI对话

| 功能项 | 描述 | 优先级 |
|--------|------|--------|
| 对话列表 | 历史对话列表展示 | P0 |
| 新建对话 | 开始新的AI对话 | P0 |
| 流式输出 | 逐字显示AI回复 | P0 |
| 命盘上下文 | 选择命盘作为对话上下文 | P0 |
| 消息复制 | 长按复制消息内容 | P0 |
| 重新生成 | 重新生成AI回复 | P1 |
| 对话搜索 | 搜索历史对话 | P1 |
| 对话管理 | 重命名、删除对话 | P0 |
| 积分消耗 | 显示剩余次数，消耗积分 | P0 |

#### 3.1.4 每日运势

| 功能项 | 描述 | 优先级 |
|--------|------|--------|
| 今日运势 | 综合运势评分与解读 | P0 |
| 五维评分 | 雷达图展示时运、爱情等维度 | P0 |
| 今日宜忌 | 适合/不适合做的事 | P0 |
| 日历切换 | 查看其他日期运势 | P1 |
| AI问答 | 针对运势的追问 | P1 |

#### 3.1.5 用户中心

| 功能项 | 描述 | 优先级 |
|--------|------|--------|
| 个人资料 | 头像、昵称、邮箱展示 | P0 |
| 我的命盘 | 八字/紫微命盘列表 | P0 |
| 会员信息 | 会员等级、剩余积分 | P0 |
| 订阅管理 | 查看订阅状态 | P0 |
| 设置 | 主题、通知、语言等 | P0 |
| 退出登录 | 清除本地数据并退出 | P0 |

### 3.2 P1 核心功能（Phase 3-4）

#### 3.2.1 紫微斗数

| 功能项 | 描述 | 优先级 |
|--------|------|--------|
| 十二宫展示 | 3x4网格展示十二宫位 | P1 |
| 星曜显示 | 主星、辅星、杂曜分层显示 | P1 |
| 四化标注 | 化禄权科忌标记 | P1 |
| 宫位详情 | 点击宫位展开详情底部抽屉 | P1 |
| 三方四正 | 点击宫位高亮关联宫位 | P1 |
| 大限流年 | 运限切换与显示 | P1 |
| 命盘保存 | 保存紫微命盘 | P1 |

#### 3.2.2 塔罗占卜

| 功能项 | 描述 | 优先级 |
|--------|------|--------|
| 牌阵选择 | 单卡、三卡、爱情、凯尔特等 | P1 |
| 问题输入 | 输入占卜问题 | P1 |
| 抽牌动画 | 流畅的抽牌交互动画 | P1 |
| 牌面展示 | 正位/逆位展示 | P1 |
| AI解读 | AI综合解读牌面含义 | P1 |
| 历史记录 | 占卜历史列表 | P1 |

#### 3.2.3 六爻占卜

| 功能项 | 描述 | 优先级 |
|--------|------|--------|
| 铜钱起卦 | 模拟投掷铜钱动画 | P1 |
| 快速起卦 | 一键随机生成卦象 | P1 |
| 卦象展示 | 六爻垂直展示（含动爻标记） | P1 |
| 变卦对比 | 本卦与变卦左右对比 | P1 |
| 传统分析 | 世应、六亲、六神等 | P1 |
| AI解卦 | AI综合解读卦象 | P1 |
| 历史记录 | 占卜历史列表 | P1 |

#### 3.2.4 MBTI测试

| 功能项 | 描述 | 优先级 |
|--------|------|--------|
| 测试流程 | 多步骤题目滑动作答 | P1 |
| 进度指示 | 当前进度展示 | P1 |
| 结果展示 | 16型人格结果卡片 | P1 |
| 维度分析 | 四个维度得分对比 | P1 |
| AI解读 | 性格深度分析 | P1 |
| 历史记录 | 测试历史列表 | P1 |

#### 3.2.5 关系合盘

| 功能项 | 描述 | 优先级 |
|--------|------|--------|
| 双人表单 | 两人出生信息输入 | P1 |
| 合盘类型 | 情侣/商业/亲子选择 | P1 |
| 匹配评分 | 综合匹配度展示 | P1 |
| 维度分析 | 性格、财运等维度对比 | P1 |
| AI建议 | 相处建议与注意事项 | P1 |
| 历史记录 | 合盘历史列表 | P1 |

#### 3.2.6 每月运势

| 功能项 | 描述 | 优先级 |
|--------|------|--------|
| 月历视图 | 日历格式展示整月运势 | P1 |
| 关键日标记 | 运势波动日高亮 | P1 |
| 日期详情 | 点击日期查看详细运势 | P1 |
| 月度总结 | 当月运势整体解读 | P1 |

#### 3.2.7 原生推送

| 功能项 | 描述 | 优先级 |
|--------|------|--------|
| 节气提醒 | 二十四节气提前提醒 | P1 |
| 运势波动 | 运势显著变化预警 | P1 |
| 关键日提醒 | 重要日期行动建议 | P1 |
| 推送设置 | 分类开关控制 | P1 |

### 3.3 P2 增强功能（Phase 5）

#### 3.3.1 面相分析

| 功能项 | 描述 | 优先级 |
|--------|------|--------|
| 拍照/相册 | 选择面部照片 | P2 |
| 分析类型 | 综合/天庭/眼相等选择 | P2 |
| AI分析 | 视觉模型面相解读 | P2 |
| 隐私提示 | 非医疗声明与隐私说明 | P2 |
| 历史记录 | 分析历史列表 | P2 |

#### 3.3.2 手相分析

| 功能项 | 描述 | 优先级 |
|--------|------|--------|
| 拍照/相册 | 选择手掌照片 | P2 |
| 手型选择 | 左手/右手/双手 | P2 |
| AI分析 | 视觉模型手相解读 | P2 |
| 历史记录 | 分析历史列表 | P2 |

#### 3.3.3 命理社区

| 功能项 | 描述 | 优先级 |
|--------|------|--------|
| 帖子列表 | 浏览社区帖子 | P2 |
| 发布帖子 | 匿名发布帖子 | P2 |
| 评论互动 | 评论、回复、点赞 | P2 |
| 举报功能 | 举报违规内容 | P2 |

#### 3.3.4 游戏化系统

| 功能项 | 描述 | 优先级 |
|--------|------|--------|
| 每日签到 | 签到领取积分 | P2 |
| 等级系统 | 经验值与等级展示 | P2 |
| 成就系统 | 成就解锁与展示 | P2 |

#### 3.3.5 应用内支付

| 功能项 | 描述 | 优先级 |
|--------|------|--------|
| 订阅购买 | Plus/Pro月度订阅 | P2 |
| 积分购买 | 单次积分包购买 | P2 |
| 订阅管理 | 查看/取消订阅 | P2 |
| 购买历史 | 交易记录查看 | P2 |

#### 3.3.6 离线支持

| 功能项 | 描述 | 优先级 |
|--------|------|--------|
| 命盘缓存 | 已保存命盘离线查看 | P2 |
| 对话缓存 | 历史对话离线查看 | P2 |
| 运势缓存 | 当日运势离线查看 | P2 |
| 离线指示 | 网络状态提示 | P2 |

### 3.4 P3 未来功能

| 功能项 | 描述 | 计划阶段 |
|--------|------|---------|
| 微信登录 | 微信一键登录 | Phase 7+ |
| 桌面Widget | iOS/Android小组件 | Phase 7+ |
| Apple Watch | 今日运势手表应用 | Phase 8+ |
| 多语言 | 繁体中文、英文 | Phase 8+ |
| 年度报告 | 年度运势总结与PDF导出 | Phase 7+ |

---

## 4. 移动端特有功能

### 4.1 原生推送通知

#### 架构设计

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   移动端设备     │     │   Supabase      │     │   APNs/FCM      │
│                 │     │   Backend       │     │                 │
│  1. 获取Token   │────►│  2. 存储Token   │     │                 │
│                 │     │                 │     │                 │
│                 │     │  3. 触发条件    │────►│  4. 发送推送    │
│                 │◄────│                 │◄────│                 │
│  5. 接收推送    │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

#### 推送类型配置

| 推送类型 | 触发条件 | 默认状态 | 发送时间 |
|---------|---------|---------|---------|
| 节气提醒 | 节气前1天 | 开启 | 早上8:00 |
| 运势波动 | 运势变化>20分 | 开启 | 早上7:00 |
| 关键日提醒 | 用户标记日期 | 开启 | 前一天20:00 |
| 积分恢复 | 积分已恢复 | 关闭 | 实时 |
| 活动通知 | 管理员发布 | 开启 | 即时 |

#### 推送内容示例

```json
// 节气提醒
{
  "title": "🌸 明日立春",
  "body": "立春是二十四节气之首，宜祈福、开业、搬家。点击查看您的立春运势。",
  "data": {
    "type": "solar_term",
    "termName": "立春",
    "deepLink": "mingai://daily?date=2026-02-04"
  }
}

// 运势波动
{
  "title": "📈 运势提醒",
  "body": "您明日的事业运势大幅提升，适合洽谈合作、签约。",
  "data": {
    "type": "fortune_change",
    "date": "2026-02-05",
    "deepLink": "mingai://daily?date=2026-02-05"
  }
}
```

### 4.2 应用内支付（IAP）

#### 产品配置

| 产品ID | 类型 | 名称 | 价格(CNY) | 权益 |
|--------|------|------|----------|------|
| `mingai.plus.monthly` | 自动续期订阅 | Plus会员月卡 | ¥29.9 | 50积分/月，每日+5 |
| `mingai.pro.monthly` | 自动续期订阅 | Pro会员月卡 | ¥99 | 200积分/月，每小时+1 |
| `mingai.credits.1` | 消耗型 | 1积分 | ¥9.9 | 1次AI对话 |
| `mingai.credits.10` | 消耗型 | 10积分包 | ¥89 | 10次AI对话（9折） |
| `mingai.credits.50` | 消耗型 | 50积分包 | ¥399 | 50次AI对话（8折） |

#### 购买流程

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   选择产品    │───►│  发起购买    │───►│  Apple/Google │───►│  收据验证    │
│              │    │              │    │   支付确认    │    │  (服务端)    │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                                                                    │
                                                                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   购买成功    │◄───│  更新本地    │◄───│  更新数据库   │◄───│  验证通过    │
│              │    │   状态       │    │  会员/积分    │    │              │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

### 4.3 离线支持策略

#### 缓存优先级

| 数据类型 | 缓存策略 | 存储方式 | 有效期 |
|---------|---------|---------|--------|
| 用户命盘 | 优先本地 | WatermelonDB | 永久 |
| 对话历史 | 最近50条 | WatermelonDB | 永久 |
| 今日运势 | 当天缓存 | AsyncStorage | 24小时 |
| 塔罗牌数据 | 永久缓存 | 应用内置 | 永久 |
| 六爻卦辞 | 永久缓存 | 应用内置 | 永久 |
| MBTI题目 | 永久缓存 | 应用内置 | 永久 |

#### 离线功能矩阵

| 功能 | 离线可用 | 说明 |
|------|---------|------|
| 查看已保存命盘 | ✅ | 本地缓存 |
| 查看历史对话 | ✅ | 本地缓存（只读） |
| 查看今日运势 | ✅ | 当天已获取的数据 |
| AI新对话 | ❌ | 需要网络 |
| 新建命盘 | ❌ | 需要后端计算 |
| 塔罗抽牌 | ⚠️ | 可抽牌，AI解读需网络 |
| 六爻起卦 | ⚠️ | 可起卦，AI解读需网络 |
| 签到 | ❌ | 需要网络 |

### 4.4 深度链接

#### URL Scheme配置

```
mingai://                           # 应用首页
mingai://bazi/{chartId}             # 八字命盘详情
mingai://ziwei/{chartId}            # 紫微命盘详情
mingai://chat/{conversationId}      # 对话详情
mingai://daily                      # 今日运势
mingai://daily?date=2026-01-20      # 指定日期运势
mingai://fortune                    # 运势中心
mingai://tarot                      # 塔罗占卜
mingai://tarot/{readingId}          # 塔罗记录详情
mingai://liuyao                     # 六爻占卜
mingai://mbti                       # MBTI测试
mingai://profile                    # 个人中心
mingai://subscription               # 订阅页面
```

#### Universal Links / App Links

| 平台 | 域名 | 路径 |
|------|------|------|
| iOS | `mingai.app` | `/app/*` |
| Android | `mingai.app` | `/app/*` |

---

## 5. UI/UX设计规范

### 5.1 导航架构

```
TabNavigator (底部Tab导航，5个Tab)
│
├── 首页 Tab (HomeStack)
│   ├── HomeScreen (今日运势概览)
│   ├── DailyFortuneScreen (运势详情)
│   └── MonthlyFortuneScreen (月历)
│
├── 占卜 Tab (DivinationStack)
│   ├── FortuneHubScreen (运势中心入口)
│   ├── BaziFormScreen (八字表单)
│   ├── BaziResultScreen (八字结果)
│   ├── ZiweiFormScreen (紫微表单)
│   ├── ZiweiResultScreen (紫微结果)
│   ├── TarotScreen (塔罗占卜)
│   ├── LiuyaoScreen (六爻占卜)
│   ├── MBTIScreen (MBTI测试)
│   └── HepanScreen (关系合盘)
│
├── AI Tab (ChatStack)
│   ├── ConversationListScreen (对话列表)
│   └── ChatScreen (对话详情)
│
├── 社区 Tab (CommunityStack) [P2]
│   ├── PostListScreen (帖子列表)
│   └── PostDetailScreen (帖子详情)
│
└── 我的 Tab (ProfileStack)
    ├── ProfileScreen (个人中心)
    ├── MyChartsScreen (我的命盘)
    ├── SubscriptionScreen (会员中心)
    ├── SettingsScreen (设置)
    ├── NotificationSettingsScreen (通知设置)
    └── AboutScreen (关于)
```

### 5.2 设计系统

#### 颜色体系

```typescript
// 复用Web端设计tokens
const colors = {
  // 背景色
  background: {
    light: '#ffffff',
    dark: '#0a0a0a',
  },
  backgroundSecondary: {
    light: '#f5f5f5',
    dark: '#1a1a1a',
  },

  // 前景色
  foreground: {
    light: '#000000',
    dark: '#ffffff',
  },
  foregroundSecondary: {
    light: '#666666',
    dark: '#a0a0a0',
  },

  // 强调色
  accent: '#D4AF37',       // 金色
  accentLight: {
    light: '#f5e6b8',
    dark: '#3d3520',
  },

  // 边框色
  border: {
    light: '#e5e5e5',
    dark: '#2a2a2a',
  },

  // 五行颜色
  wuxing: {
    wood: '#22c55e',       // 绿色
    fire: '#ef4444',       // 红色
    earth: '#f59e0b',      // 黄色
    metal: '#eab308',      // 金色
    water: '#3b82f6',      // 蓝色
  },

  // 状态颜色
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
};
```

#### 字体规范

```typescript
const typography = {
  // 字体家族
  fontFamily: {
    regular: 'PingFangSC-Regular',
    medium: 'PingFangSC-Medium',
    semibold: 'PingFangSC-Semibold',
    bold: 'PingFangSC-Bold',
  },

  // 字体大小
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },

  // 行高
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};
```

#### 间距规范

```typescript
const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
};
```

#### 圆角规范

```typescript
const borderRadius = {
  none: 0,
  sm: 4,
  base: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};
```

### 5.3 手势交互规范

| 手势 | 场景 | 行为 |
|------|------|------|
| 点击 | 按钮、列表项 | 执行操作 |
| 长按 | 消息、命盘卡片 | 弹出操作菜单 |
| 左滑 | 列表项 | 显示删除/编辑按钮 |
| 下拉 | 列表页面 | 刷新数据 |
| 上拉 | 列表页面 | 加载更多 |
| 双指捏合 | 图表、命盘 | 缩放 |
| 边缘右滑 | 页面 | 返回上一页 |

### 5.4 组件适配方案

#### 八字命盘移动端布局

```
┌─────────────────────────────────────┐
│           四柱（横向排列）            │
│  ┌────┐  ┌────┐  ┌────┐  ┌────┐    │
│  │年柱│  │月柱│  │日柱│  │时柱│    │
│  │庚午│  │辛巳│  │甲子│  │己巳│    │
│  │ 金 │  │ 金 │  │ 木 │  │ 土 │    │
│  └────┘  └────┘  └────┘  └────┘    │
├─────────────────────────────────────┤
│           五行分布（圆形）            │
│      ┌───────────────────┐          │
│      │   🔥 火 30%       │          │
│      │   🌳 木 20%       │          │
│      │   💧 水 15%       │          │
│      │   ⛰️ 土 20%       │          │
│      │   ⚙️ 金 15%       │          │
│      └───────────────────┘          │
├─────────────────────────────────────┤
│           十神列表（可展开）          │
│  ▶ 正财 ▶ 偏财 ▶ 食神 ▶ 伤官 ...   │
├─────────────────────────────────────┤
│           大运（横向滚动）            │
│  ◀ [1-10] [11-20] [21-30] [31-40] ▶ │
└─────────────────────────────────────┘
```

#### 紫微十二宫移动端布局

```
┌───────────────────────────────────────┐
│              3x4 宫位网格              │
│  ┌────┬────┬────┬────┐               │
│  │巳宫│午宫│未宫│申宫│               │
│  ├────┼────┼────┼────┤               │
│  │辰宫│    │    │酉宫│               │
│  ├────┼    │    ┼────┤               │
│  │卯宫│    │    │戌宫│               │
│  ├────┼────┼────┼────┤               │
│  │寅宫│丑宫│子宫│亥宫│               │
│  └────┴────┴────┴────┘               │
│                                       │
│  点击宫位 → 底部抽屉展开详情           │
│  ┌───────────────────────────────┐   │
│  │ 命宫                           │   │
│  │ 主星：紫微、天府               │   │
│  │ 辅星：文昌、文曲               │   │
│  │ 四化：化禄                     │   │
│  │ ...                            │   │
│  └───────────────────────────────┘   │
└───────────────────────────────────────┘
```

#### 塔罗牌阵移动端展示

```
单卡模式：
┌─────────────────────────────────────┐
│                                     │
│           ┌─────────────┐           │
│           │             │           │
│           │   🃏 牌面    │           │
│           │             │           │
│           │  愚者 正位   │           │
│           │             │           │
│           └─────────────┘           │
│                                     │
│         轻触查看详细解读             │
└─────────────────────────────────────┘

三卡模式：
┌─────────────────────────────────────┐
│    过去      现在       未来         │
│   ┌────┐   ┌────┐    ┌────┐        │
│   │ 🃏 │   │ 🃏 │    │ 🃏 │        │
│   │愚者│   │女祭│    │恋人│        │
│   │正位│   │逆位│    │正位│        │
│   └────┘   └────┘    └────┘        │
│                                     │
│  ← 左右滑动查看单卡详情 →            │
└─────────────────────────────────────┘
```

#### 六爻卦象移动端展示

```
┌─────────────────────────────────────┐
│     本卦              变卦           │
│                                     │
│  六爻 ━━━━━ 兄弟    ━━ ━━ 父母     │
│  五爻 ━━ ━━ 子孙 ○  ━━━━━ 兄弟     │ ← 动爻标记
│  四爻 ━━━━━ 妻财    ━━━━━ 妻财     │
│  三爻 ━━ ━━ 官鬼    ━━ ━━ 官鬼     │
│  二爻 ━━━━━ 父母    ━━━━━ 父母     │
│  初爻 ━━━━━ 兄弟    ━━━━━ 兄弟     │
│                                     │
│  世: 四爻   应: 初爻                 │
│                                     │
│  ────────────────────────────────   │
│  用神: 妻财   旺衰: 旺               │
│  月建: 寅木   日辰: 卯木             │
└─────────────────────────────────────┘
```

### 5.5 深色/浅色主题

- 默认跟随系统设置
- 支持手动切换（设置页面）
- 切换时平滑过渡动画
- 所有组件支持双主题

---

## 6. API接口设计

### 6.1 移动端专用API列表

| 端点 | 方法 | 描述 | 认证 |
|------|------|------|------|
| `/api/mobile/bazi/calculate` | POST | 八字计算 | 需要 |
| `/api/mobile/ziwei/calculate` | POST | 紫微计算 | 需要 |
| `/api/mobile/liuyao/time-info` | POST | 干支时间信息 | 需要 |
| `/api/mobile/push/register` | POST | 注册推送Token | 需要 |
| `/api/mobile/push/settings` | PUT | 更新推送设置 | 需要 |
| `/api/mobile/push/settings` | GET | 获取推送设置 | 需要 |
| `/api/mobile/device` | POST | 设备信息上报 | 可选 |
| `/api/mobile/iap/verify` | POST | IAP收据验证 | 需要 |

### 6.2 接口详细规范

#### POST /api/mobile/bazi/calculate

**请求体**:
```typescript
interface BaziCalculateRequest {
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  birthHour: number;        // 0-23 或 -1 表示未知
  isLunar: boolean;
  isLeapMonth?: boolean;
  gender: 'male' | 'female';
  location?: string;
}
```

**响应体**:
```typescript
interface BaziCalculateResponse {
  success: boolean;
  data?: {
    fourPillars: {
      year: Pillar;
      month: Pillar;
      day: Pillar;
      hour: Pillar;
    };
    dayMaster: string;
    dayMasterElement: WuXing;
    fiveElements: FiveElementsCount;
    tenGods: TenGodsResult;
    shenSha: ShenShaResult;
    daYun: DaYunInfo[];
    lunarDate: LunarDateInfo;
    solarDate: SolarDateInfo;
  };
  error?: string;
}
```

#### POST /api/mobile/push/register

**请求体**:
```typescript
interface PushRegisterRequest {
  pushToken: string;
  platform: 'ios' | 'android';
  deviceId?: string;
  deviceName?: string;
  osVersion?: string;
  appVersion?: string;
}
```

**响应体**:
```typescript
interface PushRegisterResponse {
  success: boolean;
  deviceId?: string;
  error?: string;
}
```

### 6.3 错误处理规范

**错误响应格式**:
```typescript
interface ApiError {
  success: false;
  error: {
    code: string;           // 错误代码
    message: string;        // 用户友好的错误信息
    details?: string;       // 开发调试信息（仅开发环境）
  };
}
```

**错误代码**:
| 代码 | 含义 | HTTP状态码 |
|------|------|-----------|
| `AUTH_REQUIRED` | 需要登录 | 401 |
| `AUTH_EXPIRED` | Token过期 | 401 |
| `FORBIDDEN` | 无权限 | 403 |
| `NOT_FOUND` | 资源不存在 | 404 |
| `RATE_LIMITED` | 请求过于频繁 | 429 |
| `CREDITS_EXHAUSTED` | 积分不足 | 402 |
| `INVALID_INPUT` | 输入参数错误 | 400 |
| `SERVER_ERROR` | 服务器错误 | 500 |

---

## 7. 开发路线图

### Phase 1: 基础架构（2周）

**目标**: 建立Monorepo、移动端项目骨架、核心API扩展

**Week 1**:
- [ ] 初始化Monorepo结构（pnpm workspaces + Turborepo）
- [ ] 提取共享类型到 `packages/shared/types`
- [ ] 提取共享常量到 `packages/shared/constants`
- [ ] 初始化Expo项目（SDK 52+）
- [ ] 配置Expo Router导航结构

**Week 2**:
- [ ] 集成Supabase客户端
- [ ] 实现移动端专用API（bazi/ziwei计算）
- [ ] 配置Zustand + TanStack Query
- [ ] 配置NativeWind样式系统
- [ ] 搭建基础UI组件库

**里程碑**: 移动端可启动，可连接Supabase并调用API

### Phase 2: MVP核心功能（4周）

**目标**: 实现八字、AI对话、每日运势的完整流程

**Week 3-4**:
- [ ] 用户认证流程（登录/注册/重置密码）
- [ ] 八字表单组件
- [ ] 八字结果展示组件
- [ ] 命盘保存与管理

**Week 5-6**:
- [ ] AI对话界面
- [ ] SSE流式输出处理
- [ ] 命盘选择器集成
- [ ] 每日运势展示
- [ ] 用户中心页面
- [ ] 会员等级与积分展示

**里程碑**: 完整的八字+AI闭环可用

### Phase 3: 功能扩展（4周）

**目标**: 补全紫微、塔罗、六爻、MBTI、合盘

**Week 7-8**:
- [ ] 紫微斗数排盘与展示
- [ ] 十二宫交互（点击展开详情）
- [ ] 三方四正高亮
- [ ] 塔罗牌抽取与展示
- [ ] 塔罗AI解读

**Week 9-10**:
- [ ] 六爻占卜（铜钱动画）
- [ ] 六爻卦象展示与分析
- [ ] MBTI测试流程
- [ ] MBTI结果展示
- [ ] 关系合盘表单与结果
- [ ] 每月运势日历

**里程碑**: 主要命理功能齐全

### Phase 4: 原生能力集成（3周）

**目标**: 推送通知、应用内支付、分享

**Week 11-12**:
- [ ] 数据库扩展（push_devices表）
- [ ] 推送Token注册
- [ ] 推送通知接收与处理
- [ ] 推送设置管理
- [ ] 深度链接处理

**Week 13**:
- [ ] IAP产品配置（App Store Connect / Google Play Console）
- [ ] 订阅购买流程
- [ ] 消耗品购买流程
- [ ] 服务端收据验证
- [ ] 原生分享功能（react-native-share）

**里程碑**: 商业化能力就绪

### Phase 5: 增强功能（3周）

**目标**: 面相手相、社区、游戏化

**Week 14**:
- [ ] 相机/相册图片选择
- [ ] 面相分析上传与结果
- [ ] 手相分析上传与结果

**Week 15**:
- [ ] 命理社区基础功能
- [ ] 帖子列表与详情
- [ ] 评论与点赞

**Week 16**:
- [ ] 每日签到
- [ ] 等级与经验值系统
- [ ] 成就系统

**里程碑**: 功能完整度达到Web端80%

### Phase 6: 优化与发布（2周）

**目标**: 性能优化、测试、上架

**Week 17**:
- [ ] 性能优化（启动时间<2s）
- [ ] 离线功能完善
- [ ] 端到端测试
- [ ] Bug修复

**Week 18**:
- [ ] iOS App Store审核准备
  - [ ] 隐私政策
  - [ ] 用户协议
  - [ ] 应用截图
  - [ ] 应用描述
- [ ] TestFlight测试
- [ ] 正式提交审核
- [ ] Google Play上架准备（后续）

**里程碑**: iOS版本正式上架

---

## 8. 风险评估

### 8.1 技术风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| lunar-javascript/iztro后端化延迟 | 高 | 中 | 提前2周开始API开发；Web端计算函数可直接复用 |
| Expo SDK升级兼容性 | 中 | 低 | 锁定SDK版本；建立升级测试流程 |
| AI流式输出弱网体验差 | 中 | 中 | 实现消息分段显示；添加重试机制；离线提示 |
| 推送通知权限拒绝率高 | 中 | 中 | 设计引导流程；首次启动延迟请求权限；提供价值说明 |
| React Native性能问题 | 中 | 低 | 使用Reanimated处理动画；列表使用FlashList；避免过度渲染 |

### 8.2 商业风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| iOS审核被拒（占卜类） | 高 | 中 | 强调娱乐属性；添加"仅供参考"免责声明；避免"预测未来"措辞 |
| 苹果30%抽成影响利润 | 高 | 确定 | 优化定价策略；考虑Web端引导付费（需遵守规则） |
| 用户获取成本高 | 高 | 中 | ASO优化；社交分享激励；老用户推荐奖励 |
| 功能被竞品复制 | 中 | 高 | 持续AI能力提升；建立用户粘性（数据、习惯） |

### 8.3 资源风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| React Native开发经验不足 | 中 | 中 | 使用Expo降低门槛；参考成熟UI库；社区资源学习 |
| 双平台适配工作量大 | 中 | 高 | iOS优先策略；使用跨平台组件；平台特定代码最小化 |
| 后端API扩展影响Web | 中 | 低 | 使用独立路由（/api/mobile/）；充分测试；灰度发布 |

---

## 9. 附录

### A. 技术栈汇总表

| 类别 | 技术 | 版本 | 用途 |
|------|------|------|------|
| **框架** | Expo | SDK 52+ | 移动端开发框架 |
| **语言** | TypeScript | 5.x | 类型安全 |
| **路由** | Expo Router | 4.x | 文件系统路由 |
| **状态** | Zustand | 5.x | 客户端状态管理 |
| **数据获取** | TanStack Query | 5.x | 服务端状态管理 |
| **样式** | NativeWind | 4.x | Tailwind for RN |
| **UI组件** | React Native Paper | 5.x | Material组件 |
| **数据库** | Supabase | 2.x | 后端服务 |
| **本地存储** | AsyncStorage | 2.x | 简单KV存储 |
| **离线数据** | WatermelonDB | 0.27+ | SQLite ORM |
| **推送** | expo-notifications | 0.29+ | FCM/APNs |
| **支付** | expo-in-app-purchases | 15.x | IAP |
| **图表** | react-native-chart-kit | 6.x | 数据可视化 |
| **动画** | react-native-reanimated | 3.x | 高性能动画 |
| **手势** | react-native-gesture-handler | 2.x | 手势处理 |
| **图片选择** | expo-image-picker | 15.x | 相机/相册 |
| **分享** | expo-sharing | 12.x | 原生分享 |
| **构建** | EAS Build | - | 云构建服务 |
| **更新** | EAS Update | - | OTA更新 |

### B. 数据库Schema扩展

```sql
-- 推送设备表
CREATE TABLE push_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  push_token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios', 'android')),
  device_id text,
  device_name text,
  os_version text,
  app_version text,
  is_active boolean DEFAULT true,
  last_used_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, push_token)
);

-- 推送日志表
CREATE TABLE push_notifications_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  device_id uuid REFERENCES push_devices(id) ON DELETE SET NULL,
  notification_type text NOT NULL,
  title text NOT NULL,
  body text,
  data jsonb,
  status text DEFAULT 'pending',
  error_message text,
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- IAP交易表（补充现有orders表）
ALTER TABLE orders ADD COLUMN IF NOT EXISTS
  platform text CHECK (platform IN ('web', 'ios', 'android'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS
  store_transaction_id text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS
  store_product_id text;
```

### C. 与Web端PRD功能对照表

| 功能模块 | Web端 | 移动端 | 移动端Phase |
|---------|-------|-------|------------|
| **八字排盘** | ✅ | ✅ | P0 (Phase 2) |
| **紫微斗数** | ✅ | ✅ | P1 (Phase 3) |
| **六爻占卜** | ✅ | ✅ | P1 (Phase 3) |
| **塔罗占卜** | ✅ | ✅ | P1 (Phase 3) |
| **MBTI测试** | ✅ | ✅ | P1 (Phase 3) |
| **关系合盘** | ✅ | ✅ | P1 (Phase 3) |
| **AI对话** | ✅ | ✅ | P0 (Phase 2) |
| **每日运势** | ✅ | ✅ | P0 (Phase 2) |
| **每月运势** | ✅ | ✅ | P1 (Phase 3) |
| **面相分析** | ✅ | ✅ | P2 (Phase 5) |
| **手相分析** | ✅ | ✅ | P2 (Phase 5) |
| **命理社区** | ✅ | ✅ | P2 (Phase 5) |
| **命理记账** | ✅ | ❌ | 待定 |
| **游戏化系统** | ✅ | ✅ | P2 (Phase 5) |
| **推送通知** | ✅ (邮件/站内) | ✅ (原生) | P1 (Phase 4) |
| **年度报告** | ✅ | ❌ | P3 |
| **微信登录** | ❌ | ❌ | P3 |
| **应用内支付** | N/A | ✅ | P2 (Phase 4) |
| **深度链接** | N/A | ✅ | P1 (Phase 4) |
| **离线支持** | N/A | ✅ | P2 (Phase 5) |
| **桌面Widget** | N/A | ❌ | P3 |

---

## 版本记录

| 版本 | 日期 | 变更内容 |
|------|------|---------|
| v1.0 | 2026-01-20 | 初稿创建 |

---

## 参考资料

- [MingAI Web端PRD](./PRD-MingAI-v2.0.md)
- [Expo官方文档](https://docs.expo.dev/)
- [React Navigation文档](https://reactnavigation.org/)
- [Supabase文档](https://supabase.com/docs)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
