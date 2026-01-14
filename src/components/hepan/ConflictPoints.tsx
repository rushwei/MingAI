/**
 * 冲突点展示组件
 *
 * 包含冲突触发因素和沟通建议模板
 */
'use client';

import { useState } from 'react';
import { AlertTriangle, AlertCircle, Info, ChevronDown, MessageCircle, Shield, Lightbulb } from 'lucide-react';
import { type ConflictPoint, type HepanType } from '@/lib/hepan';
import { getCommunicationTemplate, getSeverityAdvice, type CommunicationTemplate } from '@/lib/communication-templates';

interface ConflictPointsProps {
    conflicts: ConflictPoint[];
    hepanType: HepanType;
}

export function ConflictPoints({ conflicts, hepanType }: ConflictPointsProps) {
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
    const [showTemplate, setShowTemplate] = useState<number | null>(null);

    if (conflicts.length === 0) {
        return (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 text-center">
                <div className="text-4xl mb-2">✨</div>
                <p className="text-green-500 font-medium">暂未发现明显冲突点</p>
                <p className="text-sm text-foreground-secondary mt-1">
                    双方八字配合良好，关系发展顺利
                </p>
            </div>
        );
    }

    const severityConfig = {
        high: {
            icon: AlertTriangle,
            bgColor: 'bg-red-500/10',
            borderColor: 'border-red-500/30',
            iconColor: 'text-red-500',
            label: '高度关注',
        },
        medium: {
            icon: AlertCircle,
            bgColor: 'bg-yellow-500/10',
            borderColor: 'border-yellow-500/30',
            iconColor: 'text-yellow-500',
            label: '中度关注',
        },
        low: {
            icon: Info,
            bgColor: 'bg-blue-500/10',
            borderColor: 'border-blue-500/30',
            iconColor: 'text-blue-500',
            label: '轻度留意',
        },
    };

    const toggleExpand = (index: number) => {
        setExpandedIndex(expandedIndex === index ? null : index);
        if (expandedIndex !== index) {
            setShowTemplate(null);
        }
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">需要关注的问题</h3>

            {conflicts.map((conflict, index) => {
                const config = severityConfig[conflict.severity];
                const Icon = config.icon;
                const isExpanded = expandedIndex === index;
                const template = getCommunicationTemplate(hepanType, conflict.title);
                const severityAdvice = getSeverityAdvice(conflict.severity);

                return (
                    <div
                        key={index}
                        className={`${config.bgColor} border ${config.borderColor} rounded-xl overflow-hidden transition-all`}
                    >
                        {/* 主要内容 */}
                        <div className="p-4">
                            <div className="flex items-start gap-3">
                                <Icon className={`w-5 h-5 mt-0.5 ${config.iconColor}`} />
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium text-foreground">{conflict.title}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${config.bgColor} ${config.iconColor}`}>
                                            {config.label}
                                        </span>
                                    </div>
                                    <p className="text-sm text-foreground-secondary mb-2">
                                        {conflict.description}
                                    </p>
                                    <div className="text-sm text-accent">
                                        💡 {conflict.suggestion}
                                    </div>
                                </div>
                            </div>

                            {/* 展开按钮 */}
                            {conflict.triggerFactors && conflict.triggerFactors.length > 0 && (
                                <button
                                    onClick={() => toggleExpand(index)}
                                    className="mt-3 flex items-center gap-1 text-sm text-foreground-secondary hover:text-foreground transition-colors"
                                >
                                    <ChevronDown
                                        className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                    />
                                    {isExpanded ? '收起详情' : '查看触发因素和沟通建议'}
                                </button>
                            )}
                        </div>

                        {/* 展开内容 */}
                        {isExpanded && conflict.triggerFactors && (
                            <div className="border-t border-border/50 bg-background/50 p-4 space-y-4">
                                {/* 触发因素 */}
                                <div>
                                    <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                                        <Shield className="w-4 h-4 text-amber-500" />
                                        常见触发情境
                                    </h4>
                                    <div className="space-y-3">
                                        {conflict.triggerFactors.map((trigger, tIdx) => (
                                            <div
                                                key={tIdx}
                                                className="bg-background rounded-lg p-3 border border-border/50"
                                            >
                                                <div className="text-sm font-medium text-foreground mb-1">
                                                    {trigger.scenario}
                                                </div>
                                                <div className="text-xs text-foreground-secondary mb-2">
                                                    <span className="text-red-500">⚠️ 触发行为：</span>
                                                    {trigger.trigger}
                                                </div>
                                                <div className="text-xs text-foreground-secondary mb-2">
                                                    <span className="text-amber-500">💭 警示：</span>
                                                    {trigger.warning}
                                                </div>
                                                <div className="text-xs text-green-600">
                                                    <span>✅ 预防：</span>
                                                    {trigger.prevention}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* 沟通建议模板 */}
                                <div>
                                    <button
                                        onClick={() => setShowTemplate(showTemplate === index ? null : index)}
                                        className="w-full flex items-center justify-between p-3 bg-accent/10 rounded-lg hover:bg-accent/20 transition-colors"
                                    >
                                        <span className="font-medium text-accent flex items-center gap-2">
                                            <MessageCircle className="w-4 h-4" />
                                            沟通建议模板
                                        </span>
                                        <ChevronDown
                                            className={`w-4 h-4 text-accent transition-transform ${
                                                showTemplate === index ? 'rotate-180' : ''
                                            }`}
                                        />
                                    </button>

                                    {showTemplate === index && (
                                        <CommunicationTemplateCard template={template} />
                                    )}
                                </div>

                                {/* 通用建议 */}
                                <div className="bg-background rounded-lg p-3 border border-border/50">
                                    <h5 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                                        <Lightbulb className="w-4 h-4 text-accent" />
                                        针对{config.label}问题的通用建议
                                    </h5>
                                    <ul className="space-y-1">
                                        {severityAdvice.map((advice, aIdx) => (
                                            <li key={aIdx} className="text-xs text-foreground-secondary flex items-start gap-2">
                                                <span className="text-accent">•</span>
                                                {advice}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function CommunicationTemplateCard({ template }: { template: CommunicationTemplate }) {
    return (
        <div className="mt-3 bg-background rounded-lg p-4 border border-accent/20 space-y-4">
            <div>
                <h5 className="text-sm font-medium text-foreground mb-1">{template.title}</h5>
                <p className="text-xs text-foreground-secondary">适用情境：{template.context}</p>
            </div>

            <div>
                <div className="text-xs text-foreground-secondary mb-1">参考话术：</div>
                <div className="bg-accent/5 rounded-lg p-3 text-sm text-foreground italic">
                    &quot;{template.script}&quot;
                </div>
            </div>

            <div>
                <div className="text-xs text-foreground-secondary mb-2">沟通技巧：</div>
                <ul className="space-y-1">
                    {template.tips.map((tip, idx) => (
                        <li key={idx} className="text-xs text-foreground-secondary flex items-start gap-2">
                            <span className="text-green-500">✓</span>
                            {tip}
                        </li>
                    ))}
                </ul>
            </div>

            <div>
                <div className="text-xs text-foreground-secondary mb-2">避免用语：</div>
                <div className="flex flex-wrap gap-2">
                    {template.avoidPhrases.map((phrase, idx) => (
                        <span
                            key={idx}
                            className="text-xs px-2 py-1 bg-red-500/10 text-red-500 rounded-full"
                        >
                            ✗ {phrase}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}
