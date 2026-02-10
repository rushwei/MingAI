const TIAN_YI_GUI_REN = {
    '甲': ['丑', '未'], '乙': ['子', '申'], '丙': ['亥', '酉'], '丁': ['亥', '酉'],
    '戊': ['丑', '未'], '己': ['子', '申'], '庚': ['丑', '未'], '辛': ['寅', '午'],
    '壬': ['卯', '巳'], '癸': ['卯', '巳'],
};
const TAI_JI_GUI_REN = {
    '甲': ['子', '午'], '乙': ['子', '午'], '丙': ['卯', '酉'], '丁': ['卯', '酉'],
    '戊': ['辰', '戌', '丑', '未'], '己': ['辰', '戌', '丑', '未'],
    '庚': ['寅', '亥'], '辛': ['寅', '亥'], '壬': ['巳', '申'], '癸': ['巳', '申'],
};
const YANG_REN = {
    '甲': '卯', '乙': '辰', '丙': '午', '丁': '未',
    '戊': '午', '己': '未', '庚': '酉', '辛': '戌',
    '壬': '子', '癸': '丑',
};
const WEN_CHANG = {
    '甲': '巳', '乙': '午', '丙': '申', '丁': '酉',
    '戊': '申', '己': '酉', '庚': '亥', '辛': '子',
    '壬': '寅', '癸': '卯',
};
const YI_MA = {
    '寅': '申', '午': '申', '戌': '申',
    '申': '寅', '子': '寅', '辰': '寅',
    '巳': '亥', '酉': '亥', '丑': '亥',
    '亥': '巳', '卯': '巳', '未': '巳',
};
const TAO_HUA = {
    '寅': '卯', '午': '卯', '戌': '卯',
    '申': '酉', '子': '酉', '辰': '酉',
    '巳': '午', '酉': '午', '丑': '午',
    '亥': '子', '卯': '子', '未': '子',
};
const HUA_GAI = {
    '寅': '戌', '午': '戌', '戌': '戌',
    '申': '辰', '子': '辰', '辰': '辰',
    '巳': '丑', '酉': '丑', '丑': '丑',
    '亥': '未', '卯': '未', '未': '未',
};
const LU_SHEN = {
    '甲': '寅', '乙': '卯', '丙': '巳', '丁': '午',
    '戊': '巳', '己': '午', '庚': '申', '辛': '酉',
    '壬': '亥', '癸': '子',
};
const JIE_SHA = {
    '寅': '巳', '午': '巳', '戌': '巳',
    '申': '亥', '子': '亥', '辰': '亥',
    '亥': '申', '卯': '申', '未': '申',
    '巳': '寅', '酉': '寅', '丑': '寅',
};
const WANG_SHEN = {
    '寅': '亥', '午': '亥', '戌': '亥',
    '申': '巳', '子': '巳', '辰': '巳',
    '亥': '寅', '卯': '寅', '未': '寅',
    '巳': '申', '酉': '申', '丑': '申',
};
const GU_CHEN = {
    '寅': '巳', '卯': '巳', '辰': '巳',
    '巳': '申', '午': '申', '未': '申',
    '申': '亥', '酉': '亥', '戌': '亥',
    '亥': '寅', '子': '寅', '丑': '寅',
};
const GUA_SU = {
    '寅': '丑', '卯': '丑', '辰': '丑',
    '巳': '辰', '午': '辰', '未': '辰',
    '申': '未', '酉': '未', '戌': '未',
    '亥': '戌', '子': '戌', '丑': '戌',
};
const JIANG_XING = {
    '寅': '午', '午': '午', '戌': '午',
    '申': '子', '子': '子', '辰': '子',
    '巳': '酉', '酉': '酉', '丑': '酉',
    '亥': '卯', '卯': '卯', '未': '卯',
};
const TIAN_CHU = {
    '甲': '巳', '乙': '午', '丙': '巳', '丁': '午',
    '戊': '巳', '己': '午', '庚': '亥', '辛': '子',
    '壬': '亥', '癸': '子',
};
const GUO_YIN = {
    '甲': '戌', '乙': '亥', '丙': '丑', '丁': '寅',
    '戊': '丑', '己': '寅', '庚': '辰', '辛': '巳',
    '壬': '未', '癸': '申',
};
const XUE_TANG = {
    '甲': '亥', '乙': '午', '丙': '寅', '丁': '酉',
    '戊': '寅', '己': '酉', '庚': '巳', '辛': '子',
    '壬': '申', '癸': '卯',
};
const CI_GUAN = {
    '甲': '寅', '乙': '卯', '丙': '巳', '丁': '午',
    '戊': '辰', '己': '未', '庚': '申', '辛': '酉',
    '壬': '亥', '癸': '子',
};
const HONG_LUAN = {
    '子': '卯', '丑': '寅', '寅': '丑', '卯': '子',
    '辰': '亥', '巳': '戌', '午': '酉', '未': '申',
    '申': '未', '酉': '午', '戌': '巳', '亥': '辰',
};
const TIAN_XI = {
    '子': '酉', '丑': '申', '寅': '未', '卯': '午',
    '辰': '巳', '巳': '辰', '午': '卯', '未': '寅',
    '申': '丑', '酉': '子', '戌': '亥', '亥': '戌',
};
const TIAN_YI = {
    '寅': '丑', '卯': '寅', '辰': '卯', '巳': '辰',
    '午': '巳', '未': '午', '申': '未', '酉': '申',
    '戌': '酉', '亥': '戌', '子': '亥', '丑': '子',
};
const DIAO_KE = {
    '子': '酉', '丑': '戌', '寅': '亥', '卯': '子',
    '辰': '丑', '巳': '寅', '午': '卯', '未': '辰',
    '申': '巳', '酉': '午', '戌': '未', '亥': '申',
};
const SANG_MEN = {
    '子': '寅', '丑': '卯', '寅': '辰', '卯': '巳',
    '辰': '午', '巳': '未', '午': '申', '未': '酉',
    '申': '戌', '酉': '亥', '戌': '子', '亥': '丑',
};
const XUE_REN = {
    '甲': '卯', '乙': '辰', '丙': '午', '丁': '未',
    '戊': '午', '己': '未', '庚': '酉', '辛': '戌',
    '壬': '子', '癸': '丑',
};
const PI_TOU = {
    '子': '巳', '丑': '午', '寅': '未', '卯': '申',
    '辰': '酉', '巳': '戌', '午': '亥', '未': '子',
    '申': '丑', '酉': '寅', '戌': '卯', '亥': '辰',
};
const FU_XING = {
    '甲': '寅', '乙': '丑', '丙': '子', '丁': '亥',
    '戊': '申', '己': '未', '庚': '午', '辛': '巳',
    '壬': '辰', '癸': '卯',
};
const ZAI_SHA = {
    '寅': '午', '午': '午', '戌': '午',
    '申': '子', '子': '子', '辰': '子',
    '巳': '酉', '酉': '酉', '丑': '酉',
    '亥': '卯', '卯': '卯', '未': '卯',
};
const LIU_XIA = {
    '甲': '酉', '乙': '戌', '丙': '未', '丁': '申',
    '戊': '巳', '己': '午', '庚': '辰', '辛': '卯',
    '壬': '亥', '癸': '寅',
};
const HONG_YAN = {
    '甲': '午', '乙': '午', '丙': '寅', '丁': '未',
    '戊': '辰', '己': '辰', '庚': '戌', '辛': '酉',
    '壬': '子', '癸': '申',
};
const GOU_SHA = {
    '子': '酉', '丑': '戌', '寅': '亥', '卯': '子',
    '辰': '丑', '巳': '寅', '午': '卯', '未': '辰',
    '申': '巳', '酉': '午', '戌': '未', '亥': '申',
};
const JIAO_SHA = {
    '子': '卯', '丑': '寅', '寅': '丑', '卯': '子',
    '辰': '亥', '巳': '戌', '午': '酉', '未': '申',
    '申': '未', '酉': '午', '戌': '巳', '亥': '辰',
};
const BAI_HU = {
    '寅': '午', '卯': '未', '辰': '申', '巳': '酉',
    '午': '戌', '未': '亥', '申': '子', '酉': '丑',
    '戌': '寅', '亥': '卯', '子': '辰', '丑': '巳',
};
const FEI_REN = {
    '甲': '酉', '乙': '申', '丙': '子', '丁': '亥',
    '戊': '子', '己': '亥', '庚': '卯', '辛': '寅',
    '壬': '午', '癸': '巳',
};
const KUI_GANG = ['庚辰', '庚戌', '壬辰', '戊戌'];
const YIN_CHA_YANG_CUO = ['丙子', '丁丑', '戊寅', '辛卯', '壬辰', '癸巳', '丙午', '丁未', '戊申', '辛酉', '壬戌', '癸亥'];
const SHI_E_DA_BAI = ['甲辰', '乙巳', '壬申', '丙申', '丁亥', '庚辰', '戊戌', '癸亥', '辛巳', '己丑'];
const BA_ZHUAN = ['甲寅', '乙卯', '丙午', '丁未', '戊戌', '戊辰', '己未', '己丑', '庚申', '辛酉', '壬子', '癸丑'];
const JIN_SHEN = ['己丑', '己巳', '癸酉'];
const GU_LUAN = ['乙巳', '丁巳', '辛亥', '戊申', '甲寅', '丙午', '戊午', '壬子'];
function addUnique(target, value) {
    if (value && !target.includes(value)) {
        target.push(value);
    }
}
function matchValue(values, targetBranch, label, bag) {
    if (values && values.includes(targetBranch)) {
        addUnique(bag, label);
    }
}
function matchMapValue(map, key, targetBranch, label, bag) {
    if (map[key] && map[key] === targetBranch) {
        addUnique(bag, label);
    }
}
export function calculateBranchShenSha(context, targetBranch, options) {
    const { yearStem, yearBranch, monthBranch, dayStem, dayBranch, hourStem, kongWang } = context;
    const positionHint = options?.positionHint;
    const names = [];
    matchValue(TIAN_YI_GUI_REN[dayStem], targetBranch, '天乙贵人', names);
    matchValue(TAI_JI_GUI_REN[dayStem], targetBranch, '太极贵人', names);
    matchMapValue(LU_SHEN, dayStem, targetBranch, '禄神', names);
    matchMapValue(YANG_REN, dayStem, targetBranch, '羊刃', names);
    matchMapValue(WEN_CHANG, dayStem, targetBranch, '文昌', names);
    matchMapValue(YI_MA, dayBranch, targetBranch, '驿马', names);
    matchMapValue(TAO_HUA, dayBranch, targetBranch, '桃花', names);
    matchMapValue(HUA_GAI, dayBranch, targetBranch, '华盖', names);
    matchMapValue(JIE_SHA, dayBranch, targetBranch, '劫煞', names);
    matchMapValue(WANG_SHEN, dayBranch, targetBranch, '亡神', names);
    matchMapValue(TIAN_CHU, dayStem, targetBranch, '天厨', names);
    matchMapValue(GUO_YIN, dayStem, targetBranch, '国印贵人', names);
    matchMapValue(XUE_TANG, yearStem, targetBranch, '学堂', names);
    matchMapValue(CI_GUAN, dayStem, targetBranch, '词馆', names);
    matchMapValue(HONG_LUAN, yearBranch, targetBranch, '红鸾', names);
    matchMapValue(TIAN_XI, yearBranch, targetBranch, '天喜', names);
    matchMapValue(TIAN_YI, monthBranch, targetBranch, '天医', names);
    matchMapValue(DIAO_KE, yearBranch, targetBranch, '吊客', names);
    matchMapValue(SANG_MEN, yearBranch, targetBranch, '丧门', names);
    matchMapValue(XUE_REN, dayStem, targetBranch, '血刃', names);
    matchMapValue(PI_TOU, yearBranch, targetBranch, '披头', names);
    matchMapValue(FU_XING, dayStem, targetBranch, '福星贵人', names);
    matchMapValue(ZAI_SHA, yearBranch, targetBranch, '灾煞', names);
    matchMapValue(LIU_XIA, dayStem, targetBranch, '流霞', names);
    matchMapValue(HONG_YAN, dayStem, targetBranch, '红艳煞', names);
    matchMapValue(GOU_SHA, yearBranch, targetBranch, '勾煞', names);
    matchMapValue(JIAO_SHA, yearBranch, targetBranch, '绞煞', names);
    matchMapValue(BAI_HU, monthBranch, targetBranch, '白虎', names);
    matchMapValue(FEI_REN, dayStem, targetBranch, '飞刃', names);
    if (GU_CHEN[yearBranch] === targetBranch)
        addUnique(names, '孤辰');
    if (GUA_SU[yearBranch] === targetBranch)
        addUnique(names, '寡宿');
    if (JIANG_XING[yearBranch] === targetBranch)
        addUnique(names, '将星');
    if (kongWang?.kongZhi?.includes(targetBranch)) {
        addUnique(names, '空亡');
    }
    if (positionHint === 'year' && yearBranch === '辰' && (monthBranch === '巳' || dayBranch === '巳' || context.hourBranch === '巳')) {
        addUnique(names, '天罗');
    }
    if (positionHint === 'month' && monthBranch === '辰' && (yearBranch === '巳' || dayBranch === '巳' || context.hourBranch === '巳')) {
        addUnique(names, '天罗');
    }
    if (positionHint === 'year' && yearBranch === '戌' && (monthBranch === '亥' || dayBranch === '亥' || context.hourBranch === '亥')) {
        addUnique(names, '地网');
    }
    if (positionHint === 'month' && monthBranch === '戌' && (yearBranch === '亥' || dayBranch === '亥' || context.hourBranch === '亥')) {
        addUnique(names, '地网');
    }
    if (positionHint === 'day') {
        const dayPillar = `${dayStem}${dayBranch}`;
        if (KUI_GANG.includes(dayPillar))
            addUnique(names, '魁罡');
        if (YIN_CHA_YANG_CUO.includes(dayPillar))
            addUnique(names, '阴差阳错');
        if (SHI_E_DA_BAI.includes(dayPillar))
            addUnique(names, '十恶大败');
        if (BA_ZHUAN.includes(dayPillar))
            addUnique(names, '八专');
        if (JIN_SHEN.includes(dayPillar))
            addUnique(names, '金神');
        if (GU_LUAN.includes(dayPillar))
            addUnique(names, '孤鸾煞');
    }
    // 位置无关场景（如六爻逐爻）给出轻量全局命中提示
    if (!positionHint) {
        const dayPillar = `${dayStem}${dayBranch}`;
        if (KUI_GANG.includes(dayPillar))
            addUnique(names, '魁罡');
        if (YIN_CHA_YANG_CUO.includes(dayPillar))
            addUnique(names, '阴差阳错');
        if (SHI_E_DA_BAI.includes(dayPillar))
            addUnique(names, '十恶大败');
    }
    return names;
}
export function calculateGlobalShenSha(context) {
    const result = [];
    const dayPillar = `${context.dayStem}${context.dayBranch}`;
    if (KUI_GANG.includes(dayPillar))
        addUnique(result, '魁罡');
    if (YIN_CHA_YANG_CUO.includes(dayPillar))
        addUnique(result, '阴差阳错');
    if (SHI_E_DA_BAI.includes(dayPillar))
        addUnique(result, '十恶大败');
    if (BA_ZHUAN.includes(dayPillar))
        addUnique(result, '八专');
    if (JIN_SHEN.includes(dayPillar))
        addUnique(result, '金神');
    if (GU_LUAN.includes(dayPillar))
        addUnique(result, '孤鸾煞');
    if (context.yearBranch === '辰' && (context.monthBranch === '巳' || context.dayBranch === '巳' || context.hourBranch === '巳')) {
        addUnique(result, '天罗');
    }
    if (context.yearBranch === '戌' && (context.monthBranch === '亥' || context.dayBranch === '亥' || context.hourBranch === '亥')) {
        addUnique(result, '地网');
    }
    return result;
}
export function calculatePillarShenSha(context) {
    return {
        year: calculateBranchShenSha(context, context.yearBranch, { positionHint: 'year' }),
        month: calculateBranchShenSha(context, context.monthBranch, { positionHint: 'month' }),
        day: calculateBranchShenSha(context, context.dayBranch, { positionHint: 'day' }),
        hour: calculateBranchShenSha(context, context.hourBranch, { positionHint: 'hour' }),
    };
}
