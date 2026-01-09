/**
 * 运势计算库
 * 
 * 基于八字命理理论，通过日主与流日/流月的五行生克关系计算个性化运势
 */

import { Solar } from 'lunar-javascript';
import { STEM_ELEMENTS, BRANCH_ELEMENTS } from './bazi';
import type { BaziChart, HeavenlyStem, FiveElement } from '@/types';

// ===== 类型定义 =====

export interface FortuneScores {
    overall: number;    // 综合运势 (0-100)
    career: number;     // 事业运
    love: number;       // 感情运
    wealth: number;     // 财运
    health: number;     // 健康运
    social: number;     // 人际运
}

export interface DailyFortune extends FortuneScores {
    date: string;
    dayStem: HeavenlyStem;
    dayBranch: string;
    tenGod: string;     // 流日与日主形成的十神
    advice: string[];   // 运势建议
    luckyColor: string; // 幸运色
    luckyDirection: string; // 吉方位
}

export interface MonthlyFortune extends FortuneScores {
    year: number;
    month: number;
    monthStem: HeavenlyStem;
    monthBranch: string;
    tenGod: string;
    summary: string;
    keyDates: { date: number; desc: string; type?: 'lucky' | 'warning' | 'turning' }[];
}

// ===== 常量 =====

/** 五行相生相克权重 */
const ELEMENT_RELATION_SCORES: Record<string, number> = {
    'same': 75,       // 比和：平稳
    'produce': 85,    // 我生：付出但有回报
    'produced': 90,   // 生我：贵人运
    'control': 70,    // 我克：有压力但可掌控
    'controlled': 55, // 克我：有阻力
};

/** 十神对应各类运势的加成 */
const TEN_GOD_FORTUNE_BONUS: Record<string, Partial<FortuneScores>> = {
    '比肩': { career: 5, love: 0, wealth: -5, health: 5, social: 10 },
    '劫财': { career: 0, love: -5, wealth: -10, health: 5, social: 5 },
    '食神': { career: 5, love: 10, wealth: 5, health: 10, social: 8 },
    '伤官': { career: -5, love: 5, wealth: 5, health: 0, social: -5 },
    '偏财': { career: 5, love: 5, wealth: 15, health: 0, social: 5 },
    '正财': { career: 5, love: 10, wealth: 10, health: 0, social: 5 },
    '七杀': { career: 10, love: -5, wealth: 5, health: -5, social: -3 },
    '正官': { career: 15, love: 5, wealth: 5, health: 0, social: 8 },
    '偏印': { career: 5, love: 0, wealth: -5, health: 5, social: 0 },
    '正印': { career: 10, love: 5, wealth: 0, health: 10, social: 5 },
};

/** 五行对应颜色 */
const ELEMENT_COLORS: Record<FiveElement, string> = {
    '木': '绿色',
    '火': '红色',
    '土': '黄色',
    '金': '白色',
    '水': '黑色/蓝色',
};

/** 五行对应方位 */
const ELEMENT_DIRECTIONS: Record<FiveElement, string> = {
    '木': '东方',
    '火': '南方',
    '土': '中央',
    '金': '西方',
    '水': '北方',
};

// ===== 工具函数 =====

/**
 * 获取天干阴阳
 */
function getStemYinYang(stem: HeavenlyStem): 'yang' | 'yin' {
    const yangStems: HeavenlyStem[] = ['甲', '丙', '戊', '庚', '壬'];
    return yangStems.includes(stem) ? 'yang' : 'yin';
}

/**
 * 获取五行生克关系
 */
function getElementRelation(from: FiveElement, to: FiveElement): string {
    const order: FiveElement[] = ['木', '火', '土', '金', '水'];
    const fromIdx = order.indexOf(from);
    const toIdx = order.indexOf(to);

    if (from === to) return 'same';
    if ((fromIdx + 1) % 5 === toIdx) return 'produce';
    if ((toIdx + 1) % 5 === fromIdx) return 'produced';
    if ((fromIdx + 2) % 5 === toIdx) return 'control';
    return 'controlled';
}

/**
 * 计算十神
 */
function calculateTenGod(dayStem: HeavenlyStem, targetStem: HeavenlyStem): string {
    if (dayStem === targetStem) return '比肩';

    const dayElement = STEM_ELEMENTS[dayStem];
    const targetElement = STEM_ELEMENTS[targetStem];
    const dayYY = getStemYinYang(dayStem);
    const targetYY = getStemYinYang(targetStem);
    const sameYY = dayYY === targetYY;

    const relation = getElementRelation(dayElement, targetElement);

    const tenGodMap: Record<string, [string, string]> = {
        'same': ['比肩', '劫财'],
        'produce': ['食神', '伤官'],
        'control': ['偏财', '正财'],
        'controlled': ['七杀', '正官'],
        'produced': ['偏印', '正印'],
    };

    return tenGodMap[relation][sameYY ? 0 : 1];
}

/**
 * 限制分数在合理范围内
 */
function clampScore(score: number): number {
    return Math.max(30, Math.min(98, Math.round(score)));
}

/**
 * 基于种子的伪随机函数（用于微调）
 */
function seededRandom(seed: number, offset: number = 0): number {
    const x = Math.sin(seed + offset) * 10000;
    return x - Math.floor(x);
}

// ===== 主要导出函数 =====

/**
 * 计算每日个性化运势
 * 
 * @param baziChart 用户八字命盘
 * @param date 目标日期
 * @returns 每日运势
 */
export function calculateDailyFortune(baziChart: BaziChart, date: Date): DailyFortune {
    const solar = Solar.fromYmd(date.getFullYear(), date.getMonth() + 1, date.getDate());
    const lunar = solar.getLunar();
    const eightChar = lunar.getEightChar();

    const dayStem = eightChar.getDayGan() as HeavenlyStem;
    const dayBranch = eightChar.getDayZhi();
    const userDayStem = baziChart.dayMaster as HeavenlyStem;

    // 计算流日与日主的十神关系
    const tenGod = calculateTenGod(userDayStem, dayStem);

    // 计算五行生克关系基础分
    const dayElement = STEM_ELEMENTS[dayStem];
    const userElement = STEM_ELEMENTS[userDayStem];
    const relation = getElementRelation(userElement, dayElement);
    const baseScore = ELEMENT_RELATION_SCORES[relation];

    // 获取十神加成
    const godBonus = TEN_GOD_FORTUNE_BONUS[tenGod] || {};

    // 添加日期种子的微调（让每天有变化）
    const dateSeed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();

    // 计算各项运势
    const career = clampScore(baseScore + (godBonus.career || 0) + seededRandom(dateSeed, 1) * 10 - 5);
    const love = clampScore(baseScore + (godBonus.love || 0) + seededRandom(dateSeed, 2) * 10 - 5);
    const wealth = clampScore(baseScore + (godBonus.wealth || 0) + seededRandom(dateSeed, 3) * 10 - 5);
    const health = clampScore(baseScore + (godBonus.health || 0) + seededRandom(dateSeed, 4) * 10 - 5);
    const social = clampScore(baseScore + (godBonus.social || 0) + seededRandom(dateSeed, 5) * 10 - 5);
    const overall = clampScore((career + love + wealth + health + social) / 5);

    // 生成运势建议
    const advice = generateDailyAdvice(tenGod, overall, career, wealth, health);

    // 幸运色：生日主的五行对应颜色
    const luckyElement = getLuckyElement(userElement);
    const luckyColor = ELEMENT_COLORS[luckyElement];
    const luckyDirection = ELEMENT_DIRECTIONS[luckyElement];

    return {
        date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
        dayStem,
        dayBranch,
        tenGod,
        overall,
        career,
        love,
        wealth,
        health,
        social,
        advice,
        luckyColor,
        luckyDirection,
    };
}

/**
 * 计算每月个性化运势
 */
export function calculateMonthlyFortune(baziChart: BaziChart, year: number, month: number): MonthlyFortune {
    // 获取该月第一天的干支
    const solar = Solar.fromYmd(year, month, 15); // 取月中
    const lunar = solar.getLunar();
    const eightChar = lunar.getEightChar();

    const monthStem = eightChar.getMonthGan() as HeavenlyStem;
    const monthBranch = eightChar.getMonthZhi();
    const userDayStem = baziChart.dayMaster as HeavenlyStem;

    // 计算流月与日主的十神关系
    const tenGod = calculateTenGod(userDayStem, monthStem);

    // 计算基础分
    const monthElement = STEM_ELEMENTS[monthStem];
    const userElement = STEM_ELEMENTS[userDayStem];
    const relation = getElementRelation(userElement, monthElement);
    const baseScore = ELEMENT_RELATION_SCORES[relation];

    // 获取十神加成
    const godBonus = TEN_GOD_FORTUNE_BONUS[tenGod] || {};

    // 月度种子
    const monthSeed = year * 100 + month;

    // 计算各项运势
    const career = clampScore(baseScore + (godBonus.career || 0) + seededRandom(monthSeed, 1) * 8 - 4);
    const love = clampScore(baseScore + (godBonus.love || 0) + seededRandom(monthSeed, 2) * 8 - 4);
    const wealth = clampScore(baseScore + (godBonus.wealth || 0) + seededRandom(monthSeed, 3) * 8 - 4);
    const health = clampScore(baseScore + (godBonus.health || 0) + seededRandom(monthSeed, 4) * 8 - 4);
    const social = clampScore(baseScore + (godBonus.social || 0) + seededRandom(monthSeed, 5) * 8 - 4);
    const overall = clampScore((career + love + wealth + health + social) / 5);

    // 生成月度总结
    const summary = generateMonthlySummary(tenGod, overall);

    // 生成重要日期
    const keyDates = generateKeyDates(baziChart, year, month);

    return {
        year,
        month,
        monthStem,
        monthBranch,
        tenGod,
        overall,
        career,
        love,
        wealth,
        health,
        social,
        summary,
        keyDates,
    };
}

/**
 * 计算通用运势（无八字时使用）
 */
export function calculateGenericDailyFortune(date: Date): FortuneScores & { advice: string[] } {
    const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();

    const random = (offset: number) => {
        const x = Math.sin(seed + offset) * 10000;
        return Math.floor((x - Math.floor(x)) * 40) + 55;
    };

    const overall = random(1);
    const career = random(2);
    const love = random(3);
    const wealth = random(4);
    const health = random(5);
    const social = random(6);

    const advice = [
        overall >= 75 ? '整体运势良好，适合开展新计划' : '今日宜稳健行事，不宜冒进',
        career >= 70 ? '工作上有贵人相助，把握机会' : '职场上需多加耐心，避免冲突',
        wealth >= 70 ? '财运亨通，可适当投资' : '守财为主，避免大额消费',
        health >= 70 ? '精力充沛，适合运动健身' : '注意休息，避免过度劳累',
    ];

    return { overall, career, love, wealth, health, social, advice };
}

// ===== 辅助函数 =====

function getLuckyElement(userElement: FiveElement): FiveElement {
    // 生我者为吉
    const order: FiveElement[] = ['木', '火', '土', '金', '水'];
    const idx = order.indexOf(userElement);
    return order[(idx + 4) % 5]; // 生我的五行
}

function generateDailyAdvice(tenGod: string, overall: number, career: number, wealth: number, health: number): string[] {
    const advice: string[] = [];

    // 根据十神给出针对性建议
    const tenGodAdvice: Record<string, string> = {
        '比肩': '今日适合与朋友合作，互帮互助',
        '劫财': '注意财务支出，避免借贷',
        '食神': '创意灵感丰富，适合发挥才华',
        '伤官': '思维活跃但需谨言慎行',
        '偏财': '有意外之财，可适当投资',
        '正财': '正财运佳，努力工作有回报',
        '七杀': '压力较大，但挑战中有机遇',
        '正官': '贵人运旺，适合拓展人脉',
        '偏印': '适合学习研究，提升自我',
        '正印': '长辈相助，学业事业顺遂',
    };

    advice.push(tenGodAdvice[tenGod] || '顺其自然，平常心对待');

    // 根据分数给出其他建议
    if (overall >= 80) {
        advice.push('整体运势极佳，可大胆行动');
    } else if (overall < 60) {
        advice.push('今日宜静不宜动，稳健为上');
    }

    if (career >= 80) {
        advice.push('事业运强劲，把握晋升机会');
    } else if (career < 60) {
        advice.push('职场需低调行事，避免冲突');
    }

    if (wealth < 60) {
        advice.push('财运平平，不宜大额消费投资');
    }

    if (health < 60) {
        advice.push('注意休息，避免过度劳累');
    }

    return advice.slice(0, 4);
}

function generateMonthlySummary(tenGod: string, overall: number): string {
    const tenGodSummary: Record<string, string> = {
        '比肩': '本月人际关系活跃，适合团队合作',
        '劫财': '本月财务需谨慎，防止意外支出',
        '食神': '本月创意运势佳，适合发展副业',
        '伤官': '本月思维活跃，但需注意言行',
        '偏财': '本月偏财运旺，可尝试投资',
        '正财': '本月正财稳定，努力有回报',
        '七杀': '本月挑战与机遇并存，需果断行动',
        '正官': '本月事业运强，贵人相助',
        '偏印': '本月适合学习进修，提升能力',
        '正印': '本月稳健发展，长辈贵人相助',
    };

    let summary = tenGodSummary[tenGod] || '本月运势平稳，顺其自然';

    if (overall >= 80) {
        summary += '。整体运势极佳，可积极把握机会。';
    } else if (overall >= 65) {
        summary += '。运势良好，稳步前进即可。';
    } else {
        summary += '。建议稳健行事，避免冒险。';
    }

    return summary;
}

function generateKeyDates(baziChart: BaziChart, year: number, month: number): { date: number; desc: string; type?: 'lucky' | 'warning' | 'turning' }[] {
    const keyDates: { date: number; desc: string; type?: 'lucky' | 'warning' | 'turning' }[] = [];
    const daysInMonth = new Date(year, month, 0).getDate();

    // 计算所有天的运势
    const dailyScores: { day: number; overall: number; career: number; wealth: number; love: number; health: number; social: number }[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const fortune = calculateDailyFortune(baziChart, date);
        dailyScores.push({
            day,
            overall: fortune.overall,
            career: fortune.career,
            wealth: fortune.wealth,
            love: fortune.love,
            health: fortune.health,
            social: fortune.social,
        });
    }

    // 识别吉日（高分日）
    for (const score of dailyScores) {
        if (keyDates.length >= 8) break;

        if (score.overall >= 85) {
            keyDates.push({ date: score.day, desc: '大吉日', type: 'lucky' });
        } else if (score.wealth >= 88) {
            keyDates.push({ date: score.day, desc: '财运日', type: 'lucky' });
        } else if (score.career >= 88) {
            keyDates.push({ date: score.day, desc: '事业吉日', type: 'lucky' });
        } else if (score.love >= 88) {
            keyDates.push({ date: score.day, desc: '桃花日', type: 'lucky' });
        }
    }

    // 识别波动节点（转折日）- 运势急剧变化的日子
    for (let i = 1; i < dailyScores.length - 1; i++) {
        if (keyDates.length >= 10) break;

        const prev = dailyScores[i - 1];
        const curr = dailyScores[i];
        const next = dailyScores[i + 1];

        // 检测运势急剧上升（谷底转折）
        if (prev.overall < 65 && curr.overall < 65 && next.overall >= 75) {
            if (!keyDates.find(k => k.date === next.day)) {
                keyDates.push({ date: next.day, desc: '转运日', type: 'turning' });
            }
        }

        // 检测运势急剧下降（高峰转折）
        if (prev.overall >= 75 && curr.overall >= 75 && next.overall < 65) {
            if (!keyDates.find(k => k.date === next.day)) {
                keyDates.push({ date: next.day, desc: '需谨慎', type: 'warning' });
            }
        }
    }

    // 按日期排序
    keyDates.sort((a, b) => a.date - b.date);

    return keyDates.slice(0, 8);
}

