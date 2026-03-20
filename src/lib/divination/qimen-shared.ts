export interface QimenPalaceInfo {
    palaceNumber: number;
    palaceName: string;
    direction: string;
    element: string;
    earthStem: string;
    heavenStem: string;
    star: string;
    gate: string;
    god: string;
    patterns: string[];
    isEmpty: boolean;
    isHorseStar: boolean;
    isRuMu: boolean;
    earthStemElement: string;
    heavenStemElement: string;
    starElement: string;
    gateElement: string;
    stemWangShuai?: string;
    elementState?: string;
}

export interface QimenOutput {
    solarDate: string;
    lunarDate: string;
    fourPillars: { year: string; month: string; day: string; hour: string };
    xunShou: string;
    dunType: 'yang' | 'yin';
    juNumber: number;
    yuan: string;
    zhiFu: string;
    zhiFuPalace: number;
    zhiShi: string;
    zhiShiPalace: number;
    solarTerm: string;
    solarTermRange: string;
    panTypeLabel: string;
    juMethodLabel: string;
    palaces: QimenPalaceInfo[];
    monthPhase: Record<string, string>;
    kongWang: {
        dayKong: { branches: string[]; palaces: number[] };
        hourKong: { branches: string[]; palaces: number[] };
    };
    yiMa: { branch: string; palace: number };
    globalFormations: string[];
}

export function generateQimenResultText(result: QimenOutput & { question?: string }): string {
    const dunText = result.dunType === 'yang' ? '阳遁' : '阴遁';
    const lines: string[] = [];

    lines.push('# 奇门遁甲排盘');
    lines.push('');
    lines.push('## 基本信息');
    lines.push(`- **公历**: ${result.solarDate}`);
    lines.push(`- **农历**: ${result.lunarDate}`);
    lines.push(`- **节气**: ${result.solarTerm ?? ''}${result.solarTermRange ? `（${result.solarTermRange}）` : ''}`);
    lines.push(`- **四柱**: ${result.fourPillars.year} ${result.fourPillars.month} ${result.fourPillars.day} ${result.fourPillars.hour}`);
    lines.push(`- **局**: ${dunText}${result.juNumber}局`);
    if (result.yuan) lines.push(`- **三元**: ${result.yuan}`);
    lines.push(`- **旬首**: ${result.xunShou}`);
    lines.push(`- **盘式**: ${result.panTypeLabel}（${result.juMethodLabel}）`);
    if (result.question) lines.push(`- **占问**: ${result.question}`);
    lines.push('');

    lines.push('## 值符值使');
    lines.push(`- **值符**: ${result.zhiFu}（${result.zhiFuPalace}宫）`);
    lines.push(`- **值使**: ${result.zhiShi}（${result.zhiShiPalace}宫）`);
    lines.push('');

    if (result.kongWang?.dayKong && result.yiMa?.branch) {
        lines.push('## 空亡与驿马');
        lines.push(`- **日空**: ${result.kongWang.dayKong.branches.join('、')}（${result.kongWang.dayKong.palaces.join('、')}宫）`);
        if (result.kongWang.hourKong?.branches?.length) {
            lines.push(`- **时空**: ${result.kongWang.hourKong.branches.join('、')}（${result.kongWang.hourKong.palaces.join('、')}宫）`);
        }
        lines.push(`- **驿马**: ${result.yiMa.branch}（${result.yiMa.palace}宫）`);
        lines.push('');
    }

    lines.push('## 九宫盘');
    lines.push('');
    const luoshuOrder = [3, 8, 1, 2, 4, 6, 7, 0, 5];
    for (const idx of luoshuOrder) {
        const palace = result.palaces[idx];
        if (!palace) continue;
        if (palace.palaceNumber === 5) {
            lines.push(`【中五宫】地:${palace.earthStem}`);
            continue;
        }
        const marks: string[] = [];
        if (palace.isEmpty) marks.push('空');
        if (palace.isHorseStar) marks.push('马');
        if (palace.isRuMu) marks.push('墓');
        const markStr = marks.length > 0 ? ` [${marks.join(',')}]` : '';
        const patternStr = palace.patterns.length > 0 ? ` 格局:${palace.patterns.join(',')}` : '';
        const elementInfo = `宫五行:${palace.element || '-'} 星五行:${palace.starElement || '-'} 门五行:${palace.gateElement || '-'}${palace.elementState ? ` 宫旺衰:${palace.elementState}` : ''}`;
        lines.push(`【${palace.palaceName}${palace.palaceNumber}宫】${markStr} ${palace.god} | 天:${palace.heavenStem} 地:${palace.earthStem} | ${palace.star} | ${palace.gate}${patternStr} | ${elementInfo}`);
    }

    lines.push('');
    lines.push('## 九宫详情');
    lines.push('');
    lines.push('| 宫位 | 方位 | 地盘 | 天盘 | 九星 | 星五行 | 八门 | 门五行 | 八神 | 宫五行 | 宫旺衰 | 格局 | 旺衰 | 标记 |');
    lines.push('|------|------|------|------|------|--------|------|--------|------|--------|--------|------|------|------|');
    for (const palace of result.palaces) {
        const marks: string[] = [];
        if (palace.isEmpty) marks.push('空亡');
        if (palace.isHorseStar) marks.push('驿马');
        if (palace.isRuMu) marks.push('入墓');
        lines.push(`| ${palace.palaceName}${palace.palaceNumber} | ${palace.direction || '-'} | ${palace.earthStem || '-'} | ${palace.heavenStem || '-'} | ${palace.star || '-'} | ${palace.starElement || '-'} | ${palace.gate || '-'} | ${palace.gateElement || '-'} | ${palace.god || '-'} | ${palace.element || '-'} | ${palace.elementState || '-'} | ${palace.patterns.join('、') || '-'} | ${palace.stemWangShuai || '-'} | ${marks.join('、') || '-'} |`);
    }

    if (result.globalFormations?.length) {
        lines.push('');
        lines.push('## 格局总览');
        lines.push('');
        for (const formation of result.globalFormations) {
            lines.push(`- ${formation}`);
        }
    }

    const phaseGroups = new Map<string, string[]>();
    for (const [stem, phase] of Object.entries(result.monthPhase || {})) {
        if (!phase) continue;
        phaseGroups.set(phase, [...(phaseGroups.get(phase) || []), stem]);
    }
    if (phaseGroups.size > 0) {
        lines.push('');
        lines.push('## 月令旺衰');
        lines.push('');
        for (const [phase, stems] of phaseGroups.entries()) {
            lines.push(`- **${phase}**: ${stems.join('、')}`);
        }
    }

    return lines.join('\n');
}
