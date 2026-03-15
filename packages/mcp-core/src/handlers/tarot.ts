/**
 * 塔罗牌处理器
 */

import type { TarotInput, TarotOutput, TarotCardResult } from '../types.js';
import { createSeededRng, resolveSeed } from '../seeded-rng.js';

// 牌的基本结构
interface TarotCard {
  name: string;
  nameChinese: string;
  keywords: string[];
  reversedKeywords?: string[];
  suit: 'major' | 'wands' | 'cups' | 'swords' | 'pentacles';
  element?: string;
  astrologicalCorrespondence?: string;
}

// 大阿卡纳牌
const MAJOR_ARCANA: TarotCard[] = [
  { name: 'The Fool', nameChinese: '愚者', keywords: ['新开始', '冒险', '天真'], reversedKeywords: ['鲁莽冒失', '冲动决策', '缺乏计划'], suit: 'major', element: '风', astrologicalCorrespondence: '天王星' },
  { name: 'The Magician', nameChinese: '魔术师', keywords: ['创造力', '技能', '意志力'], reversedKeywords: ['欺骗操控', '浪费潜力', '缺乏专注'], suit: 'major', element: '风', astrologicalCorrespondence: '水星' },
  { name: 'The High Priestess', nameChinese: '女祭司', keywords: ['直觉', '神秘', '内在智慧'], reversedKeywords: ['忽视直觉', '情感疏离', '内心封闭'], suit: 'major', element: '水', astrologicalCorrespondence: '月亮' },
  { name: 'The Empress', nameChinese: '女皇', keywords: ['丰饶', '母性', '创造'], reversedKeywords: ['创造力受阻', '过度依赖', '精力耗竭'], suit: 'major', element: '土', astrologicalCorrespondence: '金星' },
  { name: 'The Emperor', nameChinese: '皇帝', keywords: ['权威', '稳定', '领导'], reversedKeywords: ['滥用权力', '刚愎自用', '混乱失序'], suit: 'major', element: '火', astrologicalCorrespondence: '白羊座' },
  { name: 'The Hierophant', nameChinese: '教皇', keywords: ['传统', '信仰', '指导'], reversedKeywords: ['质疑传统', '盲目顺从', '教条主义'], suit: 'major', element: '土', astrologicalCorrespondence: '金牛座' },
  { name: 'The Lovers', nameChinese: '恋人', keywords: ['爱情', '选择', '和谐'], reversedKeywords: ['关系不和', '选择失误', '沟通不畅'], suit: 'major', element: '风', astrologicalCorrespondence: '双子座' },
  { name: 'The Chariot', nameChinese: '战车', keywords: ['胜利', '意志', '决心'], reversedKeywords: ['失去控制', '方向迷失', '意志薄弱'], suit: 'major', element: '水', astrologicalCorrespondence: '巨蟹座' },
  { name: 'Strength', nameChinese: '力量', keywords: ['勇气', '耐心', '内在力量'], reversedKeywords: ['软弱无力', '缺乏自信', '情绪失控'], suit: 'major', element: '火', astrologicalCorrespondence: '狮子座' },
  { name: 'The Hermit', nameChinese: '隐士', keywords: ['内省', '寻求', '智慧'], reversedKeywords: ['过度孤立', '逃避现实', '迷失困惑'], suit: 'major', element: '土', astrologicalCorrespondence: '处女座' },
  { name: 'Wheel of Fortune', nameChinese: '命运之轮', keywords: ['转变', '机遇', '命运'], reversedKeywords: ['厄运挫折', '抗拒变化', '错失良机'], suit: 'major', element: '火', astrologicalCorrespondence: '木星' },
  { name: 'Justice', nameChinese: '正义', keywords: ['公平', '真相', '因果'], reversedKeywords: ['不诚实', '不公正', '逃避责任'], suit: 'major', element: '风', astrologicalCorrespondence: '天秤座' },
  { name: 'The Hanged Man', nameChinese: '倒吊人', keywords: ['牺牲', '等待', '新视角'], reversedKeywords: ['停滞不前', '抗拒改变', '执着旧观念'], suit: 'major', element: '水', astrologicalCorrespondence: '海王星' },
  { name: 'Death', nameChinese: '死神', keywords: ['结束', '转变', '重生'], reversedKeywords: ['抗拒转变', '恐惧结束', '执着过去'], suit: 'major', element: '水', astrologicalCorrespondence: '天蝎座' },
  { name: 'Temperance', nameChinese: '节制', keywords: ['平衡', '耐心', '调和'], reversedKeywords: ['失衡失调', '急躁冲动', '过度放纵'], suit: 'major', element: '火', astrologicalCorrespondence: '射手座' },
  { name: 'The Devil', nameChinese: '恶魔', keywords: ['束缚', '欲望', '物质'], reversedKeywords: ['挣脱束缚', '否认压抑', '沉溺恶习'], suit: 'major', element: '土', astrologicalCorrespondence: '摩羯座' },
  { name: 'The Tower', nameChinese: '塔', keywords: ['突变', '觉醒', '解放'], reversedKeywords: ['恐惧变革', '否认问题', '执着幻象'], suit: 'major', element: '火', astrologicalCorrespondence: '火星' },
  { name: 'The Star', nameChinese: '星星', keywords: ['希望', '灵感', '宁静'], reversedKeywords: ['绝望失望', '丧失信念', '创造力受阻'], suit: 'major', element: '风', astrologicalCorrespondence: '水瓶座' },
  { name: 'The Moon', nameChinese: '月亮', keywords: ['幻觉', '直觉', '潜意识'], reversedKeywords: ['幻象消散', '直觉受阻', '自我欺骗'], suit: 'major', element: '水', astrologicalCorrespondence: '双鱼座' },
  { name: 'The Sun', nameChinese: '太阳', keywords: ['成功', '快乐', '活力'], reversedKeywords: ['短暂挫折', '过度自信', '缺乏清晰'], suit: 'major', element: '火', astrologicalCorrespondence: '太阳' },
  { name: 'Judgement', nameChinese: '审判', keywords: ['觉醒', '重生', '召唤'], reversedKeywords: ['自我怀疑', '否认召唤', '严苛自我批判'], suit: 'major', element: '水', astrologicalCorrespondence: '冥王星' },
  { name: 'The World', nameChinese: '世界', keywords: ['完成', '整合', '成就'], reversedKeywords: ['目标未竟', '缺乏圆满', '困于循环'], suit: 'major', element: '土', astrologicalCorrespondence: '土星' },
];

// 花色元素对应
const SUIT_ELEMENTS: Record<string, string> = {
  wands: '火',
  cups: '水',
  swords: '风',
  pentacles: '土',
};

// 生成小阿卡纳牌
function generateMinorArcana(): TarotCard[] {
  const suits: Array<{ suit: 'wands' | 'cups' | 'swords' | 'pentacles'; name: string; theme: string }> = [
    { suit: 'wands', name: '权杖', theme: '行动与创造力' },
    { suit: 'cups', name: '圣杯', theme: '情感与关系' },
    { suit: 'swords', name: '宝剑', theme: '思维与挑战' },
    { suit: 'pentacles', name: '星币', theme: '物质与实践' },
  ];

  const numbers = [
    { num: 1, name: 'Ace', chinese: '一', keywords: ['新开始', '潜力', '机会'], reversedKeywords: ['错失机会', '缺乏方向', '潜力浪费'] },
    { num: 2, name: 'Two', chinese: '二', keywords: ['平衡', '选择', '合作'], reversedKeywords: ['失衡', '犹豫不决', '关系紧张'] },
    { num: 3, name: 'Three', chinese: '三', keywords: ['成长', '创造', '合作'], reversedKeywords: ['过度扩张', '缺乏合作', '创意受阻'] },
    { num: 4, name: 'Four', chinese: '四', keywords: ['稳定', '基础', '休息'], reversedKeywords: ['不稳定', '抗拒改变', '停滞'] },
    { num: 5, name: 'Five', chinese: '五', keywords: ['冲突', '变化', '挑战'], reversedKeywords: ['逃避冲突', '固守困境', '恐惧变化'] },
    { num: 6, name: 'Six', chinese: '六', keywords: ['和谐', '给予', '恢复'], reversedKeywords: ['不平等', '拒绝帮助', '自私'] },
    { num: 7, name: 'Seven', chinese: '七', keywords: ['反思', '评估', '等待'], reversedKeywords: ['缺乏耐心', '盲目行动', '自我欺骗'] },
    { num: 8, name: 'Eight', chinese: '八', keywords: ['行动', '速度', '进展'], reversedKeywords: ['停滞不前', '方向错误', '力不从心'] },
    { num: 9, name: 'Nine', chinese: '九', keywords: ['接近完成', '满足', '韧性'], reversedKeywords: ['不满足', '接近却未达成', '焦虑'] },
    { num: 10, name: 'Ten', chinese: '十', keywords: ['完成', '极端', '周期结束'], reversedKeywords: ['未完成', '过度负担', '拒绝结束'] },
    { num: 11, name: 'Page', chinese: '侍从', keywords: ['学习', '消息', '探索'], reversedKeywords: ['缺乏学习', '消息受阻', '不成熟'] },
    { num: 12, name: 'Knight', chinese: '骑士', keywords: ['行动', '冒险', '追求'], reversedKeywords: ['鲁莽行动', '方向迷失', '缺乏承诺'] },
    { num: 13, name: 'Queen', chinese: '王后', keywords: ['掌握', '滋养', '直觉'], reversedKeywords: ['过度情绪化', '忽视直觉', '失去掌控'] },
    { num: 14, name: 'King', chinese: '国王', keywords: ['权威', '控制', '成熟'], reversedKeywords: ['滥用权威', '控制欲强', '僵化固执'] },
  ];

  const cards: TarotCard[] = [];
  for (const suitInfo of suits) {
    for (const numInfo of numbers) {
      const suitCapitalized = suitInfo.suit.charAt(0).toUpperCase() + suitInfo.suit.slice(1);
      cards.push({
        name: `${numInfo.name} of ${suitCapitalized}`,
        nameChinese: `${suitInfo.name}${numInfo.chinese}`,
        keywords: [...numInfo.keywords, suitInfo.theme],
        reversedKeywords: numInfo.reversedKeywords,
        suit: suitInfo.suit,
        element: SUIT_ELEMENTS[suitInfo.suit],
      });
    }
  }
  return cards;
}

// 完整的78张塔罗牌
const FULL_DECK: TarotCard[] = [...MAJOR_ARCANA, ...generateMinorArcana()];

// 牌阵定义
const SPREADS: Record<string, { name: string; positions: string[] }> = {
  'single': { name: '单牌', positions: ['当前状况'] },
  'three-card': { name: '三牌阵', positions: ['过去', '现在', '未来'] },
  'love': { name: '爱情牌阵', positions: ['你的状态', '对方状态', '关系发展'] },
  'celtic-cross': {
    name: '凯尔特十字',
    positions: ['现状', '挑战', '过去', '未来', '目标', '潜意识', '建议', '外部影响', '希望与恐惧', '结果'],
  },
  'horseshoe': {
    name: '马蹄形',
    positions: ['过去', '现在', '潜在影响', '障碍', '外部环境', '建议', '可能结果'],
  },
  'decision': {
    name: '抉择',
    positions: ['当前处境', '选项A', '选项B', '选项A结果', '选项B结果'],
  },
  'mind-body-spirit': {
    name: '身心灵',
    positions: ['心智', '身体', '灵性'],
  },
  'situation': {
    name: '处境/障碍/建议',
    positions: ['处境', '障碍', '建议'],
  },
  'yes-no': {
    name: '是否',
    positions: ['答案'],
  },
};

// 随机抽牌
function drawCards(count: number, allowReversed: boolean, rng: () => number): Array<{
  card: TarotCard;
  orientation: 'upright' | 'reversed';
}> {
  const deck = [...FULL_DECK];
  const drawn: Array<{ card: TarotCard; orientation: 'upright' | 'reversed' }> = [];

  for (let i = 0; i < count && deck.length > 0; i++) {
    const idx = Math.floor(rng() * deck.length);
    const card = deck.splice(idx, 1)[0];
    const orientation = allowReversed && rng() > 0.5 ? 'reversed' : 'upright';
    drawn.push({ card, orientation });
  }

  return drawn;
}

// 获取牌义
function getMeaning(orientation: 'upright' | 'reversed', keywords: string[], reversedKeywords?: string[]): string {
  if (orientation === 'upright') {
    return `正位：${keywords.join('、')}`;
  }
  if (reversedKeywords && reversedKeywords.length > 0) {
    return `逆位：${reversedKeywords.join('、')}`;
  }
  return `逆位：需要反思${keywords.join('、')}相关的问题`;
}

export async function handleTarotDraw(input: TarotInput): Promise<TarotOutput> {
  const { spreadType = 'single', question, allowReversed = true } = input;
  const dateKey = new Date().toISOString().slice(0, 10);
  const seed = resolveSeed(input.seed, `${spreadType}|${question || ''}|${dateKey}`, input.seedScope);
  const rng = createSeededRng(seed);

  const spread = SPREADS[spreadType] || SPREADS['single'];
  const drawnCards = drawCards(spread.positions.length, allowReversed, rng);

  const cards: TarotCardResult[] = drawnCards.map((drawn, index) => {
    const result: TarotCardResult = {
      position: spread.positions[index],
      card: {
        name: drawn.card.name,
        nameChinese: drawn.card.nameChinese,
        keywords: drawn.card.keywords,
      },
      orientation: drawn.orientation,
      meaning: getMeaning(drawn.orientation, drawn.card.keywords, drawn.card.reversedKeywords),
    };
    if (drawn.card.reversedKeywords) {
      result.reversedKeywords = drawn.card.reversedKeywords;
    }
    if (drawn.card.element) {
      result.element = drawn.card.element;
    }
    if (drawn.card.astrologicalCorrespondence) {
      result.astrologicalCorrespondence = drawn.card.astrologicalCorrespondence;
    }
    return result;
  });

  return {
    spreadId: spreadType,
    spreadName: spread.name,
    question,
    seed,
    cards,
  };
}
