/**
 * 紫微斗数共享工具函数
 */
import { type Astrolabe, type Star } from 'iztro';
import type { BirthTimeInput, Gender, StarInfo, TrueSolarTimeInfo } from '../types.js';
export declare const MUTAGEN_NAMES: readonly ["禄", "权", "科", "忌"];
export type MutagenName = typeof MUTAGEN_NAMES[number];
/** 天干四化表: stem → [禄星, 权星, 科星, 忌星] */
export declare const STEM_MUTAGEN_TABLE: Record<string, [string, string, string, string]>;
/** 计算流年虚岁列表 */
export declare function computeLiuNianAges(palaceBranch: string, birthYearBranch: string, max?: number): number[];
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
export declare function computeDouJun(lunarMonth: number, timeIndex: number): string;
/** 将 iztro Star 映射为 StarInfo */
export declare function mapStar(star: Star): StarInfo;
/** 将小时转换为时辰索引（早子时=0, 丑时=1, ..., 晚子时=12） */
export declare function hourToTimeIndex(hour: number): number;
/**
 * 计算真太阳时
 *
 * 公式: 真太阳时 = 钟表时间 + (经度 - 120°) × 4分钟 + 时差方程(日期)
 *
 * @param input 出生时间参数（公历）
 * @param longitude 出生地经度（东经为正，西经为负；中国范围约 73°~135°）
 * @returns 真太阳时信息，包含校正后的小时分钟和时辰索引
 */
export declare function calculateTrueSolarTime(input: {
    birthYear: number;
    birthMonth: number;
    birthDay: number;
    birthHour: number;
    birthMinute?: number;
}, longitude: number): TrueSolarTimeInfo;
/** 校验出生参数并创建星盘 */
export declare function createAstrolabe(input: BirthTimeInput & {
    gender: Gender;
}): Astrolabe;
/**
 * 创建星盘（支持真太阳时校正）
 *
 * 当提供 longitude 时，先计算真太阳时，再用校正后的时辰索引排盘。
 * 注意：真太阳时仅影响时辰索引（决定命宫位置），不改变日期本身。
 * 跨日情况（dayOffset !== 0）暂不调整日期，因为时辰边界才是命理关键。
 */
export declare function createAstrolabeWithTrueSolar(input: BirthTimeInput & {
    gender: Gender;
    longitude?: number;
}): {
    astrolabe: Astrolabe;
    trueSolarTimeInfo?: TrueSolarTimeInfo;
};
//# sourceMappingURL=ziwei-shared.d.ts.map