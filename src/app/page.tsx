/**
 * 营销首页
 * 
 * 服务端组件说明：
 * - 首页主要是静态内容展示，适合作为服务端组件
 * - 可以直接进行 SEO 优化，内容在服务端渲染
 */

import Image from "next/image";
import Link from "next/link";
import {
  Sparkles,
  MessageCircle,
  Calendar,
  Shield,
  Zap,
  ChevronRight,
  Star,
  ChevronDown,
  Brain,
  Infinity,
  Clock
} from "lucide-react";

// 滚动提示组件 - 绝对定位在section底部
function ScrollIndicator() {
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce">
      <span className="text-foreground-secondary/60 text-xs mb-1">继续探索</span>
      <ChevronDown className="w-4 h-4 text-foreground-secondary/40" />
    </div>
  );
}

// 特性列表 - 根据PRD更新
const features = [
  {
    icon: Sparkles,
    title: "AI八字精批",
    description: "基于真太阳时精准排盘，四柱八字、十神解读、神煞分析、五行评估，结合AI深度解读命理玄机",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10"
  },
  {
    icon: Star,
    title: "紫微斗数",
    description: "完整十二宫排盘、主辅星曜系统、四化标注、大限流年分析，三方四正高亮联动",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10"
  },
  {
    icon: MessageCircle,
    title: "AI智能对话",
    description: "自动关联命盘进行综合分析，支持盲派和子平分析，更有专属深度推理模型",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10"
  },
  {
    icon: Calendar,
    title: "个性化运势",
    description: "基于命盘的每日/每月运势分析，黄历宜忌、AI智能问答，把握每日先机",
    color: "text-green-500",
    bgColor: "bg-green-500/10"
  },
  {
    icon: Brain,
    title: "记忆式对话",
    description: "AI自动记住您的命盘信息，支持上下文追问、云端同步、历史管理",
    color: "text-rose-500",
    bgColor: "bg-rose-500/10"
  },
  {
    icon: Shield,
    title: "隐私优先",
    description: "Row Level Security数据隔离，所有数据加密存储，支持匿名试用",
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10"
  }
];

// 命理体系
const systems = [
  { name: "八字命理", emoji: "🔮", available: true, href: "/bazi", desc: "四柱精批" },
  { name: "紫微斗数", emoji: "⭐", available: true, href: "/ziwei", desc: "星命推演" },
  { name: "塔罗占卜", emoji: "🃏", available: true, href: "/tarot", desc: "塔罗占卜" },
  { name: "六爻占卜", emoji: "☯️", available: true, href: "/liuyao", desc: "六爻占卜" },
  { name: "面相分析", emoji: "👤", available: true, href: "/face", desc: "AI面相" },
  { name: "手相分析", emoji: "🖐️", available: true, href: "/palm", desc: "AI手相" },
];

// 会员权益
const membershipBenefits = [
  {
    tier: "Free",
    price: "¥0",
    period: "永久免费",
    icon: Zap,
    color: "text-gray-500",
    borderColor: "border-gray-200 dark:border-gray-700",
    features: ["基础八字/紫微排盘", "塔罗/六爻/MBTI支持", "每日/月运势预览", "3次AI对话积分体验", "每日恢复1积分"]
  },
  {
    tier: "Plus",
    price: "¥29.9",
    period: "/月",
    icon: Star,
    color: "text-blue-500",
    borderColor: "border-blue-500/50",
    features: ["更多模型支持", "完整运势分析", "50积分上限", "每日恢复5积分", "模型搜索支持"],
    popular: true
  },
  {
    tier: "Pro",
    price: "¥299",
    period: "/年",
    icon: Infinity,
    color: "text-amber-500",
    borderColor: "border-amber-500/50",
    features: ["全部Plus权益", "高级模型支持", "200积分上限", "每小时恢复1积分", "深度搜索支持", "优先客服支持"]
  }
];

// 统计数据
const stats = [
  { value: "8+", label: "命理体系", icon: Sparkles },
  { value: "10+", label: "AI模型", icon: MessageCircle },
  { value: "7x24", label: "全天候服务", icon: Clock },
  { value: "100%", label: "数据加密", icon: Shield }
];

export default function HomePage() {
  return (
    <div className="animate-fade-in bg-background text-foreground overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col justify-center overflow-hidden">
        {/* 动态背景装饰 */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-accent/10 via-background to-background" />
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-accent/20 rounded-full blur-[100px] opacity-60 animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] opacity-40 animate-pulse delay-1000" />

        {/* 网格背景 */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20" />

        <div className="relative max-w-6xl mx-auto px-4 pt-20 pb-32">
          <div className="flex flex-col items-center text-center">
            {/* Logo区域 */}
            <div className="relative mb-12 group perspective-1000">
              <div className="relative z-10 transform transition-transform duration-700 group-hover:rotate-y-12 group-hover:scale-105">
                <Image
                  src="/Logo.png"
                  alt="MingAI Logo"
                  width={160}
                  height={160}
                  className="rounded-[2.5rem] shadow-2xl ring-1 ring-white/20"
                  priority
                />
                {/* 光晕效果 */}
                <div className="absolute -inset-4 bg-gradient-to-tr from-accent/40 to-blue-500/40 blur-2xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              </div>
            </div>

            {/* 标题 */}
            <h1 className="text-6xl lg:text-8xl font-black mb-6 tracking-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent via-amber-200 to-accent animate-shimmer bg-[length:200%_auto]">
                MingAI
              </span>
            </h1>
            <p className="text-2xl lg:text-3xl font-light text-foreground/80 mb-4 tracking-wide">
              AI 驱动的<span className="font-semibold text-accent">下一代</span>命理平台
            </p>
            <p className="text-lg text-foreground-secondary max-w-2xl mx-auto mb-12 leading-relaxed">
              融合<span className="px-2 py-0.5 rounded-md bg-accent/10 text-accent font-medium mx-1">传统智慧</span>
              与
              <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-500 font-medium mx-1">深度学习</span>，
              为您揭示命运的奥秘，指引人生的方向。
            </p>

            {/* CTA 按钮组 */}
            <div className="flex flex-col sm:flex-row gap-6 w-full max-w-md mx-auto relative z-20">
              <Link
                href="/bazi"
                className="
                  flex-1 inline-flex items-center justify-center gap-3
                  px-8 py-4 rounded-2xl
                  bg-gradient-to-r from-accent to-amber-600
                  text-white font-bold text-lg
                  shadow-lg shadow-accent/30
                  hover:shadow-xl hover:shadow-accent/40 hover:-translate-y-1 hover:scale-[1.02]
                  transition-all duration-300
                  relative overflow-hidden group
                "
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 skew-y-12" />
                <Sparkles className="w-5 h-5 animate-pulse" />
                <span>立即开启排盘</span>
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/chat"
                className="
                  flex-1 inline-flex items-center justify-center gap-3
                  px-8 py-4 rounded-2xl
                  bg-background/80 backdrop-blur-md
                  text-foreground font-bold text-lg
                  border border-border/50
                  shadow-lg
                  hover:bg-accent/5 hover:border-accent/50 hover:text-accent hover:-translate-y-1
                  transition-all duration-300
                  group
                "
              >
                <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span>AI 命理对话</span>
              </Link>
            </div>

            {/* 信任标识 */}
            <div className="flex flex-wrap items-center justify-center gap-8 mt-16 opacity-80">
              {[
                { icon: Shield, text: "端到端加密", color: "text-emerald-500" },
                { icon: Zap, text: "毫秒级响应", color: "text-amber-500" },
                { icon: Brain, text: "深度推理模型", color: "text-blue-500" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm font-medium text-foreground-secondary bg-background/50 px-4 py-2 rounded-full border border-border/50 backdrop-blur-sm">
                  <item.icon className={`w-4 h-4 ${item.color}`} />
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 滚动提示 */}
        <ScrollIndicator />
      </section>

      {/* 统计数据 - 悬浮卡片风格 */}
      <section className="relative z-10 -mt-20 px-4 mb-20">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-3xl bg-background/60 backdrop-blur-xl border border-white/20 shadow-2xl dark:border-white/5 dark:bg-zinc-900/60">
            {stats.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div key={idx} className="relative group p-6 text-center rounded-2xl hover:bg-white/50 dark:hover:bg-white/5 transition-colors">
                  <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-accent/10 text-accent mb-3 group-hover:scale-110 transition-transform duration-300">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="text-3xl lg:text-4xl font-black text-foreground mb-1 tracking-tight">
                    {stat.value}
                  </div>
                  <div className="text-sm font-medium text-foreground-secondary">{stat.label}</div>
                  {/* 分隔线 */}
                  {idx !== stats.length - 1 && (
                    <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 w-px h-12 bg-border/50" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 命理体系 - 玻璃拟态卡片 */}
      <section className="py-20 lg:py-32 relative">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <span className="text-accent font-semibold tracking-wider uppercase text-sm mb-2 block">Our Systems</span>
            <h2 className="text-4xl lg:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              全方位命理体系
            </h2>
            <p className="text-foreground-secondary max-w-2xl mx-auto text-lg">
              融合八字、紫微、塔罗等东西方智慧，构建最完整的数字命理生态
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {systems.map((system) => (
              <Link
                href={system.available ? system.href : "#"}
                key={system.name}
                className={`
                  relative group p-6 rounded-3xl
                  bg-gradient-to-br from-white/80 to-white/40 dark:from-zinc-800/80 dark:to-zinc-900/40
                  backdrop-blur-md border border-white/20 dark:border-white/10
                  shadow-lg hover:shadow-2xl hover:shadow-accent/10
                  transform hover:-translate-y-2 transition-all duration-500
                  flex flex-col items-center justify-between min-h-[180px]
                  ${!system.available && 'opacity-60 saturate-0 cursor-not-allowed'}
                `}
              >
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-accent/0 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="text-6xl mb-4 transform group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500 filter drop-shadow-lg">
                  {system.emoji}
                </div>

                <div className="relative z-10 text-center">
                  <h3 className="font-bold text-lg mb-1 text-foreground group-hover:text-accent transition-colors">
                    {system.name}
                  </h3>
                  <p className="text-xs text-foreground-secondary font-medium px-2 py-1 rounded-full bg-background/50">
                    {system.desc}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 特性介绍 - 科技感卡片 */}
      <section className="py-20 bg-background-secondary/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <span className="text-blue-500 font-semibold tracking-wider uppercase text-sm mb-2 block">Features</span>
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              为什么选择 <span className="text-accent">MingAI</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="
                    group p-8 rounded-[2rem]
                    bg-background border border-border/50
                    hover:border-accent/30 hover:shadow-2xl hover:shadow-accent/5
                    transition-all duration-500
                    hover:-translate-y-2
                  "
                >
                  <div className={`
                    w-16 h-16 rounded-2xl ${feature.bgColor} 
                    flex items-center justify-center mb-6 
                    group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500
                  `}>
                    <Icon className={`w-8 h-8 ${feature.color}`} />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 group-hover:text-accent transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-foreground-secondary leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 会员体系 - 高级定价表 */}
      <section className="py-20 lg:py-32 relative overflow-hidden">
        {/* 背景光效 */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/5 rounded-full blur-[120px] -z-10" />

        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              灵活的会员方案
            </h2>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent font-medium text-sm">
              <Sparkles className="w-4 h-4" />
              新用户首月优惠进行中
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 items-start">
            {membershipBenefits.map((plan) => {
              const Icon = plan.icon;
              const isPopular = plan.popular;
              return (
                <div
                  key={plan.tier}
                  className={`
                    relative p-8 rounded-[2.5rem]
                    bg-background/80 backdrop-blur-xl
                    border-2 transition-all duration-500
                    ${isPopular
                      ? 'border-accent shadow-2xl shadow-accent/20 z-10 scale-105'
                      : 'border-border/50 hover:border-border hover:shadow-xl'
                    }
                  `}
                >
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-6 py-1.5 bg-gradient-to-r from-accent to-amber-500 text-white text-sm font-bold tracking-wide rounded-full shadow-lg">
                      MOST POPULAR
                    </div>
                  )}

                  <div className="text-center mb-8">
                    <div className={`inline-flex p-4 rounded-2xl ${isPopular ? 'bg-accent/10' : 'bg-background-secondary'} mb-6`}>
                      <Icon className={`w-8 h-8 ${plan.color}`} />
                    </div>
                    <div className="text-2xl font-bold mb-2">{plan.tier}</div>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-black">{plan.price}</span>
                      <span className="text-foreground-secondary text-sm font-medium">{plan.period}</span>
                    </div>
                  </div>

                  <div className={`h-px w-full ${isPopular ? 'bg-accent/20' : 'bg-border'} mb-8`} />

                  <ul className="space-y-4">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm">
                        <div className={`mt-0.5 rounded-full p-0.5 ${isPopular ? 'bg-accent text-white' : 'bg-background-secondary text-foreground-secondary'}`}>
                          <ChevronRight className="w-3 h-3" />
                        </div>
                        <span className={isPopular ? 'text-foreground font-medium' : 'text-foreground-secondary'}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <button className={`
                    w-full mt-8 py-4 rounded-xl font-bold transition-all duration-300
                    ${isPopular
                      ? 'bg-accent text-white hover:bg-accent/90 shadow-lg shadow-accent/25 hover:shadow-accent/40'
                      : 'bg-background-secondary text-foreground hover:bg-border'
                    }
                  `}>
                    选择此方案
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-24 bg-foreground text-background relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-5" />
        <div className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-l from-accent/10 to-transparent" />

        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl lg:text-6xl font-black mb-8 leading-tight">
            探索您的<span className="text-accent">命运蓝图</span>
          </h2>
          <p className="text-xl text-white/60 mb-12 max-w-2xl mx-auto">
            立即注册，免费获得详细的 AI 八字精批报告与 3 次深度对话机会
          </p>
          <div className="flex flex-col sm:flex-row gap-5 justify-center">
            <Link
              href="/login"
              className="px-10 py-5 rounded-2xl bg-accent text-white font-bold text-lg hover:bg-white hover:text-accent transition-all duration-300"
            >
              免费注册
            </Link>
            <Link
              href="/bazi"
              className="px-10 py-5 rounded-2xl border border-white/20 text-white font-bold text-lg hover:bg-white/10 transition-all duration-300"
            >
              体验排盘
            </Link>
          </div>
        </div>
      </section>

      {/* Footer - Simplified */}
      <footer className="py-12 bg-background border-t border-border">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center text-accent">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-bold text-lg tracking-tight">MingAI</span>
          </div>
          <div className="text-sm text-foreground-secondary">
            © 2026 MingAI Inc. All rights reserved.
          </div>
          <div className="flex gap-8">
            {['关于我们', '隐私政策', '服务条款', '联系支持'].map((item) => (
              <a key={item} href="#" className="text-sm text-foreground-secondary hover:text-accent transition-colors">
                {item}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
