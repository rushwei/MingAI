/**
 * 塔罗牌数据定义
 * 
 * 78张韦特塔罗牌完整数据，包含22张大阿卡纳和56张小阿卡纳
 */

import { handleTarotDraw, type TarotCardResult } from '@mingai/core/tarot';

// 牌的类型
export type TarotSuit = 'major' | 'wands' | 'cups' | 'swords' | 'pentacles';

// 牌的方向
export type CardOrientation = 'upright' | 'reversed';

// 单张塔罗牌定义
export interface TarotCard {
    id: number;
    name: string;          // 英文名
    nameChinese: string;   // 中文名
    suit: TarotSuit;       // 牌组
    number: number;        // 编号（大阿卡纳0-21，小阿卡纳1-14）
    image: string;         // 图片路径
    keywords: string[];    // 关键词
    uprightMeaning: string;    // 正位含义
    reversedMeaning: string;   // 逆位含义
    element?: string;      // 对应元素
    zodiac?: string;       // 对应星座
}

// 抽牌结果
export interface DrawnCard {
    card: TarotCard;
    orientation: CardOrientation;
    position?: string;     // 在牌阵中的位置含义
}

// 牌阵定义
export interface TarotSpread {
    id: string;
    name: string;
    description: string;
    positions: { name: string; meaning: string }[];
    cardCount: number;
}

// 完整的塔罗牌解读
export interface TarotReading {
    id?: string;
    userId?: string;
    spreadId: string;
    spreadName: string;
    question?: string;
    cards: DrawnCard[];
    summary?: string;      // AI 综合解读
    createdAt: Date;
}

type TarotTextCardLike = {
    position?: string;
    orientation?: CardOrientation;
    meaning?: string;
    card?: {
        name?: string;
        nameChinese?: string;
        keywords?: string[];
        uprightMeaning?: string;
        reversedMeaning?: string;
    };
};

export function generateTarotReadingText(input: {
    spreadName: string;
    question?: string | null;
    cards: unknown;
}): string {
    const cards = Array.isArray(input.cards) ? input.cards as TarotTextCardLike[] : [];
    const lines: string[] = [
        '# 塔罗占卜',
        '',
        '## 基本信息',
        `- **牌阵**: ${input.spreadName}`,
    ];

    if (input.question) {
        lines.push(`- **问题**: ${input.question}`);
    }

    lines.push('');
    lines.push('## 抽到的牌');
    lines.push('');

    cards.forEach((item, index) => {
        const position = item.position || `第${index + 1}张`;
        const card = item.card || {};
        const orientation = item.orientation === 'reversed' ? '逆位' : '正位';
        const keywords = Array.isArray(card.keywords) ? card.keywords.join('、') : '';
        const meaning = item.meaning || (item.orientation === 'reversed' ? card.reversedMeaning : card.uprightMeaning) || '';
        lines.push(`### ${position}: ${card.nameChinese || card.name || `第${index + 1}张`}`);
        lines.push('');
        lines.push(`- **方向**: ${orientation}`);
        if (keywords) lines.push(`- **关键词**: ${keywords}`);
        if (meaning) lines.push(`- **牌义**: ${meaning}`);
        lines.push('');
    });

    return lines.join('\n');
}

// ===== 22张大阿卡纳 =====
const majorArcana: TarotCard[] = [
    {
        id: 0, name: 'The Fool', nameChinese: '愚人', suit: 'major', number: 0,
        image: '/tarot_cards/thefool.jpeg',
        keywords: ['新开始', '纯真', '冒险', '自由'],
        uprightMeaning: '代表新的开始、无限的可能性。保持开放的心态，勇敢地踏上未知的旅程。',
        reversedMeaning: '可能意味着鲁莽、不负责任，或者对新事物的恐惧阻碍了你前进。',
        element: '风', zodiac: '天王星'
    },
    {
        id: 1, name: 'The Magician', nameChinese: '魔术师', suit: 'major', number: 1,
        image: '/tarot_cards/themagician.jpeg',
        keywords: ['意志力', '创造', '技巧', '资源'],
        uprightMeaning: '你拥有实现目标所需的一切资源和能力，现在是采取行动的时候。',
        reversedMeaning: '警惕欺骗或被欺骗，可能存在潜力未被开发或资源使用不当的情况。',
        element: '风', zodiac: '水星'
    },
    {
        id: 2, name: 'The High Priestess', nameChinese: '女祭司', suit: 'major', number: 2,
        image: '/tarot_cards/thehighpriestess.jpeg',
        keywords: ['直觉', '神秘', '潜意识', '智慧'],
        uprightMeaning: '倾听你的直觉和内心的声音，答案可能就隐藏在潜意识中。',
        reversedMeaning: '可能忽视了直觉的引导，或者被表面的事物所迷惑。',
        element: '水', zodiac: '月亮'
    },
    {
        id: 3, name: 'The Empress', nameChinese: '皇后', suit: 'major', number: 3,
        image: '/tarot_cards/theempress.jpeg',
        keywords: ['富饶', '母性', '自然', '创造力'],
        uprightMeaning: '象征丰收和繁荣，是创造力和养育能量的体现。',
        reversedMeaning: '可能存在创造力受阻、过度依赖他人或自我忽视的情况。',
        element: '土', zodiac: '金星'
    },
    {
        id: 4, name: 'The Emperor', nameChinese: '皇帝', suit: 'major', number: 4,
        image: '/tarot_cards/theemperor.jpeg',
        keywords: ['权威', '结构', '控制', '父亲'],
        uprightMeaning: '代表稳定和秩序，鼓励你建立结构并承担领导责任。',
        reversedMeaning: '警惕过度控制或权威的滥用，也可能暗示缺乏自律。',
        element: '火', zodiac: '白羊座'
    },
    {
        id: 5, name: 'The Hierophant', nameChinese: '教皇', suit: 'major', number: 5,
        image: '/tarot_cards/thehierophant.jpeg',
        keywords: ['传统', '信仰', '教育', '指导'],
        uprightMeaning: '代表传统价值观和精神指导，寻求导师或遵循既定的道路。',
        reversedMeaning: '可能在挑战传统观念，或需要找到自己独特的精神道路。',
        element: '土', zodiac: '金牛座'
    },
    {
        id: 6, name: 'The Lovers', nameChinese: '恋人', suit: 'major', number: 6,
        image: '/tarot_cards/TheLovers.jpg',
        keywords: ['爱情', '选择', '和谐', '关系'],
        uprightMeaning: '代表和谐的关系和重要的选择，跟随内心做出决定。',
        reversedMeaning: '可能面临关系中的不和谐，或在重要选择面前犹豫不决。',
        element: '风', zodiac: '双子座'
    },
    {
        id: 7, name: 'The Chariot', nameChinese: '战车', suit: 'major', number: 7,
        image: '/tarot_cards/thechariot.jpeg',
        keywords: ['意志力', '胜利', '决心', '控制'],
        uprightMeaning: '凭借坚定的意志力和决心，你将克服障碍取得胜利。',
        reversedMeaning: '可能缺乏方向或自控力，需要重新调整你的目标。',
        element: '水', zodiac: '巨蟹座'
    },
    {
        id: 8, name: 'Strength', nameChinese: '力量', suit: 'major', number: 8,
        image: '/tarot_cards/thestrength.jpeg',
        keywords: ['勇气', '耐心', '内在力量', '慈悲'],
        uprightMeaning: '真正的力量来自内心，以耐心和慈悲面对挑战。',
        reversedMeaning: '可能感到自我怀疑或缺乏信心，需要重新连接内在的力量。',
        element: '火', zodiac: '狮子座'
    },
    {
        id: 9, name: 'The Hermit', nameChinese: '隐士', suit: 'major', number: 9,
        image: '/tarot_cards/thehermit.jpeg',
        keywords: ['内省', '独处', '智慧', '引导'],
        uprightMeaning: '现在是内省和寻求内在智慧的时候，独处能带来启发。',
        reversedMeaning: '可能过度孤立自己，或拒绝接受他人的指导。',
        element: '土', zodiac: '处女座'
    },
    {
        id: 10, name: 'Wheel of Fortune', nameChinese: '命运之轮', suit: 'major', number: 10,
        image: '/tarot_cards/wheeloffortune.jpeg',
        keywords: ['命运', '变化', '周期', '机遇'],
        uprightMeaning: '生活正在发生积极的变化，抓住命运带来的机遇。',
        reversedMeaning: '可能经历不利的变化，记住这只是周期的一部分。',
        element: '火', zodiac: '木星'
    },
    {
        id: 11, name: 'Justice', nameChinese: '正义', suit: 'major', number: 11,
        image: '/tarot_cards/justice.jpeg',
        keywords: ['公正', '真相', '因果', '平衡'],
        uprightMeaning: '公正将会实现，你的行为会得到公平的回报。',
        reversedMeaning: '可能存在不公正的情况，或需要面对自己逃避的真相。',
        element: '风', zodiac: '天秤座'
    },
    {
        id: 12, name: 'The Hanged Man', nameChinese: '倒吊人', suit: 'major', number: 12,
        image: '/tarot_cards/thehangedman.jpeg',
        keywords: ['暂停', '臣服', '新视角', '牺牲'],
        uprightMeaning: '暂时放下控制，换个角度看问题，可能需要做出一些牺牲。',
        reversedMeaning: '可能在抗拒必要的改变，或做出了不必要的牺牲。',
        element: '水', zodiac: '海王星'
    },
    {
        id: 13, name: 'Death', nameChinese: '死神', suit: 'major', number: 13,
        image: '/tarot_cards/death.jpeg',
        keywords: ['结束', '转变', '重生', '放下'],
        uprightMeaning: '一个阶段的结束意味着新的开始，学会放下过去。',
        reversedMeaning: '可能在抗拒必要的改变，害怕放手或前进。',
        element: '水', zodiac: '天蝎座'
    },
    {
        id: 14, name: 'Temperance', nameChinese: '节制', suit: 'major', number: 14,
        image: '/tarot_cards/temperance.jpeg',
        keywords: ['平衡', '耐心', '调和', '适度'],
        uprightMeaning: '保持耐心和平衡，找到生活中各方面的和谐。',
        reversedMeaning: '可能存在不平衡或过度行为，需要恢复适度。',
        element: '火', zodiac: '射手座'
    },
    {
        id: 15, name: 'The Devil', nameChinese: '恶魔', suit: 'major', number: 15,
        image: '/tarot_cards/thedevil.jpeg',
        keywords: ['束缚', '诱惑', '物质', '阴影'],
        uprightMeaning: '意识到什么在束缚你，面对你的阴暗面和不良习惯。',
        reversedMeaning: '正在打破束缚，从不良模式或关系中解脱出来。',
        element: '土', zodiac: '摩羯座'
    },
    {
        id: 16, name: 'The Tower', nameChinese: '高塔', suit: 'major', number: 16,
        image: '/tarot_cards/thetower.jpeg',
        keywords: ['突变', '崩塌', '觉醒', '解放'],
        uprightMeaning: '突然的变化可能令人不安，但这是破除虚假走向真实的必经之路。',
        reversedMeaning: '可能在逃避必要的改变，或者变化正在内部发生。',
        element: '火', zodiac: '火星'
    },
    {
        id: 17, name: 'The Star', nameChinese: '星星', suit: 'major', number: 17,
        image: '/tarot_cards/thestar.jpeg',
        keywords: ['希望', '灵感', '宁静', '更新'],
        uprightMeaning: '经历困难后的平静和希望，相信宇宙的引导。',
        reversedMeaning: '可能暂时失去希望或方向，需要重新找到信心。',
        element: '风', zodiac: '水瓶座'
    },
    {
        id: 18, name: 'The Moon', nameChinese: '月亮', suit: 'major', number: 18,
        image: '/tarot_cards/themoon.jpeg',
        keywords: ['幻觉', '恐惧', '潜意识', '直觉'],
        uprightMeaning: '面对恐惧和幻觉，相信你的直觉穿越迷雾。',
        reversedMeaning: '幻觉正在消散，真相开始显现，恐惧减少。',
        element: '水', zodiac: '双鱼座'
    },
    {
        id: 19, name: 'The Sun', nameChinese: '太阳', suit: 'major', number: 19,
        image: '/tarot_cards/thesun.jpeg',
        keywords: ['喜悦', '成功', '生机', '光明'],
        uprightMeaning: '这是充满喜悦和成功的时期，享受生活的光明面。',
        reversedMeaning: '喜悦可能被暂时遮蔽，但光明终将到来。',
        element: '火', zodiac: '太阳'
    },
    {
        id: 20, name: 'Judgement', nameChinese: '审判', suit: 'major', number: 20,
        image: '/tarot_cards/judgement.jpeg',
        keywords: ['觉醒', '重生', '召唤', '反思'],
        uprightMeaning: '听从内心更高的召唤，是自我评估和重生的时刻。',
        reversedMeaning: '可能在逃避自我反思，或没有听到内心的召唤。',
        element: '火', zodiac: '冥王星'
    },
    {
        id: 21, name: 'The World', nameChinese: '世界', suit: 'major', number: 21,
        image: '/tarot_cards/theworld.jpeg',
        keywords: ['完成', '整合', '成就', '旅程'],
        uprightMeaning: '一个重要周期的完成，成就和圆满的时刻。',
        reversedMeaning: '可能还有未完成的事项，或者在完成前需要更多努力。',
        element: '土', zodiac: '土星'
    },
];

// ===== 小阿卡纳生成函数 =====
function generateMinorArcana(): TarotCard[] {
    const suits: { suit: TarotSuit; element: string; theme: string }[] = [
        { suit: 'wands', element: '火', theme: '行动与创造力' },
        { suit: 'cups', element: '水', theme: '情感与关系' },
        { suit: 'swords', element: '风', theme: '思维与挑战' },
        { suit: 'pentacles', element: '土', theme: '物质与实践' },
    ];

    const numbers: { num: number; name: string; prefix: string; keywords: string[] }[] = [
        { num: 1, name: 'Ace', prefix: 'aceof', keywords: ['新开始', '潜力', '机会'] },
        { num: 2, name: 'Two', prefix: 'twoof', keywords: ['平衡', '选择', '合作'] },
        { num: 3, name: 'Three', prefix: 'threeof', keywords: ['成长', '创造', '合作'] },
        { num: 4, name: 'Four', prefix: 'fourof', keywords: ['稳定', '基础', '休息'] },
        { num: 5, name: 'Five', prefix: 'fiveof', keywords: ['冲突', '变化', '挑战'] },
        { num: 6, name: 'Six', prefix: 'sixof', keywords: ['和谐', '给予', '恢复'] },
        { num: 7, name: 'Seven', prefix: 'sevenof', keywords: ['反思', '评估', '等待'] },
        { num: 8, name: 'Eight', prefix: 'eightof', keywords: ['行动', '速度', '进展'] },
        { num: 9, name: 'Nine', prefix: 'nineof', keywords: ['接近完成', '满足', '韧性'] },
        { num: 10, name: 'Ten', prefix: 'tenof', keywords: ['完成', '极端', '周期结束'] },
        { num: 11, name: 'Page', prefix: 'pageof', keywords: ['学习', '消息', '探索'] },
        { num: 12, name: 'Knight', prefix: 'knightof', keywords: ['行动', '冒险', '追求'] },
        { num: 13, name: 'Queen', prefix: 'queenof', keywords: ['掌握', '滋养', '直觉'] },
        { num: 14, name: 'King', prefix: 'kingof', keywords: ['权威', '控制', '成熟'] },
    ];

    const suitNames: Record<TarotSuit, string> = {
        major: '大阿卡纳',
        wands: '权杖',
        cups: '圣杯',
        swords: '宝剑',
        pentacles: '星币',
    };

    const cards: TarotCard[] = [];
    let id = 22; // 从22开始，22张大阿卡纳是0-21

    for (const suitInfo of suits) {
        for (const numInfo of numbers) {
            const cardName = numInfo.num <= 10
                ? `${numInfo.name} of ${suitInfo.suit.charAt(0).toUpperCase() + suitInfo.suit.slice(1)}`
                : `${numInfo.name} of ${suitInfo.suit.charAt(0).toUpperCase() + suitInfo.suit.slice(1)}`;

            const chineseName = numInfo.num <= 10
                ? `${suitNames[suitInfo.suit]}${['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'][numInfo.num - 1]}`
                : `${suitNames[suitInfo.suit]}${['侍从', '骑士', '王后', '国王'][numInfo.num - 11]}`;

            cards.push({
                id: id++,
                name: cardName,
                nameChinese: chineseName,
                suit: suitInfo.suit,
                number: numInfo.num,
                image: `/tarot_cards/${numInfo.prefix}${suitInfo.suit}.jpeg`,
                keywords: [...numInfo.keywords, suitInfo.theme],
                uprightMeaning: `${chineseName}正位：在${suitInfo.theme}领域的${numInfo.keywords.join('、')}能量。`,
                reversedMeaning: `${chineseName}逆位：${suitInfo.theme}领域可能面临阻碍或需要反思。`,
                element: suitInfo.element,
            });
        }
    }

    return cards;
}

// ===== 完整的78张塔罗牌数据 =====
export const TAROT_CARDS: TarotCard[] = [...majorArcana, ...generateMinorArcana()];

// ===== 常用牌阵定义 =====
export const TAROT_SPREADS: TarotSpread[] = [
    {
        id: 'single',
        name: '单牌',
        description: '最简单的牌阵，抽一张牌获取当前情况的指引。',
        positions: [{ name: '当前指引', meaning: '代表当前情况最需要关注的信息' }],
        cardCount: 1,
    },
    {
        id: 'three-card',
        name: '三牌阵',
        description: '经典牌阵，展示过去、现在、未来的发展脉络。',
        positions: [
            { name: '过去', meaning: '影响当前情况的过去因素' },
            { name: '现在', meaning: '当前情况的核心' },
            { name: '未来', meaning: '可能的发展方向' },
        ],
        cardCount: 3,
    },
    {
        id: 'love',
        name: '爱情牌阵',
        description: '专门解读感情问题的牌阵。',
        positions: [
            { name: '你的状态', meaning: '你在这段关系中的状态' },
            { name: '对方状态', meaning: '对方在这段关系中的状态' },
            { name: '关系现状', meaning: '两人关系的现状' },
            { name: '建议', meaning: '改善关系的建议' },
        ],
        cardCount: 4,
    },
    {
        id: 'celtic-cross',
        name: '凯尔特十字',
        description: '最经典全面的牌阵，深入分析复杂问题。',
        positions: [
            { name: '现状', meaning: '问题的核心' },
            { name: '挑战', meaning: '面临的主要障碍' },
            { name: '意识', meaning: '你意识到的方面' },
            { name: '潜意识', meaning: '隐藏的影响因素' },
            { name: '过去', meaning: '近期的影响' },
            { name: '未来', meaning: '近期可能的发展' },
            { name: '态度', meaning: '你对问题的态度' },
            { name: '环境', meaning: '外部影响因素' },
            { name: '希望与恐惧', meaning: '内心的期望与担忧' },
            { name: '结果', meaning: '最可能的结果' },
        ],
        cardCount: 10,
    },
];

// ===== 工具函数 =====

type TarotDrawOptions = {
    seed?: string;
    seedScope?: string;
    question?: string;
    timezone?: string;
};

function buildMeaningText(
    orientation: 'upright' | 'reversed',
    keywords: string[],
    reversedKeywords?: string[]
): string {
    if (orientation === 'upright') {
        return `正位：${keywords.join('、')}`;
    }
    if (reversedKeywords && reversedKeywords.length > 0) {
        return `逆位：${reversedKeywords.join('、')}`;
    }
    return `逆位：需要反思${keywords.join('、')}相关的问题`;
}

function resolveTarotCardBase(name: string): TarotCard | undefined {
    return TAROT_CARDS.find(card => card.name === name);
}

function resolveTarotCardImage(name: string): string {
    return resolveTarotCardBase(name)?.image || TAROT_CARDS[0]?.image || '';
}

function resolveDateKey(date: Date, timeZone: string): string {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
    const parts = formatter.formatToParts(date);
    const values: Record<string, string> = {};
    for (const part of parts) {
        if (part.type !== 'literal') {
            values[part.type] = part.value;
        }
    }
    return `${values.year}-${values.month}-${values.day}`;
}

function resolveLocalDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function createEphemeralSeed(): string {
    if (typeof globalThis.crypto?.randomUUID === 'function') {
        return globalThis.crypto.randomUUID();
    }

    if (typeof globalThis.crypto?.getRandomValues === 'function') {
        const values = new Uint32Array(2);
        globalThis.crypto.getRandomValues(values);
        return `rng-${values[0].toString(36)}-${values[1].toString(36)}`;
    }

    return `rng-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function resolveDrawSeed(seed?: string): string {
    return seed ?? createEphemeralSeed();
}

function mapCoreCardToDrawn(card: TarotCardResult, position?: string): DrawnCard {
    const base = resolveTarotCardBase(card.card.name);
    const uprightMeaning = buildMeaningText('upright', card.card.keywords, card.reversedKeywords);
    const reversedMeaning = buildMeaningText('reversed', card.card.keywords, card.reversedKeywords);
    const number = base?.number ?? card.number ?? 0;

    return {
        card: {
            id: base?.id ?? number,
            name: card.card.name,
            nameChinese: card.card.nameChinese,
            suit: base?.suit ?? 'major',
            number,
            image: resolveTarotCardImage(card.card.name),
            keywords: card.card.keywords,
            uprightMeaning,
            reversedMeaning,
            element: card.element ?? base?.element,
            zodiac: card.astrologicalCorrespondence ?? base?.zodiac,
        },
        orientation: card.orientation,
        position,
    };
}

/**
 * 随机抽取塔罗牌
 */
export async function drawCards(
    count: number = 1,
    allowReversed: boolean = true,
    options: TarotDrawOptions = {}
): Promise<DrawnCard[]> {
    const safeCount = Math.max(1, Math.min(10, count));
    const spreadType = safeCount <= 1 ? 'single' : 'celtic-cross';
    const output = await handleTarotDraw({
        spreadType,
        allowReversed,
        seed: resolveDrawSeed(options.seed),
        seedScope: options.seedScope,
        question: options.question,
    });
    return output.cards.slice(0, safeCount).map(card => mapCoreCardToDrawn(card));
}

/**
 * 根据牌阵抽牌
 */
export async function drawForSpread(
    spreadId: string,
    allowReversed: boolean = true,
    options: TarotDrawOptions = {}
): Promise<{ spread: TarotSpread; cards: DrawnCard[] } | null> {
    const spread = TAROT_SPREADS.find(s => s.id === spreadId);
    if (!spread) return null;

    const output = await handleTarotDraw({
        spreadType: spreadId,
        allowReversed,
        seed: resolveDrawSeed(options.seed),
        seedScope: options.seedScope,
        question: options.question,
    });

    const cardsWithPositions = output.cards.map((card, index) =>
        mapCoreCardToDrawn(card, spread.positions[index]?.meaning)
    );

    return { spread, cards: cardsWithPositions };
}

/**
 * 每日一牌（基于日期固定）
 */
export async function getDailyCard(
    date: Date = new Date(),
    options: TarotDrawOptions = {}
): Promise<DrawnCard> {
    let seed: string;
    if (!options.timezone) {
        seed = resolveLocalDateKey(date);
    } else {
        try {
            seed = resolveDateKey(date, options.timezone);
        } catch (error) {
            if (error instanceof RangeError) {
                throw new Error('timezone 无效');
            }
            throw error;
        }
    }

    const output = await handleTarotDraw({
        spreadType: 'single',
        allowReversed: true,
        seed,
        seedScope: options.seedScope,
    });
    return mapCoreCardToDrawn(output.cards[0]);
}

/**
 * 通过ID获取卡片
 */
export function getCardById(id: number): TarotCard | undefined {
    return TAROT_CARDS.find(c => c.id === id);
}
