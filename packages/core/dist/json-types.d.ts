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
    位置: string;
    塔罗牌: string;
    状态: string;
    核心基调: string[];
    元素?: string;
    星象?: string;
}
export interface TarotNumerologyCardJSON {
    对应塔罗: string;
    背景基调: string[];
    元素?: string;
    星象?: string;
    年份?: number;
}
export interface TarotCanonicalJSON {
    问卜设定: {
        牌阵: string;
        问题?: string;
        出生日期?: string;
        随机种子?: string;
    };
    牌阵展开: TarotCardJSON[];
    求问者生命数字?: {
        人格牌: TarotNumerologyCardJSON;
        灵魂牌: TarotNumerologyCardJSON;
        年度牌: TarotNumerologyCardJSON;
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
    宫名: string;
    宫位序号: number;
    宫位: string;
    宫位五行: string;
    八神: string;
    九星: string;
    九星五行?: string;
    八门: string;
    八门五行?: string;
    天盘天干: string;
    地盘天干: string;
    宫位状态: string[];
    方位?: string;
    格局?: string[];
    宫旺衰?: string;
    天盘天干五行?: string;
    地盘天干五行?: string;
}
export interface QimenCanonicalJSON {
    基本信息: {
        占问?: string;
        四柱: string;
        节气: string;
        局式: string;
        三元: string;
        旬首: string;
        值符: string;
        值使: string;
        公历?: string;
        农历?: string;
        节气范围?: string;
        盘式?: string;
        定局法?: string;
    };
    九宫盘: QimenPalaceJSON[];
    空亡信息?: {
        日空: {
            地支: string[];
            宫位: string[];
        };
        时空: {
            地支: string[];
            宫位: string[];
        };
    };
    驿马?: {
        地支: string;
        宫位: string;
    };
    十干月令旺衰?: Record<string, string>;
    全局格局?: string[];
}
export interface DaliurenCanonicalJSON {
    基本信息: {
        占事?: string;
        占测时间: string;
        昼夜: string;
        四柱: string;
        课式: string;
        月将: string;
        关键状态: {
            空亡: string[];
            驿马: string;
            丁马: string;
            天马: string;
        };
        农历?: string;
        月将名称?: string;
        本命?: string;
        行年?: string;
        附加课体?: string[];
    };
    四课: Array<{
        课别: string;
        乘将: string;
        上神: string;
        下神: string;
    }>;
    三传: Array<{
        传序: string;
        地支: string;
        天将: string;
        六亲: string;
        遁干: string;
    }>;
    天地盘: Array<{
        地盘: string;
        五行?: string;
        旺衰?: string;
        天盘: string;
        天将: string;
        遁干: string;
        长生十二神: string;
        建除?: string;
    }>;
}
export interface FortuneCanonicalJSON {
    基础与个性化坐标: {
        日期: string;
        日干支: string;
        流日十神?: string;
    };
    传统黄历基调: {
        农历: string;
        生肖: string;
        节气?: string;
        冲煞?: string;
        彭祖百忌?: string;
        胎神占方?: string;
        日九星?: {
            描述: string;
            方位: string;
        };
    };
    择日宜忌: {
        宜: string[];
        忌: string[];
    };
    神煞参考: {
        吉神宜趋?: string[];
        凶煞宜忌?: string[];
    };
    方位信息?: {
        财神: string;
        喜神: string;
        福神: string;
        阳贵人: string;
        阴贵人: string;
    };
    值日信息?: {
        建除十二值星?: string;
        天神?: string;
        天神类型?: string;
        天神吉凶?: string;
        二十八星宿?: string;
        星宿吉凶?: string;
        星宿歌诀?: string;
        日柱纳音?: string;
    };
    时辰吉凶?: Array<{
        时辰: string;
        天神?: string;
        天神类型?: string;
        天神吉凶?: string;
        冲煞?: string;
        宜?: string[];
        忌?: string[];
    }>;
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
    基本信息: {
        目标日期: string;
        五行局: string;
        阳历?: string;
        农历?: string;
        命主?: string;
        身主?: string;
    };
    运限叠宫: Array<{
        层次: string;
        时间段备注: string;
        宫位索引: number;
        干支: string;
        落入本命宫位: string;
        运限四化: string[];
        十二宫重排?: string[];
    }>;
    流年星曜?: {
        吉星分布: string[];
        煞星分布: string[];
        '桃花/文星': string[];
    };
    岁前十二星?: string[];
    将前十二星?: string[];
}
export interface ZiweiFlyingStarResultJSON {
    查询序号: number;
    查询类型: string;
    判断目标?: string;
    结果?: '是' | '否';
    发射宫位?: string;
    发射宫干支?: string;
    实际飞化?: Array<{
        四化: string;
        宫位: string | null;
        星曜?: string | null;
    }>;
    四化落宫?: Array<{
        四化: string;
        宫位: string | null;
        星曜?: string | null;
    }>;
    本宫?: string;
    矩阵宫位?: {
        对宫: string;
        三合1: string;
        三合2: string;
    };
}
export interface ZiweiFlyingStarCanonicalJSON {
    查询结果: ZiweiFlyingStarResultJSON[];
}
//# sourceMappingURL=json-types.d.ts.map