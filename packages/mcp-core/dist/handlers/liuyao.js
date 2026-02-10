/**
 * 六爻分析处理器
 * 完整实现六爻分析功能
 */
import { Solar } from 'lunar-javascript';
import { calculateBranchShenSha, calculateGlobalShenSha } from '../shensha.js';
import { GUA_CI, XIANG_CI, YAO_CI } from '../hexagram-texts.js';
// 旺衰标签
const WANG_SHUAI_LABELS = {
    wang: '旺', xiang: '相', xiu: '休', qiu: '囚', si: '死',
};
// 空亡状态标签
const KONG_WANG_LABELS = {
    'not_kong': '',
    'kong_static': '空',
    'kong_changing': '动空',
    'kong_ri_chong': '冲空',
    'kong_yue_jian': '临建',
};
const MOVEMENT_LABELS = {
    static: '静',
    changing: '明动',
    hidden_moving: '暗动',
    day_break: '日破',
};
// 卦辞简介
const HEXAGRAM_BRIEF = {
    '乾为天': '元亨利贞，君子自强不息。',
    '坤为地': '厚德载物，柔顺利贞。',
    '水雷屯': '万事开头难，需耐心等待时机。',
    '山水蒙': '蒙昧待启，虚心求教。',
    '水天需': '需要等待，养精蓄锐。',
    '天水讼': '争讼之象，宜和解退让。',
    '地水师': '众军出征，师出有名。',
    '水地比': '亲比和睦，广结善缘。',
    '风天小畜': '小有积蓄，量力而行。',
    '天泽履': '如履薄冰，谨慎行事。',
    '地天泰': '天地交泰，万事亨通。',
    '天地否': '天地不交，闭塞不通。',
    '天火同人': '志同道合，和衷共济。',
    '火天大有': '大有收获，富贵荣华。',
    '地山谦': '谦虚谨慎，受益无穷。',
    '雷地豫': '顺时而动，和乐安详。',
    '泽雷随': '随机应变，顺势而为。',
    '山风蛊': '整治弊端，革故鼎新。',
    '地泽临': '居高临下，亲民爱物。',
    '风地观': '观察形势，审时度势。',
    '火雷噬嗑': '刚柔相济，决断明快。',
    '山火贲': '文饰修养，内外兼修。',
    '山地剥': '剥落衰败，静待时机。',
    '地雷复': '一阳来复，否极泰来。',
    '天雷无妄': '无妄之灾，谨言慎行。',
    '山天大畜': '大有积蓄，厚积薄发。',
    '山雷颐': '颐养正道，慎言节食。',
    '泽风大过': '大过之时，独立不惧。',
    '坎为水': '险陷重重，以诚待人。',
    '离为火': '附丽光明，柔顺中正。',
    '泽山咸': '感应相通，男女和合。',
    '雷风恒': '恒久不变，持之以恒。',
    '天山遯': '退避隐遁，明哲保身。',
    '雷天大壮': '刚强壮盛，戒骄戒躁。',
    '火地晋': '日出地上，晋升有望。',
    '地火明夷': '光明受损，韬光养晦。',
    '风火家人': '家道正，天下定。',
    '火泽睽': '乖离背道，求同存异。',
    '水山蹇': '行路艰难，知难而退。',
    '雷水解': '解除困难，雨过天晴。',
    '山泽损': '损己益人，先损后益。',
    '风雷益': '损上益下，利有攸往。',
    '泽天夬': '决断刚毅，扬善去恶。',
    '天风姤': '不期而遇，柔遇刚也。',
    '泽地萃': '聚集汇合，顺天应人。',
    '地风升': '积小成大，步步高升。',
    '泽水困': '困顿穷厄，守正待时。',
    '水风井': '井养不穷，取之不竭。',
    '泽火革': '革故鼎新，顺天应人。',
    '火风鼎': '鼎新革故，养贤育才。',
    '震为雷': '震动惊惧，恐惧修省。',
    '艮为山': '止而不动，知止则吉。',
    '风山渐': '循序渐进，稳步前行。',
    '雷泽归妹': '归妹待时，守正不移。',
    '雷火丰': '丰盛光明，日中则昃。',
    '火山旅': '旅途在外，小心谨慎。',
    '巽为风': '顺入柔和，谦逊有礼。',
    '兑为泽': '喜悦和乐，利于交往。',
    '风水涣': '涣散离析，聚合人心。',
    '水泽节': '节制有度，苦节不可。',
    '风泽中孚': '诚信感人，中心诚信。',
    '雷山小过': '小有过越，宜下不宜上。',
    '水火既济': '功成名就，守成为要。',
    '火水未济': '未能成功，继续努力。',
};
// 爻辞数据（卦名 -> 六爻爻辞数组，从初爻到上爻）
// 十二长生顺序
const CHANG_SHENG_ORDER = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'];
const DI_ZHI_ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
// 五行长生起点（阳干顺行，阴干逆行）
const CHANG_SHENG_START = {
    '木': '亥', '火': '寅', '土': '寅', '金': '巳', '水': '申',
};
// 计算十二长生
function getChangSheng(yaoElement, naJia) {
    const startZhi = CHANG_SHENG_START[yaoElement];
    const startIdx = DI_ZHI_ORDER.indexOf(startZhi);
    const naJiaIdx = DI_ZHI_ORDER.indexOf(naJia);
    // 顺行计算
    const offset = (naJiaIdx - startIdx + 12) % 12;
    return CHANG_SHENG_ORDER[offset];
}
// 变爻分析标签
const HUA_TYPE_LABELS = {
    'hua_jin': '化进',
    'hua_tui': '化退',
    'hua_sheng': '化生',
    'hua_ke': '化克',
    'hua_kong': '化空',
    'hua_jue': '化绝',
    'hua_mu': '化墓',
    'fu_yin': '伏吟',
};
// 分析变爻（动爻变化后的状态）
function analyzeYaoChange(originalElement, changedElement, originalNaJia, changedNaJia, kongWang) {
    const order = ['木', '火', '土', '金', '水'];
    const origIdx = order.indexOf(originalElement);
    const changedIdx = order.indexOf(changedElement);
    // 检查化空
    if (kongWang.kongZhi.includes(changedNaJia)) {
        return { huaType: 'hua_kong', huaLabel: HUA_TYPE_LABELS['hua_kong'], isGood: false };
    }
    // 检查化墓
    const muZhi = { '木': '未', '火': '戌', '土': '戌', '金': '丑', '水': '辰' };
    if (changedNaJia === muZhi[originalElement]) {
        return { huaType: 'hua_mu', huaLabel: HUA_TYPE_LABELS['hua_mu'], isGood: false };
    }
    // 检查化绝
    const jueZhi = { '木': '申', '火': '亥', '土': '亥', '金': '寅', '水': '巳' };
    if (changedNaJia === jueZhi[originalElement]) {
        return { huaType: 'hua_jue', huaLabel: HUA_TYPE_LABELS['hua_jue'], isGood: false };
    }
    // 检查化生（变爻五行生原爻五行）
    if ((changedIdx + 1) % 5 === origIdx) {
        return { huaType: 'hua_sheng', huaLabel: HUA_TYPE_LABELS['hua_sheng'], isGood: true };
    }
    // 检查化克（变爻五行克原爻五行）
    if ((changedIdx + 2) % 5 === origIdx) {
        return { huaType: 'hua_ke', huaLabel: HUA_TYPE_LABELS['hua_ke'], isGood: false };
    }
    // 检查化进/化退（同五行地支进退）
    if (originalElement === changedElement) {
        const origNaJiaIdx = DI_ZHI_ORDER.indexOf(originalNaJia);
        const changedNaJiaIdx = DI_ZHI_ORDER.indexOf(changedNaJia);
        // 计算地支前进的步数（顺时针）
        const forwardSteps = (changedNaJiaIdx - origNaJiaIdx + 12) % 12;
        if (forwardSteps === 0) {
            return { huaType: 'fu_yin', huaLabel: HUA_TYPE_LABELS['fu_yin'], isGood: false };
        }
        // 如果前进步数在1-6之间，视为化进；否则视为化退
        if (forwardSteps > 0 && forwardSteps <= 6) {
            return { huaType: 'hua_jin', huaLabel: HUA_TYPE_LABELS['hua_jin'], isGood: true };
        }
        else {
            return { huaType: 'hua_tui', huaLabel: HUA_TYPE_LABELS['hua_tui'], isGood: false };
        }
    }
    // 默认化进
    return { huaType: 'hua_jin', huaLabel: HUA_TYPE_LABELS['hua_jin'], isGood: true };
}
// 六冲表
const LIU_CHONG = {
    '子': '午', '丑': '未', '寅': '申', '卯': '酉', '辰': '戌', '巳': '亥',
    '午': '子', '未': '丑', '申': '寅', '酉': '卯', '戌': '辰', '亥': '巳',
};
// 三合表
const SAN_HE_TABLE = [
    { branches: ['申', '子', '辰'], result: '水', name: '申子辰合水局' },
    { branches: ['亥', '卯', '未'], result: '木', name: '亥卯未合木局' },
    { branches: ['寅', '午', '戌'], result: '火', name: '寅午戌合火局' },
    { branches: ['巳', '酉', '丑'], result: '金', name: '巳酉丑合金局' },
];
// 半合表
const BAN_HE_TABLE = [
    { branches: ['申', '子'], result: '水', type: 'sheng' },
    { branches: ['子', '辰'], result: '水', type: 'mu' },
    { branches: ['亥', '卯'], result: '木', type: 'sheng' },
    { branches: ['卯', '未'], result: '木', type: 'mu' },
    { branches: ['寅', '午'], result: '火', type: 'sheng' },
    { branches: ['午', '戌'], result: '火', type: 'mu' },
    { branches: ['巳', '酉'], result: '金', type: 'sheng' },
    { branches: ['酉', '丑'], result: '金', type: 'mu' },
];
// 检查爻的空亡状态
function checkYaoKongWang(naJia, kongWang, monthZhi, dayZhi, isChanging) {
    const isKong = kongWang.kongZhi.includes(naJia);
    if (!isKong)
        return 'not_kong';
    // 日冲空亡
    if (LIU_CHONG[naJia] === dayZhi)
        return 'kong_ri_chong';
    // 月建临空
    if (naJia === monthZhi)
        return 'kong_yue_jian';
    // 动空
    if (isChanging)
        return 'kong_changing';
    // 静空
    return 'kong_static';
}
// 分析三合局
function analyzeSanHe(yaos, monthZhi, dayZhi) {
    const yaoZhis = yaos.map(y => y.naJia);
    const allZhis = [...yaoZhis, monthZhi, dayZhi];
    // 检查完整三合
    for (const sanHe of SAN_HE_TABLE) {
        const positions = [];
        let hasAll = true;
        for (const branch of sanHe.branches) {
            const pos = yaos.findIndex(y => y.naJia === branch);
            if (pos >= 0) {
                positions.push(pos + 1);
            }
            else if (branch !== monthZhi && branch !== dayZhi) {
                hasAll = false;
                break;
            }
        }
        if (hasAll && positions.length >= 2) {
            return {
                hasFullSanHe: true,
                fullSanHe: { name: sanHe.name, result: sanHe.result, positions },
                hasBanHe: false,
            };
        }
    }
    // 检查半合
    const banHeResults = [];
    for (const banHe of BAN_HE_TABLE) {
        const positions = [];
        for (const branch of banHe.branches) {
            const pos = yaos.findIndex(y => y.naJia === branch);
            if (pos >= 0)
                positions.push(pos + 1);
        }
        if (positions.length === 2 || (positions.length === 1 && (allZhis.includes(banHe.branches[0]) && allZhis.includes(banHe.branches[1])))) {
            banHeResults.push({
                branches: banHe.branches,
                result: banHe.result,
                type: banHe.type === 'sheng' ? '生方' : '墓方',
                positions,
            });
        }
    }
    return {
        hasFullSanHe: false,
        hasBanHe: banHeResults.length > 0,
        banHe: banHeResults.length > 0 ? banHeResults : undefined,
    };
}
// 检测六冲卦
function checkLiuChongGua(yaos) {
    // 六冲卦：初爻与四爻冲，二爻与五爻冲，三爻与六爻冲
    const pairs = [[0, 3], [1, 4], [2, 5]];
    let chongCount = 0;
    for (const [i, j] of pairs) {
        if (LIU_CHONG[yaos[i].naJia] === yaos[j].naJia) {
            chongCount++;
        }
    }
    if (chongCount >= 3) {
        return { isLiuChongGua: true, description: '六冲卦（主事散、急）' };
    }
    return { isLiuChongGua: false };
}
// 计算神系（原神、忌神、仇神）
function calculateShenSystem(_yongShenLiuQin, yongShenElement, yaos, gongElement) {
    const order = ['木', '火', '土', '金', '水'];
    const yongIdx = order.indexOf(yongShenElement);
    // 原神：生用神者
    const yuanElement = order[(yongIdx + 4) % 5];
    // 忌神：克用神者
    const jiElement = order[(yongIdx + 3) % 5];
    // 仇神：生忌神者（克原神者）
    const chouElement = order[(yongIdx + 2) % 5];
    const findPositions = (element) => yaos.filter(y => y.wuXing === element).map(y => y.position);
    const yuanPositions = findPositions(yuanElement);
    const jiPositions = findPositions(jiElement);
    const chouPositions = findPositions(chouElement);
    return {
        yuanShen: yuanPositions.length > 0 ? {
            liuQin: getLiuQin(gongElement, yuanElement),
            wuXing: yuanElement,
            positions: yuanPositions,
        } : undefined,
        jiShen: jiPositions.length > 0 ? {
            liuQin: getLiuQin(gongElement, jiElement),
            wuXing: jiElement,
            positions: jiPositions,
        } : undefined,
        chouShen: chouPositions.length > 0 ? {
            liuQin: getLiuQin(gongElement, chouElement),
            wuXing: chouElement,
            positions: chouPositions,
        } : undefined,
    };
}
function getYaoMovementState(yao, dayZhi, monthZhi) {
    if (yao.change === 'changing') {
        return 'changing';
    }
    const isDayChong = LIU_CHONG[yao.naJia] === dayZhi;
    if (!isDayChong) {
        return 'static';
    }
    const strength = getYaoStrength(yao.wuXing, monthZhi);
    return strength.isStrong ? 'hidden_moving' : 'day_break';
}
function scoreYongShenCandidate(params) {
    const { strengthScore, movementState, isShiYao, isYingYao, kongWangState } = params;
    let score = strengthScore;
    if (movementState === 'changing')
        score += 12;
    if (movementState === 'hidden_moving')
        score += 10;
    if (movementState === 'day_break')
        score -= 25;
    if (isShiYao)
        score += 8;
    if (isYingYao)
        score += 4;
    if (kongWangState === 'kong_static')
        score -= 15;
    if (kongWangState === 'kong_changing')
        score -= 8;
    if (kongWangState === 'kong_ri_chong')
        score += 5;
    return Math.max(0, Math.min(100, score));
}
function stripCandidateScore(candidate) {
    const { rankScore, ...rest } = candidate;
    void rankScore;
    return rest;
}
function buildFuShenFallbackCandidate(params) {
    const { target, fuShenList, fullYaos, kongWang } = params;
    const candidates = fuShenList.filter(item => item.liuQin === target);
    if (candidates.length === 0) {
        return undefined;
    }
    const sorted = [...candidates].sort((a, b) => {
        if (a.isAvailable === b.isAvailable) {
            return a.feiShenPosition - b.feiShenPosition;
        }
        return a.isAvailable ? -1 : 1;
    });
    const selectedFuShen = sorted[0];
    const attachedYao = fullYaos.find(yao => yao.position === selectedFuShen.feiShenPosition);
    const kongWangState = kongWang.kongZhi.includes(selectedFuShen.naJia)
        ? 'kong_static'
        : 'not_kong';
    const strengthScore = selectedFuShen.isAvailable ? 58 : 38;
    const rankScore = scoreYongShenCandidate({
        strengthScore,
        movementState: 'static',
        isShiYao: attachedYao?.isShiYao ?? false,
        isYingYao: attachedYao?.isYingYao ?? false,
        kongWangState,
    });
    return {
        liuQin: target,
        naJia: selectedFuShen.naJia,
        element: selectedFuShen.wuXing,
        position: selectedFuShen.feiShenPosition,
        strengthScore,
        isStrong: strengthScore >= 50,
        strengthLabel: selectedFuShen.isAvailable ? '伏神可取' : '伏神待用',
        movementState: 'static',
        movementLabel: selectedFuShen.isAvailable ? '伏藏可用' : '伏藏受制',
        isShiYao: attachedYao?.isShiYao ?? false,
        isYingYao: attachedYao?.isYingYao ?? false,
        kongWangState,
        rankScore,
        factors: [
            `用神${target}不上卦，转取伏神`,
            selectedFuShen.availabilityReason,
        ],
    };
}
function toDateString(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}
function calculateTimeWindowByBranch(baseDate, baseDayZhi, targetBranch, horizonDays = 90) {
    if (!targetBranch) {
        const start = new Date(baseDate);
        start.setDate(start.getDate() + 1);
        const end = new Date(baseDate);
        end.setDate(end.getDate() + Math.min(horizonDays, 30));
        return { startDate: toDateString(start), endDate: toDateString(end) };
    }
    const baseIdx = DIZHI_LIST.indexOf(baseDayZhi);
    const targetIdx = DIZHI_LIST.indexOf(targetBranch);
    const offset = targetIdx >= 0 && baseIdx >= 0 ? (targetIdx - baseIdx + 12) % 12 : 0;
    const first = new Date(baseDate);
    first.setDate(first.getDate() + offset);
    const second = new Date(first);
    second.setDate(second.getDate() + 12);
    const horizonEnd = new Date(baseDate);
    horizonEnd.setDate(horizonEnd.getDate() + horizonDays);
    return {
        startDate: toDateString(first),
        endDate: toDateString(second <= horizonEnd ? second : first),
    };
}
function getTimeRecommendationConfidence(params) {
    const { isStrong, movementState, kongWangState, type } = params;
    let score = 0.5;
    if (isStrong)
        score += 0.2;
    if (movementState === 'changing' || movementState === 'hidden_moving')
        score += 0.15;
    if (movementState === 'day_break')
        score -= 0.25;
    if (kongWangState === 'kong_static')
        score -= 0.15;
    if (type === 'critical')
        score += 0.05;
    if (type === 'unfavorable')
        score -= 0.05;
    return Number(Math.max(0, Math.min(1, score)).toFixed(2));
}
function calculateTimeRecommendations(yongShenGroups, yaos, baseDate, dayZhi) {
    const recommendations = [];
    const order = ['木', '火', '土', '金', '水'];
    for (const group of yongShenGroups) {
        const yongYao = group.selected.position
            ? yaos.find(y => y.position === group.selected.position)
            : undefined;
        if (yongYao) {
            const window = calculateTimeWindowByBranch(baseDate, dayZhi, yongYao.naJia, 90);
            recommendations.push({
                targetLiuQin: group.targetLiuQin,
                type: 'favorable',
                earthlyBranch: yongYao.naJia,
                startDate: window.startDate,
                endDate: window.endDate,
                confidence: getTimeRecommendationConfidence({
                    isStrong: group.selected.isStrong,
                    movementState: group.selected.movementState,
                    kongWangState: group.selected.kongWangState,
                    type: 'favorable',
                }),
                description: `逢${yongYao.naJia}日/月应期，事情易有进展`,
            });
        }
        const yongIdx = order.indexOf(group.selected.element);
        const shengElement = order[(yongIdx + 4) % 5];
        const keElement = order[(yongIdx + 3) % 5];
        const favorableWindow = calculateTimeWindowByBranch(baseDate, dayZhi, undefined, 90);
        recommendations.push({
            targetLiuQin: group.targetLiuQin,
            type: 'favorable',
            startDate: favorableWindow.startDate,
            endDate: favorableWindow.endDate,
            confidence: getTimeRecommendationConfidence({
                isStrong: group.selected.isStrong,
                movementState: group.selected.movementState,
                kongWangState: group.selected.kongWangState,
                type: 'favorable',
            }),
            description: `${shengElement}旺之时有利，可积极行动`,
        });
        recommendations.push({
            targetLiuQin: group.targetLiuQin,
            type: 'unfavorable',
            startDate: favorableWindow.startDate,
            endDate: favorableWindow.endDate,
            confidence: getTimeRecommendationConfidence({
                isStrong: group.selected.isStrong,
                movementState: group.selected.movementState,
                kongWangState: group.selected.kongWangState,
                type: 'unfavorable',
            }),
            description: `${keElement}旺之时不利，宜避开`,
        });
        if (group.selected.movementState === 'changing' || group.selected.movementState === 'hidden_moving') {
            const criticalWindow = calculateTimeWindowByBranch(baseDate, dayZhi, yongYao?.naJia, 90);
            recommendations.push({
                targetLiuQin: group.targetLiuQin,
                type: 'critical',
                earthlyBranch: yongYao?.naJia,
                startDate: criticalWindow.startDate,
                endDate: criticalWindow.endDate,
                confidence: getTimeRecommendationConfidence({
                    isStrong: group.selected.isStrong,
                    movementState: group.selected.movementState,
                    kongWangState: group.selected.kongWangState,
                    type: 'critical',
                }),
                description: `${group.selected.movementState === 'changing' ? '明动' : '暗动'}临机，近期有关键变化`,
            });
        }
    }
    return recommendations;
}
// 计算伏神（当卦中缺少某六亲时，从本宫卦中找）
function calculateFuShen(fullYaos, gongName, gongElement) {
    const allLiuQin = ['父母', '兄弟', '子孙', '妻财', '官鬼'];
    const presentLiuQin = new Set(fullYaos.map(y => y.liuQin));
    const missingLiuQin = allLiuQin.filter(lq => !presentLiuQin.has(lq));
    if (missingLiuQin.length === 0)
        return [];
    // 获取本宫卦的纳甲
    const benGuaCode = BA_GONG_BEN_GUA[gongName];
    if (!benGuaCode)
        return [];
    const benHex = getHexagramByCode(benGuaCode);
    if (!benHex)
        return [];
    const lowerGong = BA_GONG_NA_JIA[benHex.lowerTrigram];
    const upperGong = BA_GONG_NA_JIA[benHex.upperTrigram];
    const fuShenList = [];
    for (const targetLiuQin of missingLiuQin) {
        // 在本宫卦中找到该六亲
        for (let i = 0; i < 6; i++) {
            const isLower = i < 3;
            const gong = isLower ? lowerGong : upperGong;
            const naJiaIdx = i % 3;
            const naJia = (gong?.naJia[isLower ? 0 : 1][naJiaIdx] || '子');
            const wuXing = DIZHI_WUXING[naJia];
            const liuQin = getLiuQin(gongElement, wuXing);
            if (liuQin === targetLiuQin) {
                const feiShenYao = fullYaos[i];
                const isAvailable = feiShenYao?.change === 'changing';
                fuShenList.push({
                    liuQin: targetLiuQin,
                    wuXing,
                    naJia,
                    feiShenPosition: i + 1,
                    isAvailable,
                    availabilityReason: isAvailable ? '飞神发动，伏神可用' : '飞神静，伏神难出',
                });
                break;
            }
        }
    }
    return fuShenList;
}
// ============= 数据表 =============
// 八宫归属表（卦码 -> 宫名和卦序）
// 卦序: 0=本宫, 1=一世, 2=二世, 3=三世, 4=四世, 5=五世, 6=游魂, 7=归魂
const BA_GONG_GUI_SHU = {
    // 乾宫
    '111111': { gong: '乾', order: 0 }, // 乾为天
    '011111': { gong: '乾', order: 1 }, // 天风姤
    '001111': { gong: '乾', order: 2 }, // 天山遁
    '000111': { gong: '乾', order: 3 }, // 天地否
    '000011': { gong: '乾', order: 4 }, // 风地观
    '000001': { gong: '乾', order: 5 }, // 山地剥
    '000101': { gong: '乾', order: 6 }, // 火地晋
    '111101': { gong: '乾', order: 7 }, // 火天大有
    // 坎宫
    '010010': { gong: '坎', order: 0 }, // 坎为水
    '110010': { gong: '坎', order: 1 }, // 水泽节
    '100010': { gong: '坎', order: 2 }, // 水雷屯
    '101010': { gong: '坎', order: 3 }, // 水火既济
    '101110': { gong: '坎', order: 4 }, // 泽火革
    '101100': { gong: '坎', order: 5 }, // 雷火丰
    '101000': { gong: '坎', order: 6 }, // 地火明夷
    '010000': { gong: '坎', order: 7 }, // 地水师
    // 艮宫
    '001001': { gong: '艮', order: 0 }, // 艮为山
    '101001': { gong: '艮', order: 1 }, // 山火贲
    '111001': { gong: '艮', order: 2 }, // 山天大畜
    '110001': { gong: '艮', order: 3 }, // 山泽损
    '110101': { gong: '艮', order: 4 }, // 火泽睽
    '110111': { gong: '艮', order: 5 }, // 天泽履
    '110011': { gong: '艮', order: 6 }, // 风泽中孚
    '001011': { gong: '艮', order: 7 }, // 风山渐
    // 震宫
    '100100': { gong: '震', order: 0 }, // 震为雷
    '000100': { gong: '震', order: 1 }, // 雷地豫
    '010100': { gong: '震', order: 2 }, // 雷水解
    '011100': { gong: '震', order: 3 }, // 雷风恒
    '011000': { gong: '震', order: 4 }, // 地风升
    '011010': { gong: '震', order: 5 }, // 水风井
    '011110': { gong: '震', order: 6 }, // 泽风大过
    '100110': { gong: '震', order: 7 }, // 泽雷随
};
// 八宫归属表（续）
const BA_GONG_GUI_SHU_2 = {
    // 巽宫
    '011011': { gong: '巽', order: 0 }, // 巽为风
    '111011': { gong: '巽', order: 1 }, // 风天小畜
    '101011': { gong: '巽', order: 2 }, // 风火家人
    '100011': { gong: '巽', order: 3 }, // 风雷益
    '100111': { gong: '巽', order: 4 }, // 天雷无妄
    '100101': { gong: '巽', order: 5 }, // 火雷噬嗑
    '100001': { gong: '巽', order: 6 }, // 山雷颐
    '011001': { gong: '巽', order: 7 }, // 山风蛊
    // 离宫
    '101101': { gong: '离', order: 0 }, // 离为火
    '001101': { gong: '离', order: 1 }, // 火山旅
    '011101': { gong: '离', order: 2 }, // 火风鼎
    '010101': { gong: '离', order: 3 }, // 火水未济
    '010001': { gong: '离', order: 4 }, // 山水蒙
    '010011': { gong: '离', order: 5 }, // 风水涣
    '010111': { gong: '离', order: 6 }, // 天水讼
    '101111': { gong: '离', order: 7 }, // 天火同人
    // 坤宫
    '000000': { gong: '坤', order: 0 }, // 坤为地
    '100000': { gong: '坤', order: 1 }, // 地雷复
    '110000': { gong: '坤', order: 2 }, // 地泽临
    '111000': { gong: '坤', order: 3 }, // 地天泰
    '111100': { gong: '坤', order: 4 }, // 雷天大壮
    '111110': { gong: '坤', order: 5 }, // 泽天夬
    '111010': { gong: '坤', order: 6 }, // 水天需
    '000010': { gong: '坤', order: 7 }, // 水地比
    // 兑宫
    '110110': { gong: '兑', order: 0 }, // 兑为泽
    '010110': { gong: '兑', order: 1 }, // 泽水困
    '000110': { gong: '兑', order: 2 }, // 泽地萃
    '001110': { gong: '兑', order: 3 }, // 泽山咸
    '001010': { gong: '兑', order: 4 }, // 水山蹇
    '001000': { gong: '兑', order: 5 }, // 地山谦
    '001100': { gong: '兑', order: 6 }, // 雷山小过
    '110100': { gong: '兑', order: 7 }, // 雷泽归妹
};
// 合并八宫归属表
const ALL_BA_GONG = { ...BA_GONG_GUI_SHU, ...BA_GONG_GUI_SHU_2 };
// 八宫本宫卦码
const BA_GONG_BEN_GUA = {
    '乾': '111111', '坎': '010010', '艮': '001001', '震': '100100',
    '巽': '011011', '离': '101101', '坤': '000000', '兑': '110110',
};
const HEXAGRAMS = [
    { name: '乾为天', code: '111111', upperTrigram: '乾', lowerTrigram: '乾', element: '金', nature: '刚健' },
    { name: '坤为地', code: '000000', upperTrigram: '坤', lowerTrigram: '坤', element: '土', nature: '柔顺' },
    { name: '水雷屯', code: '100010', upperTrigram: '坎', lowerTrigram: '震', element: '水', nature: '初生' },
    { name: '山水蒙', code: '010001', upperTrigram: '艮', lowerTrigram: '坎', element: '土', nature: '启蒙' },
    { name: '水天需', code: '111010', upperTrigram: '坎', lowerTrigram: '乾', element: '水', nature: '等待' },
    { name: '天水讼', code: '010111', upperTrigram: '乾', lowerTrigram: '坎', element: '金', nature: '争讼' },
    { name: '地水师', code: '010000', upperTrigram: '坤', lowerTrigram: '坎', element: '土', nature: '统帅' },
    { name: '水地比', code: '000010', upperTrigram: '坎', lowerTrigram: '坤', element: '水', nature: '亲比' },
    { name: '风天小畜', code: '111011', upperTrigram: '巽', lowerTrigram: '乾', element: '木', nature: '蓄养' },
    { name: '天泽履', code: '110111', upperTrigram: '乾', lowerTrigram: '兑', element: '金', nature: '践行' },
    { name: '地天泰', code: '111000', upperTrigram: '坤', lowerTrigram: '乾', element: '土', nature: '通泰' },
    { name: '天地否', code: '000111', upperTrigram: '乾', lowerTrigram: '坤', element: '金', nature: '闭塞' },
    { name: '天火同人', code: '101111', upperTrigram: '乾', lowerTrigram: '离', element: '金', nature: '和同' },
    { name: '火天大有', code: '111101', upperTrigram: '离', lowerTrigram: '乾', element: '火', nature: '大有' },
    { name: '地山谦', code: '001000', upperTrigram: '坤', lowerTrigram: '艮', element: '土', nature: '谦逊' },
    { name: '雷地豫', code: '000100', upperTrigram: '震', lowerTrigram: '坤', element: '木', nature: '愉悦' },
    { name: '泽雷随', code: '100110', upperTrigram: '兑', lowerTrigram: '震', element: '金', nature: '随从' },
    { name: '山风蛊', code: '011001', upperTrigram: '艮', lowerTrigram: '巽', element: '土', nature: '整治' },
    { name: '地泽临', code: '110000', upperTrigram: '坤', lowerTrigram: '兑', element: '土', nature: '临近' },
    { name: '风地观', code: '000011', upperTrigram: '巽', lowerTrigram: '坤', element: '木', nature: '观察' },
    { name: '火雷噬嗑', code: '100101', upperTrigram: '离', lowerTrigram: '震', element: '火', nature: '决断' },
    { name: '山火贲', code: '101001', upperTrigram: '艮', lowerTrigram: '离', element: '土', nature: '文饰' },
    { name: '山地剥', code: '000001', upperTrigram: '艮', lowerTrigram: '坤', element: '土', nature: '剥落' },
    { name: '地雷复', code: '100000', upperTrigram: '坤', lowerTrigram: '震', element: '土', nature: '复归' },
    { name: '天雷无妄', code: '100111', upperTrigram: '乾', lowerTrigram: '震', element: '金', nature: '无妄' },
    { name: '山天大畜', code: '111001', upperTrigram: '艮', lowerTrigram: '乾', element: '土', nature: '大畜' },
    { name: '山雷颐', code: '100001', upperTrigram: '艮', lowerTrigram: '震', element: '土', nature: '颐养' },
    { name: '泽风大过', code: '011110', upperTrigram: '兑', lowerTrigram: '巽', element: '金', nature: '大过' },
    { name: '坎为水', code: '010010', upperTrigram: '坎', lowerTrigram: '坎', element: '水', nature: '险陷' },
    { name: '离为火', code: '101101', upperTrigram: '离', lowerTrigram: '离', element: '火', nature: '附丽' },
    { name: '泽山咸', code: '001110', upperTrigram: '兑', lowerTrigram: '艮', element: '金', nature: '感应' },
    { name: '雷风恒', code: '011100', upperTrigram: '震', lowerTrigram: '巽', element: '木', nature: '恒久' },
    { name: '天山遯', code: '001111', upperTrigram: '乾', lowerTrigram: '艮', element: '金', nature: '退避' },
    { name: '雷天大壮', code: '111100', upperTrigram: '震', lowerTrigram: '乾', element: '木', nature: '壮大' },
    { name: '火地晋', code: '000101', upperTrigram: '离', lowerTrigram: '坤', element: '火', nature: '晋升' },
    { name: '地火明夷', code: '101000', upperTrigram: '坤', lowerTrigram: '离', element: '土', nature: '晦暗' },
    { name: '风火家人', code: '101011', upperTrigram: '巽', lowerTrigram: '离', element: '木', nature: '家人' },
    { name: '火泽睽', code: '110101', upperTrigram: '离', lowerTrigram: '兑', element: '火', nature: '乖离' },
    { name: '水山蹇', code: '001010', upperTrigram: '坎', lowerTrigram: '艮', element: '水', nature: '蹇难' },
    { name: '雷水解', code: '010100', upperTrigram: '震', lowerTrigram: '坎', element: '木', nature: '解除' },
    { name: '山泽损', code: '110001', upperTrigram: '艮', lowerTrigram: '兑', element: '土', nature: '减损' },
    { name: '风雷益', code: '100011', upperTrigram: '巽', lowerTrigram: '震', element: '木', nature: '增益' },
    { name: '泽天夬', code: '111110', upperTrigram: '兑', lowerTrigram: '乾', element: '金', nature: '决断' },
    { name: '天风姤', code: '011111', upperTrigram: '乾', lowerTrigram: '巽', element: '金', nature: '遇合' },
    { name: '泽地萃', code: '000110', upperTrigram: '兑', lowerTrigram: '坤', element: '金', nature: '聚集' },
    { name: '地风升', code: '011000', upperTrigram: '坤', lowerTrigram: '巽', element: '土', nature: '上升' },
    { name: '泽水困', code: '010110', upperTrigram: '兑', lowerTrigram: '坎', element: '金', nature: '困顿' },
    { name: '水风井', code: '011010', upperTrigram: '坎', lowerTrigram: '巽', element: '水', nature: '井养' },
    { name: '泽火革', code: '101110', upperTrigram: '兑', lowerTrigram: '离', element: '金', nature: '变革' },
    { name: '火风鼎', code: '011101', upperTrigram: '离', lowerTrigram: '巽', element: '火', nature: '鼎新' },
    { name: '震为雷', code: '100100', upperTrigram: '震', lowerTrigram: '震', element: '木', nature: '震动' },
    { name: '艮为山', code: '001001', upperTrigram: '艮', lowerTrigram: '艮', element: '土', nature: '止静' },
    { name: '风山渐', code: '001011', upperTrigram: '巽', lowerTrigram: '艮', element: '木', nature: '渐进' },
    { name: '雷泽归妹', code: '110100', upperTrigram: '震', lowerTrigram: '兑', element: '木', nature: '归妹' },
    { name: '雷火丰', code: '101100', upperTrigram: '震', lowerTrigram: '离', element: '木', nature: '丰盛' },
    { name: '火山旅', code: '001101', upperTrigram: '离', lowerTrigram: '艮', element: '火', nature: '旅行' },
    { name: '巽为风', code: '011011', upperTrigram: '巽', lowerTrigram: '巽', element: '木', nature: '顺入' },
    { name: '兑为泽', code: '110110', upperTrigram: '兑', lowerTrigram: '兑', element: '金', nature: '喜悦' },
    { name: '风水涣', code: '010011', upperTrigram: '巽', lowerTrigram: '坎', element: '木', nature: '涣散' },
    { name: '水泽节', code: '110010', upperTrigram: '坎', lowerTrigram: '兑', element: '水', nature: '节制' },
    { name: '风泽中孚', code: '110011', upperTrigram: '巽', lowerTrigram: '兑', element: '木', nature: '诚信' },
    { name: '雷山小过', code: '001100', upperTrigram: '震', lowerTrigram: '艮', element: '木', nature: '小过' },
    { name: '水火既济', code: '101010', upperTrigram: '坎', lowerTrigram: '离', element: '水', nature: '完成' },
    { name: '火水未济', code: '010101', upperTrigram: '离', lowerTrigram: '坎', element: '火', nature: '未完' },
];
const DIZHI_LIST = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const TIANGAN_LIST = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const DIZHI_WUXING = {
    '子': '水', '丑': '土', '寅': '木', '卯': '木',
    '辰': '土', '巳': '火', '午': '火', '未': '土',
    '申': '金', '酉': '金', '戌': '土', '亥': '水',
};
// 六神配置（根据日干）
const LIU_SHEN_CONFIG = {
    '甲乙': ['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武'],
    '丙丁': ['朱雀', '勾陈', '螣蛇', '白虎', '玄武', '青龙'],
    '戊': ['勾陈', '螣蛇', '白虎', '玄武', '青龙', '朱雀'],
    '己': ['螣蛇', '白虎', '玄武', '青龙', '朱雀', '勾陈'],
    '庚辛': ['白虎', '玄武', '青龙', '朱雀', '勾陈', '螣蛇'],
    '壬癸': ['玄武', '青龙', '朱雀', '勾陈', '螣蛇', '白虎'],
};
// 旬空表
const XUN_KONG_TABLE = {
    '甲子旬': ['戌', '亥'],
    '甲戌旬': ['申', '酉'],
    '甲申旬': ['午', '未'],
    '甲午旬': ['辰', '巳'],
    '甲辰旬': ['寅', '卯'],
    '甲寅旬': ['子', '丑'],
};
// 月令旺衰表
const WANG_SHUAI_TABLE = {
    '寅': { '木': 'wang', '火': 'xiang', '水': 'xiu', '金': 'qiu', '土': 'si' },
    '卯': { '木': 'wang', '火': 'xiang', '水': 'xiu', '金': 'qiu', '土': 'si' },
    '辰': { '土': 'wang', '金': 'xiang', '火': 'xiu', '木': 'qiu', '水': 'si' },
    '巳': { '火': 'wang', '土': 'xiang', '木': 'xiu', '水': 'qiu', '金': 'si' },
    '午': { '火': 'wang', '土': 'xiang', '木': 'xiu', '水': 'qiu', '金': 'si' },
    '未': { '土': 'wang', '金': 'xiang', '火': 'xiu', '木': 'qiu', '水': 'si' },
    '申': { '金': 'wang', '水': 'xiang', '土': 'xiu', '火': 'qiu', '木': 'si' },
    '酉': { '金': 'wang', '水': 'xiang', '土': 'xiu', '火': 'qiu', '木': 'si' },
    '戌': { '土': 'wang', '金': 'xiang', '火': 'xiu', '木': 'qiu', '水': 'si' },
    '亥': { '水': 'wang', '木': 'xiang', '金': 'xiu', '土': 'qiu', '火': 'si' },
    '子': { '水': 'wang', '木': 'xiang', '金': 'xiu', '土': 'qiu', '火': 'si' },
    '丑': { '土': 'wang', '金': 'xiang', '火': 'xiu', '木': 'qiu', '水': 'si' },
};
// 八宫纳甲表
const BA_GONG_NA_JIA = {
    '乾': { element: '金', naJia: [['子', '寅', '辰'], ['午', '申', '戌']] },
    '坎': { element: '水', naJia: [['寅', '辰', '午'], ['申', '戌', '子']] },
    '艮': { element: '土', naJia: [['辰', '午', '申'], ['戌', '子', '寅']] },
    '震': { element: '木', naJia: [['子', '寅', '辰'], ['午', '申', '戌']] },
    '巽': { element: '木', naJia: [['丑', '亥', '酉'], ['未', '巳', '卯']] },
    '离': { element: '火', naJia: [['卯', '丑', '亥'], ['酉', '未', '巳']] },
    '坤': { element: '土', naJia: [['未', '巳', '卯'], ['丑', '亥', '酉']] },
    '兑': { element: '金', naJia: [['巳', '卯', '丑'], ['亥', '酉', '未']] },
};
// 世应位置表（按卦序）
const SHI_YING_TABLE = {
    0: [6, 3], // 本宫卦
    1: [1, 4], // 一世卦
    2: [2, 5], // 二世卦
    3: [3, 6], // 三世卦
    4: [4, 1], // 四世卦
    5: [5, 2], // 五世卦
    6: [4, 1], // 游魂卦
    7: [3, 6], // 归魂卦
};
// ============= 核心函数 =============
// 根据卦名查找卦象
function getHexagramByName(name) {
    return HEXAGRAMS.find(h => h.name === name || h.name.includes(name));
}
// 根据卦码查找卦象
function getHexagramByCode(code) {
    return HEXAGRAMS.find(h => h.code === code);
}
// 根据卦名或卦码查找卦象
function findHexagram(input) {
    if (/^[01]{6}$/.test(input)) {
        return getHexagramByCode(input);
    }
    return getHexagramByName(input);
}
// 计算两个卦码之间的变爻位置
function calculateChangedLines(mainCode, changedCode) {
    const lines = [];
    for (let i = 0; i < 6; i++) {
        if (mainCode[i] !== changedCode[i]) {
            lines.push(i + 1);
        }
    }
    return lines;
}
// 自动起卦（模拟铜钱法）
function divine() {
    const yaos = [];
    const changedLines = [];
    for (let i = 0; i < 6; i++) {
        const coins = [
            Math.random() > 0.5 ? 3 : 2,
            Math.random() > 0.5 ? 3 : 2,
            Math.random() > 0.5 ? 3 : 2,
        ];
        const sum = coins.reduce((a, b) => a + b, 0);
        let yaoType;
        let isChanging = false;
        if (sum === 6) { // 老阴
            yaoType = 0;
            isChanging = true;
        }
        else if (sum === 7) { // 少阳
            yaoType = 1;
        }
        else if (sum === 8) { // 少阴
            yaoType = 0;
        }
        else { // 9 = 老阳
            yaoType = 1;
            isChanging = true;
        }
        if (isChanging) {
            changedLines.push(i + 1);
        }
        yaos.push({
            type: yaoType,
            change: isChanging ? 'changing' : 'stable',
            position: i + 1,
        });
    }
    return {
        yaos,
        hexagramCode: yaos.map(y => y.type).join(''),
        changedLines,
    };
}
// 计算变卦码
function calculateChangedHexagram(code, changedLines) {
    const chars = code.split('');
    for (const line of changedLines) {
        const idx = line - 1;
        chars[idx] = chars[idx] === '1' ? '0' : '1';
    }
    return chars.join('');
}
// 获取干支时间
function getGanZhiTime(date) {
    const solar = Solar.fromDate(date);
    const lunar = solar.getLunar();
    const eightChar = lunar.getEightChar();
    return {
        year: { gan: eightChar.getYearGan(), zhi: eightChar.getYearZhi() },
        month: { gan: eightChar.getMonthGan(), zhi: eightChar.getMonthZhi() },
        day: { gan: eightChar.getDayGan(), zhi: eightChar.getDayZhi() },
        hour: { gan: eightChar.getTimeGan(), zhi: eightChar.getTimeZhi() },
    };
}
// 计算旬空
function getKongWang(dayGan, dayZhi) {
    const ganIdx = TIANGAN_LIST.indexOf(dayGan);
    const zhiIdx = DIZHI_LIST.indexOf(dayZhi);
    const xunStart = (zhiIdx - ganIdx + 12) % 12;
    const xunNames = ['甲子旬', '甲戌旬', '甲申旬', '甲午旬', '甲辰旬', '甲寅旬'];
    const xunStartZhi = ['子', '戌', '申', '午', '辰', '寅'];
    const xunIdx = xunStartZhi.indexOf(DIZHI_LIST[xunStart]);
    const xun = xunNames[xunIdx] || '甲子旬';
    return {
        xun,
        kongZhi: XUN_KONG_TABLE[xun],
    };
}
// 获取六神
function getLiuShen(dayGan) {
    if ('甲乙'.includes(dayGan))
        return LIU_SHEN_CONFIG['甲乙'];
    if ('丙丁'.includes(dayGan))
        return LIU_SHEN_CONFIG['丙丁'];
    if (dayGan === '戊')
        return LIU_SHEN_CONFIG['戊'];
    if (dayGan === '己')
        return LIU_SHEN_CONFIG['己'];
    if ('庚辛'.includes(dayGan))
        return LIU_SHEN_CONFIG['庚辛'];
    return LIU_SHEN_CONFIG['壬癸'];
}
// 五行相生相克关系
function getWuXingRelation(from, to) {
    const order = ['木', '火', '土', '金', '水'];
    const fromIdx = order.indexOf(from);
    const toIdx = order.indexOf(to);
    if (from === to)
        return 'same';
    if ((fromIdx + 1) % 5 === toIdx)
        return 'produce';
    if ((toIdx + 1) % 5 === fromIdx)
        return 'produced';
    if ((fromIdx + 2) % 5 === toIdx)
        return 'control';
    return 'controlled';
}
// 计算六亲
function getLiuQin(gongElement, yaoElement) {
    const relation = getWuXingRelation(gongElement, yaoElement);
    const map = {
        'same': '兄弟',
        'produce': '子孙',
        'produced': '父母',
        'control': '妻财',
        'controlled': '官鬼',
    };
    return map[relation];
}
// 计算爻的旺衰
function getYaoStrength(yaoElement, monthZhi) {
    const wangShuai = WANG_SHUAI_TABLE[monthZhi][yaoElement];
    const isStrong = wangShuai === 'wang' || wangShuai === 'xiang';
    return { wangShuai, isStrong };
}
const LIU_QIN_ORDER = ['父母', '兄弟', '子孙', '妻财', '官鬼'];
// 维护约定（供调用方/AI 选择 yongShenTargets 参考）：
// - 父母：文书合同、证件证明、学业老师、房屋车辆
// - 官鬼：工作事业、职位规则、压力疾病、女问感情对象
// - 兄弟：同辈亲友、合作同伴、竞争分财
// - 妻财：钱财资源、交易货物、家用开销
// - 子孙：子女后辈、医药解忧（求官类通常不取子孙）
// 若映射规则调整，请同步更新 tools.ts 的 yongShenTargets 描述，确保调用提示一致。
function normalizeYongShenTargets(targets) {
    if (!targets || targets.length === 0)
        return [];
    const uniqueTargets = new Set();
    for (const target of targets) {
        if (!LIU_QIN_ORDER.includes(target)) {
            throw new Error(`yongShenTargets 含非法值: ${target}`);
        }
        uniqueTargets.add(target);
    }
    return Array.from(uniqueTargets);
}
function resolveYongShenTargets(question, targets) {
    const normalizedTargets = normalizeYongShenTargets(targets);
    const requiresTargets = question.trim().length > 0;
    if (requiresTargets && normalizedTargets.length === 0) {
        throw new Error('请先判断并填写 yongShenTargets');
    }
    return normalizedTargets;
}
// 查找卦宫（使用八宫归属表）
function findPalace(code) {
    const guiShu = ALL_BA_GONG[code];
    if (!guiShu)
        return undefined;
    const gong = BA_GONG_NA_JIA[guiShu.gong];
    return gong ? { name: guiShu.gong, element: gong.element, order: guiShu.order } : undefined;
}
// 计算完整爻信息
function calculateFullYaoInfo(yaos, hexagramCode, dayGan, gongElement, guaOrder) {
    const hex = getHexagramByCode(hexagramCode);
    if (!hex)
        return [];
    const liuShenList = getLiuShen(dayGan);
    const lowerGong = BA_GONG_NA_JIA[hex.lowerTrigram];
    const upperGong = BA_GONG_NA_JIA[hex.upperTrigram];
    // 根据卦序获取世应位置
    const [shiPos, yingPos] = SHI_YING_TABLE[guaOrder] || [6, 3];
    return yaos.map((yao, idx) => {
        const isLower = idx < 3;
        const gong = isLower ? lowerGong : upperGong;
        const naJiaIdx = idx % 3;
        const naJia = (gong?.naJia[isLower ? 0 : 1][naJiaIdx] || '子');
        const wuXing = DIZHI_WUXING[naJia];
        const liuQin = getLiuQin(gongElement, wuXing);
        return {
            ...yao,
            liuQin,
            liuShen: liuShenList[idx],
            naJia,
            wuXing,
            isShiYao: yao.position === shiPos,
            isYingYao: yao.position === yingPos,
        };
    });
}
// ============= 主处理函数 =============
export async function handleLiuyaoAnalyze(input) {
    const { question: rawQuestion = '', yongShenTargets, method = 'auto', hexagramName, changedHexagramName, date, } = input;
    const question = typeof rawQuestion === 'string' ? rawQuestion : '';
    let divDate;
    if (date) {
        if (date.includes('T')) {
            divDate = new Date(date);
        }
        else {
            const [y, m, d] = date.split('-').map(Number);
            divDate = new Date(y, m - 1, d);
        }
    }
    else {
        divDate = new Date();
    }
    let yaos;
    let hexagramCode;
    let changedCode;
    let changedLines = [];
    let mainHexagramName;
    let finalChangedHexagramName;
    if (method === 'select' && hexagramName) {
        const hexagram = findHexagram(hexagramName);
        if (!hexagram) {
            throw new Error(`未找到卦象：${hexagramName}`);
        }
        hexagramCode = hexagram.code;
        mainHexagramName = hexagram.name;
        if (changedHexagramName) {
            const changedHex = findHexagram(changedHexagramName);
            if (changedHex) {
                changedCode = changedHex.code;
                finalChangedHexagramName = changedHex.name;
                changedLines = calculateChangedLines(hexagramCode, changedCode);
            }
        }
        yaos = hexagramCode.split('').map((char, idx) => ({
            type: parseInt(char, 10),
            change: changedLines.includes(idx + 1) ? 'changing' : 'stable',
            position: idx + 1,
        }));
    }
    else {
        const result = divine();
        yaos = result.yaos;
        hexagramCode = result.hexagramCode;
        changedLines = result.changedLines;
        const mainHex = getHexagramByCode(hexagramCode);
        mainHexagramName = mainHex?.name || hexagramCode;
        if (changedLines.length > 0) {
            changedCode = calculateChangedHexagram(hexagramCode, changedLines);
            const changedHex = getHexagramByCode(changedCode);
            finalChangedHexagramName = changedHex?.name;
        }
    }
    const ganZhiTime = getGanZhiTime(divDate);
    const dayGan = ganZhiTime.day.gan;
    const monthZhi = ganZhiTime.month.zhi;
    const dayZhi = ganZhiTime.day.zhi;
    const kongWang = getKongWang(dayGan, ganZhiTime.day.zhi);
    const palace = findPalace(hexagramCode);
    const gongElement = (palace?.element || '土');
    const guaOrder = palace?.order ?? 0;
    const mainHex = getHexagramByCode(hexagramCode);
    const changedHex = changedCode ? getHexagramByCode(changedCode) : undefined;
    const changedPalace = changedCode ? findPalace(changedCode) : undefined;
    const fullYaos = calculateFullYaoInfo(yaos, hexagramCode, dayGan, gongElement, guaOrder);
    const sanHeAnalysis = analyzeSanHe(fullYaos, monthZhi, dayZhi);
    const liuChongGuaInfo = checkLiuChongGua(fullYaos);
    const fuShen = calculateFuShen(fullYaos, palace?.name || '乾', gongElement);
    const shenShaContext = {
        yearStem: ganZhiTime.year.gan,
        yearBranch: ganZhiTime.year.zhi,
        monthStem: ganZhiTime.month.gan,
        monthBranch: ganZhiTime.month.zhi,
        dayStem: ganZhiTime.day.gan,
        dayBranch: ganZhiTime.day.zhi,
        hourStem: ganZhiTime.hour.gan,
        hourBranch: ganZhiTime.hour.zhi,
        kongWang: { xun: kongWang.xun, kongZhi: [kongWang.kongZhi[0], kongWang.kongZhi[1]] },
    };
    const changedYaoByPosition = new Map();
    if (changedCode && changedLines.length > 0) {
        const changedHexInfo = getHexagramByCode(changedCode);
        if (changedHexInfo) {
            const changedLowerGong = BA_GONG_NA_JIA[changedHexInfo.lowerTrigram];
            const changedUpperGong = BA_GONG_NA_JIA[changedHexInfo.upperTrigram];
            for (const pos of changedLines) {
                const idx = pos - 1;
                const isLower = idx < 3;
                const gong = isLower ? changedLowerGong : changedUpperGong;
                const naJiaIdx = idx % 3;
                const naJia = (gong?.naJia[isLower ? 0 : 1][naJiaIdx] || '子');
                const wuXing = DIZHI_WUXING[naJia];
                const liuQin = getLiuQin(gongElement, wuXing);
                const changedType = parseInt(changedCode[idx], 10);
                const originalYao = fullYaos[idx];
                const relation = analyzeYaoChange(originalYao.wuXing, wuXing, originalYao.naJia, naJia, kongWang).huaLabel || '平';
                changedYaoByPosition.set(pos, {
                    type: changedType,
                    liuQin,
                    naJia,
                    wuXing,
                    liuShen: originalYao.liuShen,
                    yaoCi: YAO_CI[mainHexagramName]?.[pos - 1],
                    relation,
                });
            }
        }
    }
    const normalizedTargets = resolveYongShenTargets(question, yongShenTargets);
    const yongShenGroups = normalizedTargets.map((target) => {
        const rankedCandidates = fullYaos
            .filter(y => y.liuQin === target)
            .map((y) => {
            const strength = getYaoStrength(y.wuXing, monthZhi);
            const strengthScore = strength.isStrong ? 70 : 30;
            const kongState = checkYaoKongWang(y.naJia, kongWang, monthZhi, dayZhi, y.change === 'changing');
            const movementState = getYaoMovementState(y, dayZhi, monthZhi);
            const rankScore = scoreYongShenCandidate({
                strengthScore,
                movementState,
                isShiYao: y.isShiYao,
                isYingYao: y.isYingYao,
                kongWangState: kongState,
            });
            const factors = [];
            if (strength.isStrong)
                factors.push('月令生扶');
            if (movementState !== 'static')
                factors.push(MOVEMENT_LABELS[movementState]);
            if (kongState !== 'not_kong')
                factors.push(KONG_WANG_LABELS[kongState]);
            if (y.isShiYao)
                factors.push('世爻');
            if (y.isYingYao)
                factors.push('应爻');
            return {
                liuQin: y.liuQin,
                naJia: y.naJia,
                element: y.wuXing,
                position: y.position,
                strengthScore,
                isStrong: strength.isStrong,
                strengthLabel: strength.isStrong ? '旺相' : '休囚',
                movementState,
                movementLabel: MOVEMENT_LABELS[movementState],
                isShiYao: y.isShiYao,
                isYingYao: y.isYingYao,
                kongWangState: kongState,
                rankScore,
                factors,
            };
        })
            .sort((a, b) => b.rankScore - a.rankScore);
        const fuShenFallback = rankedCandidates.length > 0
            ? undefined
            : buildFuShenFallbackCandidate({
                target,
                fuShenList: fuShen,
                fullYaos,
                kongWang,
            });
        const selected = rankedCandidates[0] ?? fuShenFallback ?? {
            liuQin: target,
            element: '土',
            strengthScore: 0,
            isStrong: false,
            strengthLabel: '未取到',
            movementState: 'static',
            movementLabel: MOVEMENT_LABELS.static,
            isShiYao: false,
            isYingYao: false,
            kongWangState: 'not_kong',
            rankScore: 0,
            factors: ['目标六亲不上卦'],
        };
        const mergedCandidates = rankedCandidates.length > 0 ? rankedCandidates : [selected];
        return {
            targetLiuQin: target,
            selected,
            rankedCandidates: mergedCandidates,
        };
    });
    const yongShen = yongShenGroups.map((group) => ({
        targetLiuQin: group.targetLiuQin,
        candidates: group.rankedCandidates.map(stripCandidateScore),
    }));
    const shenSystemByYongShen = yongShenGroups.map((group) => {
        const selectedElement = (group.selected.element || '土');
        const system = group.selected.position
            ? calculateShenSystem(group.targetLiuQin, selectedElement, fullYaos, gongElement)
            : { yuanShen: undefined, jiShen: undefined, chouShen: undefined };
        return {
            targetLiuQin: group.targetLiuQin,
            ...system,
        };
    });
    const warnings = [];
    if (sanHeAnalysis.hasBanHe && sanHeAnalysis.banHe) {
        for (const banHe of sanHeAnalysis.banHe) {
            warnings.push(`${banHe.branches.join('')}${banHe.type}半合${banHe.result}`);
        }
    }
    for (const group of yongShenGroups) {
        if (!group.selected.isStrong)
            warnings.push(`用神${group.targetLiuQin}力弱`);
        if (group.selected.kongWangState === 'kong_static')
            warnings.push(`用神${group.targetLiuQin}空亡`);
    }
    const timeRecommendations = calculateTimeRecommendations(yongShenGroups.map(group => ({
        targetLiuQin: group.targetLiuQin,
        selected: {
            position: group.selected.position,
            liuQin: group.selected.liuQin,
            element: (group.selected.element || '土'),
            isStrong: group.selected.isStrong,
            kongWangState: (group.selected.kongWangState || 'not_kong'),
            movementState: group.selected.movementState,
        },
    })), fullYaos, divDate, dayZhi);
    const globalShenSha = calculateGlobalShenSha(shenShaContext);
    return {
        question,
        hexagramName: mainHexagramName,
        hexagramGong: palace?.name || '',
        hexagramElement: mainHex?.element || '',
        hexagramBrief: HEXAGRAM_BRIEF[mainHexagramName] || '',
        guaCi: GUA_CI[mainHexagramName],
        xiangCi: XIANG_CI[mainHexagramName],
        changedHexagramName: finalChangedHexagramName,
        changedHexagramGong: changedPalace?.name,
        changedHexagramElement: changedHex?.element,
        ganZhiTime,
        kongWang,
        fullYaos: fullYaos.map((y) => {
            const yaoWangShuai = WANG_SHUAI_TABLE[monthZhi]?.[y.wuXing] || 'xiu';
            const yaoKongWang = checkYaoKongWang(y.naJia, kongWang, monthZhi, dayZhi, y.change === 'changing');
            const yaoStrength = getYaoStrength(y.wuXing, monthZhi);
            const movementState = getYaoMovementState(y, dayZhi, monthZhi);
            const strengthFactors = [];
            if (yaoStrength.isStrong)
                strengthFactors.push('月令生扶');
            if (movementState !== 'static')
                strengthFactors.push(MOVEMENT_LABELS[movementState]);
            if (yaoKongWang !== 'not_kong')
                strengthFactors.push(KONG_WANG_LABELS[yaoKongWang]);
            const changSheng = getChangSheng(y.wuXing, y.naJia);
            return {
                position: y.position,
                type: y.type,
                isChanging: y.change === 'changing',
                movementState,
                movementLabel: MOVEMENT_LABELS[movementState],
                liuQin: y.liuQin,
                liuShen: y.liuShen,
                naJia: y.naJia,
                wuXing: y.wuXing,
                isShiYao: y.isShiYao,
                isYingYao: y.isYingYao,
                wangShuai: yaoWangShuai,
                wangShuaiLabel: WANG_SHUAI_LABELS[yaoWangShuai],
                kongWangState: yaoKongWang,
                kongWangLabel: KONG_WANG_LABELS[yaoKongWang],
                strengthScore: yaoStrength.isStrong ? 70 : 30,
                isStrong: yaoStrength.isStrong,
                strengthFactors: strengthFactors.length > 0 ? strengthFactors : undefined,
                changSheng,
                shenSha: calculateBranchShenSha(shenShaContext, y.naJia),
                changedYao: y.change === 'changing'
                    ? (changedYaoByPosition.get(y.position) || null)
                    : null,
            };
        }),
        yongShen,
        fuShen: fuShen.length > 0 ? fuShen : undefined,
        shenSystemByYongShen,
        globalShenSha,
        liuChongGuaInfo,
        sanHeAnalysis,
        warnings: warnings.length > 0 ? warnings : undefined,
        timeRecommendations: timeRecommendations.length > 0 ? timeRecommendations : undefined,
    };
}
