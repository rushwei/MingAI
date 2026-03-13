/**
 * 紫微斗数命盘转文字
 * 
 * 将紫微命盘转换为可读的文字格式，用于AI分析
 */

import type { ZiweiChart, PalaceInfo, StarInfo, DecadalInfo } from './ziwei';
import { getDecadalList, getHoroscope } from './ziwei';

// 传统宫位排列顺序（iztro zh-CN locale 不带"宫"后缀，除"命宫"外）
const PALACE_ORDER = ['命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄',
    '迁移', '仆役', '官禄', '田宅', '福德', '父母'];

/**
 * 将星曜信息转为文字
 */
function starToText(star: StarInfo): string {
    let text = star.name;
    if (star.brightness) text += `(${star.brightness})`;
    if (star.mutagen) text += `[化${star.mutagen}]`;
    return text;
}

/**
 * 将宫位信息转为文字
 */
function palaceToText(palace: PalaceInfo): string {
    const lines: string[] = [];

    // 宫名和干支
    let header = `【${palace.name}】${palace.heavenlyStem}${palace.earthlyBranch}`;
    if (palace.isBodyPalace) header += ' (身宫)';
    lines.push(header);

    // 主星
    if (palace.majorStars.length > 0) {
        lines.push(`  主星: ${palace.majorStars.map(starToText).join(', ')}`);
    } else {
        lines.push(`  主星: 无主星`);
    }

    // 辅星
    if (palace.minorStars.length > 0) {
        lines.push(`  辅星: ${palace.minorStars.map(starToText).join(', ')}`);
    }

    // 杂曜
    if (palace.adjStars && palace.adjStars.length > 0) {
        lines.push(`  杂曜: ${palace.adjStars.map(s => s.name).join(', ')}`);
    }

    return lines.join('\n');
}

/**
 * 将大限信息转为文字
 */
function decadalToText(decadal: DecadalInfo): string {
    const mutagen = decadal.palace.mutagen ? ` 四化: ${decadal.palace.mutagen.join(', ')}` : '';
    return `${decadal.startAge}-${decadal.endAge}岁: ${decadal.palace.name}(${decadal.heavenlyStem})${mutagen}`;
}

/**
 * 将完整紫微命盘转为文字
 * 
 * @param chart 紫微命盘数据
 * @param includeHoroscope 是否包含运限信息（默认true）
 * @returns 格式化的文字描述
 */
export function ziweiChartToText(chart: ZiweiChart, includeHoroscope: boolean = true): string {
    const sections: string[] = [];

    // ===== 基本信息 =====
    sections.push('【基本信息】');
    sections.push(`阳历: ${chart.solarDate}`);
    sections.push(`农历: ${chart.lunarDate}`);
    sections.push(`时辰: ${chart.time}`);
    sections.push(`属相: ${chart.zodiac}`);
    sections.push(`星座: ${chart.sign}`);
    sections.push('');

    // ===== 四柱信息 =====
    sections.push('【四柱】');
    sections.push(`年柱: ${chart.yearStem}${chart.yearBranch}`);
    sections.push(`月柱: ${chart.monthStem}${chart.monthBranch}`);
    sections.push(`日柱: ${chart.dayStem}${chart.dayBranch}`);
    sections.push(`时柱: ${chart.hourStem}${chart.hourBranch}`);
    sections.push('');

    // ===== 命主信息 =====
    sections.push('【命格】');
    sections.push(`命主: ${chart.soul}`);
    sections.push(`身主: ${chart.body}`);
    sections.push(`五行局: ${chart.fiveElement}`);

    // 找出命宫和身宫
    const lifePalace = chart.palaces.find(p => p.name === '命宫');
    const bodyPalace = chart.palaces.find(p => p.isBodyPalace);
    if (lifePalace) {
        sections.push(`命宫: ${lifePalace.heavenlyStem}${lifePalace.earthlyBranch}`);
    }
    if (bodyPalace) {
        sections.push(`身宫: ${bodyPalace.name}(${bodyPalace.heavenlyStem}${bodyPalace.earthlyBranch})`);
    }
    sections.push('');

    // ===== 十二宫详情 =====
    sections.push('【十二宫详情】');

    for (const palaceName of PALACE_ORDER) {
        const palace = chart.palaces.find(p => p.name === palaceName);
        if (palace) {
            sections.push(palaceToText(palace));
            sections.push('');
        }
    }

    // ===== 大限信息 =====
    if (includeHoroscope) {
        try {
            const decadalList = getDecadalList(chart);
            if (decadalList.length > 0) {
                sections.push('【大限走势】');
                for (const decadal of decadalList) {
                    sections.push(decadalToText(decadal));
                }
                sections.push('');
            }

            // 当前运限信息
            const now = new Date();
            const horoscope = getHoroscope(chart, now);
            if (horoscope) {
                sections.push('【当前运限】');
                sections.push(`当前大限: ${horoscope.decadal.palace.name} (${horoscope.decadal.startAge}-${horoscope.decadal.endAge}岁)`);
                sections.push(`流年宫位: ${horoscope.yearly.palace.name} (${horoscope.yearly.period})`);
                sections.push(`流月宫位: ${horoscope.monthly.palace.name} (${horoscope.monthly.period})`);
                sections.push(`流日宫位: ${horoscope.daily.palace.name} (${horoscope.daily.period})`);
                sections.push('');
            }
        } catch (e) {
            // 运限计算失败时忽略
            console.warn('运限计算失败:', e);
        }
    }

    // ===== 四化汇总 =====
    sections.push('【四化分布】');
    const mutagenMap: Record<string, string[]> = {
        '禄': [],
        '权': [],
        '科': [],
        '忌': [],
    };

    for (const palace of chart.palaces) {
        for (const star of [...palace.majorStars, ...palace.minorStars]) {
            if (star.mutagen && mutagenMap[star.mutagen]) {
                mutagenMap[star.mutagen].push(`${star.name}(${palace.name})`);
            }
        }
    }

    for (const [key, stars] of Object.entries(mutagenMap)) {
        if (stars.length > 0) {
            sections.push(`化${key}: ${stars.join(', ')}`);
        }
    }

    return sections.join('\n');
}

/**
 * 生成紫微命盘的简要摘要（用于对话上下文）
 */
export function ziweiChartSummary(chart: ZiweiChart): string {
    const lifePalace = chart.palaces.find(p => p.name === '命宫');
    const lifeStars = lifePalace?.majorStars.map(s => s.name).join('、') || '无主星';

    return `紫微命盘：${chart.fiveElement}，命宫主星${lifeStars}，命主${chart.soul}，身主${chart.body}`;
}
