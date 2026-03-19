/**
 * 六爻格式化共享工具
 *
 * 核心常量与函数从 @mingai/core 导入，
 * 本文件补充 web 侧专用的格式化函数（如卦级分析行、旬空行等）。
 */

import type {
    ChangedYaoDetail,
    FullYaoInfoExtended,
    ShenSystemByYongShen,
    YongShenGroup,
    LiuYaoFullAnalysis,
    Hexagram,
    Yao,
    LiuQin,
} from '@/lib/divination/liuyao';
import {
    WANG_SHUAI_LABELS,
    KONG_WANG_LABELS,
    performFullAnalysis,
} from '@/lib/divination/liuyao';
import { getShiYingPosition, findPalace } from '@/lib/divination/eight-palaces';
import { getHexagramText } from '@/lib/divination/hexagram-texts';

// 从 core 导入并 re-export 共享常量
export {
    YONG_SHEN_STATUS_LABELS,
    YAO_POSITION_NAMES,
    traditionalYaoName,
    formatGanZhiTime,
    formatGuaLevelLines,
    sortYaosDescending,
} from '@mingai/core/liuyao-core';

import {
    traditionalYaoName,
    YONG_SHEN_STATUS_LABELS,
    YAO_POSITION_NAMES,
    formatGanZhiTime,
    formatGuaLevelLines,
    sortYaosDescending,
} from '@mingai/core/liuyao-core';

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

// ── buildTraditionalInfo ──

/**
 * 构建传统六爻分析信息文本，用于 AI 解卦 prompt。
 *
 * 将排盘数据、用神分析、伏神、卦级分析、旬空等整合为一段格式化文本。
 */
export function buildTraditionalInfo(
    yaos: Yao[] | undefined,
    hexagramCode: string,
    changedCode: string | undefined,
    question: string,
    date: Date,
    yongShenTargets: LiuQin[],
    hexagram: Hexagram,
    changedHexagram?: Hexagram,
): string {
    if (!yaos || yaos.length !== 6) return '';

    const analysis = performFullAnalysis(yaos, hexagramCode, changedCode, question, date, { yongShenTargets });

    const {
        ganZhiTime,
        kongWangByPillar,
        kongWang,
        fullYaos,
        yongShen,
        fuShen,
        shenSystemByYongShen,
        globalShenSha,
        timeRecommendations,
        liuChongGuaInfo,
        liuHeGuaInfo,
        chongHeTransition,
        guaFanFuYin,
        sanHeAnalysis,
        warnings,
    } = analysis;

    const palace = findPalace(hexagramCode);
    const shiYing = getShiYingPosition(hexagramCode);
    const changedPalace = changedCode ? findPalace(changedCode) : undefined;
    const hexText = getHexagramText(hexagram.name);
    const changedHexText = changedHexagram ? getHexagramText(changedHexagram.name) : undefined;
    const yongShenMarkers = buildYongShenMarkers(yongShen);

    // 各爻详细信息（上爻→初爻）
    const yaoByPosition = new Map(fullYaos.map(y => [y.position, y] as const));
    const sortedYaos = sortYaosDescending(fullYaos);
    const yaoDetails = sortedYaos.map(y => formatYaoDetailLine(y, { yongShenMarkers })).join('\n');

    const shenSystemMap = buildShenSystemMap(shenSystemByYongShen);
    const yongShenInfo = yongShen.map((group) => {
        const main = group.selected;
        const statusLabel = YONG_SHEN_STATUS_LABELS[group.selectionStatus] || group.selectionStatus;
        const candidates = group.candidates.length > 0
            ? `\n候选：${group.candidates.map(c => `${c.liuQin}${c.position ? `@${traditionalYaoName(c.position, yaoByPosition.get(c.position)?.type ?? 1)}` : ''}${c.naJia ? `（${c.naJia}）` : ''}${c.evidence.length > 0 ? `：${c.evidence.join('、')}` : ''}`).join('、')}`
            : '';
        const system = shenSystemMap.get(group.targetLiuQin);
        const systemParts = formatShenSystemParts(system);
        const systemText = systemParts.length > 0 ? `\n神系：${systemParts.join('；')}` : '';
        const recs = timeRecommendations.filter(rec => rec.targetLiuQin === group.targetLiuQin);
        const recText = recs.length > 0
            ? `\n应期线索：${recs.map(rec => `${rec.trigger}：${rec.description}`).join('；')}`
            : '';
        const selectionText = group.selectionNote ? `\n取用说明：${group.selectionNote}` : '';
        const mainEvidence = main.evidence.length > 0 ? `\n依据：${main.evidence.join('、')}` : '';
        return `- 目标${group.targetLiuQin}（${statusLabel}）\n  主用神：${main.liuQin}${main.naJia ? `（${main.naJia}）` : ''}${main.position ? ` @${traditionalYaoName(main.position, yaoByPosition.get(main.position)?.type ?? 1)}` : ''} ${main.element} ${main.strengthLabel} ${main.movementLabel}${mainEvidence}${candidates}${selectionText}${systemText}${recText}`;
    }).join('\n');

    let fuShenInfo = '';
    if (fuShen && fuShen.length > 0) {
        const fuShenLines = fuShen.map(fs => {
            const posName = YAO_POSITION_NAMES[fs.feiShenPosition - 1];
            return `- ${fs.liuQin}伏于${posName}${fs.feiShenLiuQin ? `（${fs.feiShenLiuQin}）` : ''}下，纳甲${fs.naJia}${fs.wuXing}，${fs.availabilityReason}`;
        });
        fuShenInfo = `\n伏神分析：\n${fuShenLines.join('\n')}`;
    }

    // 变卦信息
    const changedLines = fullYaos.filter(y => y.isChanging).map(y => y.position);
    let changedHexagramInfo: string;
    if (changedHexagram && changedLines.length > 0) {
        const changedPalaceName = changedPalace?.name || '未知';
        const changedEl = changedHexagram.element || '';
        const changedLineNames = changedLines.map(l => {
            const yao = yaoByPosition.get(l);
            return yao ? traditionalYaoName(l, yao.type) : YAO_POSITION_NAMES[l - 1];
        }).join('、');
        const parts = [
            `变卦：${changedHexagram.name}（${changedPalaceName}宫·${changedEl}）`,
            `变爻：${changedLineNames}`,
        ];
        if (changedHexText) {
            parts.push(`变卦卦辞：${changedHexText.gua}`);
            parts.push(`变卦象辞：${changedHexText.xiang}`);
        }
        if (hexText?.yao) {
            for (const pos of changedLines) {
                const yaoCi = hexText.yao[pos - 1];
                if (yaoCi) {
                    const yao = yaoByPosition.get(pos);
                    parts.push(`${traditionalYaoName(pos, yao?.type ?? 1)}爻辞：${yaoCi.text}`);
                }
            }
        }
        changedHexagramInfo = parts.join('\n');
    } else {
        changedHexagramInfo = '无变爻';
    }

    // 卦级分析
    const guaLevelParts = formatGuaLevelLines({
        liuChongGuaInfo, liuHeGuaInfo, chongHeTransition, guaFanFuYin, sanHeAnalysis, globalShenSha,
    });

    // 四柱旬空
    const kongWangLines = formatKongWangLines(kongWangByPillar, kongWang);

    return [
        '【卦象信息】',
        `本卦：${hexagram.name}（${palace?.name || '未知'}宫·${hexagram.element}）`,
        `上卦：${hexagram.upperTrigram}（${hexagram.nature}）`,
        `下卦：${hexagram.lowerTrigram}`,
        hexText ? `卦辞：${hexText.gua}` : '',
        hexText ? `象辞：${hexText.xiang}` : '',
        changedHexagramInfo,
        '',
        '【起卦时间】',
        formatGanZhiTime(ganZhiTime),
        ...kongWangLines,
        `世爻：第${shiYing.shi}爻 | 应爻：第${shiYing.ying}爻`,
        '',
        guaLevelParts.length > 0 ? `【卦级分析】\n${guaLevelParts.join('\n')}` : '',
        '',
        '【六爻排盘】',
        yaoDetails,
        '',
        '【用神分析】',
        yongShenInfo,
        fuShenInfo,
        '',
        warnings && warnings.length > 0 ? `【风险提示】\n${warnings.join('；')}` : '',
        timeRecommendations.length > 0
            ? `【应期参考】\n${timeRecommendations.map(r => `${r.type === 'favorable' ? '利' : r.type === 'unfavorable' ? '忌' : '要'}（${r.targetLiuQin} ${r.trigger}）：${r.description}`).join('\n')}`
            : '',
    ].filter(Boolean).join('\n');
}
