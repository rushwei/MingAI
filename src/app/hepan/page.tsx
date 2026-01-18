/**
 * 关系合盘主页面
 */
'use client';

import Link from 'next/link';
import { Heart, Briefcase, Users, ArrowRight, HeartHandshake } from 'lucide-react';
import { type HepanType, getHepanTypeName } from '@/lib/hepan';

import { HistoryDrawer } from '@/components/layout/HistoryDrawer';

const HEPAN_TYPES: { type: HepanType; icon: typeof Heart; color: string; description: string }[] = [
    {
        type: 'love',
        icon: Heart,
        color: 'from-pink-500/20 to-red-500/20 border-pink-500/30 hover:border-pink-500/60',
        description: '分析情侣或夫妻的八字配对，了解感情走向和相处之道',
    },
    {
        type: 'business',
        icon: Briefcase,
        color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30 hover:border-blue-500/60',
        description: '分析商业伙伴的八字配合，预测合作前景和互补优势',
    },
    {
        type: 'family',
        icon: Users,
        color: 'from-green-500/20 to-emerald-500/20 border-green-500/30 hover:border-green-500/60',
        description: '分析亲子关系的八字匹配，改善家庭沟通与教育方式',
    },
];

function HepanPageContent() {
    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* 标题 */}
                <div className="text-center mb-10">
                    <div className="flex items-center justify-center mb-4">
                        <HeartHandshake className="w-12 h-12 text-rose-500" />
                    </div>
                    <h1 className="text-3xl font-bold text-foreground">关系合盘</h1>
                    <p className="text-foreground-secondary mt-2">
                        通过八字分析双方的五行配合与缘分走向
                    </p>
                </div>

                {/* 合盘类型选择 */}
                <div className="grid gap-6 mb-10">
                    {HEPAN_TYPES.map(({ type, icon: Icon, color, description }) => (
                        <Link
                            key={type}
                            href={`/hepan/create?type=${type}`}
                            className={`bg-gradient-to-br ${color} border rounded-xl p-6 
                                transition-all group hover:shadow-lg`}
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-background/50 rounded-xl">
                                    <Icon className="w-8 h-8 text-foreground" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-foreground mb-1">
                                        {getHepanTypeName(type)}
                                    </h3>
                                    <p className="text-sm text-foreground-secondary">
                                        {description}
                                    </p>
                                </div>
                                <ArrowRight className="w-5 h-5 text-foreground-secondary group-hover:text-foreground transition-colors" />
                            </div>
                        </Link>
                    ))}
                </div>

                {/* 说明 */}
                <div className="bg-background-secondary/50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4">合盘说明</h3>
                    <div className="grid md:grid-cols-2 gap-6 text-sm text-foreground-secondary">
                        <div>
                            <h4 className="font-medium text-foreground mb-2">什么是八字合盘？</h4>
                            <p>
                                八字合盘是根据两个人的出生时间，分析双方八字中天干地支的生克关系，
                                从而判断两人的缘分深浅和相处方式。
                            </p>
                        </div>
                        <div>
                            <h4 className="font-medium text-foreground mb-2">分析维度</h4>
                            <p>
                                合盘分析包括：五行配合、日柱缘分、年柱契合、
                                以及针对不同关系类型的专项分析。
                            </p>
                        </div>
                        <div>
                            <h4 className="font-medium text-foreground mb-2">需要的信息</h4>
                            <p>
                                需要双方的出生年、月、日、时（农历或公历均可），
                                信息越准确，分析结果越精确。
                            </p>
                        </div>
                        <div>
                            <h4 className="font-medium text-foreground mb-2">注意事项</h4>
                            <p>
                                合盘结果仅供参考，真正的关系需要双方共同经营。
                                命理提供的是趋势参考，而非绝对定论。
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            {/* 历史记录抽屉 */}
            <HistoryDrawer type="hepan" />
        </div>
    );
}

export default function HepanPage() {
    return (
        <HepanPageContent />
    );
}
