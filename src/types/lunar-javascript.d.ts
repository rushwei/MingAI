/**
 * lunar-javascript 库的类型声明
 * 
 * lunar-javascript 是一个纯 JavaScript 库，没有官方 TypeScript 类型
 * 这个文件为项目中使用的 API 提供基本类型定义
 */

declare module 'lunar-javascript' {
    /**
     * 公历日期类
     */
    export class Solar {
        /**
         * 从年月日时分秒创建 Solar 对象
         */
        static fromYmdHms(
            year: number,
            month: number,
            day: number,
            hour?: number,
            minute?: number,
            second?: number
        ): Solar;

        /**
         * 从年月日创建 Solar 对象
         */
        static fromYmd(year: number, month: number, day: number): Solar;

        /**
         * 获取农历日期
         */
        getLunar(): Lunar;

        /**
         * 获取年
         */
        getYear(): number;

        /**
         * 获取月
         */
        getMonth(): number;

        /**
         * 获取日
         */
        getDay(): number;

        /**
         * 获取时
         */
        getHour(): number;

        /**
         * 获取分
         */
        getMinute(): number;
    }

    /**
     * 农历日期类
     */
    export class Lunar {
        /**
         * 从农历年月日创建 Lunar 对象
         */
        static fromYmd(year: number, month: number, day: number): Lunar;

        /**
         * 获取公历日期
         */
        getSolar(): Solar;

        /**
         * 获取八字
         */
        getEightChar(): EightChar;

        /**
         * 获取农历年
         */
        getYear(): number;

        /**
         * 获取农历月
         */
        getMonth(): number;

        /**
         * 获取农历日
         */
        getDay(): number;
    }

    /**
     * 八字类
     */
    export class EightChar {
        /**
         * 获取年柱天干
         */
        getYearGan(): string;

        /**
         * 获取年柱地支
         */
        getYearZhi(): string;

        /**
         * 获取月柱天干
         */
        getMonthGan(): string;

        /**
         * 获取月柱地支
         */
        getMonthZhi(): string;

        /**
         * 获取日柱天干
         */
        getDayGan(): string;

        /**
         * 获取日柱地支
         */
        getDayZhi(): string;

        /**
         * 获取时柱天干
         */
        getTimeGan(): string;

        /**
         * 获取时柱地支
         */
        getTimeZhi(): string;

        /**
         * 获取年柱
         */
        getYear(): string;

        /**
         * 获取月柱
         */
        getMonth(): string;

        /**
         * 获取日柱
         */
        getDay(): string;

        /**
         * 获取时柱
         */
        getTime(): string;
    }
}
