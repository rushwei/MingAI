/**
 * 紫微斗数排盘处理器
 */
import { astro } from 'iztro';
// 将小时转换为时辰索引（子时=0, 丑时=1, ...）
function hourToTimeIndex(hour) {
    // 23:00-00:59 为子时（索引 0）
    if (hour >= 23 || hour < 1)
        return 0;
    return Math.floor((hour + 1) / 2);
}
export async function handleZiweiCalculate(input) {
    const { gender, birthYear, birthMonth, birthDay, birthHour, birthMinute = 0, calendarType = 'solar', isLeapMonth = false, } = input;
    const dateStr = `${birthYear}-${birthMonth}-${birthDay}`;
    const hourValue = birthHour + birthMinute / 60;
    const timeIndex = hourToTimeIndex(hourValue);
    const genderStr = gender === 'male' ? '男' : '女';
    let astrolabe;
    if (calendarType === 'lunar') {
        astrolabe = astro.byLunar(dateStr, timeIndex, genderStr, isLeapMonth, true, 'zh-CN');
    }
    else {
        astrolabe = astro.bySolar(dateStr, timeIndex, genderStr, true, 'zh-CN');
    }
    // 转换宫位数据
    const palaces = astrolabe.palaces.map((palace) => ({
        name: palace.name,
        heavenlyStem: palace.heavenlyStem,
        earthlyBranch: palace.earthlyBranch,
        isBodyPalace: palace.isBodyPalace,
        majorStars: palace.majorStars.map((star) => ({
            name: star.name,
            brightness: star.brightness,
            mutagen: star.mutagen,
        })),
        minorStars: palace.minorStars.map((star) => ({
            name: star.name,
            brightness: star.brightness,
            mutagen: star.mutagen,
        })),
        adjStars: (palace.adjectiveStars || palace.adjStars || []).map((star) => ({ name: star.name })),
    }));
    // 获取四柱
    const pillars = (astrolabe.chineseDate || '').split(' ');
    // 提取大限数据
    const decadalList = astrolabe.palaces.map((rawPalace, index) => {
        const decadal = rawPalace.decadal;
        return {
            startAge: decadal?.range?.[0] ?? 0,
            endAge: decadal?.range?.[1] ?? 0,
            heavenlyStem: decadal?.heavenlyStem ?? palaces[index].heavenlyStem,
            palace: {
                earthlyBranch: decadal?.earthlyBranch ?? palaces[index].earthlyBranch,
                name: palaces[index].name,
            },
        };
    }).sort((a, b) => a.startAge - b.startAge);
    return {
        solarDate: astrolabe.solarDate || '',
        lunarDate: astrolabe.lunarDate || '',
        fourPillars: {
            year: pillars[0] || '',
            month: pillars[1] || '',
            day: pillars[2] || '',
            hour: pillars[3] || '',
        },
        soul: astrolabe.soul || '',
        body: astrolabe.body || '',
        fiveElement: astrolabe.fiveElementsClass || '',
        zodiac: astrolabe.zodiac || '',
        sign: astrolabe.sign || '',
        palaces,
        decadalList,
    };
}
