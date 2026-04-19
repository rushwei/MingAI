#!/usr/bin/env node
// 创建管理员账号脚本
// 运行方式: node scripts/create-admin.js

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cpuehueezfrpwchlzqvq.supabase.co';
const anonKey = 'sb_publishable_4o1b8reRULRHrXQxObNz-A_foHAP71p';

async function createAdmin() {
    console.log('开始创建管理员账号...');
    
    const supabase = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false }
    });
    
    // 注册用户
    const { data, error } = await supabase.auth.signUp({
        email: 'admin@mingai.com',
        password: 'Wei14091302!',
    });
    
    if (error) {
        console.error('创建失败:', error.message);
        console.error('错误代码:', error.code);
        
        // 如果用户已存在，尝试登录
        if (error.code === 'email_exists') {
            console.log('用户已存在，尝试获取用户信息...');
            return;
        }
        
        return;
    }
    
    console.log('用户创建成功!');
    console.log('用户ID:', data.user?.id);
    
    if (!data.session) {
        console.log('需要邮箱验证，请检查 admin@mingai.com 的收件箱');
        return;
    }
    
    // 设置为管理员
    const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
            id: data.user.id,
            nickname: '管理员',
            is_admin: true
        });
    
    if (profileError) {
        console.error('设置管理员失败:', profileError.message);
    } else {
        console.log('管理员权限设置成功!');
    }
}

createAdmin().catch(console.error);
