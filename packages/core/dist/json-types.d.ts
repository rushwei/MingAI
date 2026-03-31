/**
 * CanonicalJSON 输出类型定义
 * 与 text.ts 的 render*CanonicalText() 平行，提供结构化 JSON 输出。
 */
export interface TrueSolarTimeJSON {
    钟表时间: string;
    真太阳时: string;
    经度: number;
    校正分钟: number;
}
export interface HiddenStemJSON {
    天干: string;
    十神: string;
    气性?: string;
}
export interface BranchRelationJSON {
    类型: string;
    地支: string[];
    描述: string;
}
export interface LiunianItemJSON {
    流年: number;
    年龄: number;
    干支: string;
    天干: string;
    地支: string;
    十神: string;
    纳音?: string;
    藏干: HiddenStemJSON[];
    地势?: string;
    神煞?: string[];
    原局关系?: BranchRelationJSON[];
    太岁关系?: string[];
}
export interface DayunItemJSON {
    起运年份: number;
    起运年龄?: number;
    干支: string;
    天干?: string;
    地支?: string;
    十神: string;
    地支主气十神?: string;
    藏干: HiddenStemJSON[];
    地势?: string;
    纳音?: string;
    神煞?: string[];
    原局关系?: BranchRelationJSON[];
    流年列表?: LiunianItemJSON[];
}
export interface BaziPillarJSON {
    柱: string;
    干支: string;
    天干十神: string;
    藏干: HiddenStemJSON[];
    地势: string;
    纳音?: string;
    神煞?: string[];
    空亡?: '是';
}
export interface BaziCanonicalJSON {
    基本信息: {
        性别: string;
        日主: string;
        命主五行?: string;
        空亡?: string[];
        出生地?: string;
        真太阳时?: TrueSolarTimeJSON;
        胎元?: string;
        命宫?: string;
    };
    四柱: BaziPillarJSON[];
    干支关系: string[];
    大运?: {
        起运信息: string;
        大运列表: DayunItemJSON[];
    };
}
export interface DerivedHexagramJSON {
    卦名: string;
    卦辞?: string;
    象辞?: string;
}
export interface LiuyaoYaoJSON {
    爻位: string;
    世应?: string;
    六亲: string;
    六神: string;
    纳甲: string;
    五行: string;
    旺衰: string;
    动静状态?: string;
    动静: string;
    空亡?: string;
    长生?: string;
    神煞?: string[];
    变爻?: {
        六亲: string;
        纳甲: string;
        五行: string;
        关系: string;
    };
    伏神?: {
        六亲: string;
        纳甲: string;
        五行: string;
        关系: string;
    };
}
export interface LiuyaoYongShenJSON {
    目标六亲: string;
    取用状态: string;
    取用说明?: string;
    已选用神: {
        爻位?: string;
        六亲: string;
        纳甲?: string;
        变爻纳甲?: string;
        化变类型?: string;
        五行?: string;
        来源?: string;
        动静状态?: string;
        是否世爻?: '是';
        是否应爻?: '是';
        空亡状态?: string;
        强弱: string;
        动静: string;
        依据?: string[];
    };
    候选用神?: Array<{
        爻位?: string;
        六亲: string;
        纳甲?: string;
        变爻纳甲?: string;
        化变类型?: string;
        五行?: string;
        来源?: string;
        动静状态?: string;
        是否世爻?: '是';
        是否应爻?: '是';
        空亡状态?: string;
        依据?: string[];
    }>;
    神煞系统?: {
        原神?: string;
        忌神?: string;
        仇神?: string;
    };
    应期提示?: Array<{
        触发: string;
        依据: string[];
        说明: string;
    }>;
}
export interface LiuyaoCanonicalJSON {
    卦盘: {
        问题?: string;
        本卦: {
            卦名: string;
            卦宫: string;
            五行: string;
            卦辞?: string;
            象辞?: string;
        };
        变卦?: {
            卦名: string;
            卦宫?: string;
            五行?: string;
            卦辞?: string;
            象辞?: string;
            动爻爻辞?: Array<{
                爻名: string;
                爻辞: string;
            }>;
        };
        互卦?: DerivedHexagramJSON;
        错卦?: DerivedHexagramJSON;
        综卦?: DerivedHexagramJSON;
        卦身?: {
            地支: string;
            位置?: string;
            状态?: string;
        };
    };
    干支时间: Array<{
        柱: string;
        干支: string;
        空亡: string[];
    }>;
    六爻: LiuyaoYaoJSON[];
    用神分析: LiuyaoYongShenJSON[];
    卦级分析: string[];
    提示: string[];
    全局神煞?: string[];
}
export interface LiuyaoAISafeLineJSON {
    position?: string;
    liuQin: string;
    naJia?: string;
    wuXing?: string;
    shiYing?: 'shi' | 'ying';
    shenSha?: string[];
    wangShuai?: string;
    movement?: string;
    kongWang?: string;
    changedTo?: {
        liuQin: string;
        naJia: string;
        wuXing: string;
    };
    transformation?: string;
}
export interface LiuyaoAISafeParticipantJSON {
    来源: '动爻' | '变爻' | '月建' | '日建';
    地支: string;
    位置?: string;
}
export interface LiuyaoAISafeBoardLineJSON {
    爻位: string;
    六神: string;
    神煞?: string[];
    伏神?: {
        六亲: string;
        纳甲: string;
        五行: string;
    };
    本爻: {
        六亲: string;
        纳甲: string;
        五行: string;
        旺衰?: string;
    };
    动静?: string;
    空亡?: string;
    变爻?: {
        六亲: string;
        纳甲: string;
        五行: string;
    };
    化变?: string;
    世应?: '世' | '应';
}
export interface LiuyaoAISafeLineFlagJSON {
    position: string;
    wangShuai: string;
    movement: string;
    kongWang?: string;
    transformation?: string;
}
export interface LiuyaoAISafeCombinationJSON {
    类型: '半合' | '三合';
    结果五行: string;
    参与者?: LiuyaoAISafeParticipantJSON[];
    名称?: string;
    位置?: string[];
}
export interface LiuyaoAISafeTransitionJSON {
    类型: '冲转合' | '合转冲';
}
export interface LiuyaoAISafeResonanceJSON {
    类型: '反吟' | '伏吟';
}
export interface LiuyaoAISafeJSON {
    卦盘: {
        问题?: string;
        本卦: {
            卦名: string;
            卦宫: string;
            五行: string;
            卦辞?: string;
        };
        变卦?: {
            卦名: string;
            卦宫?: string;
            五行?: string;
            卦辞?: string;
            动爻?: string[];
            动爻爻辞?: Array<{
                爻名: string;
                爻辞: string;
            }>;
        };
        干支时间: Array<{
            柱: string;
            干支: string;
            空亡: string[];
        }>;
        卦身?: {
            地支: string;
            位置?: string;
            状态?: string;
        };
        衍生卦?: {
            互卦?: {
                卦名: string;
            };
            错卦?: {
                卦名: string;
            };
            综卦?: {
                卦名: string;
            };
        };
        全局神煞?: string[];
    };
    六爻全盘: {
        爻列表: LiuyaoAISafeBoardLineJSON[];
    };
    全局互动: {
        组合关系: LiuyaoAISafeCombinationJSON[];
        冲合转换?: LiuyaoAISafeTransitionJSON[];
        反伏信息?: LiuyaoAISafeResonanceJSON[];
        是否六冲卦?: '是' | '否';
        是否六合卦?: '是' | '否';
        冲合趋势?: '冲转合' | '合转冲';
    };
    元信息: {
        细节级别: '默认' | '扩展' | '完整';
    };
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
    星名: string;
    亮度?: string;
    四化?: string;
    离心自化?: string;
    向心自化?: string;
}
export interface ZiweiBirthYearMutagenJSON {
    四化: '禄' | '权' | '科' | '忌';
    星曜: string;
    宫位: string;
}
export interface ZiweiPalaceJSON {
    宫位: string;
    宫位索引?: number;
    干支: string;
    是否身宫: '是' | '否';
    是否来因宫: '是' | '否';
    大限?: string;
    主星及四化: ZiweiStarJSON[];
    辅星: ZiweiStarJSON[];
    杂曜?: ZiweiStarJSON[];
    神煞?: string[];
    流年虚岁?: number[];
    小限虚岁?: number[];
}
export interface ZiweiCanonicalJSON {
    基本信息: {
        性别?: string;
        阳历: string;
        农历: string;
        四柱: string;
        命主: string;
        身主: string;
        五行局: string;
        生年四化?: {
            天干: string;
            四化星曜: ZiweiBirthYearMutagenJSON[];
        };
        时辰?: string;
        斗君?: string;
        命主星?: string;
        身主星?: string;
        真太阳时?: {
            钟表时间: string;
            真太阳时: string;
            经度: number;
            校正分钟: number;
            真太阳时索引: number;
            跨日偏移: string;
        };
    };
    十二宫位: ZiweiPalaceJSON[];
    小限?: Array<{
        宫位: string;
        虚岁: number[];
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
    起运信息: {
        起运年龄: number;
        起运详情: string;
    };
    小运?: Array<{
        年龄: number;
        干支: string;
        十神: string;
    }>;
    大运列表: DayunItemJSON[];
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