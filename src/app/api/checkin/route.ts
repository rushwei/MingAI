/**
 * 签到 API
 */
import { NextRequest, NextResponse } from 'next/server';
import {
    getCheckinStatus,
    performCheckin,
    getCheckinCalendar,
    getCheckinStats
} from '@/lib/checkin';
import { getUserLevel } from '@/lib/gamification';
import { requireBearerUser } from '@/lib/api-utils';
import { createMemoryCache, createSingleFlight } from '@/lib/cache';

const STATUS_CACHE_TTL_MS = 60_000;
const statusCache = createMemoryCache<CheckinResponse['data']>(STATUS_CACHE_TTL_MS);
const statusSingleFlight = createSingleFlight<CheckinResponse['data']>();

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
            rewardXp: number;
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
        const requestUrl = new URL(request.url);
        const perfEnabled = requestUrl.searchParams.get('perf') === '1';
        const perfStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const auth = await requireBearerUser(request);
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error.message }, { status: auth.error.status });
        }
        const { user } = auth;

        const action = requestUrl.searchParams.get('action') || 'status';

        switch (action) {
            case 'status': {
                const cached = statusCache.get(user.id);
                if (cached !== null) {
                    if (perfEnabled) {
                        const duration = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - perfStart);
                        console.info(`[perf:checkin:status] ${duration}ms`, { userId: user.id, cached: true });
                    }
                    return NextResponse.json({
                        success: true,
                        data: cached,
                    });
                }

                const data = await statusSingleFlight.run(user.id, async () => {
                        const [status, level] = await Promise.all([
                            getCheckinStatus(user.id),
                            getUserLevel(user.id),
                        ]);
                        const payload: CheckinResponse['data'] = {
                            status,
                            level: level ? {
                                level: level.level,
                                experience: level.experience,
                                totalExperience: level.totalExperience,
                                title: level.title,
                            } : undefined
                        };
                        statusCache.set(user.id, payload);
                        return payload;
                    });
                if (perfEnabled) {
                    const duration = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - perfStart);
                    console.info(`[perf:checkin:status] ${duration}ms`, { userId: user.id });
                }
                return NextResponse.json({
                    success: true,
                    data,
                });
            }

            case 'calendar': {
                const year = parseInt(requestUrl.searchParams.get('year') || String(new Date().getFullYear()));
                const month = parseInt(requestUrl.searchParams.get('month') || String(new Date().getMonth() + 1));
                const calendar = await getCheckinCalendar(user.id, year, month);
                if (perfEnabled) {
                    const duration = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - perfStart);
                    console.info(`[perf:checkin:calendar] ${duration}ms`, { userId: user.id, year, month });
                }
                return NextResponse.json({ success: true, data: { calendar } });
            }

            case 'stats': {
                const stats = await getCheckinStats(user.id);
                if (perfEnabled) {
                    const duration = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - perfStart);
                    console.info(`[perf:checkin:stats] ${duration}ms`, { userId: user.id });
                }
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
        const auth = await requireBearerUser(request);
        if ('error' in auth) {
            return NextResponse.json({ success: false, error: auth.error.message }, { status: auth.error.status });
        }
        const { user } = auth;

        const result = await performCheckin(user.id);

        if (!result.success) {
            return NextResponse.json({
                success: false,
                error: result.error || '签到失败',
            }, { status: 400 });
        }

        statusCache.remove(user.id);
        statusSingleFlight.clear(user.id);

        // 获取更新后的等级信息
        const level = await getUserLevel(user.id);

        return NextResponse.json({
            success: true,
            data: {
                result: {
                    streakDays: result.streakDays,
                    rewardCredits: result.rewardCredits,
                    rewardXp: result.rewardXp,
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
