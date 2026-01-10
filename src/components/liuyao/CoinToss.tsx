/**
 * 铜钱起卦组件
 * 
 * 模拟抛掷三枚铜钱，生成六爻
 */
'use client';

import { useState, useCallback } from 'react';
import { Coins, RotateCw } from 'lucide-react';
import { tossThreeCoins, type CoinTossResult, type Yao } from '@/lib/liuyao';

interface CoinTossProps {
    onComplete: (yaos: Yao[], results: CoinTossResult[]) => void;
    disabled?: boolean;
}

const YAO_LABELS = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];

export function CoinToss({ onComplete, disabled = false }: CoinTossProps) {
    const [currentLine, setCurrentLine] = useState(0);  // 0-5, 当前第几爻
    const [results, setResults] = useState<CoinTossResult[]>([]);
    const [isAnimating, setIsAnimating] = useState(false);
    const [yaos, setYaos] = useState<Yao[]>([]);

    const toss = useCallback(() => {
        if (currentLine >= 6 || isAnimating || disabled) return;

        setIsAnimating(true);

        // 模拟抛掷动画延迟
        setTimeout(() => {
            const result = tossThreeCoins();
            const newYao: Yao = {
                type: result.yaoType,
                change: result.isChanging ? 'changing' : 'stable',
                position: currentLine + 1,
            };

            const newResults = [...results, result];
            const newYaos = [...yaos, newYao];

            setResults(newResults);
            setYaos(newYaos);
            setIsAnimating(false);

            // 完成所有6爸
            if (currentLine + 1 === 6) {
                onComplete(newYaos, newResults);
            }
        }, 800);
    }, [currentLine, isAnimating, disabled, results, yaos, onComplete]);

    // 点击按钮前进到下一爸并立即开始摇
    const goToNextAndToss = useCallback(() => {
        if (currentLine < 5 && results.length > currentLine) {
            setCurrentLine(currentLine + 1);
            // 延迟一小段时间后自动开始摇
            setTimeout(() => {
                setIsAnimating(true);
                setTimeout(() => {
                    const result = tossThreeCoins();
                    const newYao: Yao = {
                        type: result.yaoType,
                        change: result.isChanging ? 'changing' : 'stable',
                        position: currentLine + 2,
                    };
                    const newResults = [...results, result];
                    const newYaos = [...yaos, newYao];
                    setResults(newResults);
                    setYaos(newYaos);
                    setIsAnimating(false);

                    if (currentLine + 2 === 6) {
                        onComplete(newYaos, newResults);
                    }
                }, 800);
            }, 100);
        }
    }, [currentLine, results, yaos, onComplete]);

    const reset = useCallback(() => {
        setCurrentLine(0);
        setResults([]);
        setYaos([]);
        setIsAnimating(false);
    }, []);

    const isComplete = results.length >= 6;
    const isFinalizing = isAnimating && currentLine === 5 && results.length === 5;

    // 显示最近一次摇卦结果
    const lastResult = results.length > 0 ? results[results.length - 1] : null;
    const showCoinResult = !isAnimating && lastResult && results.length > currentLine;

    return (
        <div className="flex flex-col items-center gap-6">
            {/* 进度指示 */}
            <div className="flex items-center gap-2">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div
                        key={i}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all
                            ${i < currentLine
                                ? 'bg-accent text-white'
                                : i === currentLine
                                    ? 'bg-accent/20 text-accent border-2 border-accent'
                                    : 'bg-background-secondary text-foreground-secondary'
                            }`}
                    >
                        {i + 1}
                    </div>
                ))}
            </div>

            {/* 当前爻标签 */}
            {!isComplete && (
                <p className="text-lg font-medium text-foreground">
                    {YAO_LABELS[currentLine]}
                </p>
            )}

            {/* 铜钱显示 */}
            <div className="flex gap-4">
                {[0, 1, 2].map((coinIndex) => (
                    <div
                        key={coinIndex}
                        className={`w-16 h-16 rounded-full border-4 flex items-center justify-center
                            transition-all duration-500
                            ${isAnimating
                                ? 'animate-spin border-accent bg-accent/20'
                                : showCoinResult
                                    ? lastResult!.coins[coinIndex]
                                        ? 'border-yellow-500 bg-yellow-500/20 text-yellow-600'
                                        : 'border-gray-400 bg-gray-200 text-gray-600'
                                    : 'border-border bg-background-secondary'
                            }`}
                    >
                        {showCoinResult && (
                            <span className="font-bold text-lg">
                                {lastResult!.coins[coinIndex] ? '字' : '花'}
                            </span>
                        )}
                    </div>
                ))}
            </div>

            {/* 最近结果 */}
            {results.length > 0 && !isAnimating && (
                <div className="text-center">
                    <p className="text-sm text-foreground-secondary">
                        {results[results.length - 1].heads}正{3 - results[results.length - 1].heads}反 →
                        <span className={results[results.length - 1].isChanging ? 'text-red-500 font-medium' : ''}>
                            {results[results.length - 1].yaoType === 1 ? '阳爻' : '阴爻'}
                            {results[results.length - 1].isChanging && '（变）'}
                        </span>
                    </p>
                </div>
            )}

            {/* 已完成的爻 */}
            {yaos.length > 0 && (
                <div className="flex flex-col gap-1 mt-4">
                    {[...yaos].reverse().map((yao) => (
                        <div key={yao.position} className="flex items-center gap-2">
                            <span className={`text-xs w-10 ${yao.change === 'changing' ? 'text-red-500' : 'text-foreground-secondary'}`}>
                                {YAO_LABELS[yao.position - 1]}
                            </span>
                            <div className={`flex items-center ${yao.change === 'changing' ? 'text-red-500' : ''}`}>
                                {yao.type === 1 ? (
                                    <div className={`w-[62px] h-2 rounded-sm ${yao.change === 'changing' ? 'bg-red-500' : 'bg-foreground'}`} />
                                ) : (
                                    <>
                                        <div className={`w-[27px] h-2 rounded-sm ${yao.change === 'changing' ? 'bg-red-500' : 'bg-foreground'}`} />
                                        <div className="w-2" />
                                        <div className={`w-[27px] h-2 rounded-sm ${yao.change === 'changing' ? 'bg-red-500' : 'bg-foreground'}`} />
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* 操作按钮 */}
            <div className="flex gap-3 mt-4">
                {!isComplete ? (
                    isFinalizing ? (
                        <div className="flex items-center gap-2 text-foreground-secondary">
                            <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                            <span className="text-sm">生成卦象中...</span>
                        </div>
                    ) : results.length > currentLine ? (
                        // 已摇完当前爸，显示“继续摇卦”按钮
                        <button
                            onClick={goToNextAndToss}
                            disabled={isAnimating}
                            className="flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-lg
                                hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            <Coins className="w-5 h-5" />
                            继续摇卦
                        </button>
                    ) : (
                        // 未摇当前爸，显示“抛掷铜钱”按钮
                        <button
                            onClick={toss}
                            disabled={isAnimating || disabled}
                            className="flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-lg
                                hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            <Coins className={`w-5 h-5 ${isAnimating ? 'animate-bounce' : ''}`} />
                            {isAnimating ? '抛掷中...' : '抛掷铜钱'}
                        </button>
                    )
                ) : (
                    <button
                        onClick={reset}
                        className="flex items-center gap-2 px-6 py-3 bg-background-secondary text-foreground rounded-lg
                            hover:bg-background-secondary/80 transition-all"
                    >
                        <RotateCw className="w-5 h-5" />
                        重新起卦
                    </button>
                )}
            </div>
        </div>
    );
}
