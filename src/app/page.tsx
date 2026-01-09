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
  Heart,
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
    description: "流式输出实时响应，支持消息编辑、重新生成，自动关联命盘进行综合分析",
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
  { name: "塔罗占卜", emoji: "🃏", available: false, desc: "即将上线" },
  { name: "六爻占卜", emoji: "☯️", available: false, desc: "即将上线" },
  { name: "面相分析", emoji: "👤", available: false, desc: "敬请期待" },
  { name: "手相分析", emoji: "🖐️", available: false, desc: "敬请期待" },
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
    features: ["基础八字/紫微排盘", "每日运势预览", "3次AI对话体验", "每日恢复1次"]
  },
  {
    tier: "Plus",
    price: "¥29.9",
    period: "/月",
    icon: Star,
    color: "text-blue-500",
    borderColor: "border-blue-500/50",
    features: ["全部排盘功能", "完整运势分析", "50次AI对话", "每日恢复5次"],
    popular: true
  },
  {
    tier: "Pro",
    price: "¥299",
    period: "/年",
    icon: Infinity,
    color: "text-amber-500",
    borderColor: "border-amber-500/50",
    features: ["全部Plus权益", "200次AI对话", "每小时恢复1次", "优先客服支持"]
  }
];

// 统计数据
const stats = [
  { value: "6+", label: "命理体系", icon: Sparkles },
  { value: "3", label: "AI对话风格", icon: MessageCircle },
  { value: "7x24", label: "全天候服务", icon: Clock },
  { value: "100%", label: "数据加密", icon: Shield }
];

export default function HomePage() {
  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-[90vh] flex flex-col justify-center">
        {/* 背景装饰 */}
        <div className="absolute inset-0 bg-accent/5" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" />

        <div className="relative max-w-6xl mx-auto px-4 py-20 lg:py-32">
          <div className="text-center">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <div className="relative group">
                <Image
                  src="/Logo.png"
                  alt="MingAI Logo"
                  width={140}
                  height={140}
                  className="rounded-4xl shadow-2xl transition-transform duration-500 group-hover:scale-105"
                  priority
                />
                <div className="absolute -inset-2 bg-accent/20 rounded-3xl blur-xl -z-10 opacity-75 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>

            {/* 标题 */}
            <h1 className="text-5xl lg:text-7xl font-bold mb-6 text-accent">
              MingAI
            </h1>
            <p className="text-xl lg:text-2xl text-foreground-secondary mb-3">
              AI智能命理平台
            </p>
            <p className="text-lg text-foreground-secondary/80 max-w-2xl mx-auto mb-10">
              将传统命理文化与前沿AI技术深度融合，
              为您提供<span className="text-accent font-medium">专业</span>、
              <span className="text-accent font-medium">私密</span>、
              <span className="text-accent font-medium">便捷</span>的命理咨询服务
            </p>

            {/* CTA 按钮 */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/bazi"
                className="
                  inline-flex items-center justify-center gap-2
                  px-10 py-4 rounded-2xl
                  bg-accent text-white font-semibold text-lg
                  hover:bg-accent/90
                  transition-all duration-300
                  shadow-lg shadow-accent/25
                  hover:shadow-xl hover:shadow-accent/30
                  hover:-translate-y-1
                  group
                "
              >
                <Sparkles className="w-5 h-5 group-hover:animate-spin" />
                开始八字精批
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/chat"
                className="
                  inline-flex items-center justify-center gap-2
                  px-10 py-4 rounded-2xl
                  bg-background-secondary text-foreground font-semibold text-lg
                  border-2 border-border
                  hover:border-accent hover:text-accent
                  transition-all duration-300
                  hover:-translate-y-1
                  group
                "
              >
                <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                AI 命理对话
              </Link>
            </div>

            {/* 信任标识 */}
            <div className="flex flex-wrap items-center justify-center gap-6 mt-12 text-foreground-secondary text-sm">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-background-secondary/50 backdrop-blur">
                <Shield className="w-4 h-4 text-green-500" />
                <span>数据安全加密</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-background-secondary/50 backdrop-blur">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>AI即时响应</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-background-secondary/50 backdrop-blur">
                <Heart className="w-4 h-4 text-rose-500" />
                <span>专业AI陪伴</span>
              </div>
            </div>
          </div>
        </div>
        {/* 滚动提示 */}
        <ScrollIndicator />
      </section>

      {/* 统计数据 */}
      <section className="py-12 bg-accent/5">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="text-center group">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-background mb-3 group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6 text-accent" />
                  </div>
                  <div className="text-3xl font-bold text-foreground mb-1">{stat.value}</div>
                  <div className="text-sm text-foreground-secondary">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 命理体系 */}
      <section className="py-12 lg:py-16 bg-background-secondary">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              多元命理体系
            </h2>
            <p className="text-foreground-secondary max-w-2xl mx-auto">
              融合东西方命理智慧，一站式满足您的命理探索需求
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {systems.map((system) => (
              <div
                key={system.name}
                className={`
                  relative p-6 rounded-2xl text-center
                  bg-background border-2 border-border
                  transition-all duration-300
                  ${system.available
                    ? 'hover:border-accent hover:shadow-xl hover:-translate-y-1 cursor-pointer group'
                    : 'opacity-60'
                  }
                `}
              >
                {system.available && system.href ? (
                  <Link href={system.href} className="absolute inset-0" />
                ) : null}
                <div className="text-5xl mb-3 group-hover:scale-110 transition-transform">{system.emoji}</div>
                <div className="font-semibold text-base mb-1">{system.name}</div>
                <div className={`text-xs ${system.available ? 'text-accent' : 'text-foreground-secondary'}`}>
                  {system.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 特性介绍 */}
      <section className="py-12 lg:py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              为什么选择 MingAI
            </h2>
            <p className="text-foreground-secondary max-w-2xl mx-auto">
              AI驱动的个性化体验，让命理解读更加现代、专业、有温度
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="
                    p-6 rounded-2xl
                    bg-background-secondary border-2 border-border
                    hover:border-accent/50 hover:shadow-xl hover:-translate-y-1
                    transition-all duration-300
                    group
                  "
                >
                  <div className={`w-14 h-14 rounded-xl ${feature.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-7 h-7 ${feature.color}`} />
                  </div>
                  <h3 className="text-xl font-semibold mb-3 group-hover:text-accent transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-foreground-secondary text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 会员体系 */}
      <section className="py-12 lg:py-16 bg-background-secondary">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              灵活的会员方案
            </h2>
            <p className="text-foreground-secondary max-w-2xl mx-auto">
              多种套餐满足不同需求，另有按量付费方案（¥9.9/次）
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {membershipBenefits.map((plan) => {
              const Icon = plan.icon;
              return (
                <div
                  key={plan.tier}
                  className={`
                    relative p-6 rounded-2xl
                    bg-background border-2 ${plan.borderColor}
                    hover:shadow-xl hover:-translate-y-1
                    transition-all duration-300
                    ${plan.popular ? 'ring-2 ring-accent ring-offset-2 ring-offset-background' : ''}
                  `}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-accent text-white text-xs font-semibold rounded-full">
                      最受欢迎
                    </div>
                  )}
                  <div className="text-center mb-6">
                    <Icon className={`w-10 h-10 ${plan.color} mx-auto mb-3`} />
                    <div className="text-2xl font-bold mb-1">{plan.tier}</div>
                    <div className="text-3xl font-bold">
                      {plan.price}
                      <span className="text-sm font-normal text-foreground-secondary">{plan.period}</span>
                    </div>
                  </div>
                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <ChevronRight className={`w-4 h-4 ${plan.color}`} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-20 bg-accent/10 relative overflow-hidden">
        {/* 背景装饰 */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />

        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 text-accent text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            免费体验
          </div>
          <h2 className="text-3xl lg:text-5xl font-bold mb-6">
            开启您的命理之旅
          </h2>
          <p className="text-lg text-foreground-secondary mb-10 max-w-xl mx-auto">
            免费体验 AI 八字精批与紫微排盘，感受传统智慧与现代科技的完美结合
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/bazi"
              className="
                inline-flex items-center justify-center gap-2
                px-12 py-5 rounded-2xl
                bg-accent text-white font-semibold text-lg
                hover:bg-accent/90
                transition-all duration-300
                shadow-xl shadow-accent/30
                hover:-translate-y-1
                group
              "
            >
              <Star className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              立即体验
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/daily"
              className="
                inline-flex items-center justify-center gap-2
                px-12 py-5 rounded-2xl
                bg-background text-foreground font-semibold text-lg
                border-2 border-border
                hover:border-accent
                transition-all duration-300
                hover:-translate-y-1
              "
            >
              <Calendar className="w-5 h-5" />
              查看今日运势
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border bg-background">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Image
                src="/Logo.png"
                alt="MingAI"
                width={32}
                height={32}
                className="rounded-lg"
              />
              <span className="font-bold text-lg">MingAI</span>
              <span className="text-foreground-secondary text-sm">© 2026</span>
            </div>
            <div className="text-foreground-secondary text-sm text-center">
              AI智能命理平台 · 传统智慧与现代科技的融合
            </div>
            <div className="flex items-center gap-4">
              <Link href="/help" className="text-foreground-secondary hover:text-accent text-sm transition-colors">
                帮助中心
              </Link>
              <span className="text-border">|</span>
              <Link href="/user" className="text-foreground-secondary hover:text-accent text-sm transition-colors">
                用户中心
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
