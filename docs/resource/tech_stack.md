1. 核心技术栈 (The Stack)
• 全栈框架: Next.js 14+ (App Router)。利用 Server Actions 处理后端逻辑，不部署独立后端。
• 语言: TypeScript (前后端统一，严格类型定义)。
• UI 系统: Tailwind CSS (移动端优先/响应式设计) + Lucide React (图标库)。
• 数据库: Supabase (PostgreSQL)。直接使用 @supabase/supabase-js 客户端进行数据读写。
• 高性能计算: 预留 WebAssembly (Rust) 接口，用于处理复杂的八字/紫微排盘算法。
2. 教学模式 (我是 React 初学者) 在生成代码时，必须遵循以下“教学规范”：
• 概念解释: 遇到 useState, useEffect, useContext 或 Server Actions 时，必须在代码注释中简要解释“为什么用它”以及“它解决了什么问题”。
• 组件化: 优先使用函数式组件 (Functional Components)。
• 服务端 vs 客户端: 明确标注代码是运行在服务端 (use server) 还是客户端 (use client)，并解释原因。