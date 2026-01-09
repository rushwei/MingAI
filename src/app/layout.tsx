/**
 * 根布局组件
 * 
 * 这是 Next.js App Router 的根布局文件
 * 所有页面都会被这个布局包裹
 * 
 * 服务端组件说明：
 * - 这个文件默认是服务端组件（没有 'use client'）
 * - 可以直接获取 metadata 等服务端特性
 * - 客户端组件（如 ThemeProvider）会自动在边界处进行水合
 */

import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { ThemeProvider } from "@/components/ui/ThemeProvider";
import { SidebarProvider } from "@/components/layout/SidebarContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";

// 字体配置 - 使用 Google Fonts 的 Geist 字体
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// SEO 元数据配置
export const metadata: Metadata = {
  title: {
    default: "MingAI - AI智能命理平台",
    template: "%s | MingAI"
  },
  description: "将传统命理文化与前沿AI技术深度融合，为您提供专业、私密、便捷的命理咨询服务。八字精批、紫微斗数、塔罗占卜等多种命理体系。",
  keywords: ["命理", "八字", "AI算命", "紫微斗数", "塔罗", "运势", "命盘分析"],
  authors: [{ name: "MingAI Team" }],
  creator: "MingAI",
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "MingAI",
    title: "MingAI - AI智能命理平台",
    description: "AI驱动的个性化命理分析，多人格AI命理师，记忆式对话体验",
  },
  twitter: {
    card: "summary_large_image",
    title: "MingAI - AI智能命理平台",
    description: "AI驱动的个性化命理分析",
  },
  robots: {
    index: true,
    follow: true,
  },
};

// 视口配置
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

/**
 * 根布局组件
 * 
 * 布局结构：
 * - 桌面端：左侧固定侧边栏 + 右侧内容区（带顶部 Header）
 * - 移动端：顶部 Header + 内容区 + 底部导航栏
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        {/* ThemeProvider 提供主题上下文，包裹整个应用 */}
        <ThemeProvider>
          <SidebarProvider>
            <div className="flex min-h-screen">
              {/* 左侧导航栏 - 仅桌面端显示 */}
              <Sidebar />

              {/* 主内容区 */}
              <div className="flex-1 flex flex-col min-h-screen">
                {/* 顶部 Header - 仅移动端显示 */}
                <div className="lg:hidden">
                  <Header />
                </div>

                {/* 页面内容 */}
                <main className="flex-1 pb-20 lg:pb-0">
                  {children}
                </main>
              </div>
            </div>

            {/* 移动端底部导航 - 仅移动端显示 */}
            <MobileNav />
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
