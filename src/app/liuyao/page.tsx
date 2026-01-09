import { ComingSoonPage } from '@/components/ui/ComingSoonPage';

export default function LiuyaoPage() {
    return (
        <ComingSoonPage
            title="六爻占卜"
            emoji="☯️"
            description="六爻占卜源自《易经》，通过卦象变化预测事物发展趋势。"
            featureKey="liuyao"
            features={[
                'AI 起卦解卦',
                '传统铜钱起卦模拟',
                '世应用神详解',
                '六亲六神分析',
                '具体事项吉凶判断',
            ]}
        />
    );
}
