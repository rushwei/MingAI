/**
 * 根页面
 *
 * 已取消匿名访问，所有用户统一进入用户中心。
 */

import { redirect } from 'next/navigation';

export default async function HomePage() {
    redirect('/user');
}
