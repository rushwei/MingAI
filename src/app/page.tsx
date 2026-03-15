/**
 * 根页面
 *
 * 已登录用户默认进入用户中心，访客仍进入运势中心。
 */

import { redirect } from 'next/navigation';
import { createRequestSupabaseClient } from '@/lib/api-utils';

export default async function HomePage() {
    const supabase = await createRequestSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        redirect('/user');
    }

    redirect('/fortune-hub');
}
