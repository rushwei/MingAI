/**
 * MBTI 性格测试主页面
 * 
 * 支持：全题库 + 7级Likert量表 + 每10题分页 + 底部进度条
 */
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Brain, Play, Loader2, ArrowLeft, ArrowRight, Eye, Check } from 'lucide-react';
import { QuestionCard } from '@/components/mbti/QuestionCard';
import { MBTIProgressBar } from '@/components/mbti/MBTIProgressBar';
import { LoginOverlay } from '@/components/auth/LoginOverlay';
import { useToast } from '@/components/ui/Toast';
import {
    loadQuestions,
    calculateResult,
    type MBTIQuestion,
    type TestAnswer,
    type LikertValue,
    type MBTIType,
    PERSONALITY_BASICS
} from '@/lib/mbti';

type Phase = 'intro' | 'testing' | 'calculating';

const QUESTIONS_PER_PAGE = 10;

function MBTIPageContent() {
    const router = useRouter();
    const { showToast } = useToast();
    const [phase, setPhase] = useState<Phase>('intro');
    const [questions, setQuestions] = useState<MBTIQuestion[]>([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [answers, setAnswers] = useState<TestAnswer[]>([]);
    const [highlightedQuestion, setHighlightedQuestion] = useState<number | null>(null);

    // 加载全部题目
    useEffect(() => {
        loadQuestions().then((allQuestions) => {
            setQuestions(allQuestions);
        });
    }, []);

    // 当前页的题目
    const currentPageQuestions = useMemo(() => {
        const start = currentPage * QUESTIONS_PER_PAGE;
        const end = Math.min(start + QUESTIONS_PER_PAGE, questions.length);
        return questions.slice(start, end);
    }, [questions, currentPage]);

    // 总页数
    const totalPages = Math.ceil(questions.length / QUESTIONS_PER_PAGE);

    // 已回答的题目索引
    const answeredIndexes = useMemo(() => {
        return answers.map(a => a.questionIndex);
    }, [answers]);

    // 当前页所有题目是否已答完
    const currentPageAllAnswered = useMemo(() => {
        const start = currentPage * QUESTIONS_PER_PAGE;
        const end = Math.min(start + QUESTIONS_PER_PAGE, questions.length);
        for (let i = start; i < end; i++) {
            if (!answeredIndexes.includes(i)) {
                return false;
            }
        }
        return true;
    }, [currentPage, questions.length, answeredIndexes]);

    // 当前正在做的题目索引（当前页第一道未答题，如果都答完则为该页最后一题）
    const currentQuestionIndex = useMemo(() => {
        const start = currentPage * QUESTIONS_PER_PAGE;
        const end = Math.min(start + QUESTIONS_PER_PAGE, questions.length);
        for (let i = start; i < end; i++) {
            if (!answeredIndexes.includes(i)) {
                return i;
            }
        }
        return end - 1; // 都答完了就高亮最后一题
    }, [currentPage, questions.length, answeredIndexes]);

    const startTest = () => {
        if (questions.length === 0) return;
        setPhase('testing');
        setCurrentPage(0);
        setAnswers([]);
    };

    const handleAnswer = useCallback((questionIndex: number, likertValue: LikertValue | null) => {
        // 如果点击相同选项，取消选择
        const existingAnswer = answers.find(a => a.questionIndex === questionIndex);
        if (existingAnswer && existingAnswer.likertValue === likertValue) {
            setAnswers(answers.filter(a => a.questionIndex !== questionIndex));
            return;
        }

        if (likertValue === null) return;

        const newAnswer: TestAnswer = {
            questionIndex,
            likertValue,
        };

        // 更新或添加答案
        const existingIndex = answers.findIndex(a => a.questionIndex === questionIndex);
        const newAnswers = existingIndex >= 0
            ? answers.map((a, i) => i === existingIndex ? newAnswer : a)
            : [...answers, newAnswer];

        setAnswers(newAnswers);

        // 清除高亮（因为用户已经开始答题）
        if (highlightedQuestion === questionIndex) {
            setHighlightedQuestion(null);
        }
    }, [answers, highlightedQuestion]);

    const goToPreviousPage = () => {
        if (currentPage > 0) {
            setCurrentPage(currentPage - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const goToNextPage = () => {
        if (!currentPageAllAnswered) {
            showToast('warning', '请完成当前页的所有题目后再翻页');
            return;
        }
        if (currentPage < totalPages - 1) {
            setCurrentPage(currentPage + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleJumpToQuestion = (index: number) => {
        const targetPage = Math.floor(index / QUESTIONS_PER_PAGE);
        const needsPageChange = targetPage !== currentPage;

        setCurrentPage(targetPage);
        setHighlightedQuestion(index);

        // 滚动到指定题目
        const scrollToQuestion = () => {
            const questionElement = document.getElementById(`question-${index}`);
            if (questionElement) {
                questionElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        };

        if (needsPageChange) {
            // 如果需要切换页面，等待渲染完成
            setTimeout(scrollToQuestion, 150);
        } else {
            scrollToQuestion();
        }
    };

    const finishTest = () => {
        if (answers.length < questions.length) {
            const unanswered = questions.length - answers.length;
            showToast('warning', `还有 ${unanswered} 道题未完成，请完成所有题目后再提交`);
            return;
        }

        setPhase('calculating');

        // 计算结果
        const result = calculateResult(questions, answers);

        // 存储结果到 sessionStorage
        sessionStorage.setItem('mbti_result', JSON.stringify(result));

        // 延迟跳转
        setTimeout(() => {
            router.push('/mbti/result');
        }, 1500);
    };

    // 介绍页
    if (phase === 'intro') {
        return (
            <div className="min-h-screen bg-background">
                <div className="max-w-4xl mx-auto px-4 py-8">
                    {/* 标题 */}
                    <div className="text-center mb-10">
                        <div className="text-5xl mb-4">🧩</div>
                        <h1 className="text-3xl font-bold text-foreground">MBTI 性格测试</h1>
                        <p className="text-foreground-secondary mt-2">
                            探索你的性格类型，了解真实的自己
                        </p>
                    </div>

                    {/* 16种人格预览 */}
                    <div className="grid grid-cols-4 gap-3 mb-10">
                        {Object.entries(PERSONALITY_BASICS).map(([type, info]) => (
                            <button
                                key={type}
                                onClick={() => router.push(`/mbti/personality/${type}`)}
                                className="bg-background-secondary rounded-lg p-3 text-center
                                    hover:bg-background-secondary/80 hover:ring-2 hover:ring-accent/50
                                    transition-all cursor-pointer group"
                            >
                                <div className="text-2xl mb-1">{info.emoji}</div>
                                <div className="text-sm font-medium text-foreground">{type}</div>
                                <div className="text-xs text-foreground-secondary">{info.title}</div>
                                <div className="flex items-center justify-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Eye className="w-3 h-3 text-accent" />
                                    <span className="text-xs text-accent">查看</span>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* 测试说明 */}
                    <div className="bg-background-secondary rounded-xl p-6 mb-8">
                        <h3 className="text-lg font-semibold text-foreground mb-4">测试说明</h3>
                        <ul className="space-y-2 text-foreground-secondary">
                            <li>• 本测试共 {questions.length || '...'} 道题，每页 {QUESTIONS_PER_PAGE} 题</li>
                            <li>• 请根据你的第一反应作答，不要过度思考</li>
                            <li>• 用量表选择你的倾向程度（左侧或右侧代表不同选项）</li>
                            <li>• 必须完成当前页所有题目才能翻到下一页</li>
                        </ul>
                    </div>

                    {/* 开始按钮 */}
                    <div className="text-center">
                        <button
                            onClick={startTest}
                            disabled={questions.length === 0}
                            className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-white rounded-xl
                                text-lg font-medium hover:bg-accent/90 disabled:opacity-50 
                                disabled:cursor-not-allowed transition-all"
                        >
                            {questions.length === 0 ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    加载中...
                                </>
                            ) : (
                                <>
                                    <Play className="w-5 h-5" />
                                    开始测试
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // 测试进行中
    if (phase === 'testing') {
        const isLastPage = currentPage === totalPages - 1;
        const allAnswered = answers.length === questions.length;

        return (
            <div className="min-h-screen bg-background pb-24">
                <div className="max-w-2xl mx-auto px-4 py-6">
                    {/* 页面头部 */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="text-sm text-foreground-secondary">
                            第 {currentPage + 1} / {totalPages} 页
                        </div>
                        <div className="text-sm text-foreground-secondary">
                            已完成 {answers.length} / {questions.length}
                        </div>
                    </div>

                    {/* 题目列表 */}
                    <div className="space-y-8">
                        {currentPageQuestions.map((question, idx) => {
                            const globalIndex = currentPage * QUESTIONS_PER_PAGE + idx;
                            const currentAnswer = answers.find(a => a.questionIndex === globalIndex);
                            const isHighlighted = highlightedQuestion === globalIndex;

                            return (
                                <div
                                    key={globalIndex}
                                    id={`question-${globalIndex}`}
                                    className={`transition-all duration-500 ${isHighlighted ? 'ring-2 ring-accent ring-offset-4 ring-offset-background rounded-xl' : ''}`}
                                >
                                    <QuestionCard
                                        question={question}
                                        questionNumber={globalIndex + 1}
                                        totalQuestions={questions.length}
                                        onAnswer={(value) => handleAnswer(globalIndex, value)}
                                        selectedValue={currentAnswer?.likertValue}
                                    />
                                </div>
                            );
                        })}
                    </div>

                    {/* 分页导航 */}
                    <div className="flex justify-between mt-8">
                        <button
                            onClick={goToPreviousPage}
                            disabled={currentPage === 0}
                            className="flex items-center gap-2 px-4 py-2 text-foreground-secondary
                                disabled:opacity-30 hover:text-foreground transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            上一页
                        </button>

                        {isLastPage ? (
                            <button
                                onClick={finishTest}
                                disabled={!allAnswered}
                                className="flex items-center gap-2 px-6 py-2 bg-accent text-white rounded-lg
                                    disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent/90 transition-all"
                            >
                                <Check className="w-4 h-4" />
                                完成测试
                            </button>
                        ) : (
                            <button
                                onClick={goToNextPage}
                                disabled={!currentPageAllAnswered}
                                className="flex items-center gap-2 px-4 py-2 text-foreground-secondary
                                    disabled:opacity-30 hover:text-foreground transition-colors"
                            >
                                下一页
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* 底部进度条 */}
                <MBTIProgressBar
                    totalQuestions={questions.length}
                    answeredIndexes={answeredIndexes}
                    currentQuestionIndex={highlightedQuestion ?? currentQuestionIndex}
                    onJumpToQuestion={handleJumpToQuestion}
                />
            </div>
        );
    }

    // 计算中
    return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-center">
                <Brain className="w-16 h-16 text-accent mx-auto mb-4 animate-pulse" />
                <h2 className="text-xl font-semibold text-foreground mb-2">正在分析你的性格类型...</h2>
                <p className="text-foreground-secondary">请稍候</p>
            </div>
        </div>
    );
}

export default function MBTIPage() {
    return (
        <LoginOverlay message="登录后使用 MBTI 性格测试">
            <MBTIPageContent />
        </LoginOverlay>
    );
}
