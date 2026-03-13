/**
 * 紫微斗数排盘处理器
 */
import { createAstrolabe, mapStar, MUTAGEN_NAMES } from './ziwei-shared.js';
export async function handleZiweiCalculate(input) {
    const astrolabe = createAstrolabe(input);
    const mutagenSummary = [];
    // 转换宫位数据
    const palaces = astrolabe.palaces.map((palace, idx) => {
        // 收集四化分布
        for (const star of [...palace.majorStars, ...palace.minorStars]) {
            if (star.mutagen && MUTAGEN_NAMES.includes(star.mutagen)) {
                mutagenSummary.push({
                    mutagen: star.mutagen,
                    starName: star.name,
                    palaceName: palace.name,
                });
            }
        }
        return {
            name: palace.name,
            heavenlyStem: palace.heavenlyStem,
            earthlyBranch: palace.earthlyBranch,
            isBodyPalace: palace.isBodyPalace,
            index: palace.index ?? idx,
            isOriginalPalace: palace.isOriginalPalace ?? false,
            changsheng12: palace.changsheng12,
            boshi12: palace.boshi12,
            jiangqian12: palace.jiangqian12,
            suiqian12: palace.suiqian12,
            ages: palace.ages,
            majorStars: palace.majorStars.map(mapStar),
            minorStars: palace.minorStars.map(mapStar),
            adjStars: (palace.adjectiveStars || []).map(mapStar),
        };
    });
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
        earthlyBranchOfSoulPalace: astrolabe.earthlyBranchOfSoulPalace,
        earthlyBranchOfBodyPalace: astrolabe.earthlyBranchOfBodyPalace,
        time: astrolabe.time,
        timeRange: astrolabe.timeRange,
        mutagenSummary,
    };
}
