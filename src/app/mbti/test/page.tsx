/**
 * MBTI 性格测试题目页面
 */

import { LoginOverlay } from '@/components/auth/LoginOverlay';
import { MBTITestFlow } from '@/components/mbti/MBTITestFlow';

export default function MBTITestPage() {
    return (
        <LoginOverlay message="登录后使用 MBTI 性格测试">
            <MBTITestFlow />
        </LoginOverlay>
    );
}
