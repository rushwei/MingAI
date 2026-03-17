export function getTimeZoneOffsetMinutes(timeZone, date) {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
    const parts = formatter.formatToParts(date);
    const values = {};
    for (const part of parts) {
        if (part.type !== 'literal') {
            values[part.type] = Number(part.value);
        }
    }
    const asUTC = Date.UTC(values.year, (values.month ?? 1) - 1, values.day ?? 1, values.hour ?? 0, values.minute ?? 0, values.second ?? 0);
    return (asUTC - date.getTime()) / 60000;
}
export function zonedTimeToUtc(input, timeZone) {
    const { year, month, day, hour, minute = 0, second = 0 } = input;
    const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
    let offsetMinutes;
    try {
        offsetMinutes = getTimeZoneOffsetMinutes(timeZone, utcGuess);
    }
    catch (error) {
        if (error instanceof RangeError) {
            throw new Error('timezone 无效');
        }
        throw error;
    }
    return new Date(utcGuess.getTime() - offsetMinutes * 60000);
}
