/**
 * 八字计算处理器
 */
import { Solar, Lunar, LunarMonth, LunarYear } from 'lunar-javascript';
import { GAN_WUXING, getStemYinYang, calculateTenGod, getKongWang, } from '../utils.js';
import { calculatePillarShenSha as calculateSharedPillarShenSha } from '../shensha.js';
import { resolveTrueSolarDateTime } from './ziwei-shared.js';
// 从数据模块导入静态数据
import { TIAN_GAN, DI_ZHI, HIDDEN_STEM_DETAILS, NA_YIN_TABLE, DI_SHI_ORDER, CHANG_SHENG_START, LIU_HE, LIU_HE_HUA, SAN_HE, LIU_CHONG, XIANG_HAI, XIANG_XING, YUE_DE, TIAN_DE, JIN_YU, DE_XIU, TIAN_DE_HE, YUE_DE_HE, } from '../data/shensha-data.js';
export function getNaYin(stem, branch) {
    return NA_YIN_TABLE[`${stem}${branch}`] || '';
}
/** 从纳音字符串提取五行（最后一个字：金/木/水/火/土） */
export function getNaYinElement(nayin) {
    if (!nayin)
        return '';
    const last = nayin.charAt(nayin.length - 1);
    return ['金', '木', '水', '火', '土'].includes(last) ? last : '';
}
export function getDiShi(dayStem, branch) {
    const element = GAN_WUXING[dayStem];
    if (!element)
        return '';
    const startBranch = CHANG_SHENG_START[element];
    const startIdx = DI_ZHI.indexOf(startBranch);
    const branchIdx = DI_ZHI.indexOf(branch);
    if (startIdx < 0 || branchIdx < 0)
        return '';
    const isYang = getStemYinYang(dayStem) === 'yang';
    const offset = isYang
        ? (branchIdx - startIdx + 12) % 12
        : (startIdx - branchIdx + 12) % 12;
    return DI_SHI_ORDER[offset];
}
export function buildHiddenStems(branch, dayStem) {
    const stems = HIDDEN_STEM_DETAILS[branch] || [];
    return stems.map((item) => ({
        stem: item.stem,
        qiType: item.qiType,
        tenGod: calculateTenGod(dayStem, item.stem),
    }));
}
function buildPillarKongWang(branch, kongWang) {
    return {
        isKong: kongWang.kongZhi.includes(branch),
    };
}
function createPillar(stem, branch, dayStem) {
    return {
        stem,
        branch,
        tenGod: calculateTenGod(dayStem, stem),
        hiddenStems: buildHiddenStems(branch, dayStem),
        naYin: getNaYin(stem, branch),
        diShi: getDiShi(dayStem, branch),
        shenSha: [],
        kongWang: { isKong: false },
    };
}
const PILLAR_POSITION_MAP = {
    year: '年支',
    month: '月支',
    day: '日支',
    hour: '时支',
    yearBranch: '年支',
    monthBranch: '月支',
    dayBranch: '日支',
    hourBranch: '时支',
    YearBranch: '年支',
    MonthBranch: '月支',
    DayBranch: '日支',
    HourBranch: '时支',
    年: '年支',
    月: '月支',
    日: '日支',
    时: '时支',
    年柱: '年支',
    月柱: '月支',
    日柱: '日支',
    时柱: '时支',
    年支: '年支',
    月支: '月支',
    日支: '日支',
    时支: '时支',
};
function normalizePillarPosition(label) {
    const normalized = PILLAR_POSITION_MAP[label];
    if (!normalized) {
        throw new Error(`无效的柱位标签: ${label}`);
    }
    return normalized;
}
// ===== 天干五合 =====
const TIAN_GAN_WU_HE_RESULT = {
    '甲己': '土', '己甲': '土',
    '乙庚': '金', '庚乙': '金',
    '丙辛': '水', '辛丙': '水',
    '丁壬': '木', '壬丁': '木',
    '戊癸': '火', '癸戊': '火',
};
function analyzeTianGanWuHe(yearStem, monthStem, dayStem, hourStem) {
    const stems = [yearStem, monthStem, dayStem, hourStem];
    const pillarNames = ['年支', '月支', '日支', '时支'];
    const result = [];
    // Check adjacent pillars: year-month, month-day, day-hour
    for (let i = 0; i < 3; i++) {
        const pair = `${stems[i]}${stems[i + 1]}`;
        const element = TIAN_GAN_WU_HE_RESULT[pair];
        if (element) {
            result.push({
                stemA: stems[i],
                stemB: stems[i + 1],
                resultElement: element,
                positions: [pillarNames[i], pillarNames[i + 1]],
            });
        }
    }
    return result;
}
// ===== 地支半合 =====
const BAN_HE_PAIRS = [
    { pair: ['申', '子'], missing: '辰', element: '水' },
    { pair: ['子', '辰'], missing: '申', element: '水' },
    { pair: ['亥', '卯'], missing: '未', element: '木' },
    { pair: ['卯', '未'], missing: '亥', element: '木' },
    { pair: ['寅', '午'], missing: '戌', element: '火' },
    { pair: ['午', '戌'], missing: '寅', element: '火' },
    { pair: ['巳', '酉'], missing: '丑', element: '金' },
    { pair: ['酉', '丑'], missing: '巳', element: '金' },
];
function analyzeDiZhiBanHe(yearBranch, monthBranch, dayBranch, hourBranch) {
    const branches = [yearBranch, monthBranch, dayBranch, hourBranch];
    const pillarNames = ['年支', '月支', '日支', '时支'];
    const result = [];
    const seen = new Set();
    for (const banHe of BAN_HE_PAIRS) {
        const [a, b] = banHe.pair;
        const positionsA = branches.map((br, i) => br === a ? i : -1).filter(i => i >= 0);
        const positionsB = branches.map((br, i) => br === b ? i : -1).filter(i => i >= 0);
        if (positionsA.length > 0 && positionsB.length > 0) {
            // Check the full 三合 is NOT present (半合 only when the third is missing)
            if (branches.includes(banHe.missing))
                continue;
            const key = [a, b].sort().join('') + banHe.element;
            if (seen.has(key))
                continue;
            seen.add(key);
            const positions = [...positionsA, ...positionsB].map(i => pillarNames[i]);
            result.push({
                branches: [a, b],
                resultElement: banHe.element,
                missingBranch: banHe.missing,
                positions,
            });
        }
    }
    return result;
}
// ===== 天干冲克 =====
const TIAN_GAN_CHONG_KE = [
    ['甲', '庚'], ['乙', '辛'], ['丙', '壬'], ['丁', '癸'],
];
function analyzeTianGanChongKe(yearStem, monthStem, dayStem, hourStem) {
    const stems = [yearStem, monthStem, dayStem, hourStem];
    const pillarNames = ['年支', '月支', '日支', '时支'];
    const result = [];
    for (let i = 0; i < stems.length; i++) {
        for (let j = i + 1; j < stems.length; j++) {
            for (const [a, b] of TIAN_GAN_CHONG_KE) {
                if ((stems[i] === a && stems[j] === b) || (stems[i] === b && stems[j] === a)) {
                    result.push({
                        stemA: stems[i],
                        stemB: stems[j],
                        positions: [pillarNames[i], pillarNames[j]],
                    });
                }
            }
        }
    }
    return result;
}
// ===== 地支三会（方局） =====
const SAN_HUI = [
    { branches: ['寅', '卯', '辰'], element: '木' },
    { branches: ['巳', '午', '未'], element: '火' },
    { branches: ['申', '酉', '戌'], element: '金' },
    { branches: ['亥', '子', '丑'], element: '水' },
];
function analyzeDiZhiSanHui(yearBranch, monthBranch, dayBranch, hourBranch) {
    const branches = [yearBranch, monthBranch, dayBranch, hourBranch];
    const pillarNames = ['年支', '月支', '日支', '时支'];
    const result = [];
    for (const hui of SAN_HUI) {
        const matchIndices = branches
            .map((b, i) => hui.branches.includes(b) ? i : -1)
            .filter(i => i >= 0);
        const matchedUnique = new Set(matchIndices.map(i => branches[i]));
        if (matchedUnique.size === 3) {
            result.push({
                branches: hui.branches,
                resultElement: hui.element,
                positions: matchIndices.map(i => pillarNames[i]),
            });
        }
    }
    return result;
}
// ===== 胎元计算 =====
// 胎元 = 月干进一位 + 月支进三位
function calculateTaiYuan(monthStem, monthBranch) {
    const stemIdx = TIAN_GAN.indexOf(monthStem);
    const branchIdx = DI_ZHI.indexOf(monthBranch);
    if (stemIdx < 0 || branchIdx < 0)
        return '';
    const newStem = TIAN_GAN[(stemIdx + 1) % 10];
    const newBranch = DI_ZHI[(branchIdx + 3) % 12];
    return `${newStem}${newBranch}`;
}
// ===== 命宫计算 =====
// 从卯起正月逆数到生月，再从该位起子时顺数到生时
// 天干用五虎遁月法：甲己→丙寅, 乙庚→戊寅, 丙辛→庚寅, 丁壬→壬寅, 戊癸→甲寅
function calculateMingGong(yearStem, monthBranch, hourBranch) {
    const maoIdx = DI_ZHI.indexOf('卯'); // 4
    const monthIdx = DI_ZHI.indexOf(monthBranch);
    const hourIdx = DI_ZHI.indexOf(hourBranch);
    if (monthIdx < 0 || hourIdx < 0)
        return '';
    // 月支对应月份：寅=1月, 卯=2月, ..., 丑=12月
    const yinIdx = DI_ZHI.indexOf('寅'); // 2
    const monthNum = (monthIdx - yinIdx + 12) % 12 + 1;
    // 从卯起正月逆数到生月，再从该位起子时顺数到生时
    const mingBranchIdx = (maoIdx - (monthNum - 1) + hourIdx + 12 * 10) % 12;
    const mingBranch = DI_ZHI[mingBranchIdx];
    // 五虎遁月法：年干 → 寅月起始天干
    const WU_HU_DUN = {
        '甲': 2, '己': 2, // 丙寅 → TIAN_GAN[2]=丙
        '乙': 4, '庚': 4, // 戊寅
        '丙': 6, '辛': 6, // 庚寅
        '丁': 8, '壬': 8, // 壬寅
        '戊': 0, '癸': 0, // 甲寅
    };
    const baseStemIdx = WU_HU_DUN[yearStem];
    if (baseStemIdx === undefined)
        return mingBranch;
    // 寅月天干 = baseStemIdx, 命宫地支距寅的偏移 = (mingBranchIdx - yinIdx + 12) % 12
    const offset = (mingBranchIdx - yinIdx + 12) % 12;
    const mingStem = TIAN_GAN[(baseStemIdx + offset) % 10];
    return `${mingStem}${mingBranch}`;
}
function analyzePillarRelations(yearBranch, monthBranch, dayBranch, hourBranch) {
    const branches = [yearBranch, monthBranch, dayBranch, hourBranch];
    const pillarNames = ['year', 'month', 'day', 'hour'];
    const relations = [];
    for (let i = 0; i < branches.length; i++) {
        for (let j = i + 1; j < branches.length; j++) {
            if (LIU_HE[branches[i]] === branches[j]) {
                const huaElement = LIU_HE_HUA[branches[i]] || '';
                relations.push({
                    type: '合',
                    pillars: [normalizePillarPosition(pillarNames[i]), normalizePillarPosition(pillarNames[j])],
                    description: `${branches[i]}${branches[j]}六合${huaElement ? '化' + huaElement : ''}`,
                });
            }
        }
    }
    for (const sanHe of SAN_HE) {
        const matchingBranches = branches.filter((b) => sanHe.branches.includes(b));
        const uniqueBranches = Array.from(new Set(matchingBranches));
        if (uniqueBranches.length >= 2) {
            const matchingPillars = branches
                .map((b, i) => (sanHe.branches.includes(b) ? normalizePillarPosition(pillarNames[i]) : null))
                .filter(Boolean);
            if (uniqueBranches.length === 3) {
                relations.push({
                    type: '合',
                    pillars: matchingPillars,
                    description: `${uniqueBranches.join('')}三合${sanHe.element}`,
                });
            }
            else {
                relations.push({
                    type: '合',
                    pillars: matchingPillars,
                    description: `${uniqueBranches.join('')}半合${sanHe.element}`,
                });
            }
        }
    }
    for (let i = 0; i < branches.length; i++) {
        for (let j = i + 1; j < branches.length; j++) {
            if (LIU_CHONG[branches[i]] === branches[j]) {
                relations.push({
                    type: '冲',
                    pillars: [normalizePillarPosition(pillarNames[i]), normalizePillarPosition(pillarNames[j])],
                    description: `${branches[i]}${branches[j]}相冲`,
                });
            }
        }
    }
    for (let i = 0; i < branches.length; i++) {
        for (let j = i + 1; j < branches.length; j++) {
            if (XIANG_HAI[branches[i]] === branches[j]) {
                relations.push({
                    type: '害',
                    pillars: [normalizePillarPosition(pillarNames[i]), normalizePillarPosition(pillarNames[j])],
                    description: `${branches[i]}${branches[j]}相害`,
                });
            }
        }
    }
    for (const xing of XIANG_XING) {
        const matchingBranches = branches.filter((b) => xing.combination.includes(b));
        if (xing.combination.length === 1) {
            const count = branches.filter((b) => b === xing.combination[0]).length;
            if (count >= 2) {
                const matchingPillars = branches
                    .map((b, i) => (b === xing.combination[0] ? normalizePillarPosition(pillarNames[i]) : null))
                    .filter(Boolean);
                relations.push({
                    type: '刑',
                    pillars: matchingPillars,
                    description: xing.name,
                });
            }
        }
        else if (matchingBranches.length >= 2) {
            const matchingPillars = branches
                .map((b, i) => (xing.combination.includes(b) ? normalizePillarPosition(pillarNames[i]) : null))
                .filter(Boolean);
            relations.push({
                type: '刑',
                pillars: matchingPillars,
                description: xing.name,
            });
        }
    }
    return relations;
}
function calculatePillarShenSha(params) {
    const shenSha = calculateSharedPillarShenSha(params);
    const { yearStem, yearBranch, monthBranch, dayStem, dayBranch, hourStem, hourBranch, } = params;
    const pushUnique = (position, name) => {
        if (!shenSha[position].includes(name)) {
            shenSha[position].push(name);
        }
    };
    const jinYuBranch = JIN_YU[dayStem];
    if (jinYuBranch === yearBranch)
        pushUnique('year', '金舆');
    if (jinYuBranch === monthBranch)
        pushUnique('month', '金舆');
    if (jinYuBranch === dayBranch)
        pushUnique('day', '金舆');
    if (jinYuBranch === hourBranch)
        pushUnique('hour', '金舆');
    const yueDeStem = YUE_DE[monthBranch];
    if (yueDeStem === yearStem)
        pushUnique('year', '月德贵人');
    if (yueDeStem === dayStem)
        pushUnique('day', '月德贵人');
    if (yueDeStem === hourStem)
        pushUnique('hour', '月德贵人');
    const tianDeChar = TIAN_DE[monthBranch];
    if (tianDeChar === yearStem || tianDeChar === yearBranch)
        pushUnique('year', '天德贵人');
    if (tianDeChar === dayStem || tianDeChar === dayBranch)
        pushUnique('day', '天德贵人');
    if (tianDeChar === hourStem || tianDeChar === hourBranch)
        pushUnique('hour', '天德贵人');
    const deXiuStems = DE_XIU[monthBranch] || [];
    if (deXiuStems.includes(dayStem))
        pushUnique('day', '德秀贵人');
    if (deXiuStems.includes(hourStem))
        pushUnique('hour', '德秀贵人');
    const tianDeHeChar = TIAN_DE_HE[monthBranch];
    if (tianDeHeChar === yearStem || tianDeHeChar === yearBranch)
        pushUnique('year', '天德合');
    if (tianDeHeChar === dayStem || tianDeHeChar === dayBranch)
        pushUnique('day', '天德合');
    if (tianDeHeChar === hourStem || tianDeHeChar === hourBranch)
        pushUnique('hour', '天德合');
    const yueDeHeStem = YUE_DE_HE[monthBranch];
    if (yueDeHeStem === yearStem)
        pushUnique('year', '月德合');
    if (yueDeHeStem === dayStem)
        pushUnique('day', '月德合');
    if (yueDeHeStem === hourStem)
        pushUnique('hour', '月德合');
    return shenSha;
}
function validateLunarDateInput(params) {
    const { birthYear, birthMonth, birthDay, birthHour, birthMinute, isLeapMonth, } = params;
    if (!Number.isInteger(birthMonth) || birthMonth < 1 || birthMonth > 12) {
        throw new Error(`农历月份无效：${birthMonth}月不存在。请输入 1-12 之间的整数。`);
    }
    const leapMonth = LunarYear.fromYear(birthYear).getLeapMonth();
    if (isLeapMonth && leapMonth !== birthMonth) {
        throw new Error(`农历闰月无效：${birthYear}年没有闰${birthMonth}月，请检查该年是否有闰月。`);
    }
    const lunarMonth = isLeapMonth ? -Math.abs(birthMonth) : birthMonth;
    let lunarMonthInfo;
    try {
        lunarMonthInfo = LunarMonth.fromYm(birthYear, lunarMonth);
    }
    catch {
        throw new Error(`农历月份无效：${birthYear}年${isLeapMonth ? '闰' : ''}${birthMonth}月不存在。`);
    }
    if (!lunarMonthInfo) {
        throw new Error(`农历月份无效：${birthYear}年${isLeapMonth ? '闰' : ''}${birthMonth}月不存在。`);
    }
    const dayCount = lunarMonthInfo.getDayCount();
    if (birthDay < 1 || birthDay > dayCount) {
        throw new Error(`农历日期无效：${birthYear}年${isLeapMonth ? '闰' : ''}${birthMonth}月只有${dayCount}天，请输入 1-${dayCount} 之间的日期。`);
    }
    let lunar;
    try {
        lunar = Lunar.fromYmdHms(birthYear, lunarMonth, birthDay, birthHour, birthMinute, 0);
    }
    catch {
        throw new Error(`农历日期无效：${birthYear}年${isLeapMonth ? '闰' : ''}${birthMonth}月${birthDay}日不存在，请检查日期是否正确。`);
    }
    return {
        solar: lunar.getSolar(),
        lunar,
    };
}
export async function handleBaziCalculate(input) {
    const { gender, birthYear, birthMonth, birthDay, birthHour, birthMinute = 0, calendarType = 'solar', isLeapMonth = false, birthPlace, longitude, } = input;
    // 真太阳时校正（仅公历 + 提供经度时生效）
    let trueSolarTimeInfo;
    let effectiveYear = birthYear;
    let effectiveMonth = birthMonth;
    let effectiveHour = birthHour;
    let effectiveMinute = birthMinute;
    let effectiveDay = birthDay;
    if (longitude != null && calendarType !== 'lunar') {
        if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
            throw new Error('longitude 必须是 -180 到 180 之间的数字');
        }
        const resolvedDateTime = resolveTrueSolarDateTime({ birthYear, birthMonth, birthDay, birthHour, birthMinute }, longitude);
        trueSolarTimeInfo = resolvedDateTime.trueSolarTimeInfo;
        effectiveYear = resolvedDateTime.year;
        effectiveMonth = resolvedDateTime.month;
        effectiveDay = resolvedDateTime.day;
        effectiveHour = resolvedDateTime.hour;
        effectiveMinute = resolvedDateTime.minute;
    }
    let solar;
    let lunar;
    if (calendarType === 'lunar') {
        const prepared = validateLunarDateInput({
            birthYear,
            birthMonth,
            birthDay,
            birthHour,
            birthMinute,
            isLeapMonth,
        });
        solar = prepared.solar;
        lunar = prepared.lunar;
    }
    else {
        solar = Solar.fromYmdHms(effectiveYear, effectiveMonth, effectiveDay, effectiveHour, effectiveMinute, 0);
        lunar = solar.getLunar();
    }
    const eightChar = lunar.getEightChar();
    const yearStem = eightChar.getYearGan();
    const yearBranch = eightChar.getYearZhi();
    const monthStem = eightChar.getMonthGan();
    const monthBranch = eightChar.getMonthZhi();
    const dayStem = eightChar.getDayGan();
    const dayBranch = eightChar.getDayZhi();
    const hourStem = eightChar.getTimeGan();
    const hourBranch = eightChar.getTimeZhi();
    const kongWang = getKongWang(dayStem, dayBranch);
    const yearNaYin = getNaYin(yearStem, yearBranch);
    const yearNaYinElement = getNaYinElement(yearNaYin);
    const pillarShenSha = calculatePillarShenSha({
        yearStem,
        yearBranch,
        monthStem,
        monthBranch,
        dayStem,
        dayBranch,
        hourStem,
        hourBranch,
        kongWang,
        yearNaYinElement,
    });
    const fourPillars = {
        year: {
            ...createPillar(yearStem, yearBranch, dayStem),
            shenSha: pillarShenSha.year,
            kongWang: buildPillarKongWang(yearBranch, kongWang),
        },
        month: {
            ...createPillar(monthStem, monthBranch, dayStem),
            shenSha: pillarShenSha.month,
            kongWang: buildPillarKongWang(monthBranch, kongWang),
        },
        day: {
            ...createPillar(dayStem, dayBranch, dayStem),
            shenSha: pillarShenSha.day,
            kongWang: buildPillarKongWang(dayBranch, kongWang),
        },
        hour: {
            ...createPillar(hourStem, hourBranch, dayStem),
            shenSha: pillarShenSha.hour,
            kongWang: buildPillarKongWang(hourBranch, kongWang),
        },
    };
    fourPillars.day.tenGod = undefined;
    const relations = analyzePillarRelations(yearBranch, monthBranch, dayBranch, hourBranch);
    const tianGanWuHe = analyzeTianGanWuHe(yearStem, monthStem, dayStem, hourStem);
    const tianGanChongKe = analyzeTianGanChongKe(yearStem, monthStem, dayStem, hourStem);
    const diZhiBanHe = analyzeDiZhiBanHe(yearBranch, monthBranch, dayBranch, hourBranch);
    const diZhiSanHui = analyzeDiZhiSanHui(yearBranch, monthBranch, dayBranch, hourBranch);
    const taiYuan = calculateTaiYuan(monthStem, monthBranch);
    const mingGong = calculateMingGong(yearStem, monthBranch, hourBranch);
    return {
        gender,
        birthPlace,
        dayMaster: dayStem,
        kongWang,
        fourPillars,
        relations,
        tianGanWuHe,
        tianGanChongKe,
        diZhiBanHe,
        diZhiSanHui,
        taiYuan: taiYuan || undefined,
        mingGong: mingGong || undefined,
        trueSolarTimeInfo,
    };
}
