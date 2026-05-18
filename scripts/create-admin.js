#!/usr/bin/env node
// 创建管理员账号脚本
// 运行方式: node scripts/create-admin.js

const { createClient } = require('@supabase/supabase-js');

// 从环境变量读取配置
const supabaseUrl = process.env.SUPABASE_URL || 'https://cpuehueezfrpwchlzqvq.supabase.co';
const serviceKey = process.env.SUPABASE_SECRET_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwdWVodWVlemZycHdjaGx6cXZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjUxOTk3NSwiZXhwIjoyMDkyMDk1OTc1fQ.KvoDhF6wV8Bc12cuDxBVjEpTm-NYfEliizB6_UqdErc';

const ADMIN_EMAIL = '2667339025@qq.com';
const ADMIN_PASSWORD = 'Wei14091302!';

async function createAdmin() {
    console.log('开始创建管理员账号...');
    
    const supabase = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false }
    });
    
    // 创建用户（使用 admin API）
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true // 跳过邮箱验证
    });
    
    if (createError) {
        console.error('创建用户失败:', createError.message);
        console.error('错误代码:', createError.code);
        
        // 如果用户已存在，尝试获取用户信息
        if (createError.code === 'user_already_exists' || createError.code === 'email_exists') {
            console.log('用户已存在，尝试获取用户ID...');
            const { data: users, error: listError } = await supabase.auth.admin.listUsers();
            if (listError) {
                console.error('获取用户列表失败:', listError.message);
                return;
            }
            const user = users.users.find(u => u.email === ADMIN_EMAIL);
            if (user) {
                await setAdminRole(user.id);
            }
        }
        return;
    }
    
    const userId = newUser.user.id;
    console.log('用户创建成功!');
    console.log('用户ID:', userId);
    
    await setAdminRole(userId);
}

async function setAdminRole(userId) {
    const supabase = createClient(process.env.SUPABASE_URL || 'https://cpuehueezfrpwchlzqvq.supabase.co', 
                                 process.env.SUPABASE_SECRET_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwdWVodWVlemZycHdjaGx6cXZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjUxOTk3NSwiZXhwIjoyMDkyMDk1OTc1fQ.KvoDhF6wV8Bc12cuDxBVjEpTm-NYfEliizB6_UqdErc', {
        auth: { persistSession: false }
    });
    
    // 在 users 表中设置管理员权限
    const { error: profileError } = await supabase
        .from('users')
        .upsert({
            id: userId,
            nickname: 'admin',
            membership: 'pro',
            is_admin: true
        });
    
    if (profileError) {
        console.error('设置管理员失败:', profileError.message);
    } else {
        console.log('管理员权限设置成功!');
        console.log('管理员账号创建完成:');
        console.log('  邮箱:', ADMIN_EMAIL);
        console.log('  密码:', ADMIN_PASSWORD);
        console.log('  昵称: admin');
        console.log('  权限: pro会员 + 管理员');
    }
}

createAdmin().catch(console.error);