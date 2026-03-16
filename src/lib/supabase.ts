/**
 * 兼容导出
 *
 * 新代码应直接从 `@/lib/auth` 引用浏览器认证客户端。
 * 这个文件仅用于兼容仍然 require `../lib/supabase` 的旧测试。
 */

export {
    authClient,
    supabase,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    getCurrentUser,
    getSession,
    getUserProfile,
    getCurrentUserProfileBundle,
    ensureUserRecord,
    updateNickname,
    resetPassword,
    sendOTP,
    verifyOTP,
    resetPasswordWithOTP,
    checkLoginAttempts,
    recordLoginAttempt,
    signInWithEmailProtected,
} from '@/lib/auth';

export type {
    AuthError,
    AuthResult,
    Session,
    SupabaseUser,
    User,
} from '@/lib/auth';
