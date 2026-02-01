/**
 * 根页面 - 重定向到运势中心
 *
 * 用户访问首页时自动跳转到运势中心页面
 */

import { redirect } from 'next/navigation';

export default function HomePage() {
    redirect('/fortune-hub');
}
