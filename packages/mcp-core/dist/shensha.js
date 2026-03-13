// 从数据模块导入
import { TIAN_YI_GUI_REN, TAI_JI_GUI_REN, YANG_REN, WEN_CHANG, YI_MA, TAO_HUA, HUA_GAI, LU_SHEN, JIE_SHA, WANG_SHEN, GU_CHEN, GUA_SU, JIANG_XING, TIAN_CHU, GUO_YIN, XUE_TANG, CI_GUAN, HONG_LUAN, TIAN_XI, TIAN_YI, DIAO_KE, SANG_MEN, XUE_REN, PI_TOU, FU_XING, ZAI_SHA, LIU_XIA, HONG_YAN, GOU_SHA, JIAO_SHA, BAI_HU, FEI_REN, KUI_GANG, YIN_CHA_YANG_CUO, SHI_E_DA_BAI, BA_ZHUAN, JIN_SHEN, GU_LUAN, } from './data/shensha-data.js';
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
    const { yearStem, yearBranch, monthBranch, dayStem, dayBranch, kongWang } = context;
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
    matchMapValue(XUE_REN, dayBranch, targetBranch, '血刃', names);
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
