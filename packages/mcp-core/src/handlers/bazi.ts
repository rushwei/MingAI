/**
 * 八字计算处理器
 */

import { Solar, Lunar, LunarMonth, LunarYear } from 'lunar-javascript';
import type {
  BaziInput,
  BaziOutput,
  HiddenStemInfo,
  PillarInfo,
  PillarKongWangInfo,
  PillarPosition,
  PillarRelation,
} from '../types.js';
import {
  STEM_ELEMENTS,
  getStemYinYang,
  calculateTenGod,
} from '../utils.js';
import { calculatePillarShenSha as calculateSharedPillarShenSha } from '../shensha.js';

type PillarShenShaByPosition = {
  year: string[];
  month: string[];
  day: string[];
  hour: string[];
};

const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;
const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;

const HIDDEN_STEM_DETAILS: Record<string, Array<{ stem: string; qiType: '本气' | '中气' | '余气' }>> = {
  '子': [{ stem: '癸', qiType: '本气' }],
  '丑': [{ stem: '己', qiType: '本气' }, { stem: '癸', qiType: '中气' }, { stem: '辛', qiType: '余气' }],
  '寅': [{ stem: '甲', qiType: '本气' }, { stem: '丙', qiType: '中气' }, { stem: '戊', qiType: '余气' }],
  '卯': [{ stem: '乙', qiType: '本气' }],
  '辰': [{ stem: '戊', qiType: '本气' }, { stem: '乙', qiType: '中气' }, { stem: '癸', qiType: '余气' }],
  '巳': [{ stem: '丙', qiType: '本气' }, { stem: '庚', qiType: '中气' }, { stem: '戊', qiType: '余气' }],
  '午': [{ stem: '丁', qiType: '本气' }, { stem: '己', qiType: '中气' }],
  '未': [{ stem: '己', qiType: '本气' }, { stem: '丁', qiType: '中气' }, { stem: '乙', qiType: '余气' }],
  '申': [{ stem: '庚', qiType: '本气' }, { stem: '壬', qiType: '中气' }, { stem: '戊', qiType: '余气' }],
  '酉': [{ stem: '辛', qiType: '本气' }],
  '戌': [{ stem: '戊', qiType: '本气' }, { stem: '辛', qiType: '中气' }, { stem: '丁', qiType: '余气' }],
  '亥': [{ stem: '壬', qiType: '本气' }, { stem: '甲', qiType: '中气' }],
};

const NA_YIN_TABLE: Record<string, string> = {
  '甲子': '海中金', '乙丑': '海中金',
  '丙寅': '炉中火', '丁卯': '炉中火',
  '戊辰': '大林木', '己巳': '大林木',
  '庚午': '路旁土', '辛未': '路旁土',
  '壬申': '剑锋金', '癸酉': '剑锋金',
  '甲戌': '山头火', '乙亥': '山头火',
  '丙子': '涧下水', '丁丑': '涧下水',
  '戊寅': '城头土', '己卯': '城头土',
  '庚辰': '白蜡金', '辛巳': '白蜡金',
  '壬午': '杨柳木', '癸未': '杨柳木',
  '甲申': '泉中水', '乙酉': '泉中水',
  '丙戌': '屋上土', '丁亥': '屋上土',
  '戊子': '霹雳火', '己丑': '霹雳火',
  '庚寅': '松柏木', '辛卯': '松柏木',
  '壬辰': '长流水', '癸巳': '长流水',
  '甲午': '砂中金', '乙未': '砂中金',
  '丙申': '山下火', '丁酉': '山下火',
  '戊戌': '平地木', '己亥': '平地木',
  '庚子': '壁上土', '辛丑': '壁上土',
  '壬寅': '金箔金', '癸卯': '金箔金',
  '甲辰': '覆灯火', '乙巳': '覆灯火',
  '丙午': '天河水', '丁未': '天河水',
  '戊申': '大驿土', '己酉': '大驿土',
  '庚戌': '钗钏金', '辛亥': '钗钏金',
  '壬子': '桑柘木', '癸丑': '桑柘木',
  '甲寅': '大溪水', '乙卯': '大溪水',
  '丙辰': '沙中土', '丁巳': '沙中土',
  '戊午': '天上火', '己未': '天上火',
  '庚申': '石榴木', '辛酉': '石榴木',
  '壬戌': '大海水', '癸亥': '大海水',
};

const DI_SHI_ORDER = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'];
const CHANG_SHENG_START: Record<string, string> = {
  '木': '亥', '火': '寅', '土': '寅', '金': '巳', '水': '申',
};

const LIU_HE: Record<string, string> = {
  '子': '丑', '丑': '子',
  '寅': '亥', '亥': '寅',
  '卯': '戌', '戌': '卯',
  '辰': '酉', '酉': '辰',
  '巳': '申', '申': '巳',
  '午': '未', '未': '午',
};

const SAN_HE: Array<{ branches: string[]; element: string }> = [
  { branches: ['申', '子', '辰'], element: '水局' },
  { branches: ['巳', '酉', '丑'], element: '金局' },
  { branches: ['寅', '午', '戌'], element: '火局' },
  { branches: ['亥', '卯', '未'], element: '木局' },
];

const LIU_CHONG: Record<string, string> = {
  '子': '午', '午': '子',
  '丑': '未', '未': '丑',
  '寅': '申', '申': '寅',
  '卯': '酉', '酉': '卯',
  '辰': '戌', '戌': '辰',
  '巳': '亥', '亥': '巳',
};

const XIANG_HAI: Record<string, string> = {
  '子': '未', '未': '子',
  '丑': '午', '午': '丑',
  '寅': '巳', '巳': '寅',
  '卯': '辰', '辰': '卯',
  '申': '亥', '亥': '申',
  '酉': '戌', '戌': '酉',
};

const XIANG_XING: Array<{ combination: string[]; name: string }> = [
  { combination: ['寅', '巳', '申'], name: '无恩之刑' },
  { combination: ['丑', '戌', '未'], name: '恃势之刑' },
  { combination: ['子', '卯'], name: '无礼之刑' },
  { combination: ['辰'], name: '辰自刑' },
  { combination: ['午'], name: '午自刑' },
  { combination: ['酉'], name: '酉自刑' },
  { combination: ['亥'], name: '亥自刑' },
];

const XUN_KONG_TABLE: Record<string, [string, string]> = {
  '甲子旬': ['戌', '亥'],
  '甲戌旬': ['申', '酉'],
  '甲申旬': ['午', '未'],
  '甲午旬': ['辰', '巳'],
  '甲辰旬': ['寅', '卯'],
  '甲寅旬': ['子', '丑'],
};

// ===== 神煞规则（对齐前端专业排盘）=====
const TIAN_YI_GUI_REN: Record<string, string[]> = {
  '甲': ['丑', '未'], '乙': ['子', '申'], '丙': ['亥', '酉'], '丁': ['亥', '酉'],
  '戊': ['丑', '未'], '己': ['子', '申'], '庚': ['丑', '未'], '辛': ['寅', '午'],
  '壬': ['卯', '巳'], '癸': ['卯', '巳'],
};

const TAI_JI_GUI_REN: Record<string, string[]> = {
  '甲': ['子', '午'], '乙': ['子', '午'], '丙': ['卯', '酉'], '丁': ['卯', '酉'],
  '戊': ['辰', '戌', '丑', '未'], '己': ['辰', '戌', '丑', '未'],
  '庚': ['寅', '亥'], '辛': ['寅', '亥'], '壬': ['巳', '申'], '癸': ['巳', '申'],
};

const YANG_REN: Record<string, string> = {
  '甲': '卯', '乙': '辰', '丙': '午', '丁': '未',
  '戊': '午', '己': '未', '庚': '酉', '辛': '戌',
  '壬': '子', '癸': '丑',
};

const WEN_CHANG: Record<string, string> = {
  '甲': '巳', '乙': '午', '丙': '申', '丁': '酉',
  '戊': '申', '己': '酉', '庚': '亥', '辛': '子',
  '壬': '寅', '癸': '卯',
};

const YI_MA: Record<string, string> = {
  '寅': '申', '午': '申', '戌': '申',
  '申': '寅', '子': '寅', '辰': '寅',
  '巳': '亥', '酉': '亥', '丑': '亥',
  '亥': '巳', '卯': '巳', '未': '巳',
};

const TAO_HUA: Record<string, string> = {
  '寅': '卯', '午': '卯', '戌': '卯',
  '申': '酉', '子': '酉', '辰': '酉',
  '巳': '午', '酉': '午', '丑': '午',
  '亥': '子', '卯': '子', '未': '子',
};

const HUA_GAI: Record<string, string> = {
  '寅': '戌', '午': '戌', '戌': '戌',
  '申': '辰', '子': '辰', '辰': '辰',
  '巳': '丑', '酉': '丑', '丑': '丑',
  '亥': '未', '卯': '未', '未': '未',
};

const LU_SHEN: Record<string, string> = {
  '甲': '寅', '乙': '卯', '丙': '巳', '丁': '午',
  '戊': '巳', '己': '午', '庚': '申', '辛': '酉',
  '壬': '亥', '癸': '子',
};

const YUE_DE: Record<string, string> = {
  '寅': '丙', '午': '丙', '戌': '丙',
  '申': '壬', '子': '壬', '辰': '壬',
  '亥': '甲', '卯': '甲', '未': '甲',
  '巳': '庚', '酉': '庚', '丑': '庚',
};

const TIAN_DE: Record<string, string> = {
  '寅': '丁', '卯': '申', '辰': '壬', '巳': '辛',
  '午': '亥', '未': '甲', '申': '癸', '酉': '寅',
  '戌': '丙', '亥': '乙', '子': '巳', '丑': '庚',
};

const JIN_YU: Record<string, string> = {
  '甲': '辰', '乙': '巳', '丙': '未', '丁': '申',
  '戊': '未', '己': '申', '庚': '戌', '辛': '亥',
  '壬': '丑', '癸': '寅',
};

const JIE_SHA: Record<string, string> = {
  '寅': '巳', '午': '巳', '戌': '巳',
  '申': '亥', '子': '亥', '辰': '亥',
  '亥': '申', '卯': '申', '未': '申',
  '巳': '寅', '酉': '寅', '丑': '寅',
};

const WANG_SHEN: Record<string, string> = {
  '寅': '亥', '午': '亥', '戌': '亥',
  '申': '巳', '子': '巳', '辰': '巳',
  '亥': '寅', '卯': '寅', '未': '寅',
  '巳': '申', '酉': '申', '丑': '申',
};

const GU_CHEN: Record<string, string> = {
  '寅': '巳', '卯': '巳', '辰': '巳',
  '巳': '申', '午': '申', '未': '申',
  '申': '亥', '酉': '亥', '戌': '亥',
  '亥': '寅', '子': '寅', '丑': '寅',
};

const GUA_SU: Record<string, string> = {
  '寅': '丑', '卯': '丑', '辰': '丑',
  '巳': '辰', '午': '辰', '未': '辰',
  '申': '未', '酉': '未', '戌': '未',
  '亥': '戌', '子': '戌', '丑': '戌',
};

const JIANG_XING: Record<string, string> = {
  '寅': '午', '午': '午', '戌': '午',
  '申': '子', '子': '子', '辰': '子',
  '巳': '酉', '酉': '酉', '丑': '酉',
  '亥': '卯', '卯': '卯', '未': '卯',
};

const TIAN_CHU: Record<string, string> = {
  '甲': '巳', '乙': '午', '丙': '巳', '丁': '午',
  '戊': '巳', '己': '午', '庚': '亥', '辛': '子',
  '壬': '亥', '癸': '子',
};

const GUO_YIN: Record<string, string> = {
  '甲': '戌', '乙': '亥', '丙': '丑', '丁': '寅',
  '戊': '丑', '己': '寅', '庚': '辰', '辛': '巳',
  '壬': '未', '癸': '申',
};

const XUE_TANG: Record<string, string> = {
  '甲': '亥', '乙': '午', '丙': '寅', '丁': '酉',
  '戊': '寅', '己': '酉', '庚': '巳', '辛': '子',
  '壬': '申', '癸': '卯',
};

const CI_GUAN: Record<string, string> = {
  '甲': '寅', '乙': '卯', '丙': '巳', '丁': '午',
  '戊': '辰', '己': '未', '庚': '申', '辛': '酉',
  '壬': '亥', '癸': '子',
};

const HONG_LUAN: Record<string, string> = {
  '子': '卯', '丑': '寅', '寅': '丑', '卯': '子',
  '辰': '亥', '巳': '戌', '午': '酉', '未': '申',
  '申': '未', '酉': '午', '戌': '巳', '亥': '辰',
};

const TIAN_XI: Record<string, string> = {
  '子': '酉', '丑': '申', '寅': '未', '卯': '午',
  '辰': '巳', '巳': '辰', '午': '卯', '未': '寅',
  '申': '丑', '酉': '子', '戌': '亥', '亥': '戌',
};

const TIAN_YI: Record<string, string> = {
  '寅': '丑', '卯': '寅', '辰': '卯', '巳': '辰',
  '午': '巳', '未': '午', '申': '未', '酉': '申',
  '戌': '酉', '亥': '戌', '子': '亥', '丑': '子',
};

const DIAO_KE: Record<string, string> = {
  '子': '酉', '丑': '戌', '寅': '亥', '卯': '子',
  '辰': '丑', '巳': '寅', '午': '卯', '未': '辰',
  '申': '巳', '酉': '午', '戌': '未', '亥': '申',
};

const SANG_MEN: Record<string, string> = {
  '子': '寅', '丑': '卯', '寅': '辰', '卯': '巳',
  '辰': '午', '巳': '未', '午': '申', '未': '酉',
  '申': '戌', '酉': '亥', '戌': '子', '亥': '丑',
};

const KUI_GANG = ['庚辰', '庚戌', '壬辰', '戊戌'];
const YIN_CHA_YANG_CUO = ['丙子', '丁丑', '戊寅', '辛卯', '壬辰', '癸巳', '丙午', '丁未', '戊申', '辛酉', '壬戌', '癸亥'];
const SHI_E_DA_BAI = ['甲辰', '乙巳', '壬申', '丙申', '丁亥', '庚辰', '戊戌', '癸亥', '辛巳', '己丑'];

const XUE_REN: Record<string, string> = {
  '甲': '卯', '乙': '辰', '丙': '午', '丁': '未',
  '戊': '午', '己': '未', '庚': '酉', '辛': '戌',
  '壬': '子', '癸': '丑',
};

const PI_TOU: Record<string, string> = {
  '子': '巳', '丑': '午', '寅': '未', '卯': '申',
  '辰': '酉', '巳': '戌', '午': '亥', '未': '子',
  '申': '丑', '酉': '寅', '戌': '卯', '亥': '辰',
};

const FU_XING: Record<string, string> = {
  '甲': '寅', '乙': '丑', '丙': '子', '丁': '亥',
  '戊': '申', '己': '未', '庚': '午', '辛': '巳',
  '壬': '辰', '癸': '卯',
};

const ZAI_SHA: Record<string, string> = {
  '寅': '午', '午': '午', '戌': '午',
  '申': '子', '子': '子', '辰': '子',
  '巳': '酉', '酉': '酉', '丑': '酉',
  '亥': '卯', '卯': '卯', '未': '卯',
};

const LIU_XIA: Record<string, string> = {
  '甲': '酉', '乙': '戌', '丙': '未', '丁': '申',
  '戊': '巳', '己': '午', '庚': '辰', '辛': '卯',
  '壬': '亥', '癸': '寅',
};

const HONG_YAN: Record<string, string> = {
  '甲': '午', '乙': '午', '丙': '寅', '丁': '未',
  '戊': '辰', '己': '辰', '庚': '戌', '辛': '酉',
  '壬': '子', '癸': '申',
};

const BA_ZHUAN = ['甲寅', '乙卯', '丙午', '丁未', '戊戌', '戊辰', '己未', '己丑', '庚申', '辛酉', '壬子', '癸丑'];
const JIN_SHEN = ['己丑', '己巳', '癸酉'];

const DE_XIU: Record<string, string[]> = {
  '寅': ['丙', '甲'], '卯': ['甲', '乙'], '辰': ['壬', '癸'], '巳': ['丙', '庚'],
  '午': ['丁', '己'], '未': ['甲', '己'], '申': ['庚', '壬'], '酉': ['辛', '庚'],
  '戌': ['丙', '戊'], '亥': ['壬', '甲'], '子': ['癸', '壬'], '丑': ['辛', '己'],
};

const GU_LUAN = ['乙巳', '丁巳', '辛亥', '戊申', '甲寅', '丙午', '戊午', '壬子'];

const GOU_SHA: Record<string, string> = {
  '子': '酉', '丑': '戌', '寅': '亥', '卯': '子',
  '辰': '丑', '巳': '寅', '午': '卯', '未': '辰',
  '申': '巳', '酉': '午', '戌': '未', '亥': '申',
};

const JIAO_SHA: Record<string, string> = {
  '子': '卯', '丑': '寅', '寅': '丑', '卯': '子',
  '辰': '亥', '巳': '戌', '午': '酉', '未': '申',
  '申': '未', '酉': '午', '戌': '巳', '亥': '辰',
};

const BAI_HU: Record<string, string> = {
  '寅': '午', '卯': '未', '辰': '申', '巳': '酉',
  '午': '戌', '未': '亥', '申': '子', '酉': '丑',
  '戌': '寅', '亥': '卯', '子': '辰', '丑': '巳',
};

const FEI_REN: Record<string, string> = {
  '甲': '酉', '乙': '申', '丙': '子', '丁': '亥',
  '戊': '子', '己': '亥', '庚': '卯', '辛': '寅',
  '壬': '午', '癸': '巳',
};

const TIAN_DE_HE: Record<string, string> = {
  '寅': '壬', '卯': '癸', '辰': '丁', '巳': '丙',
  '午': '寅', '未': '己', '申': '戊', '酉': '丁',
  '戌': '辛', '亥': '庚', '子': '庚', '丑': '乙',
};

const YUE_DE_HE: Record<string, string> = {
  '寅': '辛', '午': '辛', '戌': '辛',
  '申': '丁', '子': '丁', '辰': '丁',
  '亥': '己', '卯': '己', '未': '己',
  '巳': '乙', '酉': '乙', '丑': '乙',
};

function getNaYin(stem: string, branch: string): string {
  return NA_YIN_TABLE[`${stem}${branch}`] || '';
}

function getDiShi(dayStem: string, branch: string): string {
  const element = STEM_ELEMENTS[dayStem];
  if (!element) return '';

  const startBranch = CHANG_SHENG_START[element];
  const startIdx = DI_ZHI.indexOf(startBranch as (typeof DI_ZHI)[number]);
  const branchIdx = DI_ZHI.indexOf(branch as (typeof DI_ZHI)[number]);
  if (startIdx < 0 || branchIdx < 0) return '';

  const isYang = getStemYinYang(dayStem) === 'yang';
  const offset = isYang
    ? (branchIdx - startIdx + 12) % 12
    : (startIdx - branchIdx + 12) % 12;

  return DI_SHI_ORDER[offset];
}

function getKongWang(dayGan: string, dayZhi: string): { xun: string; kongZhi: [string, string] } {
  const ganIdx = TIAN_GAN.indexOf(dayGan as (typeof TIAN_GAN)[number]);
  const zhiIdx = DI_ZHI.indexOf(dayZhi as (typeof DI_ZHI)[number]);
  if (ganIdx < 0 || zhiIdx < 0) {
    return { xun: '甲子旬', kongZhi: XUN_KONG_TABLE['甲子旬'] };
  }

  const xunStart = (zhiIdx - ganIdx + 12) % 12;
  const xunNames = ['甲子旬', '甲戌旬', '甲申旬', '甲午旬', '甲辰旬', '甲寅旬'];
  const xunStartZhi = ['子', '戌', '申', '午', '辰', '寅'];
  const startZhi = DI_ZHI[xunStart];
  const xunIdx = xunStartZhi.indexOf(startZhi);
  const xun = xunNames[xunIdx] || '甲子旬';

  return {
    xun,
    kongZhi: XUN_KONG_TABLE[xun],
  };
}

function buildHiddenStems(branch: string, dayStem: string): HiddenStemInfo[] {
  const stems = HIDDEN_STEM_DETAILS[branch] || [];
  return stems.map((item) => ({
    stem: item.stem,
    qiType: item.qiType,
    tenGod: calculateTenGod(dayStem, item.stem),
  }));
}

function buildPillarKongWang(branch: string, kongWang: { xun: string; kongZhi: [string, string] }): PillarKongWangInfo {
  return {
    isKong: kongWang.kongZhi.includes(branch),
  };
}

function createPillar(stem: string, branch: string, dayStem: string): PillarInfo {
  return {
    stem,
    branch,
    tenGod: calculateTenGod(dayStem, stem),
    hiddenStems: buildHiddenStems(branch, dayStem),
    naYin: getNaYin(stem, branch),
    diShi: getDiShi(dayStem, branch),
    shenSha: [],
    kongWang: { isKong: false },
  };
}

const PILLAR_POSITION_MAP: Record<string, PillarPosition> = {
  year: '年支',
  month: '月支',
  day: '日支',
  hour: '时支',
  yearBranch: '年支',
  monthBranch: '月支',
  dayBranch: '日支',
  hourBranch: '时支',
  YearBranch: '年支',
  MonthBranch: '月支',
  DayBranch: '日支',
  HourBranch: '时支',
  年: '年支',
  月: '月支',
  日: '日支',
  时: '时支',
  年柱: '年支',
  月柱: '月支',
  日柱: '日支',
  时柱: '时支',
  年支: '年支',
  月支: '月支',
  日支: '日支',
  时支: '时支',
};

function normalizePillarPosition(label: string): PillarPosition {
  const normalized = PILLAR_POSITION_MAP[label];
  if (!normalized) {
    throw new Error(`Invalid pillar position label: ${label}`);
  }
  return normalized;
}

function analyzePillarRelations(yearBranch: string, monthBranch: string, dayBranch: string, hourBranch: string): PillarRelation[] {
  const branches = [yearBranch, monthBranch, dayBranch, hourBranch];
  const pillarNames = ['year', 'month', 'day', 'hour'] as const;
  const relations: PillarRelation[] = [];

  for (let i = 0; i < branches.length; i++) {
    for (let j = i + 1; j < branches.length; j++) {
      if (LIU_HE[branches[i]] === branches[j]) {
        relations.push({
          type: '合',
          pillars: [normalizePillarPosition(pillarNames[i]), normalizePillarPosition(pillarNames[j])],
          description: `${branches[i]}${branches[j]}六合`,
          isAuspicious: true,
        });
      }
    }
  }

  for (const sanHe of SAN_HE) {
    const matchingBranches = branches.filter((b) => sanHe.branches.includes(b));
    const uniqueBranches = Array.from(new Set(matchingBranches));
    if (uniqueBranches.length >= 2) {
      const matchingPillars = branches
        .map((b, i) => (sanHe.branches.includes(b) ? normalizePillarPosition(pillarNames[i]) : null))
        .filter(Boolean) as PillarPosition[];

      if (uniqueBranches.length === 3) {
        relations.push({
          type: '合',
          pillars: matchingPillars,
          description: `${uniqueBranches.join('')}三合${sanHe.element}`,
          isAuspicious: true,
        });
      } else {
        relations.push({
          type: '合',
          pillars: matchingPillars,
          description: `${uniqueBranches.join('')}半合${sanHe.element}`,
          isAuspicious: true,
        });
      }
    }
  }

  for (let i = 0; i < branches.length; i++) {
    for (let j = i + 1; j < branches.length; j++) {
      if (LIU_CHONG[branches[i]] === branches[j]) {
        relations.push({
          type: '冲',
          pillars: [normalizePillarPosition(pillarNames[i]), normalizePillarPosition(pillarNames[j])],
          description: `${branches[i]}${branches[j]}相冲`,
          isAuspicious: false,
        });
      }
    }
  }

  for (let i = 0; i < branches.length; i++) {
    for (let j = i + 1; j < branches.length; j++) {
      if (XIANG_HAI[branches[i]] === branches[j]) {
        relations.push({
          type: '害',
          pillars: [normalizePillarPosition(pillarNames[i]), normalizePillarPosition(pillarNames[j])],
          description: `${branches[i]}${branches[j]}相害`,
          isAuspicious: false,
        });
      }
    }
  }

  for (const xing of XIANG_XING) {
    const matchingBranches = branches.filter((b) => xing.combination.includes(b));
    if (xing.combination.length === 1) {
      const count = branches.filter((b) => b === xing.combination[0]).length;
      if (count >= 2) {
        const matchingPillars = branches
          .map((b, i) => (b === xing.combination[0] ? normalizePillarPosition(pillarNames[i]) : null))
          .filter(Boolean) as PillarPosition[];
        relations.push({
          type: '刑',
          pillars: matchingPillars,
          description: xing.name,
          isAuspicious: false,
        });
      }
    } else if (matchingBranches.length >= 2) {
      const matchingPillars = branches
        .map((b, i) => (xing.combination.includes(b) ? normalizePillarPosition(pillarNames[i]) : null))
        .filter(Boolean) as PillarPosition[];
      relations.push({
        type: '刑',
        pillars: matchingPillars,
        description: xing.name,
        isAuspicious: false,
      });
    }
  }

  return relations;
}

function calculatePillarShenSha(params: {
  yearStem: string;
  yearBranch: string;
  monthStem: string;
  monthBranch: string;
  dayStem: string;
  dayBranch: string;
  hourStem: string;
  hourBranch: string;
  kongWang: { xun: string; kongZhi: [string, string] };
}): PillarShenShaByPosition {
  return calculateSharedPillarShenSha(params);
}

function getDaYunTenGods(ganZhi: string, dayStem: string): { tenGod: string; branchTenGod: string } {
  const stem = ganZhi.slice(0, 1);
  const branch = ganZhi.slice(1, 2);
  const tenGod = stem ? calculateTenGod(dayStem, stem) : '';
  const branchMainStem = HIDDEN_STEM_DETAILS[branch]?.[0]?.stem;
  const branchTenGod = branchMainStem ? calculateTenGod(dayStem, branchMainStem) : '';
  return { tenGod, branchTenGod };
}

function validateLunarDateInput(params: {
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  birthHour: number;
  birthMinute: number;
  isLeapMonth: boolean;
}): { solar: ReturnType<typeof Solar.fromYmdHms>; lunar: ReturnType<typeof Lunar.fromYmdHms> } {
  const {
    birthYear,
    birthMonth,
    birthDay,
    birthHour,
    birthMinute,
    isLeapMonth,
  } = params;

  const leapMonth = LunarYear.fromYear(birthYear).getLeapMonth();
  if (isLeapMonth && leapMonth !== birthMonth) {
    throw new Error(`农历闰月无效：${birthYear}年不存在闰${birthMonth}月`);
  }

  const lunarMonth = isLeapMonth ? -Math.abs(birthMonth) : birthMonth;
  let lunarMonthInfo: ReturnType<typeof LunarMonth.fromYm>;
  try {
    lunarMonthInfo = LunarMonth.fromYm(birthYear, lunarMonth);
  } catch {
    throw new Error(`农历月份无效：${birthYear}年${isLeapMonth ? '闰' : ''}${birthMonth}月`);
  }
  if (!lunarMonthInfo) {
    throw new Error(`农历月份无效：${birthYear}年${isLeapMonth ? '闰' : ''}${birthMonth}月`);
  }

  const dayCount = lunarMonthInfo.getDayCount();
  if (birthDay < 1 || birthDay > dayCount) {
    throw new Error(`农历日期无效：${birthYear}年${isLeapMonth ? '闰' : ''}${birthMonth}月只有${dayCount}天`);
  }

  let lunar: ReturnType<typeof Lunar.fromYmdHms>;
  try {
    lunar = Lunar.fromYmdHms(birthYear, lunarMonth, birthDay, birthHour, birthMinute, 0);
  } catch {
    throw new Error(`农历日期无效：${birthYear}年${isLeapMonth ? '闰' : ''}${birthMonth}月${birthDay}日`);
  }
  return {
    solar: lunar.getSolar(),
    lunar,
  };
}

export async function handleBaziCalculate(input: BaziInput): Promise<BaziOutput> {
  const {
    gender,
    birthYear,
    birthMonth,
    birthDay,
    birthHour,
    birthMinute = 0,
    calendarType = 'solar',
    isLeapMonth = false,
    birthPlace,
  } = input;

  let solar: ReturnType<typeof Solar.fromYmdHms>;
  let lunar: ReturnType<typeof Lunar.fromYmdHms>;
  if (calendarType === 'lunar') {
    const prepared = validateLunarDateInput({
      birthYear,
      birthMonth,
      birthDay,
      birthHour,
      birthMinute,
      isLeapMonth,
    });
    solar = prepared.solar;
    lunar = prepared.lunar;
  } else {
    solar = Solar.fromYmdHms(
      birthYear,
      birthMonth,
      birthDay,
      birthHour,
      birthMinute,
      0
    );
    lunar = solar.getLunar();
  }

  const eightChar = lunar.getEightChar();
  const yearStem = eightChar.getYearGan();
  const yearBranch = eightChar.getYearZhi();
  const monthStem = eightChar.getMonthGan();
  const monthBranch = eightChar.getMonthZhi();
  const dayStem = eightChar.getDayGan();
  const dayBranch = eightChar.getDayZhi();
  const hourStem = eightChar.getTimeGan();
  const hourBranch = eightChar.getTimeZhi();

  const kongWang = getKongWang(dayStem, dayBranch);
  const pillarShenSha = calculatePillarShenSha({
    yearStem,
    yearBranch,
    monthStem,
    monthBranch,
    dayStem,
    dayBranch,
    hourStem,
    hourBranch,
    kongWang,
  });

  const fourPillars = {
    year: {
      ...createPillar(yearStem, yearBranch, dayStem),
      shenSha: pillarShenSha.year,
      kongWang: buildPillarKongWang(yearBranch, kongWang),
    },
    month: {
      ...createPillar(monthStem, monthBranch, dayStem),
      shenSha: pillarShenSha.month,
      kongWang: buildPillarKongWang(monthBranch, kongWang),
    },
    day: {
      ...createPillar(dayStem, dayBranch, dayStem),
      shenSha: pillarShenSha.day,
      kongWang: buildPillarKongWang(dayBranch, kongWang),
    },
    hour: {
      ...createPillar(hourStem, hourBranch, dayStem),
      shenSha: pillarShenSha.hour,
      kongWang: buildPillarKongWang(hourBranch, kongWang),
    },
  };

  fourPillars.day.tenGod = undefined;

  const genderNum = gender === 'male' ? 1 : 0;
  const yun = eightChar.getYun(genderNum);
  const daYunList = yun.getDaYun();

  let startAgeDetail = `${yun.getStartYear()}岁起运`;
  try {
    const startSolar = yun.getStartSolar();
    if (startSolar) {
      const birthDate = new Date(
        solar.getYear(),
        solar.getMonth() - 1,
        solar.getDay(),
        solar.getHour(),
        solar.getMinute()
      );
      const qiyunDate = new Date(
        startSolar.getYear(),
        startSolar.getMonth() - 1,
        startSolar.getDay(),
        startSolar.getHour(),
        startSolar.getMinute()
      );
      const diffDays = Math.floor((qiyunDate.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24));
      const years = Math.floor(diffDays / 365);
      const remainingDays = diffDays % 365;
      const months = Math.floor(remainingDays / 30);
      const days = remainingDays % 30;
      startAgeDetail = `${years}年${months}月${days}天起运`;
    }
  } catch {
    // 保持默认值
  }

  const daYun = daYunList
    .filter((dy) => dy.getGanZhi())
    .slice(0, 10)
    .map((dy) => {
      const ganZhi = dy.getGanZhi();
      const { tenGod, branchTenGod } = getDaYunTenGods(ganZhi, dayStem);
      return {
        startYear: dy.getStartYear(),
        ganZhi,
        tenGod,
        branchTenGod,
      };
    });

  const relations = analyzePillarRelations(yearBranch, monthBranch, dayBranch, hourBranch);

  return {
    gender,
    birthPlace,
    dayMaster: dayStem,
    kongWang,
    fourPillars,
    daYun: {
      startAgeDetail,
      list: daYun,
    },
    relations,
  };
}
