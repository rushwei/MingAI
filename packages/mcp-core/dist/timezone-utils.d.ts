export type ZonedDateTimeInput = {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute?: number;
    second?: number;
};
export declare function getTimeZoneOffsetMinutes(timeZone: string, date: Date): number;
export declare function zonedTimeToUtc(input: ZonedDateTimeInput, timeZone: string): Date;
//# sourceMappingURL=timezone-utils.d.ts.map