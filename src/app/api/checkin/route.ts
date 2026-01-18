/**
 * 签到 API
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
    getCheckinStatus,
    performCheckin,
    getCheckinCalendar,
    getCheckinStats
} from '@/lib/checkin';
import { getUserLevel } from '@/lib/gamification';

interface CheckinResponse {
    success: boolean;
    data?: {
        status?: {
            canCheckin: boolean;
            lastCheckin: string | null;
            streakDays: number;
            todayCheckedIn: boolean;
        };
        result?: {
            streakDays: number;
            rewardCredits: number;
            leveledUp: boolean;
        };
        calendar?: string[];
        stats?: {
            totalDays: number;
            currentStreak: number;
            longestStreak: number;
            thisMonthDays: number;
        };
        level?: {
            level: number;
            experience: number;
            totalExperience: number;
            title: string;
        };
    };
    error?: string;
}

// GET - 获取签到状态
export async function GET(request: NextRequest): Promise<NextResponse<CheckinResponse>> {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ success: false, error: '认证失败' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action') || 'status';

        switch (action) {
            case 'status': {
                const status = await getCheckinStatus(user.id);
                const level = await getUserLevel(user.id);
                return NextResponse.json({
                    success: true,
                    data: {
                        status,
                        level: level ? {
                            level: level.level,
                            experience: level.experience,
                            totalExperience: level.totalExperience,
                            title: level.title,
                        } : undefined
                    },
                });
            }

            case 'calendar': {
                const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
                const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
                const calendar = await getCheckinCalendar(user.id, year, month);
                return NextResponse.json({ success: true, data: { calendar } });
            }

            case 'stats': {
                const stats = await getCheckinStats(user.id);
                return NextResponse.json({ success: true, data: { stats } });
            }

            default:
                return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 });
        }
    } catch (error) {
        console.error('[checkin API] 错误:', error);
        return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
    }
}

// POST - 执行签到
export async function POST(request: NextRequest): Promise<NextResponse<CheckinResponse>> {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ success: false, error: '认证失败' }, { status: 401 });
        }

        const result = await performCheckin(user.id);

        if (!result.success) {
            return NextResponse.json({
                success: false,
                error: result.error || '签到失败',
            }, { status: 400 });
        }

        // 获取更新后的等级信息
        const level = await getUserLevel(user.id);

        return NextResponse.json({
            success: true,
            data: {
                result: {
                    streakDays: result.streakDays,
                    rewardCredits: result.rewardCredits,
                    leveledUp: result.leveledUp,
                },
                level: level ? {
                    level: level.level,
                    experience: level.experience,
                    totalExperience: level.totalExperience,
                    title: level.title,
                } : undefined,
            },
        });
    } catch (error) {
        console.error('[checkin API] 签到错误:', error);
        return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
    }
}
