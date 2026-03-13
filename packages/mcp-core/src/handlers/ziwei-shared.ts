/**
 * 紫微斗数共享工具函数
 */

import { astro, type Astrolabe, type Star } from 'iztro';
import type { BirthTimeInput, Gender, StarInfo } from '../types.js';

export const MUTAGEN_NAMES = ['禄', '权', '科', '忌'] as const;
export type MutagenName = typeof MUTAGEN_NAMES[number];

/** 将 iztro Star 映射为 StarInfo */
export function mapStar(star: Star): StarInfo {
  return {
    name: star.name,
    type: star.type,
    brightness: star.brightness,
    mutagen: star.mutagen,
  };
}

/** 将小时转换为时辰索引（早子时=0, 丑时=1, ..., 晚子时=12） */
export function hourToTimeIndex(hour: number): number {
  if (hour >= 23) return 12;
  if (hour >= 0 && hour < 1) return 0;
  return Math.floor((hour + 1) / 2);
}

/** 校验出生参数并创建星盘 */
export function createAstrolabe(input: BirthTimeInput & { gender: Gender }): Astrolabe {
  const {
    gender,
    birthYear,
    birthMonth,
    birthDay,
    birthHour,
    birthMinute = 0,
    calendarType = 'solar',
    isLeapMonth = false,
  } = input;

  if (gender !== 'male' && gender !== 'female') {
    throw new Error('gender 必须是 "male" 或 "female"');
  }
  if (!Number.isInteger(birthYear) || birthYear < 1900 || birthYear > 2100) {
    throw new Error('birthYear 必须是 1900-2100 之间的整数');
  }
  if (!Number.isInteger(birthMonth) || birthMonth < 1 || birthMonth > 12) {
    throw new Error('birthMonth 必须是 1-12 之间的整数');
  }
  if (!Number.isInteger(birthDay) || birthDay < 1 || birthDay > 30) {
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
