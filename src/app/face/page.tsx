import { ComingSoonPage } from '@/components/ui/ComingSoonPage';

export default function FacePage() {
    return (
        <ComingSoonPage
            title="面相分析"
            emoji="👤"
            description="面相学通过分析五官轮廓，洞察性格特质与运势走向。"
            features={[
                'AI 面部特征识别',
                '五官运势分析',
                '面相与性格关联',
                '流年气色解读',
                '开运妆容建议',
            ]}
        />
    );
}
