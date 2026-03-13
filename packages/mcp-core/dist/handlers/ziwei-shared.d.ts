/**
 * 紫微斗数共享工具函数
 */
import { type Astrolabe, type Star } from 'iztro';
import type { BirthTimeInput, Gender, StarInfo } from '../types.js';
export declare const MUTAGEN_NAMES: readonly ["禄", "权", "科", "忌"];
export type MutagenName = typeof MUTAGEN_NAMES[number];
/** 将 iztro Star 映射为 StarInfo */
export declare function mapStar(star: Star): StarInfo;
/** 将小时转换为时辰索引（早子时=0, 丑时=1, ..., 晚子时=12） */
export declare function hourToTimeIndex(hour: number): number;
/** 校验出生参数并创建星盘 */
export declare function createAstrolabe(input: BirthTimeInput & {
    gender: Gender;
}): Astrolabe;
//# sourceMappingURL=ziwei-shared.d.ts.map