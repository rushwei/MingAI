import type { ToolDefinition } from './tool-schema.js';

type OutputSchema = NonNullable<ToolDefinition['outputSchema']>;

const str = (description?: string) => ({ type: 'string', ...(description ? { description } : {}) });
const num = (description?: string) => ({ type: 'number', ...(description ? { description } : {}) });
const bool = (description?: string) => ({ type: 'boolean', ...(description ? { description } : {}) });
const arr = (items: Record<string, unknown>, description?: string) => ({
  type: 'array',
  items,
  ...(description ? { description } : {}),
});
const obj = (properties: Record<string, unknown>, description?: string): OutputSchema => ({
  type: 'object',
  properties,
  ...(description ? { description } : {}),
});

const trueSolarTimeSchema = obj({
  clockTime: str('钟表时间'),
  trueSolarTime: str('真太阳时'),
  longitude: num('经度'),
  correctionMinutes: num('校正分钟数'),
}, '真太阳时信息');

const dayunItemSchema = obj({
  startYear: num('起始年份'),
  ganZhi: str('干支'),
  tenGod: str('十神'),
  hiddenStems: arr(obj({
    stem: str('藏干天干'),
    tenGod: str('藏干十神'),
  }), '藏干'),
  diShi: str('地势'),
  naYin: str('纳音'),
  shenSha: arr(str(), '神煞'),
});

export const canonicalOutputSchemas: Record<string, OutputSchema> = {
  bazi_calculate: obj({
    basicInfo: obj({
      gender: str('性别'),
      dayMaster: str('日主'),
      dayMasterElement: str('命主五行'),
      kongWang: arr(str(), '空亡'),
      birthPlace: str('出生地'),
      trueSolarTime: trueSolarTimeSchema,
      taiYuan: str('胎元'),
      mingGong: str('命宫'),
    }),
    fourPillars: arr(obj({
      pillar: str('柱名'),
      ganZhi: str('干支'),
      tenGod: str('十神'),
      hiddenStems: arr(obj({
        stem: str('藏干天干'),
        tenGod: str('藏干十神'),
      })),
      diShi: str('地势'),
      naYin: str('纳音'),
      shenSha: arr(str()),
      isKong: bool('是否空亡'),
    }), '四柱'),
    relations: arr(str(), '干支关系'),
    dayun: obj({
      startInfo: str('起运信息'),
      list: arr(dayunItemSchema, '大运列表'),
    }),
  }),
  bazi_pillars_resolve: obj({
    originalPillars: obj({
      yearPillar: str('年柱'),
      monthPillar: str('月柱'),
      dayPillar: str('日柱'),
      hourPillar: str('时柱'),
    }),
    count: num('候选总数'),
    candidates: arr(obj({
      candidateId: str('候选ID'),
      lunarText: str('农历文本'),
      solarText: str('公历文本'),
      birthTime: str('出生时间'),
      isLeapMonth: bool('是否闰月'),
    })),
  }),
  bazi_dayun: obj({
    startInfo: obj({
      startAge: num('起运年龄'),
      detail: str('起运详情'),
    }),
    list: arr(dayunItemSchema, '大运列表'),
  }),
  ziwei_calculate: obj({
    basicInfo: obj({
      gender: str('性别'),
      solarDate: str('阳历'),
      lunarDate: str('农历'),
      fourPillars: str('四柱'),
      soul: str('命主'),
      body: str('身主'),
      fiveElement: str('五行局'),
      time: str('时辰'),
      douJun: str('斗君'),
      lifeMasterStar: str('命主星'),
      bodyMasterStar: str('身主星'),
      trueSolarTime: trueSolarTimeSchema,
    }),
    palaces: arr(obj({
      name: str('宫位'),
      index: num('宫位索引'),
      ganZhi: str('干支'),
      isBodyPalace: bool('是否身宫'),
      isOriginalPalace: bool('是否来因宫'),
      majorStars: arr(obj({
        name: str('星名'),
        brightness: str('亮度'),
        mutagen: str('四化'),
        selfMutagen: str('自化'),
        oppositeMutagen: str('对宫自化'),
      })),
      minorStars: arr(obj({
        name: str('星名'),
        brightness: str('亮度'),
        mutagen: str('四化'),
        selfMutagen: str('自化'),
        oppositeMutagen: str('对宫自化'),
      })),
      adjStars: arr(obj({
        name: str('星名'),
        brightness: str('亮度'),
        mutagen: str('四化'),
        selfMutagen: str('自化'),
        oppositeMutagen: str('对宫自化'),
      })),
      shenSha: arr(str(), '神煞'),
      decadalRange: str('大限范围'),
      liuNianAges: arr(num(), '流年虚岁'),
      ages: arr(num(), '小限虚岁'),
    }), '十二宫'),
    smallLimit: arr(obj({
      palaceName: str('宫位'),
      ages: arr(num(), '虚岁列表'),
    }), '小限'),
  }),
  ziwei_horoscope: obj({
    basicInfo: obj({
      solarDate: str('阳历'),
      lunarDate: str('农历'),
      soul: str('命主'),
      body: str('身主'),
      fiveElement: str('五行局'),
      targetDate: str('目标日期'),
    }),
    periods: arr(obj({
      label: str('类型'),
      palaceIndex: num('宫位索引'),
      name: str('宫位'),
      ganZhi: str('干支'),
      mutagen: arr(str(), '四化'),
      palaceNames: arr(str(), '十二宫重排'),
      nominalAge: num('虚岁'),
    })),
    transitStars: arr(obj({
      starName: str('星名'),
      palaceName: str('宫位'),
    })),
    yearlyDecStar: obj({
      suiqian12: arr(str(), '岁前十二星'),
      jiangqian12: arr(str(), '将前十二星'),
    }),
  }),
  ziwei_flying_star: obj({
    results: arr(obj({
      queryIndex: num('查询索引'),
      type: str('查询类型'),
      booleanResult: bool('布尔结果'),
      mutagedPlaces: arr(obj({
        mutagen: str('四化'),
        targetPalace: str('目标宫位'),
      })),
      surroundedPalaces: obj({
        target: str('本宫'),
        opposite: str('对宫'),
        wealth: str('财帛宫'),
        career: str('官禄宫'),
      }),
    })),
  }),
  liuyao: obj({
    卦盘: obj({
      问题: str('问题'),
      本卦: obj({
        卦名: str('本卦'),
        卦宫: str('卦宫'),
        五行: str('五行'),
        卦辞: str('卦辞'),
      }),
      变卦: obj({
        卦名: str('变卦'),
        卦宫: str('卦宫'),
        五行: str('五行'),
        卦辞: str('卦辞'),
        动爻: arr(str(), '动爻'),
        动爻爻辞: arr(obj({
          爻名: str('爻名'),
          爻辞: str('爻辞'),
        }), '动爻爻辞'),
      }),
      干支时间: arr(obj({
        柱: str('柱'),
        干支: str('干支'),
        空亡: arr(str(), '空亡'),
      })),
      卦身: obj({
        地支: str('卦身地支'),
        位置: str('位置'),
        状态: str('状态'),
      }),
      衍生卦: obj({
        互卦: obj({ 卦名: str('互卦') }),
        错卦: obj({ 卦名: str('错卦') }),
        综卦: obj({ 卦名: str('综卦') }),
      }),
      全局神煞: arr(str(), '全局神煞'),
    }),
    六爻全盘: obj({
      爻列表: arr(obj({
        爻位: str('爻位'),
        六神: str('六神'),
        神煞: arr(str(), '神煞'),
        伏神: obj({
          六亲: str('伏神六亲'),
          纳甲: str('伏神纳甲'),
          五行: str('伏神五行'),
        }),
        本爻: obj({
          六亲: str('本卦六亲'),
          纳甲: str('本卦纳甲'),
          五行: str('本卦五行'),
          旺衰: str('旺衰'),
        }),
        动静: str('动静'),
        空亡: str('空亡'),
        变爻: obj({
          六亲: str('变出六亲'),
          纳甲: str('变出纳甲'),
          五行: str('变出五行'),
        }),
        化变: str('化变'),
        世应: str('世应'),
      }), '六爻全盘'),
    }),
    全局互动: obj({
      组合关系: arr(obj({
        类型: str('互动类型'),
        结果五行: str('结果五行'),
        参与者: arr(obj({
          来源: str('参与来源'),
          地支: str('地支'),
          位置: str('位置'),
        }), '参与者'),
        名称: str('组合名'),
        位置: arr(str(), '位置'),
      }), '组合关系'),
      冲合转换: arr(obj({
        类型: str('转换类型'),
      }), '冲合转换'),
      反伏信息: arr(obj({
        类型: str('共振类型'),
      }), '反吟伏吟'),
      是否六冲卦: str('是否六冲卦'),
      是否六合卦: str('是否六合卦'),
      冲合趋势: str('冲合转换'),
    }),
    元信息: obj({
      细节级别: str('细节级别'),
    }),
  }),
  tarot: obj({
    basicInfo: obj({
      spreadName: str('牌阵'),
      question: str('问题'),
      birthDate: str('出生日期'),
    }),
    cards: arr(obj({
      position: str('位置'),
      cardName: str('牌名'),
      direction: str('正逆位'),
      keywords: arr(str(), '关键词'),
      meaning: str('牌义'),
      element: str('元素'),
      astrologicalCorrespondence: str('星象对应'),
    })),
    numerology: obj({
      personalityCard: obj({
        name: str('人格牌'),
        keywords: arr(str(), '关键词'),
        element: str('元素'),
        astrologicalCorrespondence: str('星象对应'),
      }),
      soulCard: obj({
        name: str('灵魂牌'),
        keywords: arr(str(), '关键词'),
        element: str('元素'),
        astrologicalCorrespondence: str('星象对应'),
      }),
      yearlyCard: obj({
        name: str('年度牌'),
        year: num('年份'),
        keywords: arr(str(), '关键词'),
        element: str('元素'),
        astrologicalCorrespondence: str('星象对应'),
      }),
    }),
  }),
  almanac: obj({
    basicInfo: obj({
      date: str('日期'),
      dayGanZhi: str('日干支'),
      tenGod: str('流日十神'),
    }),
    almanac: obj({
      lunarDate: str('农历'),
      zodiac: str('生肖'),
      solarTerm: str('节气'),
      chongSha: str('冲煞'),
      pengZuBaiJi: str('彭祖百忌'),
      taiShen: str('胎神'),
      dayNineStar: obj({
        description: str('描述'),
        position: str('方位'),
      }),
      suitable: arr(str(), '宜'),
      avoid: arr(str(), '忌'),
      jishen: arr(str(), '吉神'),
      xiongsha: arr(str(), '凶煞'),
    }),
  }),
  qimen_calculate: obj({
    basicInfo: obj({
      solarDate: str('阳历'),
      lunarDate: str('农历'),
      solarTerm: str('节气'),
      solarTermRange: str('节气范围'),
      fourPillars: str('四柱'),
      ju: str('局数'),
      yuan: str('三元'),
      xunShou: str('旬首'),
      panType: str('盘式'),
      question: str('占问'),
    }),
    palaces: arr(obj({
      palaceName: str('宫位'),
      palaceIndex: num('序号'),
      element: str('宫五行'),
      elementState: str('宫旺衰'),
      deity: str('八神'),
      heavenStem: str('天盘天干'),
      earthStem: str('地盘天干'),
      star: str('九星'),
      gate: str('八门'),
      starElement: str('星五行'),
      gateElement: str('门五行'),
      formations: arr(str(), '格局'),
      isDayKong: bool('日空'),
      isHourKong: bool('时空'),
      isYiMa: bool('驿马'),
      isRuMu: bool('入墓'),
    })),
    monthPhaseMap: {
      type: 'object',
      description: '月令旺衰映射',
      additionalProperties: { type: 'string' },
    },
  }),
  daliuren: obj({
    basicInfo: obj({
      date: str('日期'),
      lunarDate: str('农历'),
      bazi: str('八字'),
      ganZhi: obj({
        year: str(),
        month: str(),
        day: str(),
        hour: str(),
      }),
      yueJiang: str('月将'),
      kongWang: arr(str(), '空亡'),
      yiMa: str('驿马'),
      dingMa: str('丁马'),
      tianMa: str('天马'),
      diurnal: str('昼夜'),
      keTi: obj({
        method: str('取传法'),
        subTypes: arr(str(), '课体'),
        extraTypes: arr(str(), '附加课体'),
      }),
      keName: str('课名'),
      benMing: str('本命'),
      xingNian: str('行年'),
      question: str('占问'),
    }),
    siKe: arr(obj({
      ke: str('课次'),
      upper: str('上神'),
      lower: str('下神'),
      tianJiang: str('天将'),
    })),
    sanChuan: arr(obj({
      chuan: str('传次'),
      branch: str('地支'),
      tianJiang: str('天将'),
      liuQin: str('六亲'),
      dunGan: str('遁干'),
    })),
    gongInfos: arr(obj({
      diZhi: str('地盘地支'),
      wuXing: str('五行'),
      wangShuai: str('旺衰'),
      tianZhi: str('天盘地支'),
      tianJiang: str('天将'),
      dunGan: str('遁干'),
      changSheng: str('长生'),
      jianChu: str('建除'),
    })),
    shenSha: {
      type: 'object',
      description: '神煞分组',
      additionalProperties: { type: 'array', items: { type: 'string' } },
    },
  }),
};
