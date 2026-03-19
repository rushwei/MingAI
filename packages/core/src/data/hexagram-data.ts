/**
 * 六爻卦象静态数据
 */

export interface Hexagram {
  name: string;
  code: string;
  upperTrigram: string;
  lowerTrigram: string;
  element: string;
  nature: string;
}

export const HEXAGRAMS: Hexagram[] = [
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
