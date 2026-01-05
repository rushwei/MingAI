import type { BaziFormData } from '@/types';

export const DEFAULT_BAZI_FORM_DATA: BaziFormData = {
    name: '',
    gender: 'male',
    birthYear: 1990,
    birthMonth: 1,
    birthDay: 1,
    birthHour: 12,
    birthMinute: 0,
    calendarType: 'solar',
    birthPlace: '',
};

export const CURRENT_YEAR = new Date().getFullYear();
export const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 1900 + 1 }, (_, i) => CURRENT_YEAR - i);
export const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);
export const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => i + 1);

export type HourOption = {
    value: number;
    name: string;
    time: string;
};

export const HOUR_OPTIONS: HourOption[] = [
    { value: 0, name: '子时', time: '23:00-01:00' },
    { value: 1, name: '丑时', time: '01:00-03:00' },
    { value: 3, name: '寅时', time: '03:00-05:00' },
    { value: 5, name: '卯时', time: '05:00-07:00' },
    { value: 7, name: '辰时', time: '07:00-09:00' },
    { value: 9, name: '巳时', time: '09:00-11:00' },
    { value: 11, name: '午时', time: '11:00-13:00' },
    { value: 13, name: '未时', time: '13:00-15:00' },
    { value: 15, name: '申时', time: '15:00-17:00' },
    { value: 17, name: '酉时', time: '17:00-19:00' },
    { value: 19, name: '戌时', time: '19:00-21:00' },
    { value: 21, name: '亥时', time: '21:00-23:00' },
];
