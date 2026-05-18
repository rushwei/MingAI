import { type NextRequest } from 'next/server';
import { jsonError, jsonOk, requireUserContext } from '@/lib/api-utils-local';
import { isValidChatMessagePayload } from '@/lib/server/conversation-messages';
import type { ChatMessage } from '@/types';
import { query } from '@/lib/db/postgres-client';

const CONVERSATION_LIST_SELECT = [
    'id',
    'user_id',
    'personality',
    'title',
    'created_at',
    'updated_at',
    'source_type',
    "coalesce((source_data->>'question'), '') as question_preview",
].join(', ');

function isObjectBody(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null | undefined {
    return value === undefined || value === null || typeof value === 'string';
}

function normalizeConversationTitle(title: string | null | undefined): string | null | undefined {
    if (typeof title !== 'string') {
        return title;
    }
    const trimmed = title.trim();
    return trimmed.length > 0 ? trimmed : '';
}

export async function GET(request: NextRequest) {
    const auth = await requireUserContext(request);
    if ('error' in auth) return jsonError(auth.error.message, auth.error.status);

    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get('includeArchived') === 'true';
    const limit = Math.min(Math.max(Number.parseInt(searchParams.get('limit') || '100', 10) || 100, 1), 100);
    const offset = Math.max(Number.parseInt(searchParams.get('offset') || '0', 10) || 0, 0);
    const sourceType = searchParams.get('sourceType');
    const chartId = searchParams.get('chartId');

    let sql = `SELECT ${CONVERSATION_LIST_SELECT} FROM conversations`;
    const params: unknown[] = [auth.user.id];
    let paramIndex = 1;

    sql += ` WHERE user_id = $${paramIndex++}`;

    if (sourceType) {
        sql += ` AND source_type = $${paramIndex++}`;
        params.push(sourceType);
    }
    if (chartId) {
        sql += ` AND source_data->>'chart_id' = $${paramIndex++}`;
        params.push(chartId);
    }

    sql += ` ORDER BY updated_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit + 1, offset);

    try {
        const result = await query(sql, params);
        const rows = result.rows;
        const hasMore = rows.length > limit;
        const conversations = hasMore ? rows.slice(0, limit) : rows;

        return jsonOk({
            conversations,
            pagination: {
                hasMore,
                nextOffset: hasMore ? offset + limit : null,
            },
        });
    } catch (error) {
        console.error('[conversations] failed to load list:', error);
        return jsonError('加载对话列表失败', 500);
    }
}

export async function POST(request: NextRequest) {
    const auth = await requireUserContext(request);
    if ('error' in auth) return jsonError(auth.error.message, auth.error.status);

    let body: {
        personality?: string;
        title?: string;
        messages?: unknown[] | null;
    };

    try {
        const parsed = await request.json();
        if (!isObjectBody(parsed)) {
            return jsonError('请求体必须是对象', 400);
        }
        body = parsed as typeof body;
    } catch {
        return jsonError('请求体不是合法 JSON', 400);
    }

    if (!isNullableString(body.title)) {
        return jsonError('title 必须是字符串或 null', 400);
    }
    if (!isNullableString(body.personality)) {
        return jsonError('personality 必须是字符串或 null', 400);
    }

    const normalizedTitle = normalizeConversationTitle(body.title);

    let initialMessages: ChatMessage[] = [];
    if (Object.prototype.hasOwnProperty.call(body, 'messages')) {
        if (body.messages === null) {
            initialMessages = [];
        } else if (Array.isArray(body.messages)) {
            if (!body.messages.every(isValidChatMessagePayload)) {
                return jsonError('messages 包含非法消息项', 400);
            }
            initialMessages = body.messages as ChatMessage[];
        } else {
            return jsonError('messages 必须是数组或 null', 400);
        }
    }

    const conversationId = await query(
        'INSERT INTO conversations (user_id, title, personality, source_type, source_data) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [auth.user.id, normalizedTitle || '新对话', body.personality || 'general', null, null]
    );

    if (!conversationId.rows[0]?.id) {
        return jsonError('创建对话失败', 500);
    }

    if (initialMessages.length > 0) {
        for (const message of initialMessages) {
            await query(
                'INSERT INTO conversation_messages (conversation_id, role, content, created_at) VALUES ($1, $2, $3, $4)',
                [conversationId.rows[0].id, message.role, JSON.stringify(message.content), message.createdAt || new Date()]
            );
        }
    }

    return jsonOk({ id: conversationId.rows[0].id }, 201);
}