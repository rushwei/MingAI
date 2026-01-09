/**
 * 积分恢复 Cron Job API
 * 
 * Vercel Cron 配置：在 vercel.json 中添加
 * {
 *   "crons": [{
 *     "path": "/api/credits/restore?period=daily",
 *     "schedule": "0 0 * * *"
 *   }, {
 *     "path": "/api/credits/restore?period=hourly", 
 *     "schedule": "0 * * * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { restoreAllCredits } from '@/lib/credits';

export async function GET(request: NextRequest) {
    // 验证 Cron 密钥（可选，增加安全性）
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 获取恢复周期参数
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') as 'daily' | 'hourly';

    if (!period || !['daily', 'hourly'].includes(period)) {
        return NextResponse.json(
            { error: 'Invalid period. Use "daily" or "hourly"' },
            { status: 400 }
        );
    }

    try {
        const result = await restoreAllCredits(period);

        return NextResponse.json({
            success: true,
            period,
            ...result,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[cron] Credit restore failed:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// 支持手动触发（POST 请求）
export async function POST(request: NextRequest) {
    return GET(request);
}
