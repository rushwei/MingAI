import { ComingSoonPage } from '@/components/ui/ComingSoonPage';

export default function PalmPage() {
    return (
        <ComingSoonPage
            title="手相分析"
            emoji="🖐️"
            description="手相学通过掌纹分析，揭示先天禀赋与后天发展。"
            features={[
                'AI 掌纹识别',
                '生命线、智慧线、感情线解读',
                '手型与性格分析',
                '掌丘详细解读',
                '左右手对比分析',
            ]}
        />
    );
}
