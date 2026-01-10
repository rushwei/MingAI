/**
 * MBTI 人格详情页面
 * 
 * 显示特定 MBTI 类型的详细信息（查看模式，无维度分析）
 */
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { PERSONALITY_BASICS, type MBTIType } from '@/lib/mbti';

interface PersonalityData {
    sections: Record<string, string>;
}

export default function PersonalityPage() {
    const router = useRouter();
    const params = useParams();
    const type = params.type as MBTIType;

    const [data, setData] = useState<PersonalityData | null>(null);
    const [loading, setLoading] = useState(true);

    const basic = PERSONALITY_BASICS[type];

    useEffect(() => {
        if (!basic) {
            router.push('/mbti');
            return;
        }

        fetch(`/mbti/personalities/${type}.json`)
            .then(res => res.json())
            .then(data => {
                setData(data);
                setLoading(false);
            })
            .catch(() => {
                setData(null);
                setLoading(false);
            });
    }, [type, basic, router]);

    if (!basic) {
        return null;
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-3xl mx-auto px-4 py-8">
                {/* 返回 */}
                <Link
                    href="/mbti"
                    className="inline-flex items-center gap-2 text-foreground-secondary hover:text-foreground mb-6"
                >
                    <ArrowLeft className="w-4 h-4" />
                    返回
                </Link>

                {/* 头部 */}
                <div className="text-center mb-8">
                    <div className="text-6xl mb-4">{basic.emoji}</div>
                    <h1 className="text-3xl font-bold text-foreground mb-2">{type}</h1>
                    <p className="text-xl text-accent">{basic.title}</p>
                    <p className="text-foreground-secondary mt-4 max-w-xl mx-auto">
                        {basic.description}
                    </p>
                </div>

                {/* 内容 */}
                {data && (
                    <div className="space-y-8">
                        {Object.entries(data.sections).map(([title, content]) => (
                            <div key={title} className="bg-background-secondary rounded-xl p-6">
                                <h2 className="text-lg font-semibold text-foreground mb-4">{title}</h2>
                                <p className="text-foreground-secondary whitespace-pre-line">
                                    {content}
                                </p>
                            </div>
                        ))}
                    </div>
                )}

                {/* 开始测试按钮 */}
                <div className="text-center mt-10">
                    <Link
                        href="/mbti"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-lg
                            hover:bg-accent/90 transition-all"
                    >
                        开始 MBTI 测试
                    </Link>
                </div>
            </div>
        </div>
    );
}
