import { ComingSoonPage } from '@/components/ui/ComingSoonPage';

export default function ZiweiPage() {
    return (
        <ComingSoonPage
            title="紫微斗数"
            emoji="⭐"
            description="紫微斗数是中国传统命理学中最精密的推命术之一，以星辰排布解读人生命运。"
            features={[
                'AI 智能排紫微命盘',
                '十二宫位详细解读',
                '主星、辅星性格分析',
                '大限、流年运势预测',
                '与八字交叉验证分析',
            ]}
        />
    );
}
