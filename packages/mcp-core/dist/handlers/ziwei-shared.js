/**
 * 紫微斗数共享工具函数
 */
import { astro } from 'iztro';
export const MUTAGEN_NAMES = ['禄', '权', '科', '忌'];
/** 天干四化表: stem → [禄星, 权星, 科星, 忌星] */
export const STEM_MUTAGEN_TABLE = {
    '甲': ['廉贞', '破军', '武曲', '太阳'],
    '乙': ['天机', '天梁', '紫微', '太阴'],
    '丙': ['天同', '天机', '文昌', '廉贞'],
    '丁': ['太阴', '天同', '天机', '巨门'],
    '戊': ['贪狼', '太阴', '右弼', '天机'],
    '己': ['武曲', '贪狼', '天梁', '文曲'],
    '庚': ['太阳', '武曲', '太阴', '天同'],
    '辛': ['巨门', '太阳', '文曲', '文昌'],
    '壬': ['天梁', '紫微', '左辅', '武曲'],
    '癸': ['破军', '巨门', '太阴', '贪狼'],
};
import { DI_ZHI } from '../constants/ganzhi.js';
export { DI_ZHI };
/** 禄存所在地支：按年干查表 */
export const LUCUN_TABLE = {
    '甲': '寅', '乙': '卯', '丙': '巳', '丁': '午',
    '戊': '巳', '己': '午', '庚': '申', '辛': '酉',
    '壬': '亥', '癸': '子',
};
/** 计算流年虚岁列表 */
export function computeLiuNianAges(palaceBranch, birthYearBranch, max = 60) {
    const pIdx = DI_ZHI.indexOf(palaceBranch);
    const bIdx = DI_ZHI.indexOf(birthYearBranch);
    if (pIdx < 0 || bIdx < 0)
        return [];
    const offset = (pIdx - bIdx + 12) % 12;
    const ages = [];
    for (let age = offset + 1; age <= max; age += 12)
        ages.push(age);
    return ages;
}
/**
 * 计算子年斗君地支
 *
 * 公式来源：iztro FunctionalAstrolabe.js 流月算法
 * 「流年地支逆数到生月所在宫位，再从该宫位顺数到生时，为正月所在宫位」
 *
 * 斗君 = 子年正月宫位地支
 *   = DI_ZHI[(13 - lunarMonth + hourBranchIdx) % 12]
 *
 * 其中 hourBranchIdx 为时辰地支绝对索引（子=0, 丑=1, ..., 亥=11）
 * timeIndex 12（晚子时）与 timeIndex 0（早子时）同为子，取 % 12
 */
export function computeDouJun(lunarMonth, timeIndex) {
    // timeIndex: 早子时=0, 丑=1, ..., 亥=11, 晚子时=12 → 子=0
    const hourBranchIdx = timeIndex % 12;
    return DI_ZHI[(13 - lunarMonth + hourBranchIdx + 12) % 12];
}
/** 将 iztro Star 映射为 StarInfo */
export function mapStar(star) {
    return {
        name: star.name,
        type: star.type,
        brightness: star.brightness,
        mutagen: star.mutagen,
    };
}
/** 将小时转换为时辰索引（早子时=0, 丑时=1, ..., 晚子时=12） */
export function hourToTimeIndex(hour) {
    if (hour >= 23)
        return 12;
    if (hour >= 0 && hour < 1)
        return 0;
    return Math.floor((hour + 1) / 2);
}
// ===== 真太阳时计算 =====
/** 中国标准时区基准经度 (UTC+8) */
const STANDARD_MERIDIAN = 120;
/**
 * 计算时差方程 (Equation of Time)，单位：分钟
 *
 * 使用 Spencer (1971) 近似公式，精度约 ±30 秒，满足时辰判定需求。
 * 参考: Spencer, J.W. (1971) "Fourier series representation of the position of the sun"
 *
 * @param dayOfYear 一年中的第几天 (1-366)
 * @param year 年份（用于判断闰年计算总天数）
 */
function equationOfTime(dayOfYear, year) {
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    const totalDays = isLeap ? 366 : 365;
    // B 角（弧度）
    const B = (2 * Math.PI * (dayOfYear - 81)) / totalDays;
    // Spencer 公式，结果单位：分钟
    return 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
}
/** 计算某日期是一年中的第几天 */
function getDayOfYear(year, month, day) {
    const d = new Date(year, month - 1, day);
    const start = new Date(year, 0, 1);
    return Math.floor((d.getTime() - start.getTime()) / 86400000) + 1;
}
function applyMinuteOffsetToSolarDateTime(input, roundedOffsetMinutes) {
    const { birthYear, birthMonth, birthDay, birthHour, birthMinute = 0 } = input;
    const baseTime = Date.UTC(birthYear, birthMonth - 1, birthDay, birthHour, birthMinute, 0, 0);
    const shifted = new Date(baseTime + roundedOffsetMinutes * 60_000);
    const baseDay = Date.UTC(birthYear, birthMonth - 1, birthDay, 0, 0, 0, 0);
    const shiftedDay = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate(), 0, 0, 0, 0);
    return {
        year: shifted.getUTCFullYear(),
        month: shifted.getUTCMonth() + 1,
        day: shifted.getUTCDate(),
        hour: shifted.getUTCHours(),
        minute: shifted.getUTCMinutes(),
        dayOffset: Math.round((shiftedDay - baseDay) / 86400000),
    };
}
export function resolveTrueSolarDateTime(input, longitude) {
    const { birthYear, birthMonth, birthDay, birthHour, birthMinute = 0 } = input;
    // 经度校正：每度 4 分钟
    const longitudeCorrection = (longitude - STANDARD_MERIDIAN) * 4;
    // 时差方程校正
    const dayOfYear = getDayOfYear(birthYear, birthMonth, birthDay);
    const eot = equationOfTime(dayOfYear, birthYear);
    // 总校正量（分钟）
    const totalCorrectionMinutes = longitudeCorrection + eot;
    const roundedCorrectionMinutes = Math.round(totalCorrectionMinutes);
    const resolvedDateTime = applyMinuteOffsetToSolarDateTime(input, roundedCorrectionMinutes);
    const trueTimeIndex = hourToTimeIndex(resolvedDateTime.hour + resolvedDateTime.minute / 60);
    return {
        ...resolvedDateTime,
        trueSolarTimeInfo: {
            clockTime: `${String(birthHour).padStart(2, '0')}:${String(birthMinute).padStart(2, '0')}`,
            trueSolarTime: `${String(resolvedDateTime.hour).padStart(2, '0')}:${String(resolvedDateTime.minute).padStart(2, '0')}`,
            longitude,
            correctionMinutes: Math.round(totalCorrectionMinutes * 10) / 10,
            trueTimeIndex,
            dayOffset: resolvedDateTime.dayOffset,
        },
    };
}
/**
 * 计算真太阳时
 *
 * 公式: 真太阳时 = 钟表时间 + (经度 - 120°) × 4分钟 + 时差方程(日期)
 *
 * @param input 出生时间参数（公历）
 * @param longitude 出生地经度（东经为正，西经为负；中国范围约 73°~135°）
 * @returns 真太阳时信息，包含校正后的小时分钟和时辰索引
 */
export function calculateTrueSolarTime(input, longitude) {
    return resolveTrueSolarDateTime(input, longitude).trueSolarTimeInfo;
}
/** 校验出生参数并创建星盘 */
export function createAstrolabe(input) {
    const { gender, birthYear, birthMonth, birthDay, birthHour, birthMinute = 0, calendarType = 'solar', isLeapMonth = false, } = input;
    if (gender !== 'male' && gender !== 'female') {
        throw new Error('gender 必须是 "male" 或 "female"');
    }
    if (!Number.isInteger(birthYear) || birthYear < 1900 || birthYear > 2100) {
        throw new Error('birthYear 必须是 1900-2100 之间的整数');
    }
    if (!Number.isInteger(birthMonth) || birthMonth < 1 || birthMonth > 12) {
        throw new Error('birthMonth 必须是 1-12 之间的整数');
    }
    if (!Number.isInteger(birthDay) || birthDay < 1) {
        throw new Error('birthDay 必须是合法日期');
    }
    if (calendarType === 'solar') {
        const maxSolarDay = new Date(birthYear, birthMonth, 0).getDate();
        if (birthDay > maxSolarDay) {
            throw new Error(`birthDay 必须是 1-${maxSolarDay} 之间的整数`);
        }
    }
    else if (birthDay > 30) {
        throw new Error('birthDay 必须是 1-30 之间的整数');
    }
    if (!Number.isInteger(birthHour) || birthHour < 0 || birthHour > 23) {
        throw new Error('birthHour 必须是 0-23 之间的整数');
    }
    const dateStr = `${birthYear}-${birthMonth}-${birthDay}`;
    const hourValue = birthHour + birthMinute / 60;
    const timeIndex = hourToTimeIndex(hourValue);
    const genderStr = gender === 'male' ? '男' : '女';
    if (calendarType === 'lunar') {
        return astro.byLunar(dateStr, timeIndex, genderStr, isLeapMonth, true, 'zh-CN');
    }
    return astro.bySolar(dateStr, timeIndex, genderStr, true, 'zh-CN');
}
/**
 * 创建星盘（支持真太阳时校正）
 *
 * 当提供 longitude 时，先计算真太阳时，再用归一化后的日期与时辰索引排盘。
 */
export function createAstrolabeWithTrueSolar(input) {
    const { longitude, ...baseInput } = input;
    if (longitude == null) {
        return { astrolabe: createAstrolabe(baseInput) };
    }
    if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
        throw new Error('longitude 必须是 -180 到 180 之间的数字');
    }
    const { gender, birthYear, birthMonth, birthDay, birthHour, birthMinute = 0, calendarType = 'solar', isLeapMonth = false, } = input;
    const resolvedDateTime = resolveTrueSolarDateTime({ birthYear, birthMonth, birthDay, birthHour, birthMinute }, longitude);
    const trueSolarTimeInfo = resolvedDateTime.trueSolarTimeInfo;
    const dateStr = `${resolvedDateTime.year}-${resolvedDateTime.month}-${resolvedDateTime.day}`;
    const genderStr = gender === 'male' ? '男' : '女';
    // 使用真太阳时的时辰索引排盘
    if (calendarType === 'lunar') {
        return {
            astrolabe: astro.byLunar(dateStr, trueSolarTimeInfo.trueTimeIndex, genderStr, isLeapMonth, true, 'zh-CN'),
            trueSolarTimeInfo,
        };
    }
    return {
        astrolabe: astro.bySolar(dateStr, trueSolarTimeInfo.trueTimeIndex, genderStr, true, 'zh-CN'),
        trueSolarTimeInfo,
    };
}
