/**
 * CanonicalJSON 输出类型定义
 * 与 text.ts 的 render*CanonicalText() 平行，提供结构化 JSON 输出。
 */
export interface TrueSolarTimeJSON {
    clockTime: string;
    trueSolarTime: string;
    longitude: number;
    correctionMinutes: number;
}
export interface DayunItemJSON {
    startYear: number;
    ganZhi: string;
    tenGod: string;
    hiddenStems: Array<{
        stem: string;
        tenGod: string;
    }>;
    diShi: string;
    naYin: string;
    shenSha: string[];
}
export interface BaziPillarJSON {
    pillar: string;
    ganZhi: string;
    tenGod: string;
    hiddenStems: Array<{
        stem: string;
        tenGod: string;
    }>;
    diShi: string;
    naYin: string;
    shenSha: string[];
    isKong?: boolean;
}
export interface BaziCanonicalJSON {
    basicInfo: {
        gender: string;
        dayMaster: string;
        dayMasterElement: string;
        kongWang?: string[];
        birthPlace?: string;
        trueSolarTime?: TrueSolarTimeJSON;
        taiYuan?: string;
        mingGong?: string;
    };
    fourPillars: BaziPillarJSON[];
    relations: string[];
    dayun?: {
        startInfo: string;
        list: DayunItemJSON[];
    };
}
export interface DerivedHexagramJSON {
    name: string;
    guaCi?: string;
    xiangCi?: string;
}
export interface LiuyaoYaoJSON {
    position: string;
    shiYing?: string;
    liuQin: string;
    liuShen: string;
    naJia: string;
    wuXing: string;
    wangShuai: string;
    movementState?: string;
    movementLabel: string;
    kongWang?: string;
    changSheng?: string;
    shenSha?: string[];
    changedYao?: {
        liuQin: string;
        naJia: string;
        wuXing: string;
        relation: string;
    };
    fuShen?: {
        liuQin: string;
        naJia: string;
        wuXing: string;
        relation: string;
    };
}
export interface LiuyaoYongShenJSON {
    targetLiuQin: string;
    selectionStatus: string;
    selectionNote?: string;
    selected: {
        position?: string;
        liuQin: string;
        naJia?: string;
        changedNaJia?: string;
        huaType?: string;
        element?: string;
        source?: string;
        movementState?: string;
        isShiYao?: boolean;
        isYingYao?: boolean;
        kongWangState?: string;
        strengthLabel: string;
        movementLabel: string;
        evidence?: string[];
    };
    candidates?: Array<{
        position?: string;
        liuQin: string;
        naJia?: string;
        changedNaJia?: string;
        huaType?: string;
        element?: string;
        source?: string;
        movementState?: string;
        isShiYao?: boolean;
        isYingYao?: boolean;
        kongWangState?: string;
        evidence?: string[];
    }>;
    shenSystem?: {
        yuanShen?: string;
        jiShen?: string;
        chouShen?: string;
    };
    timeRecommendations?: Array<{
        trigger: string;
        basis: string[];
        description: string;
    }>;
}
export interface LiuyaoCanonicalJSON {
    hexagramInfo: {
        question?: string;
        mainHexagram: {
            name: string;
            gong: string;
            element: string;
            guaCi?: string;
            xiangCi?: string;
        };
        changedHexagram?: {
            name: string;
            gong?: string;
            element?: string;
            guaCi?: string;
            xiangCi?: string;
            changingYaoCi?: Array<{
                yaoName: string;
                yaoCi: string;
            }>;
        };
        nuclearHexagram?: DerivedHexagramJSON;
        oppositeHexagram?: DerivedHexagramJSON;
        reversedHexagram?: DerivedHexagramJSON;
        guaShen?: {
            branch: string;
            position?: string;
            absent: boolean;
        };
    };
    ganZhiTime: Array<{
        pillar: string;
        ganZhi: string;
        kongWang: string[];
    }>;
    yaos: LiuyaoYaoJSON[];
    yongShenAnalysis: LiuyaoYongShenJSON[];
    guaLevelAnalysis: string[];
    warnings: string[];
    globalShenSha?: string[];
}
export interface TarotCardJSON {
    position: string;
    cardName: string;
    direction: string;
    keywords: string[];
    meaning: string;
    element?: string;
    astrologicalCorrespondence?: string;
}
export interface TarotNumerologyCardJSON {
    name: string;
    keywords: string[];
    element?: string;
    astrologicalCorrespondence?: string;
}
export interface TarotCanonicalJSON {
    basicInfo: {
        spreadName: string;
        question?: string;
        birthDate?: string;
    };
    cards: TarotCardJSON[];
    numerology?: {
        personalityCard: TarotNumerologyCardJSON;
        soulCard: TarotNumerologyCardJSON;
        yearlyCard: TarotNumerologyCardJSON & {
            year: number;
        };
    };
}
export interface ZiweiStarJSON {
    name: string;
    brightness?: string;
    mutagen?: string;
    selfMutagen?: string;
    oppositeMutagen?: string;
}
export interface ZiweiPalaceJSON {
    name: string;
    index?: number;
    ganZhi: string;
    isBodyPalace: boolean;
    isOriginalPalace?: boolean;
    majorStars: ZiweiStarJSON[];
    minorStars: ZiweiStarJSON[];
    adjStars: ZiweiStarJSON[];
    shenSha: string[];
    decadalRange?: string;
    liuNianAges: number[];
    ages: number[];
}
export interface ZiweiCanonicalJSON {
    basicInfo: {
        gender?: string;
        solarDate: string;
        lunarDate: string;
        fourPillars: string;
        soul: string;
        body: string;
        fiveElement: string;
        time?: string;
        douJun?: string;
        lifeMasterStar?: string;
        bodyMasterStar?: string;
        trueSolarTime?: TrueSolarTimeJSON;
    };
    palaces: ZiweiPalaceJSON[];
    smallLimit?: Array<{
        palaceName: string;
        ages: number[];
    }>;
}
export interface QimenPalaceJSON {
    palaceName: string;
    palaceIndex: number;
    element: string;
    elementState?: string;
    deity: string;
    heavenStem: string;
    earthStem: string;
    star: string;
    gate: string;
    starElement?: string;
    gateElement?: string;
    formations: string[];
    isDayKong?: boolean;
    isHourKong?: boolean;
    isYiMa?: boolean;
    isRuMu?: boolean;
}
export interface QimenCanonicalJSON {
    basicInfo: {
        solarDate: string;
        lunarDate: string;
        solarTerm: string;
        solarTermRange?: string;
        fourPillars: string;
        ju: string;
        yuan: string;
        xunShou: string;
        panType: string;
        question?: string;
    };
    palaces: QimenPalaceJSON[];
    monthPhaseMap?: Record<string, string>;
}
export interface DaliurenCanonicalJSON {
    basicInfo: {
        date: string;
        lunarDate?: string;
        bazi: string;
        ganZhi: {
            year: string;
            month: string;
            day: string;
            hour: string;
        };
        yueJiang: string;
        kongWang: string[];
        yiMa: string;
        dingMa: string;
        tianMa: string;
        diurnal: string;
        keTi: {
            method: string;
            subTypes: string[];
            extraTypes: string[];
        };
        keName?: string;
        benMing?: string;
        xingNian?: string;
        question?: string;
    };
    siKe: Array<{
        ke: string;
        upper: string;
        lower: string;
        tianJiang: string;
    }>;
    sanChuan: Array<{
        chuan: string;
        branch: string;
        tianJiang: string;
        liuQin: string;
        dunGan: string;
    }>;
    gongInfos: Array<{
        diZhi: string;
        wuXing?: string;
        wangShuai?: string;
        tianZhi: string;
        tianJiang: string;
        dunGan: string;
        changSheng: string;
        jianChu: string;
    }>;
    shenSha: Record<string, string[]>;
}
export interface FortuneCanonicalJSON {
    basicInfo: {
        date: string;
        dayGanZhi: string;
        tenGod: string;
    };
    almanac: {
        lunarDate: string;
        zodiac: string;
        solarTerm?: string;
        chongSha?: string;
        pengZuBaiJi?: string;
        taiShen?: string;
        dayNineStar?: {
            description: string;
            position: string;
        };
        suitable: string[];
        avoid: string[];
        jishen: string[];
        xiongsha: string[];
    };
}
export interface DayunCanonicalJSON {
    startInfo: {
        startAge: number;
        detail: string;
    };
    list: DayunItemJSON[];
}
export interface BaziPillarsResolveCanonicalJSON {
    originalPillars: {
        yearPillar: string;
        monthPillar: string;
        dayPillar: string;
        hourPillar: string;
    };
    count: number;
    candidates: Array<{
        candidateId: string;
        lunarText: string;
        solarText: string;
        birthTime: string;
        isLeapMonth: boolean;
    }>;
}
export interface ZiweiHoroscopeCanonicalJSON {
    basicInfo: {
        solarDate: string;
        lunarDate: string;
        soul: string;
        body: string;
        fiveElement: string;
        targetDate: string;
    };
    periods: Array<{
        label: string;
        palaceIndex: number;
        name: string;
        ganZhi: string;
        mutagen: string[];
        palaceNames: string[];
        nominalAge?: number;
    }>;
    transitStars?: Array<{
        starName: string;
        palaceName: string;
    }>;
    yearlyDecStar?: {
        suiqian12: string[];
        jiangqian12: string[];
    };
}
export interface ZiweiFlyingStarResultJSON {
    queryIndex: number;
    type: string;
    booleanResult?: boolean;
    mutagedPlaces?: Array<{
        mutagen: string;
        targetPalace: string | null;
    }>;
    surroundedPalaces?: {
        target: string;
        opposite: string;
        wealth: string;
        career: string;
    };
}
export interface ZiweiFlyingStarCanonicalJSON {
    results: ZiweiFlyingStarResultJSON[];
}
//# sourceMappingURL=json-types.d.ts.map