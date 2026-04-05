import type { AlmanacInfo } from '../shared/types.js';
export interface FortuneInput {
    dayMaster?: string;
    birthYear?: number;
    birthMonth?: number;
    birthDay?: number;
    birthHour?: number;
    date?: string;
}
export interface FortuneOutput {
    date: string;
    dayInfo: {
        stem: string;
        branch: string;
        ganZhi: string;
    };
    tenGod?: string;
    almanac: AlmanacInfo;
}
//# sourceMappingURL=types.d.ts.map