/**
 * MCP API Key 管理库
 *
 * 提供 MCP Key 的生成、查询、重置、吊销等功能
 * 复用 activation-keys.ts 的模式（getServiceRoleClient + 纯函数导出）
 */

import crypto from 'crypto';
import { getServiceRoleClient } from '@/lib/api-utils';

export interface McpApiKey {
  id: string;
  user_id: string;
  key_code: string;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
}

export interface McpApiKeyWithUser extends Omit<McpApiKey, 'key_code'> {
  key_preview: string;
  user_email: string | null;
  user_nickname: string | null;
}

function buildKeyPreview(keyCode: string): string {
  if (keyCode.length <= 8) return keyCode;
  return `${keyCode.slice(0, 4)}••••${keyCode.slice(-4)}`;
}

async function getUserEmailMap(
  supabase: ReturnType<typeof getServiceRoleClient>,
  userIds: string[]
): Promise<Map<string, string | null>> {
  const emailMap = new Map<string, string | null>();
  await Promise.all(
    userIds.map(async (userId) => {
      const { data, error } = await supabase.auth.admin.getUserById(userId);
      if (error) {
        console.error('[mcp-keys] Failed to fetch auth user email:', {
          userId,
          error,
        });
        emailMap.set(userId, null);
        return;
      }
      emailMap.set(userId, data.user?.email ?? null);
    })
  );
  return emailMap;
}

/**
 * 生成 MCP Key 代码（格式: mcp- + 24 位随机字符）
 */
export function generateMcpKeyCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const randomBytes = crypto.randomBytes(24);
  let code = 'sk-mcp-mingai-';
  for (let i = 0; i < 24; i++) {
    code += chars[randomBytes[i] % chars.length];
  }
  return code;
}

/**
 * 获取用户的 MCP Key
 */
export async function getMcpKey(userId: string): Promise<McpApiKey | null> {
  try {
    const supabase = getServiceRoleClient();
    const { data, error } = await supabase
      .from('mcp_api_keys')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[mcp-keys] Failed to get key:', error);
      return null;
    }
    return data;
  } catch (error) {
    console.error('[mcp-keys] Error getting key:', error);
    return null;
  }
}

/**
 * 首次生成 MCP Key（检查唯一性）
 */
export async function createMcpKey(
  userId: string
): Promise<{ success: boolean; key?: McpApiKey; error?: string; status?: number }> {
  try {
    const supabase = getServiceRoleClient();

    // 检查是否已有 key
    const existing = await getMcpKey(userId);
    if (existing) {
      return { success: false, error: '已存在 MCP Key，请使用重置功能' };
    }

    const keyCode = generateMcpKeyCode();
    const { data, error } = await supabase
      .from('mcp_api_keys')
      .insert({ user_id: userId, key_code: keyCode })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: '已存在 MCP Key' };
      }
      console.error('[mcp-keys] Failed to create key:', error);
      return { success: false, error: '创建 MCP Key 失败' };
    }

    return { success: true, key: data };
  } catch (error) {
    console.error('[mcp-keys] Error creating key:', error);
    return { success: false, error: '服务器错误' };
  }
}

/**
 * 重置 MCP Key（旧 key 立即失效，生成新 key）
 */
export async function resetMcpKey(
  userId: string
): Promise<{ success: boolean; key?: McpApiKey; error?: string; status?: number }> {
  try {
    const supabase = getServiceRoleClient();

    const existing = await getMcpKey(userId);
    if (!existing) {
      return { success: false, error: '未找到 MCP Key，请先生成' };
    }
    if (!existing.is_active) {
      return {
        success: false,
        error: '当前账号的 MCP Key 已被管理员永久封禁，请联系管理员',
        status: 403,
      };
    }

    const newKeyCode = generateMcpKeyCode();
    const { data, error } = await supabase
      .from('mcp_api_keys')
      .update({
        key_code: newKeyCode,
        is_active: true,
        last_used_at: null,
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('[mcp-keys] Failed to reset key:', error);
      return { success: false, error: '重置 MCP Key 失败' };
    }

    return { success: true, key: data };
  } catch (error) {
    console.error('[mcp-keys] Error resetting key:', error);
    return { success: false, error: '服务器错误' };
  }
}

/**
 * 管理员吊销 MCP Key
 */
export async function revokeMcpKey(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getServiceRoleClient();

    const { error } = await supabase
      .from('mcp_api_keys')
      .update({ is_active: false })
      .eq('user_id', userId);

    if (error) {
      console.error('[mcp-keys] Failed to revoke key:', error);
      return { success: false, error: '吊销 MCP Key 失败' };
    }

    return { success: true };
  } catch (error) {
    console.error('[mcp-keys] Error revoking key:', error);
    return { success: false, error: '服务器错误' };
  }
}

/**
 * 管理员列出所有 MCP Key（join users 获取昵称/邮箱）
 */
export async function getAllMcpKeys(filters?: {
  isActive?: boolean;
}): Promise<McpApiKeyWithUser[]> {
  try {
    const supabase = getServiceRoleClient();

    let query = supabase
      .from('mcp_api_keys')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[mcp-keys] Failed to fetch all keys:', error);
      return [];
    }

    const userIds = Array.from(
      new Set((data || []).map((row) => row.user_id).filter((id): id is string => !!id))
    );

    const userMap = new Map<string, { nickname: string | null }>();
    if (userIds.length > 0) {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, nickname')
        .in('id', userIds);

      if (usersError) {
        console.error('[mcp-keys] Failed to fetch users for keys:', usersError);
      } else {
        for (const user of usersData || []) {
          userMap.set(user.id, {
            nickname: user.nickname ?? null,
          });
        }
      }
    }

    const emailMap = userIds.length > 0
      ? await getUserEmailMap(supabase, userIds)
      : new Map<string, string | null>();

    return (data || []).map((row) => {
      const user = userMap.get(row.user_id);
      return {
        id: row.id,
        user_id: row.user_id,
        key_preview: buildKeyPreview(row.key_code),
        is_active: row.is_active,
        created_at: row.created_at,
        last_used_at: row.last_used_at,
        user_email: emailMap.get(row.user_id) ?? null,
        user_nickname: user?.nickname ?? null,
      };
    });
  } catch (error) {
    console.error('[mcp-keys] Error fetching all keys:', error);
    return [];
  }
}
