declare module 'lunar-javascript' {
  export class Solar {
    static fromDate(date: Date): Solar;
    static fromYmdHms(
      year: number,
      month: number,
      day: number,
      hour: number,
      minute: number,
      second: number
    ): Solar;
    getLunar(): Lunar;
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getHour(): number;
    getMinute(): number;
  }

  export class Lunar {
    static fromYmdHms(
      year: number,
      month: number,
      day: number,
      hour: number,
      minute: number,
      second: number
    ): Lunar;
    getEightChar(): EightChar;
    getDay(): LunarDay;
    getSolar(): Solar;
    getYear(): number;
    getMonth(): number;
    toString(): string;
    getMonthInChinese(): string;
    getDayInChinese(): string;
    getYearShengXiao(): string;
    getJieQi(): string | null;
    // 黄历相关方法
    getDayYi(): string[];
    getDayJi(): string[];
    getDayChongDesc(): string;
    getDaySha(): string;
    getPengZuGan(): string[];
    getPengZuZhi(): string[];
    getDayJiShen(): string[];
    getDayXiongSha(): string[];
  }

  export class EightChar {
    getYearGan(): string;
    getYearZhi(): string;
    getMonthGan(): string;
    getMonthZhi(): string;
    getDayGan(): string;
    getDayZhi(): string;
    getTimeGan(): string;
    getTimeZhi(): string;
    getYun(gender: number): Yun;
  }

  export class Yun {
    getStartYear(): number;
    getStartSolar(): Solar;
    getDaYun(): DaYun[];
  }

  export class DaYun {
    getStartAge(): number;
    getGanZhi(): string;
  }

  export class LunarDay {
    getYi(): string[];
    getJi(): string[];
    getChongDesc(): string;
    getSha(): string;
    getPengZuGan(): string[];
    getPengZuZhi(): string[];
    getDayJiShen(): string[];
    getDayXiongSha(): string[];
  }
}
