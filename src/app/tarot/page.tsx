import { ComingSoonPage } from '@/components/ui/ComingSoonPage';

export default function TarotPage() {
    return (
        <ComingSoonPage
            title="塔罗占卜"
            emoji="🃏"
            description="塔罗牌是西方最流行的占卜工具，通过牌阵揭示过去、现在与未来的奥秘。"
            features={[
                'AI 智能抽牌解读',
                '多种经典牌阵选择',
                '78张塔罗牌完整解读',
                '每日一牌指引',
                '个性化问题占卜',
            ]}
        />
    );
}
