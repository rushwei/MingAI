export type ZonedDateTimeInput = {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute?: number;
    second?: number;
};
export declare const DEFAULT_DIVINATION_TIMEZONE = "Asia/Shanghai";
export declare function getTimeZoneOffsetMinutes(timeZone: string, date: Date): number;
export declare function zonedTimeToUtc(input: ZonedDateTimeInput, timeZone: string): Date;
export declare function zonedWallClockToSystemDate(input: ZonedDateTimeInput, timeZone: string): Date;
//# sourceMappingURL=timezone-utils.d.ts.map