/**
 * 每日运势处理器
 */
import { Solar } from 'lunar-javascript';
import { STEM_ELEMENTS, WU_XING_ORDER, calculateTenGod } from '../utils.js';
// 五行对应颜色
const ELEMENT_COLORS = {
    '木': ['绿色', '青色'],
    '火': ['红色', '紫色'],
    '土': ['黄色', '棕色'],
    '金': ['白色', '金色'],
    '水': ['黑色', '蓝色'],
};
// 五行对应方位
const ELEMENT_DIRECTIONS = {
    '木': '东方',
    '火': '南方',
    '土': '中央',
    '金': '西方',
    '水': '北方',
};
// 根据十神计算运势分数
function calculateScores(tenGod) {
    const baseScores = {
        '比肩': [70, 65, 60, 55, 75, 80],
        '劫财': [60, 55, 50, 45, 65, 75],
        '食神': [80, 70, 75, 65, 85, 85],
        '伤官': [65, 60, 70, 55, 60, 70],
        '偏财': [75, 70, 65, 85, 70, 75],
        '正财': [80, 75, 70, 90, 75, 70],
        '七杀': [60, 80, 55, 60, 55, 60],
        '正官': [75, 85, 70, 70, 70, 75],
        '偏印': [70, 65, 60, 55, 65, 65],
        '正印': [75, 70, 65, 60, 80, 70],
    };
    const scores = baseScores[tenGod] || [65, 65, 65, 65, 65, 65];
    const variance = () => Math.floor(Math.random() * 10) - 5;
    return {
        overall: Math.min(100, Math.max(0, scores[0] + variance())),
        career: Math.min(100, Math.max(0, scores[1] + variance())),
        love: Math.min(100, Math.max(0, scores[2] + variance())),
        wealth: Math.min(100, Math.max(0, scores[3] + variance())),
        health: Math.min(100, Math.max(0, scores[4] + variance())),
        social: Math.min(100, Math.max(0, scores[5] + variance())),
    };
}
// 获取幸运颜色（基于日主五行的相生元素）
function getLuckyColor(dayMaster) {
    const element = STEM_ELEMENTS[dayMaster];
    if (!element)
        return '白色';
    // 生我者为幸运色（印星五行）
    const idx = WU_XING_ORDER.indexOf(element);
    const luckyElement = WU_XING_ORDER[(idx + 4) % 5]; // 生我者
    const colors = ELEMENT_COLORS[luckyElement];
    return colors[Math.floor(Math.random() * colors.length)];
}
// 获取幸运方位（基于日主五行的相生元素）
function getLuckyDirection(dayMaster) {
    const element = STEM_ELEMENTS[dayMaster];
    if (!element)
        return '东方';
    // 我生者为幸运方位（食伤五行）
    const idx = WU_XING_ORDER.indexOf(element);
    const luckyElement = WU_XING_ORDER[(idx + 1) % 5]; // 我生者
    return ELEMENT_DIRECTIONS[luckyElement];
}
// 生成建议
function generateAdvice(tenGod) {
    const adviceMap = {
        '比肩': ['适合与朋友合作', '保持独立思考'],
        '劫财': ['注意财务支出', '避免冲动决策'],
        '食神': ['发挥创意才能', '享受生活乐趣'],
        '伤官': ['表达要注意分寸', '适合艺术创作'],
        '偏财': ['把握投资机会', '注意风险控制'],
        '正财': ['稳健理财为宜', '工作会有收获'],
        '七杀': ['面对挑战勇敢', '注意身体健康'],
        '正官': ['遵守规则行事', '事业有贵人助'],
        '偏印': ['学习新知识', '保持开放心态'],
        '正印': ['多与长辈交流', '适合学习进修'],
    };
    return adviceMap[tenGod] || ['保持平常心', '顺其自然'];
}
export async function handleDailyFortune(input) {
    // 解析日期为本地时间，避免 UTC 偏移
    let targetDate;
    if (input.date) {
        const [y, m, d] = input.date.split('-').map(Number);
        targetDate = new Date(y, m - 1, d);
    }
    else {
        targetDate = new Date();
    }
    const solar = Solar.fromDate(targetDate);
    const lunar = solar.getLunar();
    const eightChar = lunar.getEightChar();
    // 获取日主
    let dayMaster = input.dayMaster;
    if (!dayMaster && input.birthYear && input.birthMonth && input.birthDay) {
        const birthSolar = Solar.fromYmdHms(input.birthYear, input.birthMonth, input.birthDay, input.birthHour ?? 12, 0, 0);
        const birthLunar = birthSolar.getLunar();
        dayMaster = birthLunar.getEightChar().getDayGan();
    }
    // 流日干支
    const dayStem = eightChar.getDayGan();
    const dayBranch = eightChar.getDayZhi();
    // 计算十神（如果有日主）
    const tenGod = dayMaster ? calculateTenGod(dayMaster, dayStem) : undefined;
    const scores = calculateScores(tenGod || '比肩');
    const advice = generateAdvice(tenGod || '比肩');
    const luckyColor = dayMaster ? getLuckyColor(dayMaster) : undefined;
    const luckyDirection = dayMaster ? getLuckyDirection(dayMaster) : undefined;
    // 获取黄历信息
    const jieQi = lunar.getJieQi();
    // 安全获取数组
    const safeGetArray = (fn) => {
        try {
            return fn() || [];
        }
        catch {
            return [];
        }
    };
    // 安全获取字符串
    const safeGetString = (fn) => {
        try {
            return fn() || '';
        }
        catch {
            return '';
        }
    };
    return {
        date: `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`,
        dayInfo: {
            stem: dayStem,
            branch: dayBranch,
            ganZhi: `${dayStem}${dayBranch}`,
        },
        tenGod,
        scores,
        advice,
        luckyColor,
        luckyDirection,
        almanac: {
            lunarDate: lunar.toString(),
            lunarMonth: lunar.getMonthInChinese(),
            lunarDay: lunar.getDayInChinese(),
            zodiac: lunar.getYearShengXiao(),
            solarTerm: jieQi || undefined,
            suitable: safeGetArray(() => lunar.getDayYi()),
            avoid: safeGetArray(() => lunar.getDayJi()),
            chongSha: `冲${safeGetString(() => lunar.getDayChongDesc())} 煞${safeGetString(() => lunar.getDaySha())}`,
            pengZuBaiJi: safeGetArray(() => lunar.getPengZuGan()).concat(safeGetArray(() => lunar.getPengZuZhi())),
            jishen: safeGetArray(() => lunar.getDayJiShen()),
            xiongsha: safeGetArray(() => lunar.getDayXiongSha()),
        },
    };
}
