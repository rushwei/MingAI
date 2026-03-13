/**
 * 紫微斗数运限处理器
 */
import { createAstrolabe } from './ziwei-shared.js';
function mapPeriod(item) {
    return {
        index: item.index,
        name: item.name,
        heavenlyStem: item.heavenlyStem,
        earthlyBranch: item.earthlyBranch,
        palaceNames: item.palaceNames,
        mutagen: item.mutagen,
    };
}
export async function handleZiweiHoroscope(input) {
    const astrolabe = createAstrolabe(input);
    const { targetDate, targetTimeIndex } = input;
    const horoscope = astrolabe.horoscope(targetDate, targetTimeIndex);
    return {
        solarDate: astrolabe.solarDate || '',
        lunarDate: astrolabe.lunarDate || '',
        soul: astrolabe.soul || '',
        body: astrolabe.body || '',
        fiveElement: astrolabe.fiveElementsClass || '',
        targetDate: targetDate || new Date().toISOString().slice(0, 10),
        decadal: mapPeriod(horoscope.decadal),
        age: { ...mapPeriod(horoscope.age), nominalAge: horoscope.age.nominalAge },
        yearly: mapPeriod(horoscope.yearly),
        monthly: mapPeriod(horoscope.monthly),
        daily: mapPeriod(horoscope.daily),
        hourly: mapPeriod(horoscope.hourly),
    };
}
