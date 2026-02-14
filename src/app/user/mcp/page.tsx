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
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';

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
Headers: x-api-key: ${apiKey}`;
}

function formatTime(iso: string | null): string {
  if (!iso) return '从未';
  return new Date(iso).toLocaleString('zh-CN');
}

export default function McpPage() {
  const { showToast } = useToast();
  const [keyData, setKeyData] = useState<McpKeyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [operating, setOperating] = useState(false);
  const [copied, setCopied] = useState(false);
  // 使用教程默认展开
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [snippetCopied, setSnippetCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authMethod, setAuthMethod] = useState<'oauth' | 'apikey'>('oauth');
  const [showKey, setShowKey] = useState(false);
  const tutorialKey = keyData?.key_code || '你的 MCP Key';

  const maskKey = (key: string) => {
    if (key.length <= 8) return key;
    return key.slice(0, 4) + '****' + key.slice(-4);
  };
  const cherryConfig = buildCherryConfig(tutorialKey);
  const ideConfig = buildCursorConfig(tutorialKey);

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
    // 不关闭弹窗，让 loading 状态在弹窗内显示
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/user/mcp-key', {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '重置失败');
      setKeyData(data.key);
      setShowResetConfirm(false);
      showToast('success', 'MCP Key 重置成功');
    } catch (err) {
      setError(err instanceof Error ? err.message : '重置失败');
      showToast('error', err instanceof Error ? err.message : '重置失败');
      setShowResetConfirm(false);
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
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-foreground-secondary" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 md:py-8 animate-fade-in">
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

      {/* 可用工具 */}
      <div className="bg-background rounded-2xl border border-border p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="font-semibold">可用工具</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-1.5 rounded-lg bg-background-secondary text-sm">八字排盘</span>
          <span className="px-3 py-1.5 rounded-lg bg-background-secondary text-sm">四柱排盘</span>
          <span className="px-3 py-1.5 rounded-lg bg-background-secondary text-sm">紫微斗数</span>
          <span className="px-3 py-1.5 rounded-lg bg-background-secondary text-sm">六爻（快速摇挂/选卦分析）</span>
          <span className="px-3 py-1.5 rounded-lg bg-background-secondary text-sm">塔罗</span>
          <span className="px-3 py-1.5 rounded-lg bg-background-secondary text-sm">每日运势</span>
          <span className="px-3 py-1.5 rounded-lg bg-background-secondary text-sm">大运</span>
        </div>
      </div>

      {/* MCP 服务 */}
      <div className="bg-background rounded-2xl border border-border p-5 mb-4">
        {/* 标题 */}
        <div className="flex items-center gap-2 mb-4">
          <h2 className="font-semibold">获取您的 MCP 服务</h2>
        </div>

        {/* 认证方式选择 */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setAuthMethod('oauth')}
            className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${
              authMethod === 'oauth'
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border hover:bg-background-secondary'
            }`}
          >
            OAuth 认证
          </button>
          <button
            onClick={() => setAuthMethod('apikey')}
            className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${
              authMethod === 'apikey'
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border hover:bg-background-secondary'
            }`}
          >
            API Key 认证
          </button>
        </div>

        {/* OAuth 模式 */}
        {authMethod === 'oauth' && (
          <div className="space-y-4">
            <p className="text-sm text-foreground-secondary">
              通过 OAuth 自动完成认证，无需手动传 Key。首次连接时会弹出 MingAI 登录页面授权。
            </p>
            <div className="p-4 rounded-xl">
              <div className="text-sm space-y-2">
                <div className="flex gap-2">
                  <span className="text-foreground-secondary">URL:</span>
                  <code className="px-1 py-0.5 bg-background-secondary rounded">https://mcp.mingai.fun/mcp</code>
                </div>
                <div className="flex gap-2">
                  <span className="text-foreground-secondary">Type:</span>
                  <code className="px-1 py-0.5 bg-background-secondary rounded">streamable_http</code> 或 <code className="px-1 py-0.5 bg-background-secondary rounded">http</code> 或 <code className="px-1 py-0.5 bg-background-secondary rounded">streamableHttp</code>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* API Key 模式 */}
        {authMethod === 'apikey' && (
          <div className="space-y-4">
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
                {/* 横向表格 */}
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/70">
                        <th className="px-3 py-2.5 text-left font-medium text-foreground-secondary bg-background-secondary/40">Key</th>
                        <th className="px-3 py-2.5 text-left font-medium text-foreground-secondary bg-background-secondary/40">状态</th>
                        <th className="px-3 py-2.5 text-left font-medium text-foreground-secondary bg-background-secondary/40">上次使用</th>
                        <th className="px-3 py-2.5 text-left font-medium text-foreground-secondary bg-background-secondary/40">创建时间</th>
                        <th className="px-3 py-2.5 text-left font-medium text-foreground-secondary bg-background-secondary/40 w-24">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border/70">
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-mono">{showKey ? keyData.key_code : maskKey(keyData.key_code)}</code>
                            <button
                              onClick={() => setShowKey(!showKey)}
                              className="text-xs text-foreground-secondary hover:text-foreground"
                            >
                              {showKey ? '隐藏' : '显示'}
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={keyData.is_banned ? 'text-red-500' : 'text-green-500'}>
                            {keyData.is_banned ? '已封禁' : '活跃'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">{formatTime(keyData.last_used_at)}</td>
                        <td className="px-3 py-2.5">{formatTime(keyData.created_at)}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex gap-1">
                            <button
                              onClick={handleCopy}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border text-xs hover:bg-background-secondary transition-colors"
                              title="复制"
                              disabled={operating}
                            >
                              {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                            </button>
                            {!keyData.is_banned ? (
                              <button
                                onClick={() => setShowResetConfirm(true)}
                                className="inline-flex items-center px-2 py-1 rounded border border-border text-xs hover:border-red-500 hover:text-red-500 transition-colors"
                                title="重置"
                                disabled={operating}
                              >
                                {operating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {showResetConfirm && !keyData.is_banned && (
                  <ConfirmDialog
                    isOpen={showResetConfirm}
                    onClose={() => setShowResetConfirm(false)}
                    onConfirm={handleReset}
                    title="确认重置"
                    description="确定要重新生成 Key 吗？旧 Key 将立即失效，所有使用旧 Key 的客户端需要更新。"
                    confirmText={operating ? '重置中...' : '确认重置'}
                    cancelText="取消"
                    variant="danger"
                    loading={operating}
                  />
                )}
                {keyData.is_banned && (
                  <div className="mt-3 p-3 rounded-xl bg-red-500/10 text-red-500 text-sm">
                    当前 Key 已被管理员封禁，无法重新生成。请联系管理员处理。
                  </div>
                )}

                {/* 配置说明 */}
                <div className="space-y-3 pt-4 border-t border-border">
                  <h3 className="font-medium text-sm">配置说明</h3>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-foreground-secondary">Cherry Studio 等其他客户端</span>
                      <button
                        onClick={() => handleCopySnippet('cherry', cherryConfig)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border text-xs hover:bg-background-secondary"
                      >
                        {snippetCopied === 'cherry' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                        复制
                      </button>
                    </div>
                    <pre className="p-3 bg-background-secondary rounded-xl text-xs overflow-x-auto">
{cherryConfig}
                    </pre>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-foreground-secondary">IDE/CLI</span>
                      <button
                        onClick={() => handleCopySnippet('ide', ideConfig)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border text-xs hover:bg-background-secondary"
                      >
                        {snippetCopied === 'ide' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                        复制
                      </button>
                    </div>
                    <pre className="p-3 bg-background-secondary rounded-xl text-xs overflow-x-auto">
{ideConfig}
                    </pre>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
