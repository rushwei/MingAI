import type {
  AlmanacInfo
} from '../shared/types.js';

// ===== 运势相关类型 =====

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
