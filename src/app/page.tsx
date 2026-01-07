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
  Star
} from "lucide-react";

// 特性列表
const features = [
  {
    icon: Sparkles,
    title: "AI八字精批",
    description: "基于真太阳时精准排盘，结合AI深度解读，为您呈现完整命理画卷",
    color: "text-amber-500"
  },
  {
    icon: MessageCircle,
    title: "多人格AI命理师",
    description: "玄机宗师、暖心疗愈师、神秘学者三种风格，满足不同咨询需求",
    color: "text-blue-500"
  },
  {
    icon: Calendar,
    title: "每日运势",
    description: "五维度评分系统，精准把握每日运势起伏，助您把握先机",
    color: "text-green-500"
  },
  {
    icon: Shield,
    title: "隐私优先",
    description: "所有数据加密存储，支持匿名试用，您的命理信息安全无忧",
    color: "text-purple-500"
  }
];

// 命理体系
const systems = [
  { name: "八字命理", emoji: "🔮", available: true, href: "/bazi" },
  { name: "紫微斗数", emoji: "⭐", available: true, href: "/ziwei" },
  { name: "塔罗占卜", emoji: "🃏", available: false },
  { name: "六爻占卜", emoji: "☯️", available: false },
  { name: "面相分析", emoji: "👤", available: false },
  { name: "手相分析", emoji: "🖐️", available: false },
];

export default function HomePage() {
  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* 背景装饰 */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-accent/5" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-64 h-64 bg-accent/5 rounded-full blur-2xl" />

        <div className="relative max-w-6xl mx-auto px-4 py-20 lg:py-32">
          <div className="text-center">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <Image
                  src="/Logo.png"
                  alt="MingAI Logo"
                  width={120}
                  height={120}
                  className="rounded-2xl shadow-lg"
                  priority
                />
                <div className="absolute -inset-1 bg-gradient-to-r from-accent/20 to-accent/40 rounded-2xl blur-lg -z-10" />
              </div>
            </div>

            {/* 标题 */}
            <h1 className="text-4xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground via-foreground to-accent bg-clip-text">
              MingAI
            </h1>
            <p className="text-xl lg:text-2xl text-foreground-secondary mb-4">
              AI智能命理平台
            </p>
            <p className="text-lg text-foreground-secondary max-w-2xl mx-auto mb-10">
              将传统命理文化与前沿AI技术深度融合，
              {/* <br className="hidden sm:block" /> */}
              为您提供专业、私密、便捷的命理咨询服务
            </p>

            {/* CTA 按钮 */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/bazi"
                className="
                  inline-flex items-center justify-center gap-2
                  px-8 py-4 rounded-xl
                  bg-accent text-white font-semibold
                  hover:bg-accent/90 
                  transition-all duration-300
                  shadow-lg shadow-accent/25
                  hover:shadow-xl hover:shadow-accent/30
                  hover:-translate-y-0.5
                "
              >
                <Sparkles className="w-5 h-5" />
                开始八字精批
                <ChevronRight className="w-4 h-4" />
              </Link>

              <Link
                href="/chat"
                className="
                  inline-flex items-center justify-center gap-2
                  px-8 py-4 rounded-xl
                  bg-background-secondary text-foreground font-semibold
                  border border-border
                  hover:border-accent hover:text-accent
                  transition-all duration-300
                  hover:-translate-y-0.5
                "
              >
                <MessageCircle className="w-5 h-5" />
                AI 命理对话
              </Link>
            </div>

            {/* 信任标识 */}
            <div className="flex items-center justify-center gap-6 mt-10 text-foreground-secondary text-sm">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>数据加密</span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <span>即时响应</span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4" />
                <span>专业陪伴</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 命理体系 */}
      <section className="py-16 lg:py-24 bg-background-secondary">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl lg:text-3xl font-bold text-center mb-4">
            多元命理体系
          </h2>
          <p className="text-foreground-secondary text-center mb-12 max-w-2xl mx-auto">
            融合东西方命理智慧，一站式满足您的命理探索需求
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {systems.map((system) => (
              <div
                key={system.name}
                className={`
                  relative p-6 rounded-xl text-center
                  bg-background border border-border
                  transition-all duration-300
                  ${system.available
                    ? 'hover:border-accent hover:shadow-lg cursor-pointer group'
                    : 'opacity-60'
                  }
                `}
              >
                {system.available && system.href ? (
                  <Link href={system.href} className="absolute inset-0" />
                ) : null}
                <div className="text-4xl mb-3">{system.emoji}</div>
                <div className="font-medium text-sm">{system.name}</div>
                {!system.available && (
                  <div className="text-xs text-foreground-secondary mt-1">敬请期待</div>
                )}
                {system.available && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-accent mt-1">
                    点击开始
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 特性介绍 */}
      <section className="py-16 lg:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl lg:text-3xl font-bold text-center mb-4">
            为什么选择 MingAI
          </h2>
          <p className="text-foreground-secondary text-center mb-12 max-w-2xl mx-auto">
            AI驱动的个性化体验，让命理解读更加现代、专业、有温度
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="
                    p-6 rounded-xl
                    bg-background-secondary border border-border
                    hover:border-accent/50 hover:shadow-lg
                    transition-all duration-300
                    group
                  "
                >
                  <div className={`w-12 h-12 rounded-lg bg-background flex items-center justify-center mb-4 ${feature.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 group-hover:text-accent transition-colors">
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

      {/* CTA Section */}
      <section className="py-16 lg:py-24 bg-gradient-to-r from-accent/5 via-accent/10 to-accent/5">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl lg:text-3xl font-bold mb-4">
            开启您的命理之旅
          </h2>
          <p className="text-foreground-secondary mb-8 max-w-xl mx-auto">
            免费体验 AI 八字精批，感受传统智慧与现代科技的完美结合
          </p>
          <Link
            href="/bazi"
            className="
              inline-flex items-center justify-center gap-2
              px-10 py-4 rounded-xl
              bg-accent text-white font-semibold text-lg
              hover:bg-accent/90 
              transition-all duration-300
              shadow-lg shadow-accent/25
              hover:shadow-xl hover:shadow-accent/30
              hover:-translate-y-0.5
            "
          >
            <Star className="w-5 h-5" />
            立即体验
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Image
                src="/Logo.png"
                alt="MingAI"
                width={24}
                height={24}
                className="rounded"
              />
              <span className="font-semibold">MingAI</span>
              <span className="text-foreground-secondary text-sm">© 2026</span>
            </div>
            <div className="text-foreground-secondary text-sm">
              AI智能命理平台 · 传统智慧与现代科技的融合
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
