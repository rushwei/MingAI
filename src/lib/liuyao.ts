/**
 * 六爻占卜核心库
 * 
 * 包含 64 卦数据、铜钱起卦算法、变爻计算
 */

// 爻的类型
export type YaoType = 0 | 1;  // 0 = 阴爻, 1 = 阳爻

// 变爻状态
export type YaoChange = 'stable' | 'changing';

// 单个爻的信息
export interface Yao {
    type: YaoType;
    change: YaoChange;  // 是否变爻
    position: number;   // 1-6，从下到上
}

// 卦象
export interface Hexagram {
    name: string;           // 卦名
    code: string;           // 二进制编码 (从下到上)
    upperTrigram: string;   // 上卦
    lowerTrigram: string;   // 下卦
    element: string;        // 五行属性
    nature: string;         // 卦象本质
}

// 单卦（八卦）
export interface Trigram {
    name: string;
    code: string;
    element: string;
    nature: string;
}

// 铜钱抛掷结果
export interface CoinTossResult {
    coins: [boolean, boolean, boolean];  // true = 正面(字), false = 反面(花)
    heads: number;
    yaoType: YaoType;
    isChanging: boolean;
}

// 占卜结果
export interface DivinationResult {
    question: string;
    yaos: Yao[];
    hexagram: Hexagram;
    changedHexagram?: Hexagram;
    changedLines: number[];
    createdAt: Date;
}

// 八卦数据
export const TRIGRAMS: Record<string, Trigram> = {
    '111': { name: '乾', code: '111', element: '金', nature: '天' },
    '000': { name: '坤', code: '000', element: '土', nature: '地' },
    '100': { name: '震', code: '100', element: '木', nature: '雷' },
    '001': { name: '艮', code: '001', element: '土', nature: '山' },
    '010': { name: '坎', code: '010', element: '水', nature: '水' },
    '101': { name: '离', code: '101', element: '火', nature: '火' },
    '110': { name: '兑', code: '110', element: '金', nature: '泽' },
    '011': { name: '巽', code: '011', element: '木', nature: '风' },
};

// 64卦数据 (从 hexagram.md 解析)
export const HEXAGRAMS: Hexagram[] = [
    { name: '乾为天', code: '111111', upperTrigram: '乾', lowerTrigram: '乾', element: '金', nature: '刚健' },
    { name: '坤为地', code: '000000', upperTrigram: '坤', lowerTrigram: '坤', element: '土', nature: '柔顺' },
    { name: '水雷屯', code: '100010', upperTrigram: '坎', lowerTrigram: '震', element: '水', nature: '初生' },
    { name: '山水蒙', code: '010001', upperTrigram: '艮', lowerTrigram: '坎', element: '土', nature: '启蒙' },
    { name: '水天需', code: '111010', upperTrigram: '坎', lowerTrigram: '乾', element: '水', nature: '等待' },
    { name: '天水讼', code: '010111', upperTrigram: '乾', lowerTrigram: '坎', element: '金', nature: '争讼' },
    { name: '地水师', code: '010000', upperTrigram: '坤', lowerTrigram: '坎', element: '土', nature: '众军' },
    { name: '水地比', code: '000010', upperTrigram: '坎', lowerTrigram: '坤', element: '水', nature: '亲比' },
    { name: '风天小畜', code: '111011', upperTrigram: '巽', lowerTrigram: '乾', element: '木', nature: '积蓄' },
    { name: '天泽履', code: '110111', upperTrigram: '乾', lowerTrigram: '兑', element: '金', nature: '践履' },
    { name: '地天泰', code: '111000', upperTrigram: '坤', lowerTrigram: '乾', element: '土', nature: '通泰' },
    { name: '天地否', code: '000111', upperTrigram: '乾', lowerTrigram: '坤', element: '金', nature: '闭塞' },
    { name: '天火同人', code: '101111', upperTrigram: '乾', lowerTrigram: '离', element: '金', nature: '和同' },
    { name: '火天大有', code: '111101', upperTrigram: '离', lowerTrigram: '乾', element: '火', nature: '富有' },
    { name: '地山谦', code: '001000', upperTrigram: '坤', lowerTrigram: '艮', element: '土', nature: '谦逊' },
    { name: '雷地豫', code: '000100', upperTrigram: '震', lowerTrigram: '坤', element: '木', nature: '愉乐' },
    { name: '泽雷随', code: '100110', upperTrigram: '兑', lowerTrigram: '震', element: '金', nature: '随从' },
    { name: '山风蛊', code: '011001', upperTrigram: '艮', lowerTrigram: '巽', element: '土', nature: '蛊惑' },
    { name: '地泽临', code: '110000', upperTrigram: '坤', lowerTrigram: '兑', element: '土', nature: '临近' },
    { name: '风地观', code: '000011', upperTrigram: '巽', lowerTrigram: '坤', element: '木', nature: '观察' },
    { name: '火雷噬嗑', code: '100101', upperTrigram: '离', lowerTrigram: '震', element: '火', nature: '咬合' },
    { name: '山火贲', code: '101001', upperTrigram: '艮', lowerTrigram: '离', element: '土', nature: '文饰' },
    { name: '山地剥', code: '000001', upperTrigram: '艮', lowerTrigram: '坤', element: '土', nature: '剥落' },
    { name: '地雷复', code: '100000', upperTrigram: '坤', lowerTrigram: '震', element: '土', nature: '复归' },
    { name: '天雷无妄', code: '100111', upperTrigram: '乾', lowerTrigram: '震', element: '金', nature: '无妄' },
    { name: '山天大畜', code: '111001', upperTrigram: '艮', lowerTrigram: '乾', element: '土', nature: '大蓄' },
    { name: '山雷颐', code: '100001', upperTrigram: '艮', lowerTrigram: '震', element: '土', nature: '养育' },
    { name: '泽风大过', code: '011110', upperTrigram: '兑', lowerTrigram: '巽', element: '金', nature: '过度' },
    { name: '坎为水', code: '010010', upperTrigram: '坎', lowerTrigram: '坎', element: '水', nature: '险陷' },
    { name: '离为火', code: '101101', upperTrigram: '离', lowerTrigram: '离', element: '火', nature: '附丽' },
    { name: '泽山咸', code: '001110', upperTrigram: '兑', lowerTrigram: '艮', element: '金', nature: '感应' },
    { name: '雷风恒', code: '011100', upperTrigram: '震', lowerTrigram: '巽', element: '木', nature: '恒常' },
    { name: '天山遯', code: '001111', upperTrigram: '乾', lowerTrigram: '艮', element: '金', nature: '退避' },
    { name: '雷天大壮', code: '111100', upperTrigram: '震', lowerTrigram: '乾', element: '木', nature: '壮大' },
    { name: '火地晋', code: '000101', upperTrigram: '离', lowerTrigram: '坤', element: '火', nature: '晋升' },
    { name: '地火明夷', code: '101000', upperTrigram: '坤', lowerTrigram: '离', element: '土', nature: '晦暗' },
    { name: '风火家人', code: '101011', upperTrigram: '巽', lowerTrigram: '离', element: '木', nature: '家庭' },
    { name: '火泽睽', code: '110101', upperTrigram: '离', lowerTrigram: '兑', element: '火', nature: '乖离' },
    { name: '水山蹇', code: '001010', upperTrigram: '坎', lowerTrigram: '艮', element: '水', nature: '艰难' },
    { name: '雷水解', code: '010100', upperTrigram: '震', lowerTrigram: '坎', element: '木', nature: '解除' },
    { name: '山泽损', code: '110001', upperTrigram: '艮', lowerTrigram: '兑', element: '土', nature: '损益' },
    { name: '风雷益', code: '100011', upperTrigram: '巽', lowerTrigram: '震', element: '木', nature: '增益' },
    { name: '泽天夬', code: '111110', upperTrigram: '兑', lowerTrigram: '乾', element: '金', nature: '决断' },
    { name: '天风姤', code: '011111', upperTrigram: '乾', lowerTrigram: '巽', element: '金', nature: '遇合' },
    { name: '泽地萃', code: '000110', upperTrigram: '兑', lowerTrigram: '坤', element: '金', nature: '聚集' },
    { name: '地风升', code: '011000', upperTrigram: '坤', lowerTrigram: '巽', element: '土', nature: '上升' },
    { name: '泽水困', code: '010110', upperTrigram: '兑', lowerTrigram: '坎', element: '金', nature: '困穷' },
    { name: '水风井', code: '011010', upperTrigram: '坎', lowerTrigram: '巽', element: '水', nature: '井养' },
    { name: '泽火革', code: '101110', upperTrigram: '兑', lowerTrigram: '离', element: '金', nature: '变革' },
    { name: '火风鼎', code: '011101', upperTrigram: '离', lowerTrigram: '巽', element: '火', nature: '鼎新' },
    { name: '震为雷', code: '100100', upperTrigram: '震', lowerTrigram: '震', element: '木', nature: '震动' },
    { name: '艮为山', code: '001001', upperTrigram: '艮', lowerTrigram: '艮', element: '土', nature: '止息' },
    { name: '风山渐', code: '001011', upperTrigram: '巽', lowerTrigram: '艮', element: '木', nature: '渐进' },
    { name: '雷泽归妹', code: '110100', upperTrigram: '震', lowerTrigram: '兑', element: '木', nature: '归嫁' },
    { name: '雷火丰', code: '101100', upperTrigram: '震', lowerTrigram: '离', element: '木', nature: '丰盛' },
    { name: '火山旅', code: '001101', upperTrigram: '离', lowerTrigram: '艮', element: '火', nature: '旅行' },
    { name: '巽为风', code: '011011', upperTrigram: '巽', lowerTrigram: '巽', element: '木', nature: '顺入' },
    { name: '兑为泽', code: '110110', upperTrigram: '兑', lowerTrigram: '兑', element: '金', nature: '喜悦' },
    { name: '风水涣', code: '010011', upperTrigram: '巽', lowerTrigram: '坎', element: '木', nature: '涣散' },
    { name: '水泽节', code: '110010', upperTrigram: '坎', lowerTrigram: '兑', element: '水', nature: '节制' },
    { name: '风泽中孚', code: '110011', upperTrigram: '巽', lowerTrigram: '兑', element: '木', nature: '诚信' },
    { name: '雷山小过', code: '001100', upperTrigram: '震', lowerTrigram: '艮', element: '木', nature: '小过' },
    { name: '水火既济', code: '101010', upperTrigram: '坎', lowerTrigram: '离', element: '水', nature: '已成' },
    { name: '火水未济', code: '010101', upperTrigram: '离', lowerTrigram: '坎', element: '火', nature: '未成' },
];

// 根据编码查找卦象
export function findHexagram(code: string): Hexagram | undefined {
    return HEXAGRAMS.find(h => h.code === code);
}

// 根据卦名查找卦象
export function findHexagramByName(name: string): Hexagram | undefined {
    return HEXAGRAMS.find(h => h.name === name);
}

/**
 * 模拟抛铜钱
 * 正面(字) = true, 反面(花) = false
 * 
 * 三正 = 老阳(9), 变爻, 记 ○
 * 二正一反 = 少阳(7), 不变, 记 —
 * 一正二反 = 少阴(8), 不变, 记 - -
 * 三反 = 老阴(6), 变爻, 记 ×
 */
export function tossCoin(): boolean {
    return Math.random() < 0.5;
}

export function tossThreeCoins(): CoinTossResult {
    const coins: [boolean, boolean, boolean] = [tossCoin(), tossCoin(), tossCoin()];
    const heads = coins.filter(c => c).length;

    // 三正 = 老阳(9), 变
    // 二正一反 = 少阳(7), 不变
    // 一正二反 = 少阴(8), 不变
    // 三反 = 老阴(6), 变
    let yaoType: YaoType;
    let isChanging: boolean;

    switch (heads) {
        case 3: // 老阳
            yaoType = 1;
            isChanging = true;
            break;
        case 2: // 少阳
            yaoType = 1;
            isChanging = false;
            break;
        case 1: // 少阴
            yaoType = 0;
            isChanging = false;
            break;
        case 0: // 老阴
            yaoType = 0;
            isChanging = true;
            break;
        default:
            yaoType = 1;
            isChanging = false;
    }

    return { coins, heads, yaoType, isChanging };
}

/**
 * 完整起卦流程
 * 抛6次，从初爻(下)到上爻(上)
 */
export function divine(): { yaos: Yao[], results: CoinTossResult[] } {
    const results: CoinTossResult[] = [];
    const yaos: Yao[] = [];

    for (let i = 1; i <= 6; i++) {
        const result = tossThreeCoins();
        results.push(result);
        yaos.push({
            type: result.yaoType,
            change: result.isChanging ? 'changing' : 'stable',
            position: i,
        });
    }

    return { yaos, results };
}

/**
 * 从爻数组生成卦象编码
 */
export function yaosTpCode(yaos: Yao[]): string {
    return yaos.map(y => y.type.toString()).join('');
}

/**
 * 计算变卦
 * 变爻翻转后的卦象
 */
export function calculateChangedHexagram(yaos: Yao[]): { changedCode: string, changedLines: number[] } {
    const changedLines: number[] = [];
    const changedYaos = yaos.map((y, i) => {
        if (y.change === 'changing') {
            changedLines.push(i + 1);
            return y.type === 1 ? 0 : 1;
        }
        return y.type;
    });

    return {
        changedCode: changedYaos.join(''),
        changedLines,
    };
}

/**
 * 执行完整占卜
 */
export function performDivination(question: string): DivinationResult {
    const { yaos } = divine();
    const hexagramCode = yaosTpCode(yaos);
    const hexagram = findHexagram(hexagramCode);

    if (!hexagram) {
        throw new Error(`未找到卦象: ${hexagramCode}`);
    }

    const { changedCode, changedLines } = calculateChangedHexagram(yaos);
    const changedHexagram = changedLines.length > 0 ? findHexagram(changedCode) : undefined;

    return {
        question,
        yaos,
        hexagram,
        changedHexagram,
        changedLines,
        createdAt: new Date(),
    };
}

/**
 * 根据传入的爻数据重建占卜结果
 */
export function reconstructDivination(
    question: string,
    yaoData: { type: YaoType, change: YaoChange }[]
): DivinationResult {
    const yaos: Yao[] = yaoData.map((y, i) => ({
        ...y,
        position: i + 1,
    }));

    const hexagramCode = yaosTpCode(yaos);
    const hexagram = findHexagram(hexagramCode);

    if (!hexagram) {
        throw new Error(`未找到卦象: ${hexagramCode}`);
    }

    const { changedCode, changedLines } = calculateChangedHexagram(yaos);
    const changedHexagram = changedLines.length > 0 ? findHexagram(changedCode) : undefined;

    return {
        question,
        yaos,
        hexagram,
        changedHexagram,
        changedLines,
        createdAt: new Date(),
    };
}

// 卦象简要解释
export const HEXAGRAM_BRIEF: Record<string, string> = {
    '乾为天': '元亨利贞，君子自强不息。象征刚健、创造、积极进取。',
    '坤为地': '厚德载物，柔顺利贞。象征包容、承载、宽厚待人。',
    '水雷屯': '万事开头难，需耐心等待时机，草创初期多艰辛。',
    '山水蒙': '蒙昧待启，虚心求教，学无止境。',
    '水天需': '需要等待，养精蓄锐，时机未到不可轻动。',
    '天水讼': '争讼之象，宜和解退让，不宜强争。',
    '地水师': '众军出征，需有明君统帅，师出有名。',
    '水地比': '亲比和睦，辅佐贤能，广结善缘。',
    '风天小畜': '小有积蓄，以柔制刚，量力而行。',
    '天泽履': '如履薄冰，谨慎行事，礼仪规范。',
    '地天泰': '天地交泰，上下和睦，大吉大利。',
    '天地否': '闭塞不通，君子潜藏，等待时机。',
    '天火同人': '同人于野，志同道合，众志成城。',
    '火天大有': '大有收获，光明正大，元亨。',
    '地山谦': '谦虚自牧，谦受益满招损。',
    '雷地豫': '和乐愉悦，但不可过于安逸。',
    '泽雷随': '随顺因时，灵活应变。',
    '山风蛊': '拨乱反正，振作革新。',
    '地泽临': '临近观察，居高临下，以德服人。',
    '风地观': '观察仰望，以身作则。',
    '火雷噬嗑': '明断是非，刑罚分明。',
    '山火贲': '文饰修养，内实外华。',
    '山地剥': '剥落凋零，顺应衰退。',
    '地雷复': '一阳复始，回归本心。',
    '天雷无妄': '无妄而行，顺应自然。',
    '山天大畜': '大有积蓄，厚积薄发。',
    '山雷颐': '养育之道，慎言节食。',
    '泽风大过': '过度之象，独立不惧。',
    '坎为水': '重重险难，诚信待之。',
    '离为火': '附丽光明，柔顺得吉。',
    '泽山咸': '感应相通，真诚相待。',
    '雷风恒': '恒久不变，坚持正道。',
    '天山遯': '避让退隐，保全自身。',
    '雷天大壮': '壮盛强大，宜守正道。',
    '火地晋': '晋升明出，光明上进。',
    '地火明夷': '明入地中，晦暗待时。',
    '风火家人': '家庭和睦，齐家之道。',
    '火泽睽': '乖离异向，求同存异。',
    '水山蹇': '行路艰难，宜守宜退。',
    '雷水解': '解除困难，缓和矛盾。',
    '山泽损': '损下益上，减损得益。',
    '风雷益': '益下利民，增益发展。',
    '泽天夬': '果断决定，刚决柔。',
    '天风姤': '偶然相遇，阴长阳消。',
    '泽地萃': '聚集汇合，众志成城。',
    '地风升': '上升进阶，循序渐进。',
    '泽水困': '困穷受困，困而不失。',
    '水风井': '井养不穷，取之不竭。',
    '泽火革': '变革创新，除旧布新。',
    '火风鼎': '鼎新革故，重器传承。',
    '震为雷': '震惊百里，修省自身。',
    '艮为山': '止息静止，知止不殆。',
    '风山渐': '渐进发展，循序渐进。',
    '雷泽归妹': '归嫁从夫，有终无初。',
    '雷火丰': '丰盛鼎盛，宜大作为。',
    '火山旅': '旅行在外，谨慎客居。',
    '巽为风': '顺入渗透，柔和谦逊。',
    '兑为泽': '喜悦说和，刚中柔外。',
    '风水涣': '涣散离散，重新聚合。',
    '水泽节': '节制适度，有度为吉。',
    '风泽中孚': '诚信孚于中，信及豚鱼。',
    '雷山小过': '小事可过，不可大事。',
    '水火既济': '已经成功，谨守成功。',
    '火水未济': '尚未完成，谨慎前行。',
};

/**
 * 获取卦象简要解释
 */
export function getHexagramBrief(name: string): string {
    return HEXAGRAM_BRIEF[name] || '此卦象征变化与机遇，宜静观其变。';
}
