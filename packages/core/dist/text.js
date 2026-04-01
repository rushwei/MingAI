import { Solar } from 'lunar-javascript';
import { formatGuaLevelLines, KONG_WANG_LABELS, sortYaosDescending, traditionalYaoName, WANG_SHUAI_LABELS, YONG_SHEN_STATUS_LABELS, } from './liuyao-core.js';
import { GAN_WUXING } from './utils.js';
const ZIWEI_PALACE_TEXT_ORDER = ['命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄', '迁移', '交友', '官禄', '田宅', '福德', '父母'];
function normalizeBaziDetailLevel(detailLevel) {
    if (detailLevel === 'full' || detailLevel === 'more' || detailLevel === 'facts' || detailLevel === 'debug') {
        return 'full';
    }
    return 'default';
}
function normalizeTarotDetailLevel(detailLevel) {
    if (detailLevel === 'full' || detailLevel === 'more' || detailLevel === 'facts' || detailLevel === 'debug') {
        return 'full';
    }
    return 'default';
}
function normalizeZiweiDetailLevel(detailLevel) {
    if (detailLevel === 'full' || detailLevel === 'more' || detailLevel === 'facts' || detailLevel === 'debug') {
        return 'full';
    }
    return 'default';
}
function normalizeQimenDetailLevel(detailLevel) {
    if (detailLevel === 'full' || detailLevel === 'more' || detailLevel === 'facts' || detailLevel === 'debug') {
        return 'full';
    }
    return 'default';
}
function normalizeDaliurenDetailLevel(detailLevel) {
    if (detailLevel === 'full' || detailLevel === 'more' || detailLevel === 'facts' || detailLevel === 'debug') {
        return 'full';
    }
    return 'default';
}
function normalizeZiweiHoroscopeDetailLevel(detailLevel) {
    if (detailLevel === 'full' || detailLevel === 'more' || detailLevel === 'facts' || detailLevel === 'debug') {
        return 'full';
    }
    return 'default';
}
function normalizeFortuneDetailLevel(detailLevel) {
    if (detailLevel === 'full' || detailLevel === 'more' || detailLevel === 'facts' || detailLevel === 'debug') {
        return 'full';
    }
    return 'default';
}
function formatTrueSolarBlock(info) {
    const dayOffsetLabel = info.dayOffset > 0
        ? `后${info.dayOffset}日`
        : info.dayOffset < 0
            ? `前${Math.abs(info.dayOffset)}日`
            : '当日';
    return [
        `- 钟表时间: ${info.clockTime}`,
        `- 真太阳时: ${info.trueSolarTime}（经度 ${info.longitude}°，校正 ${info.correctionMinutes > 0 ? '+' : ''}${info.correctionMinutes} 分钟）`,
        `- 真太阳时索引: ${info.trueTimeIndex}`,
        `- 跨日偏移: ${dayOffsetLabel}`,
    ];
}
function buildBaziCanonicalStemRelations(result) {
    const relationParts = [];
    const seen = new Set();
    const pushUnique = (value) => {
        if (!value || seen.has(value))
            return;
        seen.add(value);
        relationParts.push(value);
    };
    for (const item of result.tianGanWuHe) {
        pushUnique(`${item.stemA}${item.stemB}合${item.resultElement}`);
    }
    for (const item of result.tianGanChongKe) {
        pushUnique(`${item.stemA}${item.stemB}冲克`);
    }
    return relationParts;
}
function buildBaziCanonicalBranchRelations(result) {
    const posBranchMap = {
        '年支': result.fourPillars.year.branch,
        '月支': result.fourPillars.month.branch,
        '日支': result.fourPillars.day.branch,
        '时支': result.fourPillars.hour.branch,
    };
    const relationParts = [];
    const seen = new Set();
    const pushUnique = (value) => {
        if (!value || seen.has(value))
            return;
        seen.add(value);
        relationParts.push(value);
    };
    for (const relation of result.relations) {
        if (relation.type === '刑') {
            const branches = [...new Set(relation.pillars.map((pillar) => posBranchMap[pillar]))].join('');
            pushUnique(`${branches}刑（${relation.description}）`);
        }
        else {
            pushUnique(relation.description);
        }
    }
    for (const item of result.diZhiBanHe) {
        pushUnique(`${item.branches.join('')}半合${item.resultElement}`);
    }
    for (const item of result.diZhiSanHui) {
        pushUnique(`${item.branches.join('')}三会${item.resultElement}`);
    }
    return relationParts;
}
function formatStarLabel(star) {
    let label = star.name;
    if (star.brightness)
        label += `(${star.brightness})`;
    if (star.mutagen)
        label += `[化${star.mutagen}]`;
    if (star.selfMutagen)
        label += `[↓${star.selfMutagen}]`;
    if (star.oppositeMutagen)
        label += `[↑${star.oppositeMutagen}]`;
    return label;
}
function buildShenSystemMap(systems) {
    return new Map(systems.map((system) => [system.targetLiuQin, system]));
}
function formatShenSystemParts(system) {
    const parts = [];
    if (system?.yuanShen)
        parts.push(`原神=${system.yuanShen.liuQin}（${system.yuanShen.wuXing}）`);
    if (system?.jiShen)
        parts.push(`忌神=${system.jiShen.liuQin}（${system.jiShen.wuXing}）`);
    if (system?.chouShen)
        parts.push(`仇神=${system.chouShen.liuQin}（${system.chouShen.wuXing}）`);
    return parts;
}
export function sortZiweiPalaces(palaces) {
    return [...palaces].sort((left, right) => {
        const leftOrder = ZIWEI_PALACE_TEXT_ORDER.indexOf(left.name);
        const rightOrder = ZIWEI_PALACE_TEXT_ORDER.indexOf(right.name);
        const normalizedLeft = leftOrder >= 0 ? leftOrder : Number.MAX_SAFE_INTEGER;
        const normalizedRight = rightOrder >= 0 ? rightOrder : Number.MAX_SAFE_INTEGER;
        if (normalizedLeft !== normalizedRight)
            return normalizedLeft - normalizedRight;
        return (left.index ?? Number.MAX_SAFE_INTEGER) - (right.index ?? Number.MAX_SAFE_INTEGER);
    });
}
export function renderBaziCanonicalText(chart, options = {}) {
    const detailLevel = normalizeBaziDetailLevel(options.detailLevel);
    if (detailLevel === 'full') {
        return renderBaziCanonicalFullText(chart, options);
    }
    return renderBaziCanonicalDefaultText(chart, options);
}
function renderBaziCanonicalDefaultText(chart, options = {}) {
    const { dayun } = options;
    const lines = ['# 八字命盘', '', '## 命局全盘'];
    if (options.name)
        lines.push(`- 姓名: ${options.name}`);
    lines.push(`- 性别: ${chart.gender === 'male' ? '男' : '女'}`);
    lines.push(`- 日主: ${chart.dayMaster}`);
    if (chart.birthPlace)
        lines.push(`- 出生地: ${chart.birthPlace}`);
    if (chart.trueSolarTimeInfo) {
        lines.push(...formatTrueSolarBlock(chart.trueSolarTimeInfo));
    }
    lines.push('');
    lines.push('| 柱 | 干支 | 天干(十神) | 地支藏干(十神) | 地势 | 空亡 |');
    lines.push('|---|------|------------|----------------|------|------|');
    for (const [label, pillar] of [
        ['年柱', chart.fourPillars.year],
        ['月柱', chart.fourPillars.month],
        ['日柱', chart.fourPillars.day],
        ['时柱', chart.fourPillars.hour],
    ]) {
        const hiddenStemsText = pillar.hiddenStems.length > 0
            ? pillar.hiddenStems.map((item) => `${item.stem}(${item.tenGod || '-'})`).join(' ')
            : '-';
        const stemText = label === '日柱'
            ? `${pillar.stem}(日主)`
            : `${pillar.stem}(${pillar.tenGod || '-'})`;
        lines.push(`| ${label} | ${pillar.stem}${pillar.branch} | ${stemText} | ${hiddenStemsText} | ${pillar.diShi || '-'} | ${pillar.kongWang?.isKong ? '空' : '-'} |`);
    }
    lines.push('');
    const stemRelationParts = buildBaziCanonicalStemRelations(chart);
    const branchRelationParts = buildBaziCanonicalBranchRelations(chart);
    if (stemRelationParts.length > 0 || branchRelationParts.length > 0) {
        lines.push('## 干支关系');
        if (stemRelationParts.length > 0)
            lines.push(`- 天干: ${stemRelationParts.join('；')}`);
        if (branchRelationParts.length > 0)
            lines.push(`- 地支: ${branchRelationParts.join('；')}`);
    }
    if (dayun) {
        lines.push('');
        lines.push('## 大运轨迹');
        lines.push(`- 起运: ${dayun.startAge}岁（${dayun.startAgeDetail}）`);
        lines.push('');
        lines.push('| 起运年份 | 年龄 | 大运干支 | 天干(十神) | 地支藏干(十神) |');
        lines.push('|----------|------|----------|------------|----------------|');
        for (const item of dayun.list) {
            const hiddenStemsText = item.hiddenStems?.length
                ? item.hiddenStems.map((hs) => `${hs.stem}(${hs.tenGod})`).join(' ')
                : '-';
            lines.push(`| ${item.startYear} | ${item.startAge}岁 | ${item.ganZhi} | ${item.stem}(${item.tenGod || '-'}) | ${hiddenStemsText} |`);
        }
    }
    return lines.join('\n');
}
function renderBaziCanonicalFullText(chart, options = {}) {
    const { dayun } = options;
    const lines = ['# 八字命盘', '', '## 基本信息'];
    if (options.name)
        lines.push(`- 姓名: ${options.name}`);
    lines.push(`- 性别: ${chart.gender === 'male' ? '男' : '女'}`);
    lines.push(`- 日主: ${chart.dayMaster}`);
    lines.push(`- 命主五行: ${chart.dayMaster}${GAN_WUXING[chart.dayMaster.charAt(0)] || ''}`);
    if (chart.birthPlace)
        lines.push(`- 出生地: ${chart.birthPlace}`);
    if (chart.trueSolarTimeInfo) {
        lines.push(...formatTrueSolarBlock(chart.trueSolarTimeInfo));
    }
    if (chart.kongWang?.kongZhi?.length)
        lines.push(`- 空亡: ${chart.kongWang.kongZhi.join('')}`);
    if (chart.taiYuan)
        lines.push(`- 胎元: ${chart.taiYuan}`);
    if (chart.mingGong)
        lines.push(`- 命宫: ${chart.mingGong}`);
    lines.push('');
    lines.push('## 四柱');
    lines.push('| 柱 | 干支 | 天干(十神) | 地支藏干(十神) | 地势 | 纳音 | 神煞 |');
    lines.push('|---|------|------------|----------------|------|------|------|');
    for (const [label, pillar] of [
        ['年柱', chart.fourPillars.year],
        ['月柱', chart.fourPillars.month],
        ['日柱', chart.fourPillars.day],
        ['时柱', chart.fourPillars.hour],
    ]) {
        const hiddenStemsText = pillar.hiddenStems.length > 0
            ? pillar.hiddenStems.map((item) => `${item.stem}(${item.tenGod || '-'})`).join(' ')
            : '-';
        const stemText = label === '日柱'
            ? `${pillar.stem}(日主)`
            : `${pillar.stem}(${pillar.tenGod || '-'})`;
        const shenShaText = pillar.shenSha?.length ? pillar.shenSha.join('、') : '-';
        lines.push(`| ${label} | ${pillar.stem}${pillar.branch} | ${stemText} | ${hiddenStemsText} | ${pillar.diShi || '-'} | ${pillar.naYin || '-'} | ${shenShaText} |`);
    }
    lines.push('');
    const stemRelationParts = buildBaziCanonicalStemRelations(chart);
    const branchRelationParts = buildBaziCanonicalBranchRelations(chart);
    if (stemRelationParts.length > 0 || branchRelationParts.length > 0) {
        lines.push('## 干支关系');
        if (stemRelationParts.length > 0)
            lines.push(`- 天干: ${stemRelationParts.join('；')}`);
        if (branchRelationParts.length > 0)
            lines.push(`- 地支: ${branchRelationParts.join('；')}`);
    }
    if (dayun) {
        lines.push('');
        lines.push('## 大运轨迹');
        lines.push(`- 起运: ${dayun.startAge}岁（${dayun.startAgeDetail}）`);
        lines.push('');
        lines.push('| 起运年份 | 年龄 | 大运干支 | 天干(十神) | 地支藏干(十神) | 地势 | 纳音 | 神煞 |');
        lines.push('|----------|------|----------|------------|----------------|------|------|------|');
        for (const item of dayun.list) {
            const hiddenStemsText = item.hiddenStems?.length
                ? item.hiddenStems.map((hs) => `${hs.stem}(${hs.tenGod})`).join('、')
                : '-';
            const shenShaText = item.shenSha?.length ? item.shenSha.join('、') : '-';
            lines.push(`| ${item.startYear} | ${item.startAge}岁 | ${item.ganZhi} | ${item.stem}(${item.tenGod || '-'}) | ${hiddenStemsText} | ${item.diShi || '-'} | ${item.naYin || '-'} | ${shenShaText} |`);
        }
    }
    return lines.join('\n');
}
export function renderBaziPillarsResolveCanonicalText(result) {
    const lines = [
        '# 四柱反推候选时间',
        '',
        '## 原始四柱',
        `- **年柱**: ${result.pillars.yearPillar}`,
        `- **月柱**: ${result.pillars.monthPillar}`,
        `- **日柱**: ${result.pillars.dayPillar}`,
        `- **时柱**: ${result.pillars.hourPillar}`,
        '',
        '## 候选数量',
        `- **总数**: ${result.count}`,
    ];
    if (result.candidates.length === 0) {
        lines.push('');
        lines.push('## 候选列表');
        lines.push('- 无匹配候选');
        return lines.join('\n');
    }
    lines.push('');
    lines.push('## 候选列表');
    for (const [index, candidate] of result.candidates.entries()) {
        lines.push('');
        lines.push(`### 候选 ${index + 1}（${candidate.candidateId}）`);
        lines.push(`- **农历**: ${candidate.lunarText}`);
        lines.push(`- **公历**: ${candidate.solarText}`);
        lines.push(`- **出生时间**: ${candidate.birthHour}:${String(candidate.birthMinute).padStart(2, '0')}`);
        if (candidate.isLeapMonth)
            lines.push('- **闰月**: 是');
    }
    return lines.join('\n');
}
export function renderZiweiCanonicalText(result, options = {}) {
    const detailLevel = normalizeZiweiDetailLevel(options.detailLevel);
    if (detailLevel === 'full') {
        return renderZiweiCanonicalFullText(result, options);
    }
    return renderZiweiCanonicalDefaultText(result, options);
}
function formatZiweiCanonicalLunarDate(result) {
    const raw = result.lunarDate?.trim();
    if (!raw)
        return '';
    const yearLabel = `${result.fourPillars.year.gan}${result.fourPillars.year.zhi}年`;
    if (!raw.includes('年'))
        return raw;
    const [, ...rest] = raw.split('年');
    const suffix = rest.join('年').trim();
    return suffix ? `${yearLabel}${suffix}` : yearLabel;
}
function buildZiweiBirthMutagenLine(result) {
    if (!result.mutagenSummary?.length)
        return undefined;
    const order = new Map([
        ['禄', 0],
        ['权', 1],
        ['科', 2],
        ['忌', 3],
    ]);
    const sorted = [...result.mutagenSummary].sort((left, right) => {
        const leftOrder = order.get(left.mutagen) ?? Number.MAX_SAFE_INTEGER;
        const rightOrder = order.get(right.mutagen) ?? Number.MAX_SAFE_INTEGER;
        return leftOrder - rightOrder;
    });
    const items = sorted.map((item) => `${item.starName}化${item.mutagen}`);
    return `${items.join('、')} (${result.fourPillars.year.gan}干)`;
}
function formatZiweiPalaceName(palace) {
    const tags = [];
    if (palace.isBodyPalace)
        tags.push('身宫');
    if (palace.isOriginalPalace)
        tags.push('来因');
    return tags.length > 0 ? `${palace.name}(${tags.join('、')})` : palace.name;
}
function appendZiweiHoroscopeBlock(lines, options) {
    if (!options.horoscope)
        return;
    const h = options.horoscope;
    lines.push('');
    lines.push('## 当前运限');
    lines.push(`- 当前大限: ${h.decadal.palaceName}（${h.decadal.ageRange}）`);
    lines.push(`- 流年宫位: ${h.yearly.palaceName}（${h.yearly.period}）`);
    lines.push(`- 流月宫位: ${h.monthly.palaceName}（${h.monthly.period}）`);
    lines.push(`- 流日宫位: ${h.daily.palaceName}（${h.daily.period}）`);
}
function renderZiweiCanonicalDefaultText(result, options = {}) {
    const lines = ['# 紫微命盘', '', '## 基本信息'];
    if (result.gender === 'male' || result.gender === 'female') {
        lines.push(`- 性别: ${result.gender === 'male' ? '男' : '女'}`);
    }
    const lunarDate = formatZiweiCanonicalLunarDate(result) || result.lunarDate;
    lines.push(`- 阳历: ${result.solarDate}${lunarDate ? ` (农历: ${lunarDate})` : ''}`);
    lines.push(`- 四柱: ${result.fourPillars.year.gan}${result.fourPillars.year.zhi} ${result.fourPillars.month.gan}${result.fourPillars.month.zhi} ${result.fourPillars.day.gan}${result.fourPillars.day.zhi} ${result.fourPillars.hour.gan}${result.fourPillars.hour.zhi}`);
    lines.push(`- 五行局: ${result.fiveElement}`);
    lines.push(`- 命主: ${result.soul} / 身主: ${result.body}`);
    const birthMutagenLine = buildZiweiBirthMutagenLine(result);
    if (birthMutagenLine)
        lines.push(`- 生年四化: ${birthMutagenLine}`);
    if (result.trueSolarTimeInfo) {
        lines.push(`- 真太阳时: ${result.trueSolarTimeInfo.trueSolarTime} (钟表时间: ${result.trueSolarTimeInfo.clockTime}; 经度: ${result.trueSolarTimeInfo.longitude}°; 校正: ${result.trueSolarTimeInfo.correctionMinutes > 0 ? '+' : ''}${result.trueSolarTimeInfo.correctionMinutes}分钟)`);
    }
    lines.push('');
    lines.push('## 十二宫位全盘');
    lines.push('| 宫位 | 干支 | 大限 | 主星及四化 | 辅煞星 (吉/煞/禄/马) |');
    lines.push('|------|------|------|------------|----------------------|');
    for (const palace of sortZiweiPalaces(result.palaces)) {
        const decadal = palace.decadalRange ? `${palace.decadalRange[0]}~${palace.decadalRange[1]}` : '-';
        lines.push(`| ${formatZiweiPalaceName(palace)} | ${palace.heavenlyStem}${palace.earthlyBranch} | ${decadal} | ${palace.majorStars.map(formatStarLabel).join('、') || '-'} | ${palace.minorStars.map(formatStarLabel).join('、') || '-'} |`);
    }
    appendZiweiHoroscopeBlock(lines, options);
    return lines.join('\n');
}
function renderZiweiCanonicalFullText(result, options = {}) {
    const lines = ['# 紫微命盘', '', '## 基本信息'];
    if (result.gender === 'male' || result.gender === 'female') {
        lines.push(`- 性别: ${result.gender === 'male' ? '男' : '女'}`);
    }
    const lunarDate = formatZiweiCanonicalLunarDate(result) || result.lunarDate;
    lines.push(`- 阳历: ${result.solarDate}${lunarDate ? ` (农历: ${lunarDate})` : ''}`);
    lines.push(`- 四柱: ${result.fourPillars.year.gan}${result.fourPillars.year.zhi} ${result.fourPillars.month.gan}${result.fourPillars.month.zhi} ${result.fourPillars.day.gan}${result.fourPillars.day.zhi} ${result.fourPillars.hour.gan}${result.fourPillars.hour.zhi}`);
    lines.push(`- 五行局: ${result.fiveElement}`);
    lines.push(`- 命主: ${result.soul} / 身主: ${result.body}`);
    if (result.time)
        lines.push(`- 时辰: ${result.time}${result.timeRange ? `（${result.timeRange}）` : ''}`);
    const identityParts = [];
    if (result.douJun)
        identityParts.push(`斗君: ${result.douJun}`);
    if (result.lifeMasterStar)
        identityParts.push(`命主星: ${result.lifeMasterStar}`);
    if (result.bodyMasterStar)
        identityParts.push(`身主星: ${result.bodyMasterStar}`);
    if (identityParts.length > 0)
        lines.push(`- ${identityParts.join(' / ')}`);
    const birthMutagenLine = buildZiweiBirthMutagenLine(result);
    if (birthMutagenLine)
        lines.push(`- 生年四化: ${birthMutagenLine}`);
    if (result.trueSolarTimeInfo) {
        lines.push(`- 真太阳时: ${result.trueSolarTimeInfo.trueSolarTime} (钟表时间: ${result.trueSolarTimeInfo.clockTime}; 经度: ${result.trueSolarTimeInfo.longitude}°; 校正: ${result.trueSolarTimeInfo.correctionMinutes > 0 ? '+' : ''}${result.trueSolarTimeInfo.correctionMinutes}分钟)`);
        lines.push(`- 真太阳时索引: ${result.trueSolarTimeInfo.trueTimeIndex}`);
        lines.push(`- 跨日偏移: ${result.trueSolarTimeInfo.dayOffset > 0 ? `后${result.trueSolarTimeInfo.dayOffset}日` : result.trueSolarTimeInfo.dayOffset < 0 ? `前${Math.abs(result.trueSolarTimeInfo.dayOffset)}日` : '当日'}`);
    }
    lines.push('');
    lines.push('## 十二宫位全盘');
    lines.push('| 宫位 | 干支 | 大限 | 主星及四化 | 辅星 | 杂曜 | 神煞 | 流年 | 小限 |');
    lines.push('|------|------|------|------------|------|------|------|------|------|');
    for (const palace of sortZiweiPalaces(result.palaces)) {
        const palaceLabel = formatZiweiPalaceName(palace);
        const shensha = [palace.changsheng12, palace.boshi12, palace.jiangqian12, palace.suiqian12].filter(Boolean).join('、') || '-';
        const decadal = palace.decadalRange ? `${palace.decadalRange[0]}~${palace.decadalRange[1]}` : '-';
        const liuNian = palace.liuNianAges?.length ? palace.liuNianAges.join(',') : '-';
        const xiaoXian = palace.ages?.length ? palace.ages.join(',') : '-';
        lines.push(`| ${palaceLabel} | ${palace.heavenlyStem}${palace.earthlyBranch} | ${decadal} | ${palace.majorStars.map(formatStarLabel).join('、') || '-'} | ${palace.minorStars.map(formatStarLabel).join('、') || '-'} | ${(palace.adjStars || []).map(formatStarLabel).join('、') || '-'} | ${shensha} | ${liuNian} | ${xiaoXian} |`);
    }
    appendZiweiHoroscopeBlock(lines, options);
    return lines.join('\n');
}
const ZIWEI_HOROSCOPE_MUTAGEN_ORDER = ['禄', '权', '科', '忌'];
const ZIWEI_BRANCH_ZODIAC = {
    子: '鼠', 丑: '牛', 寅: '虎', 卯: '兔', 辰: '龙', 巳: '蛇',
    午: '马', 未: '羊', 申: '猴', 酉: '鸡', 戌: '狗', 亥: '猪',
};
const ZIWEI_TRANSIT_STAR_GROUPS = {
    吉星分布: ['流禄', '流魁', '流钺', '流马'],
    煞星分布: ['流羊', '流陀'],
    '桃花/文星': ['流昌', '流曲', '流鸾', '流喜'],
};
function parseZiweiHoroscopeTargetDate(targetDate) {
    const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/u.exec(targetDate.trim());
    if (!match)
        return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const lunarMonthLabel = `农历${Solar.fromYmd(year, month, day).getLunar().getMonthInChinese()}月`;
    return { year, month, day, lunarMonthLabel };
}
function formatZiweiHoroscopeMutagen(stars) {
    return ZIWEI_HOROSCOPE_MUTAGEN_ORDER
        .map((mutagen, index) => stars[index] ? `${stars[index]}[化${mutagen}]` : null)
        .filter(Boolean)
        .join(' ');
}
function formatZiweiHoroscopeLandingPalace(palaceNames) {
    return palaceNames[0] ? `${palaceNames[0]}宫` : '-';
}
function formatZiweiHoroscopeTimeNote(layer, result, parsedTargetDate) {
    switch (layer) {
        case '大限':
            if (typeof result.decadal.startAge === 'number' && typeof result.decadal.endAge === 'number') {
                return `虚岁 ${result.decadal.startAge}~${result.decadal.endAge}`;
            }
            return '-';
        case '流年': {
            const fallbackYear = Number(result.targetDate.slice(0, 4));
            const year = typeof parsedTargetDate?.year === 'number'
                ? parsedTargetDate.year
                : (Number.isFinite(fallbackYear) ? fallbackYear : 0);
            const zodiac = ZIWEI_BRANCH_ZODIAC[result.yearly.earthlyBranch] || '';
            return zodiac ? `${year}年 (${zodiac}年)` : `${year}年`;
        }
        case '小限':
            return `虚岁 ${result.age.nominalAge}`;
        case '流月':
            return parsedTargetDate?.lunarMonthLabel || '-';
        case '流日':
            return parsedTargetDate ? `${parsedTargetDate.day}日` : '-';
        case '流时':
            return result.hourly.earthlyBranch ? `${result.hourly.earthlyBranch}时` : '-';
        default:
            return '-';
    }
}
function buildZiweiHoroscopeTransitGroups(result) {
    const transitStars = result.transitStars || [];
    const formatPalace = (palaceName) => palaceName.endsWith('宫') ? palaceName : `${palaceName}宫`;
    return [
        {
            label: '吉星分布',
            items: transitStars
                .filter((entry) => ZIWEI_TRANSIT_STAR_GROUPS.吉星分布.includes(entry.starName))
                .map((entry) => `${entry.starName}(${formatPalace(entry.palaceName)})`),
        },
        {
            label: '煞星分布',
            items: transitStars
                .filter((entry) => ZIWEI_TRANSIT_STAR_GROUPS.煞星分布.includes(entry.starName))
                .map((entry) => `${entry.starName}(${formatPalace(entry.palaceName)})`),
        },
        {
            label: '桃花/文星',
            items: transitStars
                .filter((entry) => ZIWEI_TRANSIT_STAR_GROUPS['桃花/文星'].includes(entry.starName))
                .map((entry) => `${entry.starName}(${formatPalace(entry.palaceName)})`),
        },
    ];
}
export function renderZiweiHoroscopeCanonicalText(result, options = {}) {
    const detailLevel = normalizeZiweiHoroscopeDetailLevel(options.detailLevel);
    const parsedTargetDate = parseZiweiHoroscopeTargetDate(result.targetDate);
    const lines = [
        '# 紫微运限',
        '',
        '## 基本信息',
        `- 目标日期: ${result.targetDate}`,
        `- 五行局: ${result.fiveElement}`,
    ];
    if (detailLevel === 'full') {
        lines.push(`- 阳历: ${result.solarDate}`);
        lines.push(`- 农历: ${result.lunarDate}`);
        lines.push(`- 命主: ${result.soul}`);
        lines.push(`- 身主: ${result.body}`);
    }
    lines.push('');
    lines.push('## 运限叠宫与四化');
    lines.push('| 层次 | 时间段/备注 | 干支 | 落入本命宫位 | 运限四化 (禄/权/科/忌) |');
    lines.push('|------|-------------|------|--------------|-------------------------|');
    const periodRows = [
        { layer: '大限', data: result.decadal },
        { layer: '流年', data: result.yearly },
        { layer: '小限', data: result.age },
        { layer: '流月', data: result.monthly },
        { layer: '流日', data: result.daily },
        ...(detailLevel === 'full' && result.hasExplicitTargetTime && result.hourly.heavenlyStem && result.hourly.earthlyBranch
            ? [{ layer: '流时', data: result.hourly }]
            : []),
    ];
    for (const { layer, data } of periodRows) {
        lines.push(`| ${layer} | ${formatZiweiHoroscopeTimeNote(layer, result, parsedTargetDate)} | ${data.heavenlyStem}${data.earthlyBranch} | ${formatZiweiHoroscopeLandingPalace(data.palaceNames)} | ${formatZiweiHoroscopeMutagen(data.mutagen) || '-'} |`);
    }
    const transitGroups = buildZiweiHoroscopeTransitGroups(result);
    if (transitGroups.some((group) => group.items.length > 0)) {
        lines.push('');
        lines.push('## 流年星曜');
        for (const group of transitGroups) {
            if (group.items.length > 0) {
                lines.push(`- ${group.label}: ${group.items.join('、')}`);
            }
        }
    }
    if (detailLevel === 'full') {
        if (result.yearlyDecStar?.suiqian12.length) {
            lines.push('');
            lines.push('## 岁前十二星');
            lines.push(result.yearlyDecStar.suiqian12.join('、'));
        }
        if (result.yearlyDecStar?.jiangqian12.length) {
            lines.push('');
            lines.push('## 将前十二星');
            lines.push(result.yearlyDecStar.jiangqian12.join('、'));
        }
    }
    return lines.join('\n');
}
function formatZiweiFlyingStarResult(r, lines) {
    const formatPalace = (name) => {
        if (!name)
            return '无';
        return name.endsWith('宫') ? name : `${name}宫`;
    };
    if (r.type === 'fliesTo') {
        if (r.queryTarget?.fromPalace && r.queryTarget?.toPalace && r.queryTarget?.mutagens?.length) {
            lines.push(`- 判断目标: ${formatPalace(r.queryTarget.fromPalace)} -> ${formatPalace(r.queryTarget.toPalace)} [${r.queryTarget.mutagens.join('、')}]`);
        }
        lines.push(`- 结果: ${r.result ? '是' : '否'}`);
        if (r.actualFlights?.length) {
            for (const item of r.actualFlights) {
                const starSuffix = item.starName ? ` [${item.starName}星]` : '';
                lines.push(`- 实际落点: 化[${item.mutagen}] 飞入 -> ${formatPalace(item.targetPalace)}${starSuffix}`);
            }
        }
        return;
    }
    if (r.type === 'selfMutaged') {
        if (r.queryTarget?.palace && r.queryTarget?.mutagens?.length) {
            lines.push(`- 判断目标: ${formatPalace(r.queryTarget.palace)} [${r.queryTarget.mutagens.join('、')}]`);
        }
        lines.push(`- 结果: ${r.result ? '是' : '否'}`);
        return;
    }
    if (r.type === 'mutagedPlaces') {
        if (r.queryTarget?.palace)
            lines.push(`- 查询宫位: ${formatPalace(r.queryTarget.palace)}`);
        if (r.sourcePalaceGanZhi)
            lines.push(`- 本宫干支: ${r.sourcePalaceGanZhi}`);
        const places = r.actualFlights || r.result.map((item) => ({ mutagen: item.mutagen, targetPalace: item.targetPalace, starName: null }));
        if (places.length === 0) {
            lines.push('- 结果: 无');
            return;
        }
        for (const p of places) {
            const starSuffix = p.starName ? ` [${p.starName}星]` : '';
            lines.push(`- 化${p.mutagen}: ${formatPalace(p.targetPalace)}${starSuffix}`);
        }
        return;
    }
    if (r.type === 'surroundedPalaces') {
        const s = r.result;
        if (r.queryTarget?.palace)
            lines.push(`- 查询宫位: ${formatPalace(r.queryTarget.palace)}`);
        lines.push(`- 本宫: ${formatPalace(s.target.name)}`);
        lines.push(`- 对宫: ${formatPalace(s.opposite.name)}`);
        lines.push(`- 三合宫 1: ${formatPalace(s.wealth.name)}`);
        lines.push(`- 三合宫 2: ${formatPalace(s.career.name)}`);
    }
}
function mapZiweiFlyingStarQueryType(type) {
    switch (type) {
        case 'fliesTo':
            return '飞化判断';
        case 'selfMutaged':
            return '自化判断';
        case 'mutagedPlaces':
            return '四化落宫';
        case 'surroundedPalaces':
            return '三方四正';
        default:
            return type;
    }
}
export function renderZiweiFlyingStarCanonicalText(result) {
    const lines = ['# 紫微飞星'];
    for (const r of result.results) {
        lines.push('');
        lines.push(`## 查询 ${r.queryIndex + 1}`);
        lines.push(`- 查询类型: ${mapZiweiFlyingStarQueryType(r.type)}`);
        formatZiweiFlyingStarResult(r, lines);
    }
    return lines.join('\n');
}
export function renderLiuyaoCanonicalText(result) {
    const lines = ['# 六爻分析', '', '## 卦象信息'];
    if (result.question)
        lines.push(`- 问题: ${result.question}`);
    lines.push(`- 本卦: ${result.hexagramName}（${result.hexagramGong || '?'}宫·${result.hexagramElement || '?'}）`);
    if (result.guaCi)
        lines.push(`- 卦辞: ${result.guaCi}`);
    if (result.xiangCi)
        lines.push(`- 象辞: ${result.xiangCi}`);
    if (result.changedHexagramName) {
        lines.push(`- 变卦: ${result.changedHexagramName}（${result.changedHexagramGong || ''}宫·${result.changedHexagramElement || ''}）`);
        if (result.changedGuaCi)
            lines.push(`- 变卦卦辞: ${result.changedGuaCi}`);
        if (result.changedXiangCi)
            lines.push(`- 变卦象辞: ${result.changedXiangCi}`);
        for (const yao of (result.fullYaos || []).filter((item) => item.isChanging && item.yaoCi)) {
            lines.push(`- ${traditionalYaoName(yao.position, yao.type)}爻辞: ${yao.yaoCi}`);
        }
    }
    else {
        lines.push('- 变卦: 无');
    }
    if (result.nuclearHexagram) {
        lines.push(`- 互卦: ${result.nuclearHexagram.name}`);
        if (result.nuclearHexagram.guaCi)
            lines.push(`- 互卦卦辞: ${result.nuclearHexagram.guaCi}`);
        if (result.nuclearHexagram.xiangCi)
            lines.push(`- 互卦象辞: ${result.nuclearHexagram.xiangCi}`);
    }
    if (result.oppositeHexagram) {
        lines.push(`- 错卦: ${result.oppositeHexagram.name}`);
        if (result.oppositeHexagram.guaCi)
            lines.push(`- 错卦卦辞: ${result.oppositeHexagram.guaCi}`);
        if (result.oppositeHexagram.xiangCi)
            lines.push(`- 错卦象辞: ${result.oppositeHexagram.xiangCi}`);
    }
    if (result.reversedHexagram) {
        lines.push(`- 综卦: ${result.reversedHexagram.name}`);
        if (result.reversedHexagram.guaCi)
            lines.push(`- 综卦卦辞: ${result.reversedHexagram.guaCi}`);
        if (result.reversedHexagram.xiangCi)
            lines.push(`- 综卦象辞: ${result.reversedHexagram.xiangCi}`);
    }
    if (result.guaShen) {
        const guaShenYao = (result.fullYaos || []).find((y) => y.position === result.guaShen.linePosition);
        const posLabel = typeof result.guaShen.linePosition === 'number'
            ? (guaShenYao ? `${traditionalYaoName(result.guaShen.linePosition, guaShenYao.type)}爻` : `${result.guaShen.linePosition}爻`)
            : '';
        const extra = [posLabel, result.guaShen.absent ? '飞伏' : ''].filter(Boolean).join('，');
        lines.push(`- 卦身: ${result.guaShen.branch}${extra ? `（${extra}）` : ''}`);
    }
    else {
        lines.push('- 卦身: 无');
    }
    lines.push('');
    const gz = result.ganZhiTime;
    lines.push('| 柱 | 干支 | 空亡 |');
    lines.push('|------|------|------|');
    lines.push(`| 年 | ${gz.year.gan}${gz.year.zhi} | ${result.kongWangByPillar.year.kongDizhi.join(' ')} |`);
    lines.push(`| 月 | ${gz.month.gan}${gz.month.zhi} | ${result.kongWangByPillar.month.kongDizhi.join(' ')} |`);
    lines.push(`| 日 | ${gz.day.gan}${gz.day.zhi} | ${result.kongWang.kongDizhi.join(' ')} |`);
    lines.push(`| 时 | ${gz.hour.gan}${gz.hour.zhi} | ${result.kongWangByPillar.hour.kongDizhi.join(' ')} |`);
    lines.push('');
    lines.push('## 六爻排盘');
    lines.push('');
    const sortedYaos = sortYaosDescending(result.fullYaos || []);
    const globalShenShaSet = new Set(result.globalShenSha || []);
    const hasKongCol = sortedYaos.some((y) => y.kongWangState && y.kongWangState !== 'not_kong');
    const hasChangShengCol = sortedYaos.some((y) => y.changSheng?.stage);
    const hasShenShaCol = sortedYaos.some((y) => y.shenSha?.some((s) => !globalShenShaSet.has(s)));
    const hasBianChuCol = sortedYaos.some((y) => y.isChanging && y.changedYao);
    const hasFuShenCol = sortedYaos.some((y) => y.fuShen);
    const yaoHeader = ['爻位', '六亲', '六神', '纳甲', '动静'];
    if (hasKongCol)
        yaoHeader.push('空亡');
    if (hasChangShengCol)
        yaoHeader.push('长生');
    if (hasShenShaCol)
        yaoHeader.push('神煞');
    if (hasBianChuCol)
        yaoHeader.push('变出');
    if (hasFuShenCol)
        yaoHeader.push('伏神');
    lines.push(`| ${yaoHeader.join(' | ')} |`);
    lines.push(`|${yaoHeader.map(() => '------').join('|')}|`);
    for (const yao of sortedYaos) {
        const shiYing = yao.isShiYao ? '·世' : yao.isYingYao ? '·应' : '';
        const cells = [
            `${traditionalYaoName(yao.position, yao.type)}${shiYing}`,
            yao.liuQin,
            yao.liuShen,
            `${yao.naJia}${yao.wuXing}(${WANG_SHUAI_LABELS[yao.strength.wangShuai]})`,
            yao.movementLabel,
        ];
        if (hasKongCol) {
            const kl = yao.kongWangState && yao.kongWangState !== 'not_kong' ? KONG_WANG_LABELS[yao.kongWangState] : '';
            cells.push(kl || '-');
        }
        if (hasChangShengCol)
            cells.push(yao.changSheng?.stage || '-');
        if (hasShenShaCol) {
            const local = yao.shenSha?.filter((s) => !globalShenShaSet.has(s)) || [];
            cells.push(local.length ? local.join('、') : '-');
        }
        if (hasBianChuCol) {
            if (yao.isChanging && yao.changedYao) {
                const rel = yao.changedYao.relation ? `(${yao.changedYao.relation})` : '';
                cells.push(`→${yao.changedYao.liuQin}${yao.changedYao.naJia}${yao.changedYao.wuXing}${rel}`);
            }
            else {
                cells.push('-');
            }
        }
        if (hasFuShenCol) {
            if (yao.fuShen) {
                const rel = yao.fuShen.relation ? `(${yao.fuShen.relation})` : '';
                cells.push(`${yao.fuShen.liuQin}${yao.fuShen.naJia}${yao.fuShen.wuXing}${rel}`);
            }
            else {
                cells.push('-');
            }
        }
        lines.push(`| ${cells.join(' | ')} |`);
    }
    lines.push('');
    if (result.yongShen.length > 0) {
        lines.push('## 用神分析');
        lines.push('');
        const yaoNameMap = new Map();
        for (const yao of sortedYaos)
            yaoNameMap.set(yao.position, traditionalYaoName(yao.position, yao.type));
        const posLabel = (pos) => (pos ? `${yaoNameMap.get(pos) || pos}爻` : '');
        const shenSystemMap = buildShenSystemMap(result.shenSystemByYongShen || []);
        const timeRecMap = new Map();
        for (const item of result.timeRecommendations || []) {
            const list = timeRecMap.get(item.targetLiuQin) || [];
            list.push(item);
            timeRecMap.set(item.targetLiuQin, list);
        }
        for (const group of result.yongShen) {
            const statusSuffix = group.selectionStatus !== 'resolved' ? `（${YONG_SHEN_STATUS_LABELS[group.selectionStatus] || group.selectionStatus}）` : '';
            lines.push(`### ${group.targetLiuQin}${statusSuffix}`);
            const selected = group.selected;
            const selectedExtra = [
                selected.changedNaJia ? `变出=${selected.changedNaJia}` : null,
                selected.huaType ? `化变=${selected.huaType}` : null,
            ].filter(Boolean).join('，');
            const posStr = posLabel(selected.position);
            const mainPrefix = posStr || selected.liuQin;
            lines.push(`- ${mainPrefix}${selected.naJia ? ` ${selected.naJia}` : ''}${selectedExtra ? `（${selectedExtra}）` : ''}，${selected.strengthLabel}，${selected.movementLabel}`);
            if (group.selectionNote && group.selectionStatus !== 'resolved')
                lines.push(`- 说明: ${group.selectionNote}`);
            if (selected.evidence?.length)
                lines.push(`- 依据: ${selected.evidence.join('、')}`);
            if (group.candidates?.length) {
                lines.push(`- 并看: ${group.candidates.map((candidate) => {
                    const candidateExtra = [
                        candidate.changedNaJia ? `变出=${candidate.changedNaJia}` : null,
                        candidate.huaType ? `化变=${candidate.huaType}` : null,
                    ].filter(Boolean).join('，');
                    const cPos = posLabel(candidate.position);
                    const cPrefix = cPos || candidate.liuQin;
                    return `${cPrefix}${candidate.naJia ? ` ${candidate.naJia}` : ''}${candidateExtra ? `（${candidateExtra}）` : ''}${candidate.evidence?.length ? `：${candidate.evidence.join('、')}` : ''}`;
                }).join('；')}`);
            }
            const system = shenSystemMap.get(group.targetLiuQin);
            const shenParts = formatShenSystemParts(system);
            if (shenParts.length > 0)
                lines.push(`- 神系: ${shenParts.join('，')}`);
            const recs = timeRecMap.get(group.targetLiuQin);
            if (recs?.length) {
                for (const item of recs) {
                    lines.push(`- 应期: ${item.trigger}${item.basis?.length ? `（${item.basis.join('、')}）` : ''}，${item.description}`);
                }
            }
            lines.push('');
        }
    }
    const guaLevelParts = formatGuaLevelLines(result).map((line) => `- ${line}`);
    if (guaLevelParts.length > 0) {
        lines.push('## 卦级分析');
        lines.push('');
        lines.push(...guaLevelParts);
        lines.push('');
    }
    if (result.warnings?.length) {
        lines.push('## 凶吉警告');
        lines.push('');
        for (const warning of result.warnings)
            lines.push(`- ${warning}`);
        lines.push('');
    }
    return lines.join('\n');
}
function buildLiuyaoSafeTextPosition(position, fullYaos) {
    if (!position)
        return undefined;
    const attached = fullYaos.find((yao) => yao.position === position);
    return attached ? `${traditionalYaoName(position, attached.type)}爻` : `${position}爻`;
}
function buildLiuyaoSafeInteractionText(result) {
    const lines = [];
    const sourceIndex = new Map();
    for (const yao of result.fullYaos || []) {
        const positionLabel = buildLiuyaoSafeTextPosition(yao.position, result.fullYaos) || `${yao.position}爻`;
        if (yao.isChanging) {
            sourceIndex.set(`moving:${yao.naJia}`, `${yao.naJia}(动爻 ${positionLabel})`);
        }
        if (yao.changedYao) {
            sourceIndex.set(`changed:${yao.changedYao.naJia}`, `${yao.changedYao.naJia}(变爻 ${positionLabel})`);
        }
    }
    sourceIndex.set(`month:${result.ganZhiTime.month.zhi}`, `${result.ganZhiTime.month.zhi}(月建)`);
    sourceIndex.set(`day:${result.ganZhiTime.day.zhi}`, `${result.ganZhiTime.day.zhi}(日建)`);
    if (result.sanHeAnalysis?.banHe?.length) {
        for (const item of result.sanHeAnalysis.banHe) {
            const participants = item.branches.map((branch) => sourceIndex.get(`changed:${branch}`)
                || sourceIndex.get(`moving:${branch}`)
                || sourceIndex.get(`month:${branch}`)
                || sourceIndex.get(`day:${branch}`)
                || branch);
            lines.push(`- 半合: ${participants.join(' + ')} -> ${item.result}`);
        }
    }
    if (result.sanHeAnalysis?.fullSanHeList?.length) {
        for (const item of result.sanHeAnalysis.fullSanHeList) {
            const positions = item.positions?.map((position) => buildLiuyaoSafeTextPosition(position, result.fullYaos) || `${position}爻`) || [];
            lines.push(`- 三合: ${item.name} -> ${item.result}${positions.length ? ` (${positions.join('、')})` : ''}`);
        }
    }
    if (result.chongHeTransition?.type === 'chong_to_he') {
        lines.push('- 转换: 冲转合');
    }
    else if (result.chongHeTransition?.type === 'he_to_chong') {
        lines.push('- 转换: 合转冲');
    }
    if (result.guaFanFuYin?.isFuYin)
        lines.push('- 共振: 伏吟');
    if (result.guaFanFuYin?.isFanYin)
        lines.push('- 共振: 反吟');
    return lines;
}
function mapLiuyaoRelationLabel(label) {
    if (!label || label === '平')
        return undefined;
    return label;
}
export function renderLiuyaoAISafeText(result) {
    return renderLiuyaoLevelText(result, { detailLevel: 'default' });
}
export function renderLiuyaoLevelText(result, options) {
    const requested = options?.detailLevel;
    const detailLevel = requested === 'more' || requested === 'facts'
        ? 'more'
        : requested === 'full' || requested === 'debug'
            ? 'full'
            : 'default';
    const lines = ['# 六爻盘面', '', '## 卦盘总览'];
    if (result.question)
        lines.push(`- 问题: ${result.question}`);
    lines.push(`- 本卦: ${result.hexagramName}（${result.hexagramGong || '?'}宫·${result.hexagramElement || '?'}）`);
    if (result.guaCi) {
        lines.push(`- 本卦卦辞: ${result.guaCi}`);
    }
    if (result.changedHexagramName) {
        const changedMeta = result.changedHexagramGong || result.changedHexagramElement
            ? `（${result.changedHexagramGong || ''}宫·${result.changedHexagramElement || ''}）`
            : '';
        lines.push(`- 变卦: ${result.changedHexagramName}${changedMeta}`);
        if (result.changedGuaCi) {
            lines.push(`- 变卦卦辞: ${result.changedGuaCi}`);
        }
    }
    const changing = (result.fullYaos || [])
        .filter((item) => item.isChanging)
        .map((yao) => traditionalYaoName(yao.position, yao.type));
    if (changing.length > 0) {
        lines.push(`- 动爻: ${changing.join('、')}`);
    }
    for (const yao of (result.fullYaos || []).filter((item) => item.isChanging && item.yaoCi)) {
        lines.push(`- ${traditionalYaoName(yao.position, yao.type)}爻辞: ${yao.yaoCi}`);
    }
    if (detailLevel === 'more' || detailLevel === 'full') {
        if (result.guaShen) {
            const guaShenPos = result.guaShen.linePosition ? buildLiuyaoSafeTextPosition(result.guaShen.linePosition, result.fullYaos) : '';
            lines.push(`- 卦身: ${result.guaShen.branch}${guaShenPos ? `（${guaShenPos}）` : ''}`);
        }
        if (result.nuclearHexagram)
            lines.push(`- 互卦: ${result.nuclearHexagram.name}`);
        if (result.oppositeHexagram)
            lines.push(`- 错卦: ${result.oppositeHexagram.name}`);
        if (result.reversedHexagram)
            lines.push(`- 综卦: ${result.reversedHexagram.name}`);
        if (result.globalShenSha?.length)
            lines.push(`- 全局神煞: ${result.globalShenSha.join('、')}`);
        lines.push('');
    }
    const gz = result.ganZhiTime;
    lines.push('## 时间信息');
    lines.push('| 柱 | 干支 | 空亡 |');
    lines.push('|------|------|------|');
    lines.push(`| 年 | ${gz.year.gan}${gz.year.zhi} | ${result.kongWangByPillar.year.kongDizhi.join(' ')} |`);
    lines.push(`| 月 | ${gz.month.gan}${gz.month.zhi} | ${result.kongWangByPillar.month.kongDizhi.join(' ')} |`);
    lines.push(`| 日 | ${gz.day.gan}${gz.day.zhi} | ${result.kongWang.kongDizhi.join(' ')} |`);
    lines.push(`| 时 | ${gz.hour.gan}${gz.hour.zhi} | ${result.kongWangByPillar.hour.kongDizhi.join(' ')} |`);
    lines.push('');
    const boardLines = sortYaosDescending(result.fullYaos || []);
    if (boardLines.length > 0) {
        lines.push('## 六爻排盘');
        const header = ['爻位', '六神'];
        if (detailLevel === 'more' || detailLevel === 'full')
            header.push('神煞');
        header.push('伏神', '本卦六亲/干支');
        if (detailLevel === 'full')
            header.push('旺衰', '动静', '空亡');
        header.push('变出');
        if (detailLevel === 'full')
            header.push('化变');
        header.push('世应');
        lines.push(`| ${header.join(' | ')} |`);
        lines.push(`|${header.map(() => '------').join('|')}|`);
        for (const yao of boardLines) {
            const fuShen = yao.fuShen ? `${yao.fuShen.liuQin} ${yao.fuShen.naJia}${yao.fuShen.wuXing}` : '-';
            const mainLine = `${yao.liuQin} ${yao.naJia}${yao.wuXing}`;
            const changedTo = yao.changedYao ? `${yao.changedYao.liuQin} ${yao.changedYao.naJia}${yao.changedYao.wuXing}` : '-';
            const shiYing = yao.isShiYao ? '世' : yao.isYingYao ? '应' : '-';
            const row = [traditionalYaoName(yao.position, yao.type), yao.liuShen];
            if (detailLevel === 'more' || detailLevel === 'full')
                row.push(yao.shenSha?.length ? yao.shenSha.join('、') : '-');
            row.push(fuShen, mainLine);
            if (detailLevel === 'full') {
                row.push(WANG_SHUAI_LABELS[yao.strength.wangShuai], yao.movementLabel, yao.kongWangState && yao.kongWangState !== 'not_kong' ? (KONG_WANG_LABELS[yao.kongWangState] || yao.kongWangState) : '-');
            }
            row.push(changedTo);
            if (detailLevel === 'full')
                row.push(mapLiuyaoRelationLabel(yao.changedYao?.relation) || '-');
            row.push(shiYing);
            lines.push(`| ${row.join(' | ')} |`);
        }
        lines.push('');
    }
    const interactions = buildLiuyaoSafeInteractionText(result);
    if (interactions.length > 0) {
        lines.push('## 卦象关系', '');
        lines.push(...interactions);
        if (detailLevel === 'full') {
            if (result.liuChongGuaInfo)
                lines.push(`- 六冲卦: ${result.liuChongGuaInfo.isLiuChongGua ? '是' : '否'}`);
            if (result.liuHeGuaInfo)
                lines.push(`- 六合卦: ${result.liuHeGuaInfo.isLiuHeGua ? '是' : '否'}`);
            if (result.chongHeTransition?.type && result.chongHeTransition.type !== 'none') {
                lines.push(`- 冲合转换: ${result.chongHeTransition.type === 'chong_to_he' ? '冲转合' : '合转冲'}`);
            }
            const resonanceFlags = [
                ...(result.guaFanFuYin?.isFanYin ? ['反吟'] : []),
                ...(result.guaFanFuYin?.isFuYin ? ['伏吟'] : []),
            ];
            if (resonanceFlags.length > 0) {
                lines.push(`- 反吟伏吟: ${resonanceFlags.join('、')}`);
            }
        }
        lines.push('');
    }
    return lines.join('\n').trimEnd();
}
export function renderTarotCanonicalText(result, options = {}) {
    const detailLevel = normalizeTarotDetailLevel(options.detailLevel);
    const birthDate = options.birthDate?.trim() || result.birthDate;
    const lines = ['# 塔罗占卜', '', '## 问卜设定', `- 牌阵: ${result.spreadName}`];
    if (result.question)
        lines.push(`- 问题: ${result.question}`);
    if (detailLevel === 'full' && birthDate)
        lines.push(`- 出生日期: ${birthDate}`);
    if (detailLevel === 'full' && result.seed)
        lines.push(`- 随机种子: ${result.seed}`);
    lines.push('');
    // Dynamic columns for card table
    const hasElement = result.cards.some((c) => c.element);
    const hasAstro = result.cards.some((c) => c.astrologicalCorrespondence);
    const header = ['位置', '塔罗牌', '状态'];
    if (hasElement)
        header.push('元素');
    if (hasAstro)
        header.push('星象');
    header.push('核心基调');
    lines.push('## 牌阵展开');
    lines.push('');
    lines.push(`| ${header.join(' | ')} |`);
    lines.push(`|${header.map(() => '------').join('|')}|`);
    for (const card of result.cards) {
        const isReversed = card.orientation === 'reversed';
        const direction = isReversed ? '逆位' : '正位';
        const toneKeywords = isReversed && card.reversedKeywords?.length ? card.reversedKeywords : card.card.keywords;
        const row = [card.position, card.card.nameChinese, direction];
        if (hasElement)
            row.push(card.element || '-');
        if (hasAstro)
            row.push(card.astrologicalCorrespondence || '-');
        row.push(toneKeywords.join('、'));
        lines.push(`| ${row.join(' | ')} |`);
    }
    lines.push('');
    if (detailLevel === 'full' && result.numerology) {
        lines.push('## 求问者生命数字');
        lines.push('');
        const nCards = [
            { label: '人格牌', card: result.numerology.personalityCard },
            { label: '灵魂牌', card: result.numerology.soulCard },
            { label: `年度牌(${result.numerology.yearlyCard.year})`, card: result.numerology.yearlyCard },
        ];
        lines.push('| 维度 | 对应塔罗 | 元素 | 星象 | 背景基调 |');
        lines.push('|------|----------|------|------|----------|');
        for (const { label, card } of nCards) {
            lines.push(`| ${label} | ${card.nameChinese} | ${card.element || '-'} | ${card.astrologicalCorrespondence || '-'} | ${card.keywords?.join('、') || '-'} |`);
        }
    }
    return lines.join('\n');
}
function formatQimenPalaceStateText(palace, dayKongPalaces, hourKongPalaces) {
    if (palace.palaceIndex === 5)
        return '(寄宫参看对应宫位)';
    const states = [
        dayKongPalaces.has(palace.palaceIndex) ? '日空' : null,
        hourKongPalaces.has(palace.palaceIndex) ? '时空' : null,
        palace.isYiMa ? '驿马' : null,
        palace.isRuMu ? '入墓' : null,
    ].filter(Boolean).join('、');
    return states || '-';
}
function formatQimenMonthPhaseLine(monthPhase) {
    const phaseGroups = new Map();
    for (const [stem, phase] of Object.entries(monthPhase)) {
        if (!phase)
            continue;
        phaseGroups.set(phase, [...(phaseGroups.get(phase) || []), stem]);
    }
    if (phaseGroups.size === 0)
        return null;
    const parts = [];
    for (const [phase, stems] of phaseGroups.entries()) {
        const stemsWithElement = stems.map((stem) => `${stem}${GAN_WUXING[stem] || ''}`).join('');
        parts.push(`${phase}：${stemsWithElement}`);
    }
    return parts.join('、');
}
function formatQimenPalaceName(palace) {
    return `${palace.palaceName}${palace.palaceIndex}(${palace.element || '-'})`;
}
export function renderQimenCanonicalText(result, options = {}) {
    const detailLevel = normalizeQimenDetailLevel(options.detailLevel);
    const dunText = result.dunType === 'yang' ? '阳遁' : '阴遁';
    const juLabel = `${dunText}${result.juNumber}局`;
    const dayKongPalaces = new Set(result.kongWang.dayKong.palaces);
    const hourKongPalaces = new Set(result.kongWang.hourKong.palaces);
    const lines = [
        '# 奇门遁甲排盘',
        '',
        '## 基本信息',
        ...(result.question ? [`- 占问: ${result.question}`] : []),
        `- 四柱: ${result.siZhu.year} ${result.siZhu.month} ${result.siZhu.day} ${result.siZhu.hour}`,
        `- 节气: ${result.dateInfo.solarTerm} (${juLabel} · ${result.yuan})`,
        `- 旬首: ${result.xunShou}`,
        `- 值符 (大局趋势): ${result.zhiFu.star}`,
        `- 值使 (执行枢纽): ${result.zhiShi.gate}`,
    ];
    if (detailLevel === 'full') {
        lines.push(`- 公历: ${result.dateInfo.solarDate}`);
        lines.push(`- 农历: ${result.dateInfo.lunarDate}`);
        if (result.dateInfo.solarTermRange)
            lines.push(`- 节气范围: ${result.dateInfo.solarTermRange}`);
        lines.push(`- 盘式: ${result.panType}`);
        lines.push(`- 定局法: ${result.juMethod}`);
    }
    lines.push('');
    lines.push('## 九宫盘');
    lines.push('');
    if (detailLevel === 'full') {
        lines.push('| 宫位(五行) | 八神 | 九星(五行) | 八门(五行) | 天盘天干 | 地盘天干 | 宫位状态 | 方位 | 格局 |');
        lines.push('|------------|------|------------|------------|----------|----------|----------|------|------|');
    }
    else {
        lines.push('| 宫位(五行) | 八神 | 九星(五行) | 八门(五行) | 天盘天干 | 地盘天干 | 宫位状态 |');
        lines.push('|------------|------|------------|------------|----------|----------|----------|');
    }
    for (const palace of result.palaces) {
        const starLabel = palace.star ? `${palace.star}(${palace.starElement || ''})` : '-';
        const gateLabel = palace.gate ? `${palace.gate}(${palace.gateElement || ''})` : '-';
        const row = [
            formatQimenPalaceName(palace),
            palace.deity || '-',
            starLabel,
            gateLabel,
            palace.heavenStem || '-',
            palace.earthStem || '-',
            formatQimenPalaceStateText(palace, dayKongPalaces, hourKongPalaces),
        ];
        if (detailLevel === 'full') {
            row.push(palace.direction || '-');
            row.push(palace.formations.length > 0 ? palace.formations.join('、') : '-');
        }
        lines.push(`| ${row.join(' | ')} |`);
    }
    if (detailLevel === 'full') {
        lines.push('');
        lines.push('## 补充信息');
        lines.push('');
        lines.push(`- 日空: ${result.kongWang.dayKong.branches.join('、') || '-'} (${result.kongWang.dayKong.palaces.map((index) => `${result.palaces[index - 1]?.palaceName || ''}${index}`).join('、') || '-'})`);
        lines.push(`- 时空: ${result.kongWang.hourKong.branches.join('、') || '-'} (${result.kongWang.hourKong.palaces.map((index) => `${result.palaces[index - 1]?.palaceName || ''}${index}`).join('、') || '-'})`);
        lines.push(`- 驿马: ${result.yiMa.branch || '-'}${result.yiMa.palace ? ` (${result.palaces[result.yiMa.palace - 1]?.palaceName || ''}${result.yiMa.palace})` : ''}`);
        const monthPhaseLine = result.monthPhase ? formatQimenMonthPhaseLine(result.monthPhase) : null;
        if (monthPhaseLine) {
            lines.push('');
            lines.push('## 月令旺衰');
            lines.push('');
            lines.push(monthPhaseLine);
        }
        if (result.globalFormations.length > 0) {
            lines.push('');
            lines.push('## 全局格局');
            lines.push('');
            for (const formation of result.globalFormations) {
                lines.push(`- ${formation}`);
            }
        }
    }
    return lines.join('\n');
}
function formatDaliurenCoreStatus(result) {
    return `空亡(${result.dateInfo.kongWang.join(', ')}) / 驿马(${result.dateInfo.yiMa}) / 丁马(${result.dateInfo.dingMa}) / 天马(${result.dateInfo.tianMa})`;
}
function formatDaliurenDiPanLabel(item) {
    const suffix = [item.wuXing, item.wangShuai].filter(Boolean).join('·');
    return suffix ? `${item.diZhi}(${suffix})` : item.diZhi;
}
export function renderDaliurenCanonicalText(result, options = {}) {
    const detailLevel = normalizeDaliurenDetailLevel(options.detailLevel);
    const diurnalLabel = result.dateInfo.diurnal ? '昼占' : '夜占';
    const siKeLabels = ['一课 (干上)', '二课 (干阴)', '三课 (支上)', '四课 (支阴)'];
    const siKeData = [result.siKe.yiKe, result.siKe.erKe, result.siKe.sanKe, result.siKe.siKe];
    const sanChuanLabels = ['初传 (发端)', '中传 (移易)', '末传 (归计)'];
    const sanChuanData = [result.sanChuan.chu, result.sanChuan.zhong, result.sanChuan.mo];
    const lines = [
        '# 大六壬排盘',
        '',
        '## 基本信息',
        ...(result.question ? [`- 占事: ${result.question}`] : []),
        `- 占测时间: ${result.dateInfo.solarDate} (${diurnalLabel})`,
        `- 四柱: ${result.dateInfo.bazi}`,
        `- 课式: ${result.keName} / ${result.keTi.method}课`,
        `- 月将: ${result.dateInfo.yueJiang}`,
        `- 关键状态: ${formatDaliurenCoreStatus(result)}`,
    ];
    if (detailLevel === 'full') {
        if (result.dateInfo.lunarDate)
            lines.push(`- 农历: ${result.dateInfo.lunarDate}`);
        lines.push(`- 月将名称: ${result.dateInfo.yueJiangName}`);
        if (result.benMing)
            lines.push(`- 本命: ${result.benMing}`);
        if (result.xingNian)
            lines.push(`- 行年: ${result.xingNian}`);
        if (result.keTi.extraTypes.length > 0)
            lines.push(`- 附加课体: ${result.keTi.extraTypes.join('、')}`);
    }
    lines.push('');
    lines.push('## 四课 (主客对立)');
    lines.push('');
    lines.push('| 课别 | 乘将 | 上神 (天盘) | 下神 (地盘) |');
    lines.push('|---|---|---|---|');
    for (let index = 0; index < siKeLabels.length; index += 1) {
        const item = siKeData[index];
        lines.push(`| ${siKeLabels[index]} | ${item[1] || '-'} | ${item[0]?.[0] || '-'} | ${item[0]?.[1] || '-'} |`);
    }
    lines.push('');
    lines.push('## 三传 (事态推演)');
    lines.push('');
    lines.push('| 传序 | 地支 | 天将 | 六亲 | 遁干 |');
    lines.push('|---|---|---|---|---|');
    for (let index = 0; index < sanChuanLabels.length; index += 1) {
        const item = sanChuanData[index];
        lines.push(`| ${sanChuanLabels[index]} | ${item[0] || '-'} | ${item[1] || '-'} | ${item[2] || '-'} | ${item[3] || '-'} |`);
    }
    lines.push('');
    if (result.gongInfos.length > 0) {
        lines.push('## 天地盘全图 (十二宫)');
        lines.push('');
        if (detailLevel === 'full') {
            lines.push('| 地盘 (五行·状态) | 天盘 (月将) | 天将 | 遁干 | 长生十二神 | 建除 |');
            lines.push('|---|---|---|---|---|---|');
        }
        else {
            lines.push('| 地盘 (五行·状态) | 天盘 (月将) | 天将 | 遁干 | 长生十二神 |');
            lines.push('|---|---|---|---|---|');
        }
        for (const item of result.gongInfos) {
            const row = [
                formatDaliurenDiPanLabel(item),
                item.tianZhi || '-',
                item.tianJiang || '-',
                item.dunGan || '-',
                item.changSheng || '-',
            ];
            if (detailLevel === 'full')
                row.push(item.jianChu || '-');
            lines.push(`| ${row.join(' | ')} |`);
        }
    }
    return lines.join('\n');
}
export function renderFortuneCanonicalText(result, options = {}) {
    const detailLevel = normalizeFortuneDetailLevel(options.detailLevel);
    const { date, dayInfo, tenGod, almanac } = result;
    const lines = [
        '# 每日黄历',
        '',
        '## 基础与个性化坐标',
        `- 日期: ${date} (${dayInfo.ganZhi}日)`,
    ];
    if (tenGod)
        lines.push(`- 流日十神 (针对命主): ${tenGod}`);
    if (almanac) {
        lines.push('');
        lines.push('## 传统黄历基调');
        lines.push(`- 农历: ${almanac.lunarDate || `${almanac.lunarMonth}${almanac.lunarDay}`} (生肖${almanac.zodiac})`);
        if (almanac.solarTerm)
            lines.push(`- 节气: ${almanac.solarTerm}`);
        if (almanac.chongSha)
            lines.push(`- 冲煞: ${almanac.chongSha.replace(' 煞', ' / 煞')}`);
        if (almanac.pengZuBaiJi)
            lines.push(`- 彭祖百忌: ${almanac.pengZuBaiJi.replace(/\s+/gu, ' / ')}`);
        if (almanac.taiShen)
            lines.push(`- 胎神占方: ${almanac.taiShen}`);
        if (almanac.dayNineStar)
            lines.push(`- 日九星: ${almanac.dayNineStar.description}`);
        lines.push('');
        lines.push('## 择日宜忌');
        lines.push(`- 宜: ${almanac.suitable.join(', ') || '无'}`);
        lines.push(`- 忌: ${almanac.avoid.join(', ') || '无'}`);
        if ((almanac.jishen && almanac.jishen.length > 0) || (almanac.xiongsha && almanac.xiongsha.length > 0)) {
            lines.push('');
            lines.push('## 神煞参考 (择日背景)');
            if (almanac.jishen && almanac.jishen.length > 0) {
                lines.push(`- 吉神宜趋: ${almanac.jishen.join(', ')}`);
            }
            if (almanac.xiongsha && almanac.xiongsha.length > 0) {
                lines.push(`- 凶煞宜忌: ${almanac.xiongsha.join(', ')}`);
            }
        }
        if (detailLevel === 'full') {
            lines.push('');
            lines.push('## 方位信息');
            lines.push(`- 财神: ${almanac.directions.caiShen}`);
            lines.push(`- 喜神: ${almanac.directions.xiShen}`);
            lines.push(`- 福神: ${almanac.directions.fuShen}`);
            lines.push(`- 阳贵人: ${almanac.directions.yangGui}`);
            lines.push(`- 阴贵人: ${almanac.directions.yinGui}`);
            lines.push('');
            lines.push('## 值日信息');
            if (almanac.dayOfficer)
                lines.push(`- 建除十二值星: ${almanac.dayOfficer}`);
            if (almanac.tianShen)
                lines.push(`- 天神: ${almanac.tianShen}${almanac.tianShenType || almanac.tianShenLuck ? ` (${[almanac.tianShenType, almanac.tianShenLuck].filter(Boolean).join(' / ')})` : ''}`);
            if (almanac.lunarMansion)
                lines.push(`- 二十八星宿: ${almanac.lunarMansion}${almanac.lunarMansionLuck ? ` (${almanac.lunarMansionLuck})` : ''}`);
            if (almanac.lunarMansionSong)
                lines.push(`- 星宿歌诀: ${almanac.lunarMansionSong}`);
            if (almanac.nayin)
                lines.push(`- 日柱纳音: ${almanac.nayin}`);
            if (almanac.hourlyFortune.length > 0) {
                lines.push('');
                lines.push('## 时辰吉凶');
                lines.push('| 时辰 | 天神 | 类型 | 吉凶 | 冲煞 | 宜 | 忌 |');
                lines.push('|------|------|------|------|------|------|------|');
                for (const hour of almanac.hourlyFortune) {
                    lines.push(`| ${hour.ganZhi || '-'} | ${hour.tianShen || '-'} | ${hour.tianShenType || '-'} | ${hour.tianShenLuck || '-'} | ${[hour.chong, hour.sha].filter(Boolean).join(' / ') || '-'} | ${hour.suitable.join('、') || '-'} | ${hour.avoid.join('、') || '-'} |`);
                }
            }
        }
    }
    return lines.join('\n');
}
export function renderDayunCanonicalText(result, options = {}) {
    const detailLevel = normalizeBaziDetailLevel(options.detailLevel);
    if (detailLevel === 'full') {
        return renderDayunCanonicalFullText(result);
    }
    return renderDayunCanonicalDefaultText(result);
}
function renderDayunCanonicalDefaultText(result) {
    const lines = [
        '# 大运流年',
        '',
        '## 起运信息',
        '',
        `- 起运年龄：${result.startAge}岁`,
        `- 起运详情：${result.startAgeDetail}`,
        '',
        '## 大运列表',
        '',
        '| 起运年份 | 起运年龄 | 干支 | 天干十神 | 藏干 |',
        '|----------|----------|------|----------|------|',
    ];
    for (const dayun of result.list) {
        const hiddenStemsText = dayun.hiddenStems && dayun.hiddenStems.length > 0
            ? dayun.hiddenStems.map((hs) => `${hs.stem}(${hs.tenGod})`).join(' ')
            : '-';
        lines.push(`| ${dayun.startYear} | ${dayun.startAge}岁 | ${dayun.ganZhi} | ${dayun.tenGod || '-'} | ${hiddenStemsText} |`);
    }
    return lines.join('\n');
}
function renderDayunCanonicalFullText(result) {
    const lines = [
        '# 大运流年',
        '',
        '## 起运信息',
        '',
        `- 起运年龄：${result.startAge}岁`,
        `- 起运详情：${result.startAgeDetail}`,
    ];
    if (result.xiaoYun.length > 0) {
        lines.push('');
        lines.push('## 小运');
        lines.push('');
        lines.push('| 年龄 | 干支 | 天干十神 |');
        lines.push('|------|------|----------|');
        for (const item of result.xiaoYun) {
            lines.push(`| ${item.age}岁 | ${item.ganZhi} | ${item.tenGod || '-'} |`);
        }
    }
    lines.push('');
    lines.push('## 大运列表');
    lines.push('');
    lines.push('| 起运年份 | 起运年龄 | 干支 | 天干十神 | 地支主气十神 | 藏干 | 地势 | 纳音 | 神煞 | 原局关系 |');
    lines.push('|----------|----------|------|----------|--------------|------|------|------|------|----------|');
    for (const dayun of result.list) {
        const hiddenStemsText = dayun.hiddenStems.length > 0
            ? dayun.hiddenStems.map((hs) => `${hs.stem}(${hs.tenGod})`).join('、')
            : '-';
        const shenShaText = dayun.shenSha.length > 0 ? dayun.shenSha.join('、') : '-';
        const relationText = dayun.branchRelations.length > 0 ? dayun.branchRelations.map((item) => item.description).join('；') : '-';
        lines.push(`| ${dayun.startYear} | ${dayun.startAge}岁 | ${dayun.ganZhi} | ${dayun.tenGod || '-'} | ${dayun.branchTenGod || '-'} | ${hiddenStemsText} | ${dayun.diShi || '-'} | ${dayun.naYin || '-'} | ${shenShaText} | ${relationText} |`);
    }
    for (const [index, dayun] of result.list.entries()) {
        const endYear = result.list[index + 1]?.startYear ? result.list[index + 1].startYear - 1 : dayun.startYear + 9;
        lines.push('');
        lines.push(`### ${dayun.startYear}-${endYear} ${dayun.ganZhi}`);
        lines.push(`- 起运年龄: ${dayun.startAge}岁`);
        if (dayun.branchRelations.length > 0) {
            lines.push(`- 原局关系: ${dayun.branchRelations.map((item) => item.description).join('；')}`);
        }
        lines.push('');
        lines.push('| 流年 | 年龄 | 干支 | 天干十神 | 藏干 | 地势 | 纳音 | 神煞 | 地支关系 | 太岁 |');
        lines.push('|------|------|------|----------|------|------|------|------|----------|------|');
        for (const liunian of dayun.liunianList) {
            const hiddenStemsText = liunian.hiddenStems.length > 0
                ? liunian.hiddenStems.map((hs) => `${hs.stem}(${hs.tenGod})`).join('、')
                : '-';
            const shenShaText = liunian.shenSha.length > 0 ? liunian.shenSha.join('、') : '-';
            const relationText = liunian.branchRelations.length > 0 ? liunian.branchRelations.map((item) => item.description).join('；') : '-';
            const taiSuiText = liunian.taiSui.length > 0 ? liunian.taiSui.join('、') : '-';
            lines.push(`| ${liunian.year} | ${liunian.age}岁 | ${liunian.ganZhi} | ${liunian.tenGod || '-'} | ${hiddenStemsText} | ${liunian.diShi || '-'} | ${liunian.nayin || '-'} | ${shenShaText} | ${relationText} | ${taiSuiText} |`);
        }
    }
    return lines.join('\n');
}
