/**
 * MBTI 测试题目卡片组件 (7级 Likert 量表)
 */
'use client';

import { type MBTIQuestion, type LikertValue } from '@/lib/mbti';

interface QuestionCardProps {
    question: MBTIQuestion;
    questionNumber: number;
    totalQuestions: number;
    onAnswer: (likertValue: LikertValue) => void;
    selectedValue?: LikertValue;
    showProgress?: boolean;  // 是否显示顶部进度条
}

// Likert 量表配置
const LIKERT_OPTIONS: { value: LikertValue; size: number }[] = [
    { value: 1, size: 40 },   // 强烈同意 A
    { value: 2, size: 32 },   // 同意 A
    { value: 3, size: 26 },   // 略同意 A
    { value: 4, size: 20 },   // 中立
    { value: 5, size: 26 },   // 略同意 B
    { value: 6, size: 32 },   // 同意 B
    { value: 7, size: 40 },   // 强烈同意 B
];

export function QuestionCard({
    question,
    questionNumber,
    totalQuestions,
    onAnswer,
    selectedValue,
    showProgress = false
}: QuestionCardProps) {
    // 获取选项颜色
    const getOptionStyle = (value: LikertValue, isSelected: boolean) => {
        if (!isSelected) {
            // 未选中状态：显示渐变颜色边框
            if (value <= 3) {
                const intensity = (4 - value) / 3; // 1->1, 2->0.66, 3->0.33
                return {
                    borderColor: `rgba(16, 185, 129, ${0.3 + intensity * 0.4})`, // green
                    backgroundColor: 'transparent',
                };
            } else if (value === 4) {
                return {
                    borderColor: 'rgba(156, 163, 175, 0.5)', // gray
                    backgroundColor: 'transparent',
                };
            } else {
                const intensity = (value - 4) / 3; // 5->0.33, 6->0.66, 7->1
                return {
                    borderColor: `rgba(139, 92, 246, ${0.3 + intensity * 0.4})`, // purple
                    backgroundColor: 'transparent',
                };
            }
        }

        // 选中状态：填充颜色
        if (value <= 3) {
            const intensity = (4 - value) / 3;
            return {
                borderColor: `rgba(16, 185, 129, ${0.6 + intensity * 0.4})`,
                backgroundColor: `rgba(16, 185, 129, ${0.3 + intensity * 0.5})`,
            };
        } else if (value === 4) {
            return {
                borderColor: 'rgba(156, 163, 175, 0.8)',
                backgroundColor: 'rgba(156, 163, 175, 0.3)',
            };
        } else {
            const intensity = (value - 4) / 3;
            return {
                borderColor: `rgba(139, 92, 246, ${0.6 + intensity * 0.4})`,
                backgroundColor: `rgba(139, 92, 246, ${0.3 + intensity * 0.5})`,
            };
        }
    };

    return (
        <div className="w-full">
            {/* 进度条（可选） */}
            {showProgress && (
                <div className="mb-4">
                    <div className="flex justify-between text-sm text-foreground-secondary mb-2">
                        <span>问题 {questionNumber}/{totalQuestions}</span>
                        <span>{Math.round((questionNumber / totalQuestions) * 100)}%</span>
                    </div>
                    <div className="h-2 bg-background-secondary rounded-full overflow-hidden">
                        <div
                            className="h-full bg-accent transition-all duration-300"
                            style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
                        />
                    </div>
                </div>
            )}

            {/* 题号 */}
            <div className="text-sm text-accent font-medium mb-2">第 {questionNumber} 题</div>

            {/* 问题 */}
            <div className="bg-background-secondary rounded-xl p-4 mb-6">
                <p className="text-base text-foreground font-medium text-center">
                    {question.question}
                </p>
            </div>

            {/* Likert 量表 */}
            <div className="space-y-3">
                {/* 圆圈选项 */}
                <div className="flex items-center justify-between px-2">
                    {LIKERT_OPTIONS.map(({ value, size }) => {
                        const isSelected = selectedValue === value;
                        const style = getOptionStyle(value, isSelected);

                        return (
                            <button
                                key={value}
                                onClick={() => onAnswer(value)}
                                className="transition-all duration-200 rounded-full border-2 hover:scale-110"
                                style={{
                                    width: size,
                                    height: size,
                                    borderColor: style.borderColor,
                                    backgroundColor: style.backgroundColor,
                                }}
                                aria-label={`选择 ${value}`}
                            />
                        );
                    })}
                </div>

                {/* 选项文字说明 - 使用实际选项文字 */}
                <div className="flex justify-between">
                    <div className="flex-1 text-left">
                        <p className="text-sm text-emerald-600 dark:text-emerald-400 px-1 line-clamp-2">
                            {question.choice_a.text}
                        </p>
                    </div>
                    <div className="w-8" />
                    <div className="flex-1 text-right">
                        <p className="text-sm text-violet-600 dark:text-violet-400 px-1 line-clamp-2">
                            {question.choice_b.text}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
