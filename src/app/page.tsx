/**
 * 根页面
 *
 * 已登录用户默认进入用户中心，访客仍进入运势中心。
 */

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createAnonClient, createRequestSupabaseClient } from '@/lib/api-utils';
import { ACCESS_COOKIE, REFRESH_COOKIE, resolveSessionFromTokens } from '@/lib/auth-session';

export default async function HomePage() {
    const cookieStore = await cookies();
    const { session } = await resolveSessionFromTokens(createAnonClient(), {
        accessToken: cookieStore.get(ACCESS_COOKIE)?.value ?? null,
        refreshToken: cookieStore.get(REFRESH_COOKIE)?.value ?? null,
    });

    if (session?.user) {
        redirect('/user');
    }

    const supabase = await createRequestSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        redirect('/user');
    }

    redirect('/fortune-hub');
}
