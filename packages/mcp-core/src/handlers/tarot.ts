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
  suit: 'major' | 'wands' | 'cups' | 'swords' | 'pentacles';
}

// 大阿卡纳牌
const MAJOR_ARCANA: TarotCard[] = [
  { name: 'The Fool', nameChinese: '愚者', keywords: ['新开始', '冒险', '天真'], suit: 'major' },
  { name: 'The Magician', nameChinese: '魔术师', keywords: ['创造力', '技能', '意志力'], suit: 'major' },
  { name: 'The High Priestess', nameChinese: '女祭司', keywords: ['直觉', '神秘', '内在智慧'], suit: 'major' },
  { name: 'The Empress', nameChinese: '女皇', keywords: ['丰饶', '母性', '创造'], suit: 'major' },
  { name: 'The Emperor', nameChinese: '皇帝', keywords: ['权威', '稳定', '领导'], suit: 'major' },
  { name: 'The Hierophant', nameChinese: '教皇', keywords: ['传统', '信仰', '指导'], suit: 'major' },
  { name: 'The Lovers', nameChinese: '恋人', keywords: ['爱情', '选择', '和谐'], suit: 'major' },
  { name: 'The Chariot', nameChinese: '战车', keywords: ['胜利', '意志', '决心'], suit: 'major' },
  { name: 'Strength', nameChinese: '力量', keywords: ['勇气', '耐心', '内在力量'], suit: 'major' },
  { name: 'The Hermit', nameChinese: '隐士', keywords: ['内省', '寻求', '智慧'], suit: 'major' },
  { name: 'Wheel of Fortune', nameChinese: '命运之轮', keywords: ['转变', '机遇', '命运'], suit: 'major' },
  { name: 'Justice', nameChinese: '正义', keywords: ['公平', '真相', '因果'], suit: 'major' },
  { name: 'The Hanged Man', nameChinese: '倒吊人', keywords: ['牺牲', '等待', '新视角'], suit: 'major' },
  { name: 'Death', nameChinese: '死神', keywords: ['结束', '转变', '重生'], suit: 'major' },
  { name: 'Temperance', nameChinese: '节制', keywords: ['平衡', '耐心', '调和'], suit: 'major' },
  { name: 'The Devil', nameChinese: '恶魔', keywords: ['束缚', '欲望', '物质'], suit: 'major' },
  { name: 'The Tower', nameChinese: '塔', keywords: ['突变', '觉醒', '解放'], suit: 'major' },
  { name: 'The Star', nameChinese: '星星', keywords: ['希望', '灵感', '宁静'], suit: 'major' },
  { name: 'The Moon', nameChinese: '月亮', keywords: ['幻觉', '直觉', '潜意识'], suit: 'major' },
  { name: 'The Sun', nameChinese: '太阳', keywords: ['成功', '快乐', '活力'], suit: 'major' },
  { name: 'Judgement', nameChinese: '审判', keywords: ['觉醒', '重生', '召唤'], suit: 'major' },
  { name: 'The World', nameChinese: '世界', keywords: ['完成', '整合', '成就'], suit: 'major' },
];

// 生成小阿卡纳牌
function generateMinorArcana(): TarotCard[] {
  const suits: Array<{ suit: 'wands' | 'cups' | 'swords' | 'pentacles'; name: string; theme: string }> = [
    { suit: 'wands', name: '权杖', theme: '行动与创造力' },
    { suit: 'cups', name: '圣杯', theme: '情感与关系' },
    { suit: 'swords', name: '宝剑', theme: '思维与挑战' },
    { suit: 'pentacles', name: '星币', theme: '物质与实践' },
  ];

  const numbers = [
    { num: 1, name: 'Ace', chinese: '一', keywords: ['新开始', '潜力', '机会'] },
    { num: 2, name: 'Two', chinese: '二', keywords: ['平衡', '选择', '合作'] },
    { num: 3, name: 'Three', chinese: '三', keywords: ['成长', '创造', '合作'] },
    { num: 4, name: 'Four', chinese: '四', keywords: ['稳定', '基础', '休息'] },
    { num: 5, name: 'Five', chinese: '五', keywords: ['冲突', '变化', '挑战'] },
    { num: 6, name: 'Six', chinese: '六', keywords: ['和谐', '给予', '恢复'] },
    { num: 7, name: 'Seven', chinese: '七', keywords: ['反思', '评估', '等待'] },
    { num: 8, name: 'Eight', chinese: '八', keywords: ['行动', '速度', '进展'] },
    { num: 9, name: 'Nine', chinese: '九', keywords: ['接近完成', '满足', '韧性'] },
    { num: 10, name: 'Ten', chinese: '十', keywords: ['完成', '极端', '周期结束'] },
    { num: 11, name: 'Page', chinese: '侍从', keywords: ['学习', '消息', '探索'] },
    { num: 12, name: 'Knight', chinese: '骑士', keywords: ['行动', '冒险', '追求'] },
    { num: 13, name: 'Queen', chinese: '王后', keywords: ['掌握', '滋养', '直觉'] },
    { num: 14, name: 'King', chinese: '国王', keywords: ['权威', '控制', '成熟'] },
  ];

  const cards: TarotCard[] = [];
  for (const suitInfo of suits) {
    for (const numInfo of numbers) {
      const suitCapitalized = suitInfo.suit.charAt(0).toUpperCase() + suitInfo.suit.slice(1);
      cards.push({
        name: `${numInfo.name} of ${suitCapitalized}`,
        nameChinese: `${suitInfo.name}${numInfo.chinese}`,
        keywords: [...numInfo.keywords, suitInfo.theme],
        suit: suitInfo.suit,
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
function getMeaning(orientation: 'upright' | 'reversed', keywords: string[]): string {
  if (orientation === 'upright') {
    return `正位：${keywords.join('、')}`;
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

  const cards: TarotCardResult[] = drawnCards.map((drawn, index) => ({
    position: spread.positions[index],
    card: {
      name: drawn.card.name,
      nameChinese: drawn.card.nameChinese,
      keywords: drawn.card.keywords,
    },
    orientation: drawn.orientation,
    meaning: getMeaning(drawn.orientation, drawn.card.keywords),
  }));

  return {
    spreadId: spreadType,
    spreadName: spread.name,
    question,
    seed,
    cards,
  };
}
