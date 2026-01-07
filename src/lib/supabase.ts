/**
 * Supabase 客户端配置
 * 
 * 提供浏览器端和服务器端的 Supabase 客户端
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}

// 浏览器端 Supabase 客户端（单例）
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
    },
});

// 类型定义
export type Database = {
    public: {
        Tables: {
            users: {
                Row: {
                    id: string;
                    nickname: string | null;
                    avatar_url: string | null;
                    membership: 'free' | 'single' | 'monthly' | 'yearly';
                    membership_expires_at: string | null;
                    ai_chat_count: number;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id: string;
                    nickname?: string | null;
                    avatar_url?: string | null;
                    membership?: 'free' | 'single' | 'monthly' | 'yearly';
                    membership_expires_at?: string | null;
                    ai_chat_count?: number;
                };
                Update: {
                    nickname?: string | null;
                    avatar_url?: string | null;
                    membership?: 'free' | 'single' | 'monthly' | 'yearly';
                    membership_expires_at?: string | null;
                    ai_chat_count?: number;
                };
            };
            bazi_charts: {
                Row: {
                    id: string;
                    user_id: string | null;
                    name: string;
                    gender: 'male' | 'female' | null;
                    birth_date: string;
                    birth_time: string | null;
                    birth_place: string | null;
                    calendar_type: string | null;
                    is_leap_month: boolean | null;
                    chart_data: Record<string, unknown> | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_id?: string | null;
                    name: string;
                    gender?: 'male' | 'female' | null;
                    birth_date: string;
                    birth_time?: string | null;
                    birth_place?: string | null;
                    calendar_type?: string | null;
                    is_leap_month?: boolean | null;
                    chart_data?: Record<string, unknown> | null;
                };
                Update: {
                    name?: string;
                    gender?: 'male' | 'female' | null;
                    birth_date?: string;
                    birth_time?: string | null;
                    birth_place?: string | null;
                    calendar_type?: string | null;
                    is_leap_month?: boolean | null;
                    chart_data?: Record<string, unknown> | null;
                };
            };
            ziwei_charts: {
                Row: {
                    id: string;
                    user_id: string | null;
                    name: string;
                    gender: 'male' | 'female' | null;
                    birth_date: string;
                    birth_time: string | null;
                    birth_place: string | null;
                    calendar_type: string | null;
                    is_leap_month: boolean | null;
                    chart_data: Record<string, unknown> | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_id?: string | null;
                    name: string;
                    gender?: 'male' | 'female' | null;
                    birth_date: string;
                    birth_time?: string | null;
                    birth_place?: string | null;
                    calendar_type?: string | null;
                    is_leap_month?: boolean | null;
                    chart_data?: Record<string, unknown> | null;
                };
                Update: {
                    name?: string;
                    gender?: 'male' | 'female' | null;
                    birth_date?: string;
                    birth_time?: string | null;
                    birth_place?: string | null;
                    calendar_type?: string | null;
                    is_leap_month?: boolean | null;
                    chart_data?: Record<string, unknown> | null;
                };
            };
            conversations: {
                Row: {
                    id: string;
                    user_id: string | null;
                    bazi_chart_id: string | null;
                    ziwei_chart_id: string | null;
                    personality: string | null;
                    title: string | null;
                    messages: Record<string, unknown>[] | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    user_id?: string | null;
                    bazi_chart_id?: string | null;
                    ziwei_chart_id?: string | null;
                    personality?: string | null;
                    title?: string | null;
                    messages?: Record<string, unknown>[] | null;
                };
                Update: {
                    bazi_chart_id?: string | null;
                    ziwei_chart_id?: string | null;
                    personality?: string | null;
                    title?: string | null;
                    messages?: Record<string, unknown>[] | null;
                    updated_at?: string;
                };
            };
            orders: {
                Row: {
                    id: string;
                    user_id: string | null;
                    product_type: 'single' | 'monthly' | 'yearly';
                    amount: number;
                    status: 'pending' | 'paid' | 'cancelled' | 'refunded';
                    payment_method: string | null;
                    created_at: string;
                    paid_at: string | null;
                };
                Insert: {
                    id?: string;
                    user_id?: string | null;
                    product_type: 'single' | 'monthly' | 'yearly';
                    amount: number;
                    status?: 'pending' | 'paid' | 'cancelled' | 'refunded';
                    payment_method?: string | null;
                };
                Update: {
                    status?: 'pending' | 'paid' | 'cancelled' | 'refunded';
                    payment_method?: string | null;
                    paid_at?: string | null;
                };
            };
        };
    };
};
