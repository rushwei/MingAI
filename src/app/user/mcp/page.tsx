/**
 * 用户 MCP 服务页面
 *
 * 需要 useState/useEffect + 浏览器 clipboard API
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Copy,
  Check,
  RefreshCw,
  Key,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface McpKeyData {
  id: string;
  key_code: string;
  is_active: boolean;
  is_banned: boolean;
  created_at: string;
  last_used_at: string | null;
}

function buildCherryConfig(apiKey: string): string {
  return `{
  "mcpServers": {
    "mingai": {
      "url": "https://mcp.mingai.fun/mcp",
      "headers": {
        "x-api-key": "${apiKey}"
      }
    }
  }
}`;
}

function buildCursorConfig(apiKey: string): string {
  return `URL: https://mcp.mingai.fun/mcp
Header: x-api-key: ${apiKey}`;
}

function formatTime(iso: string | null): string {
  if (!iso) return '从未';
  return new Date(iso).toLocaleString('zh-CN');
}

export default function McpPage() {
  const [keyData, setKeyData] = useState<McpKeyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [operating, setOperating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [snippetCopied, setSnippetCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tutorialKey = keyData?.key_code || '你的 MCP Key';
  const cherryConfig = buildCherryConfig(tutorialKey);
  const cursorConfig = buildCursorConfig(tutorialKey);

  const getAuthHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('请先登录');
    return { Authorization: `Bearer ${session.access_token}` };
  }, []);

  const fetchKey = useCallback(async () => {
    try {
      setError(null);
      const headers = await getAuthHeaders();
      const res = await fetch('/api/user/mcp-key', { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '获取失败');
      setKeyData(data.key || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取 Key 失败');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => { fetchKey(); }, [fetchKey]);

  const handleCreate = async () => {
    setOperating(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/user/mcp-key', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '创建失败');
      setKeyData(data.key);
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    } finally {
      setOperating(false);
    }
  };

  const handleReset = async () => {
    setOperating(true);
    setError(null);
    setShowResetConfirm(false);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/user/mcp-key', {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '重置失败');
      setKeyData(data.key);
    } catch (err) {
      setError(err instanceof Error ? err.message : '重置失败');
    } finally {
      setOperating(false);
    }
  };

  const handleCopy = async () => {
    if (!keyData) return;
    try {
      await navigator.clipboard.writeText(keyData.key_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('复制失败，请手动复制');
    }
  };

  const handleCopySnippet = async (snippetName: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setSnippetCopied(snippetName);
      setTimeout(() => setSnippetCopied((current) => (current === snippetName ? null : current)), 2000);
    } catch {
      setError('复制失败，请手动复制');
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-foreground-secondary" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 md:py-8 animate-fade-in">
      {/* 顶部导航 */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/user" className="p-2 -ml-2 hover:bg-background-secondary rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold">MCP 服务</h1>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 text-red-500 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* MCP API Key 卡片 */}
      <div className="bg-background rounded-2xl border border-border p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Key className="w-5 h-5 text-accent" />
          <h2 className="font-semibold">MCP API Key</h2>
        </div>

        {!keyData ? (
          <div className="text-center py-6">
            <p className="text-foreground-secondary mb-4">还没有 MCP Key，生成一个来连接 MCP 客户端</p>
            <button
              onClick={handleCreate}
              disabled={operating}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-accent text-white font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              {operating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
              生成 MCP Key
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-border mb-4">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-border/70">
                    <th className="w-28 px-3 py-2.5 text-left font-medium text-foreground-secondary bg-background-secondary/40">
                      Key
                    </th>
                    <td className="px-3 py-2.5">
                      <code className="text-sm font-mono break-all">{keyData.key_code}</code>
                    </td>
                  </tr>
                  <tr className="border-b border-border/70">
                    <th className="px-3 py-2.5 text-left font-medium text-foreground-secondary bg-background-secondary/40">
                      状态
                    </th>
                    <td className="px-3 py-2.5">
                      <span className={keyData.is_banned ? 'text-red-500' : 'text-green-500'}>
                        {keyData.is_banned ? '已封禁' : '活跃'}
                      </span>
                    </td>
                  </tr>
                  <tr className="border-b border-border/70">
                    <th className="px-3 py-2.5 text-left font-medium text-foreground-secondary bg-background-secondary/40">
                      上次使用
                    </th>
                    <td className="px-3 py-2.5">{formatTime(keyData.last_used_at)}</td>
                  </tr>
                  <tr>
                    <th className="px-3 py-2.5 text-left font-medium text-foreground-secondary bg-background-secondary/40">
                      创建时间
                    </th>
                    <td className="px-3 py-2.5">{formatTime(keyData.created_at)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border text-sm hover:bg-background-secondary transition-colors"
                title="复制"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                复制
              </button>
              {!keyData.is_banned && (
                <button
                  onClick={() => setShowResetConfirm((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border text-sm hover:border-red-500 hover:text-red-500 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  重新生成 Key
                </button>
              )}
            </div>
            {showResetConfirm && !keyData.is_banned && (
              <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-500 mb-3">
                  确定要重新生成 Key 吗？旧 Key 将立即失效，所有使用旧 Key 的客户端需要更新。
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleReset}
                    disabled={operating}
                    className="px-4 py-1.5 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                  >
                    {operating ? '重置中...' : '确认重置'}
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="px-4 py-1.5 rounded-lg border border-border text-sm hover:bg-background-secondary transition-colors"
                  >
                    取消
                  </button>
                </div>
              </div>
            )}
            {keyData.is_banned && (
              <div className="mt-3 p-3 rounded-xl bg-red-500/10 text-red-500 text-sm">
                当前 Key 已被管理员封禁，无法重新生成。请联系管理员处理。
              </div>
            )}
          </>
        )}
      </div>

      {/* 使用教程 */}
      <div className="bg-background rounded-2xl border border-border overflow-hidden">
        <button
          onClick={() => setShowTutorial(!showTutorial)}
          className="w-full flex items-center justify-between p-5 hover:bg-background-secondary/50 transition-colors"
        >
          <span className="font-semibold">使用教程</span>
          {showTutorial ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>

        {showTutorial && (
          <div className="px-5 pb-5 space-y-5">
            {/* Cherry Studio */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">Cherry Studio</h3>
                <button
                  onClick={() => handleCopySnippet('cherry', cherryConfig)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border text-xs hover:bg-background-secondary transition-colors"
                >
                  {snippetCopied === 'cherry' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  复制配置
                </button>
              </div>
              <p className="text-sm text-foreground-secondary mb-2">
                在 Cherry Studio 的 MCP 配置文件中添加：
              </p>
              <pre className="p-3 bg-background-secondary rounded-xl text-xs overflow-x-auto">
{cherryConfig}
              </pre>
            </div>

            {/* Cursor */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">Cursor</h3>
                <button
                  onClick={() => handleCopySnippet('cursor', cursorConfig)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border text-xs hover:bg-background-secondary transition-colors"
                >
                  {snippetCopied === 'cursor' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  复制配置
                </button>
              </div>
              <p className="text-sm text-foreground-secondary mb-2">
                在 Cursor Settings → MCP 中添加服务器：
              </p>
              <pre className="p-3 bg-background-secondary rounded-xl text-xs overflow-x-auto">
{cursorConfig}
              </pre>
            </div>

            {/* 其他客户端 */}
            <div>
              <h3 className="font-medium mb-2">其他 MCP 客户端</h3>
              <p className="text-sm text-foreground-secondary">
                使用 Streamable HTTP 传输协议连接，在请求头中携带 <code className="px-1 py-0.5 bg-background-secondary rounded">x-api-key</code> 或 <code className="px-1 py-0.5 bg-background-secondary rounded">Authorization: Bearer</code> 认证。
              </p>
            </div>

            {/* 可用工具 */}
            <div>
              <h3 className="font-medium mb-2">可用工具</h3>
              <div className="space-y-2 text-sm">
                <div className="flex gap-2"><code className="text-accent">bazi_calculate</code><span className="text-foreground-secondary">— 八字排盘计算</span></div>
                <div className="flex gap-2"><code className="text-accent">bazi_pillars_resolve</code><span className="text-foreground-secondary">— 四柱反推候选时间</span></div>
                <div className="flex gap-2"><code className="text-accent">ziwei_calculate</code><span className="text-foreground-secondary">— 紫微斗数排盘</span></div>
                <div className="flex gap-2"><code className="text-accent">liuyao_analyze</code><span className="text-foreground-secondary">— 六爻排盘分析</span></div>
                <div className="flex gap-2"><code className="text-accent">tarot_draw</code><span className="text-foreground-secondary">— 塔罗牌抽牌</span></div>
                <div className="flex gap-2"><code className="text-accent">daily_fortune</code><span className="text-foreground-secondary">— 每日运势</span></div>
                <div className="flex gap-2"><code className="text-accent">liunian_analyze</code><span className="text-foreground-secondary">— 流年分析</span></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
