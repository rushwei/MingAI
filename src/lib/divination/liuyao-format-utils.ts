/**
 * 六爻格式化共享工具
 *
 * 核心常量与函数从 @mingai/mcp-core 导入，
 * 本文件补充 web 侧专用的格式化函数（如卦级分析行、旬空行等）。
 */

import type {
    ChangedYaoDetail,
    FullYaoInfoExtended,
    ShenSystemByYongShen,
    YongShenGroup,
    LiuYaoFullAnalysis,
} from '@/lib/divination/liuyao';
import {
    WANG_SHUAI_LABELS,
    KONG_WANG_LABELS,
} from '@/lib/divination/liuyao';

// 从 mcp-core 导入并 re-export 共享常量
export {
    YONG_SHEN_STATUS_LABELS,
    YAO_POSITION_NAMES,
    traditionalYaoName,
    formatGanZhiTime,
    formatGuaLevelLines,
    sortYaosDescending,
} from '@mingai/mcp-core/liuyao-core';

import { traditionalYaoName } from '@mingai/mcp-core/liuyao-core';

// ── 函数 ──

/** 构建用神标记集合，用于排盘行标注【用神】 */
export function buildYongShenMarkers(yongShen: YongShenGroup[]): Set<string> {
    return new Set(
        yongShen
            .map(group => {
                const { position, liuQin } = group.selected;
                if (typeof position !== 'number' || typeof liuQin !== 'string') return null;
                return `${position}:${liuQin}`;
            })
            .filter((v): v is string => Boolean(v))
    );
}
/** 格式化变爻化出行 */
export function formatChangedYaoLine(cy: ChangedYaoDetail): string {
    return `化${cy.liuQin} ${cy.naJia}${cy.wuXing}（${cy.relation || ''}）`;
}

/**
 * 四柱旬空格式化行
 * 返回包含日旬空 + 年/月/时旬空 + 注释的行数组
 */
export function formatKongWangLines(
    kongWangByPillar: LiuYaoFullAnalysis['kongWangByPillar'] | undefined | null,
    kongWang: LiuYaoFullAnalysis['kongWang']
): string[] {
    const lines: string[] = [];
    if (kongWangByPillar) {
        lines.push(`日旬空：${kongWangByPillar.day.xun}（${kongWangByPillar.day.kongDizhi.join('、')}）`);
        lines.push(`年旬空：${kongWangByPillar.year.xun}（${kongWangByPillar.year.kongDizhi.join('、')}）`);
        lines.push(`月旬空：${kongWangByPillar.month.xun}（${kongWangByPillar.month.kongDizhi.join('、')}）`);
        lines.push(`时旬空：${kongWangByPillar.hour.xun}（${kongWangByPillar.hour.kongDizhi.join('、')}）`);
    } else {
        lines.push(`日旬空：${kongWang.xun}（${kongWang.kongDizhi.join('、')}）`);
    }
    lines.push('注：六爻断卦判空亡以"日旬空"为主，年/月/时旬空供参考。');
    return lines;
}

// ── Task 1: formatYaoDetailLine ──

export interface FormatYaoLineOptions {
    yongShenMarkers?: Set<string>;
    /** data-source style uses '明动'/'静' instead of '（动）' */
    dataSourceStyle?: boolean;
}

/**
 * 格式化单爻详细行（共享逻辑）
 *
 * 默认风格（AI prompt / clipboard）：
 *   九五：官鬼 朱雀 午火 【世】【用神】（动） [旺·真空·明动·帝旺] 证据:… 神煞:…
 *
 * dataSourceStyle 风格：
 *   九五：官鬼 朱雀 午火 旺 明动 真空 【世】 证据:… 神煞:…
 */
export function formatYaoDetailLine(
    y: FullYaoInfoExtended,
    options?: FormatYaoLineOptions,
): string {
    const { yongShenMarkers, dataSourceStyle = false } = options ?? {};
    const shiYingMark = y.isShiYao ? '【世】' : y.isYingYao ? '【应】' : '';

    if (dataSourceStyle) {
        const changeMark = y.isChanging ? ' 明动' : ' 静';
        const kongLabel = y.kongWangState !== 'not_kong' ? ` ${KONG_WANG_LABELS[y.kongWangState]}` : '';
        const shenSha = y.shenSha.length > 0 ? ` 神煞:${y.shenSha.join('、')}` : '';
        const evidence = y.strength.evidence.length > 0 ? ` 证据:${y.strength.evidence.join('、')}` : '';
        let line = `${traditionalYaoName(y.position, y.type)}：${y.liuQin} ${y.liuShen} ${y.naJia}${y.wuXing} ${WANG_SHUAI_LABELS[y.strength.wangShuai]}${changeMark}${kongLabel} ${shiYingMark}${evidence}${shenSha}`;
        if (y.isChanging && y.changedYao) {
            line += `\n    → ${formatChangedYaoLine(y.changedYao)}`;
        }
        return line;
    }

    // default style (AI prompt / clipboard)
    const yongShenMark = yongShenMarkers?.has(`${y.position}:${y.liuQin}`) ? '【用神】' : '';
    const changeMark = y.isChanging ? '（动）' : '';
    const statusParts = [
        WANG_SHUAI_LABELS[y.strength.wangShuai],
        y.kongWangState !== 'not_kong' ? KONG_WANG_LABELS[y.kongWangState] : '',
        y.movementLabel,
        y.changSheng?.stage,
    ].filter(Boolean);
    const shenShaMark = y.shenSha.length > 0 ? ` 神煞:${y.shenSha.join('、')}` : '';
    const evidenceText = y.strength.evidence.length > 0 ? ` 证据:${y.strength.evidence.join('、')}` : '';
    let line = `${traditionalYaoName(y.position, y.type)}：${y.liuQin} ${y.liuShen} ${y.naJia}${y.wuXing} ${shiYingMark}${yongShenMark}${changeMark} [${statusParts.join('·')}]${evidenceText}${shenShaMark}`;
    if (y.isChanging && y.changedYao) {
        line += `\n  → ${formatChangedYaoLine(y.changedYao)}`;
    }
    return line;
}

// ── Task 2: buildShenSystemMap ──

/** 构建 targetLiuQin → ShenSystemByYongShen 的映射 */
export function buildShenSystemMap(systems: ShenSystemByYongShen[]): Map<string, ShenSystemByYongShen> {
    return new Map(systems.map(s => [s.targetLiuQin, s] as const));
}

// ── Task 3: formatShenSystemParts ──

/** 格式化原神/忌神/仇神文本片段 */
export function formatShenSystemParts(system: ShenSystemByYongShen | undefined): string[] {
    const parts: string[] = [];
    if (system?.yuanShen) parts.push(`原神=${system.yuanShen.liuQin}（${system.yuanShen.wuXing}）`);
    if (system?.jiShen) parts.push(`忌神=${system.jiShen.liuQin}（${system.jiShen.wuXing}）`);
    if (system?.chouShen) parts.push(`仇神=${system.chouShen.liuQin}（${system.chouShen.wuXing}）`);
    return parts;
}
