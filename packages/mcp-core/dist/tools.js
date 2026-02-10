/**
 * MCP 工具定义
 */
export const tools = [
    {
        name: 'bazi_calculate',
        description: '八字计算 - 根据出生时间计算八字命盘，输出四柱、藏干气性/十神、分柱神煞、分柱空亡、地支刑害合冲关系与大运信息',
        inputSchema: {
            type: 'object',
            properties: {
                gender: {
                    type: 'string',
                    enum: ['male', 'female'],
                    description: '性别',
                },
                birthYear: {
                    type: 'number',
                    description: '出生年 (1900-2100)。calendarType=lunar 时表示农历年',
                },
                birthMonth: {
                    type: 'number',
                    description: '出生月 (1-12)。calendarType=lunar 时表示农历月',
                },
                birthDay: {
                    type: 'number',
                    description: '出生日。calendarType=lunar 时会按农历月天数校验',
                },
                birthHour: {
                    type: 'number',
                    description: '出生时 (0-23)',
                },
                birthMinute: {
                    type: 'number',
                    description: '出生分 (0-59)，默认 0',
                },
                calendarType: {
                    type: 'string',
                    enum: ['solar', 'lunar'],
                    description: '历法类型，默认 solar。lunar 表示按农历输入 birthYear/month/day',
                },
                isLeapMonth: {
                    type: 'boolean',
                    description: '是否闰月（仅 calendarType=lunar 有效，且会校验该年该月是否真为闰月）',
                },
                birthPlace: {
                    type: 'string',
                    description: '出生地点（可选）',
                },
            },
            required: ['gender', 'birthYear', 'birthMonth', 'birthDay', 'birthHour'],
        },
        outputSchema: {
            type: 'object',
            properties: {
                gender: {
                    type: 'string',
                    description: '性别',
                },
                birthPlace: {
                    type: 'string',
                    description: '出生地点',
                },
                dayMaster: {
                    type: 'string',
                    description: '日主天干（甲乙丙丁戊己庚辛壬癸）',
                },
                kongWang: {
                    type: 'object',
                    description: '全局空亡（按日柱查空亡，四柱共用）',
                    properties: {
                        xun: { type: 'string', description: '旬名' },
                        kongZhi: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 2, description: '空亡地支' },
                    },
                },
                fourPillars: {
                    type: 'object',
                    description: '四柱信息',
                    properties: {
                        year: {
                            type: 'object',
                            description: '年柱',
                            properties: {
                                stem: { type: 'string', description: '天干' },
                                branch: { type: 'string', description: '地支' },
                                tenGod: { type: 'string', description: '十神' },
                                hiddenStems: {
                                    type: 'array',
                                    description: '藏干明细',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            stem: { type: 'string', description: '藏干天干' },
                                            qiType: { type: 'string', enum: ['本气', '中气', '余气'], description: '气性' },
                                            tenGod: { type: 'string', description: '相对日主十神' },
                                        },
                                    },
                                },
                                naYin: { type: 'string', description: '纳音' },
                                diShi: { type: 'string', description: '地势（十二长生）' },
                                shenSha: { type: 'array', items: { type: 'string' }, description: '本柱神煞' },
                                kongWang: {
                                    type: 'object',
                                    description: '本柱空亡',
                                    properties: {
                                        isKong: { type: 'boolean', description: '本柱地支是否入空亡' },
                                    },
                                },
                            },
                        },
                        month: {
                            type: 'object',
                            description: '月柱',
                            properties: {
                                stem: { type: 'string', description: '天干' },
                                branch: { type: 'string', description: '地支' },
                                tenGod: { type: 'string', description: '十神' },
                                hiddenStems: {
                                    type: 'array',
                                    description: '藏干明细',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            stem: { type: 'string', description: '藏干天干' },
                                            qiType: { type: 'string', enum: ['本气', '中气', '余气'], description: '气性' },
                                            tenGod: { type: 'string', description: '相对日主十神' },
                                        },
                                    },
                                },
                                naYin: { type: 'string', description: '纳音' },
                                diShi: { type: 'string', description: '地势（十二长生）' },
                                shenSha: { type: 'array', items: { type: 'string' }, description: '本柱神煞' },
                                kongWang: {
                                    type: 'object',
                                    description: '本柱空亡',
                                    properties: {
                                        isKong: { type: 'boolean', description: '本柱地支是否入空亡' },
                                    },
                                },
                            },
                        },
                        day: {
                            type: 'object',
                            description: '日柱（日柱无十神）',
                            properties: {
                                stem: { type: 'string', description: '天干' },
                                branch: { type: 'string', description: '地支' },
                                hiddenStems: {
                                    type: 'array',
                                    description: '藏干明细',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            stem: { type: 'string', description: '藏干天干' },
                                            qiType: { type: 'string', enum: ['本气', '中气', '余气'], description: '气性' },
                                            tenGod: { type: 'string', description: '相对日主十神' },
                                        },
                                    },
                                },
                                naYin: { type: 'string', description: '纳音' },
                                diShi: { type: 'string', description: '地势（十二长生）' },
                                shenSha: { type: 'array', items: { type: 'string' }, description: '本柱神煞' },
                                kongWang: {
                                    type: 'object',
                                    description: '本柱空亡',
                                    properties: {
                                        isKong: { type: 'boolean', description: '本柱地支是否入空亡' },
                                    },
                                },
                            },
                        },
                        hour: {
                            type: 'object',
                            description: '时柱',
                            properties: {
                                stem: { type: 'string', description: '天干' },
                                branch: { type: 'string', description: '地支' },
                                tenGod: { type: 'string', description: '十神' },
                                hiddenStems: {
                                    type: 'array',
                                    description: '藏干明细',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            stem: { type: 'string', description: '藏干天干' },
                                            qiType: { type: 'string', enum: ['本气', '中气', '余气'], description: '气性' },
                                            tenGod: { type: 'string', description: '相对日主十神' },
                                        },
                                    },
                                },
                                naYin: { type: 'string', description: '纳音' },
                                diShi: { type: 'string', description: '地势（十二长生）' },
                                shenSha: { type: 'array', items: { type: 'string' }, description: '本柱神煞' },
                                kongWang: {
                                    type: 'object',
                                    description: '本柱空亡',
                                    properties: {
                                        isKong: { type: 'boolean', description: '本柱地支是否入空亡' },
                                    },
                                },
                            },
                        },
                    },
                },
                daYun: {
                    type: 'object',
                    description: '大运信息',
                    properties: {
                        startAgeDetail: { type: 'string', description: '起运详情（如"3年2月15天起运"）' },
                        list: {
                            type: 'array',
                            description: '大运列表',
                            items: {
                                type: 'object',
                                properties: {
                                    startYear: { type: 'number', description: '起始年份' },
                                    ganZhi: { type: 'string', description: '干支' },
                                    tenGod: { type: 'string', description: '大运天干十神（如：正官）' },
                                    branchTenGod: { type: 'string', description: '大运地支主气十神' },
                                },
                            },
                        },
                    },
                },
                relations: {
                    type: 'array',
                    description: '地支刑害合冲关系',
                    items: {
                        type: 'object',
                        properties: {
                            type: { type: 'string', enum: ['合', '冲', '刑', '害'], description: '关系类型' },
                            pillars: {
                                type: 'array',
                                items: { type: 'string', enum: ['年支', '月支', '日支', '时支'] },
                                description: '涉及柱位',
                            },
                            description: { type: 'string', description: '关系描述' },
                            isAuspicious: { type: 'boolean', description: '是否偏吉' },
                        },
                    },
                },
            },
        },
    },
    {
        name: 'bazi_pillars_resolve',
        description: '四柱反推候选时间 - 输入年/月/日/时四柱，返回1900-2100范围内全部候选时间（候选主字段为农历，可直接用于农历排盘）',
        inputSchema: {
            type: 'object',
            properties: {
                yearPillar: { type: 'string', description: '年柱，2字干支（如“甲子”）' },
                monthPillar: { type: 'string', description: '月柱，2字干支（如“乙丑”）' },
                dayPillar: { type: 'string', description: '日柱，2字干支（如“丙寅”）' },
                hourPillar: { type: 'string', description: '时柱，2字干支（如“丁卯”）' },
            },
            required: ['yearPillar', 'monthPillar', 'dayPillar', 'hourPillar'],
        },
        outputSchema: {
            type: 'object',
            properties: {
                pillars: {
                    type: 'object',
                    description: '原始四柱输入',
                    properties: {
                        yearPillar: { type: 'string' },
                        monthPillar: { type: 'string' },
                        dayPillar: { type: 'string' },
                        hourPillar: { type: 'string' },
                    },
                },
                count: { type: 'number', description: '候选总数' },
                candidates: {
                    type: 'array',
                    description: '候选出生时间',
                    items: {
                        type: 'object',
                        properties: {
                            candidateId: { type: 'string', description: '候选ID' },
                            birthYear: { type: 'number', description: '农历出生年' },
                            birthMonth: { type: 'number', description: '农历出生月' },
                            birthDay: { type: 'number', description: '农历出生日' },
                            birthHour: { type: 'number', description: '出生时' },
                            birthMinute: { type: 'number', description: '出生分' },
                            isLeapMonth: { type: 'boolean', description: '是否农历闰月' },
                            solarText: { type: 'string', description: '公历可读文本' },
                            lunarText: { type: 'string', description: '农历可读文本' },
                            nextCall: {
                                type: 'object',
                                description: '下一步调用 bazi_calculate 的农历建议参数（需补 gender）',
                                properties: {
                                    tool: { type: 'string', description: '工具名' },
                                    arguments: {
                                        type: 'object',
                                        properties: {
                                            birthYear: { type: 'number', description: '农历出生年' },
                                            birthMonth: { type: 'number', description: '农历出生月' },
                                            birthDay: { type: 'number', description: '农历出生日' },
                                            birthHour: { type: 'number' },
                                            birthMinute: { type: 'number' },
                                            calendarType: { type: 'string', enum: ['lunar'] },
                                            isLeapMonth: { type: 'boolean', description: '是否农历闰月' },
                                        },
                                    },
                                    missing: { type: 'array', items: { type: 'string' } },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
    {
        name: 'ziwei_calculate',
        description: '紫微斗数排盘 - 根据出生时间计算紫微命盘，包含十二宫位、星曜、四化、大限等信息',
        inputSchema: {
            type: 'object',
            properties: {
                gender: {
                    type: 'string',
                    enum: ['male', 'female'],
                    description: '性别',
                },
                birthYear: {
                    type: 'number',
                    description: '出生年 (1900-2100)',
                },
                birthMonth: {
                    type: 'number',
                    description: '出生月 (1-12)',
                },
                birthDay: {
                    type: 'number',
                    description: '出生日 (1-31)',
                },
                birthHour: {
                    type: 'number',
                    description: '出生时 (0-23)',
                },
                birthMinute: {
                    type: 'number',
                    description: '出生分 (0-59)，默认 0',
                },
                calendarType: {
                    type: 'string',
                    enum: ['solar', 'lunar'],
                    description: '历法类型，默认 solar (阳历)',
                },
                isLeapMonth: {
                    type: 'boolean',
                    description: '是否闰月（仅农历有效），默认 false',
                },
            },
            required: ['gender', 'birthYear', 'birthMonth', 'birthDay', 'birthHour'],
        },
        outputSchema: {
            type: 'object',
            properties: {
                solarDate: { type: 'string', description: '阳历日期' },
                lunarDate: { type: 'string', description: '农历日期' },
                fourPillars: {
                    type: 'object',
                    description: '四柱',
                    properties: {
                        year: { type: 'string', description: '年柱干支' },
                        month: { type: 'string', description: '月柱干支' },
                        day: { type: 'string', description: '日柱干支' },
                        hour: { type: 'string', description: '时柱干支' },
                    },
                },
                soul: { type: 'string', description: '命主' },
                body: { type: 'string', description: '身主' },
                fiveElement: { type: 'string', description: '五行局' },
                zodiac: { type: 'string', description: '属相' },
                sign: { type: 'string', description: '星座' },
                palaces: {
                    type: 'array',
                    description: '十二宫位',
                    items: {
                        type: 'object',
                        properties: {
                            name: { type: 'string', description: '宫名' },
                            heavenlyStem: { type: 'string', description: '天干' },
                            earthlyBranch: { type: 'string', description: '地支' },
                            isBodyPalace: { type: 'boolean', description: '是否身宫' },
                            majorStars: {
                                type: 'array',
                                description: '主星',
                                items: {
                                    type: 'object',
                                    properties: {
                                        name: { type: 'string', description: '星名' },
                                        brightness: { type: 'string', description: '亮度（庙/旺/得/利/平/不/陷）' },
                                        mutagen: { type: 'string', description: '四化（禄/权/科/忌）' },
                                    },
                                },
                            },
                            minorStars: {
                                type: 'array',
                                description: '辅星',
                                items: {
                                    type: 'object',
                                    properties: {
                                        name: { type: 'string', description: '星名' },
                                        brightness: { type: 'string', description: '亮度' },
                                        mutagen: { type: 'string', description: '四化（禄/权/科/忌）' },
                                    },
                                },
                            },
                            adjStars: {
                                type: 'array',
                                description: '杂曜',
                                items: {
                                    type: 'object',
                                    properties: {
                                        name: { type: 'string', description: '星名' },
                                    },
                                },
                            },
                        },
                    },
                },
                decadalList: {
                    type: 'array',
                    description: '大限列表',
                    items: {
                        type: 'object',
                        properties: {
                            startAge: { type: 'number', description: '起始年龄' },
                            endAge: { type: 'number', description: '结束年龄' },
                            heavenlyStem: { type: 'string', description: '天干' },
                            palace: {
                                type: 'object',
                                description: '宫位',
                                properties: {
                                    earthlyBranch: { type: 'string', description: '地支' },
                                    name: { type: 'string', description: '宫名' },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
    {
        name: 'liuyao_analyze',
        description: '六爻分析 - 六爻卦象占卜分析，支持自动起卦或选卦。输出包含：本卦/变卦信息、六亲六神、旺衰状态（旺/相/休/囚/死）、空亡状态、用神/原神/忌神/仇神、三合局、六冲卦、时间建议、凶吉警告等',
        inputSchema: {
            type: 'object',
            properties: {
                question: {
                    type: 'string',
                    description: '占卜问题',
                },
                yongShenTargets: {
                    type: 'array',
                    description: '指定用神目标（可多选，优先级高于问题推断）',
                    items: {
                        type: 'string',
                        enum: ['父母', '兄弟', '子孙', '妻财', '官鬼'],
                    },
                },
                method: {
                    type: 'string',
                    enum: ['auto', 'select'],
                    description: '起卦方式：auto=自动起卦，select=选卦。默认 auto',
                },
                hexagramName: {
                    type: 'string',
                    description: '选卦模式：卦名（如"天火同人"）或6位卦码（如"101111"）',
                },
                changedHexagramName: {
                    type: 'string',
                    description: '选卦模式：变卦名或卦码（可选，提供后自动计算变爻）',
                },
                date: {
                    type: 'string',
                    description: '占卜日期 (ISO格式)，默认今天',
                },
            },
            required: ['question'],
        },
        outputSchema: {
            type: 'object',
            properties: {
                question: { type: 'string', description: '占卜问题' },
                hexagramName: { type: 'string', description: '本卦名' },
                hexagramGong: { type: 'string', description: '卦宫' },
                hexagramElement: { type: 'string', description: '卦五行' },
                hexagramBrief: { type: 'string', description: '卦辞简介' },
                guaCi: { type: 'string', description: '卦辞（周易原文）' },
                xiangCi: { type: 'string', description: '象辞' },
                changedHexagramName: { type: 'string', description: '变卦名' },
                changedHexagramGong: { type: 'string', description: '变卦宫' },
                changedHexagramElement: { type: 'string', description: '变卦五行' },
                ganZhiTime: {
                    type: 'object',
                    description: '干支时间',
                    properties: {
                        year: {
                            type: 'object',
                            properties: {
                                gan: { type: 'string', description: '天干' },
                                zhi: { type: 'string', description: '地支' },
                            },
                        },
                        month: {
                            type: 'object',
                            properties: {
                                gan: { type: 'string', description: '天干' },
                                zhi: { type: 'string', description: '地支' },
                            },
                        },
                        day: {
                            type: 'object',
                            properties: {
                                gan: { type: 'string', description: '天干' },
                                zhi: { type: 'string', description: '地支' },
                            },
                        },
                        hour: {
                            type: 'object',
                            properties: {
                                gan: { type: 'string', description: '天干' },
                                zhi: { type: 'string', description: '地支' },
                            },
                        },
                    },
                },
                kongWang: {
                    type: 'object',
                    description: '旬空',
                    properties: {
                        xun: { type: 'string', description: '旬名' },
                        kongZhi: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 2, description: '空亡地支（两个）' },
                    },
                },
                fullYaos: {
                    type: 'array',
                    description: '六爻详情',
                    items: {
                        type: 'object',
                        properties: {
                            position: { type: 'number', description: '爻位(1-6)' },
                            type: { type: 'number', description: '爻类型(0阴/1阳)' },
                            isChanging: { type: 'boolean', description: '是否变爻' },
                            movementState: {
                                type: 'string',
                                enum: ['static', 'changing', 'hidden_moving', 'day_break'],
                                description: '动静状态（静/明动/暗动/日破）',
                            },
                            movementLabel: { type: 'string', description: '动静状态中文标签' },
                            liuQin: { type: 'string', description: '六亲' },
                            liuShen: { type: 'string', description: '六神' },
                            naJia: { type: 'string', description: '纳甲地支' },
                            wuXing: { type: 'string', description: '五行' },
                            isShiYao: { type: 'boolean', description: '是否世爻' },
                            isYingYao: { type: 'boolean', description: '是否应爻' },
                            wangShuai: { type: 'string', description: '旺衰(wang/xiang/xiu/qiu/si)' },
                            wangShuaiLabel: { type: 'string', description: '旺衰标签(旺/相/休/囚/死)' },
                            kongWangState: { type: 'string', description: '空亡状态' },
                            kongWangLabel: { type: 'string', description: '空亡标签' },
                            strengthScore: { type: 'number', description: '强度评分' },
                            isStrong: { type: 'boolean', description: '是否旺相' },
                            strengthFactors: { type: 'array', items: { type: 'string' }, description: '强度因素' },
                            changSheng: { type: 'string', description: '十二长生' },
                            shenSha: { type: 'array', items: { type: 'string' }, description: '本爻神煞' },
                            changedYao: {
                                type: ['object', 'null'],
                                description: '变出之爻（仅动爻有值）',
                                properties: {
                                    type: { type: 'number', description: '变爻类型(0阴/1阳)' },
                                    liuQin: { type: 'string', description: '变爻六亲' },
                                    naJia: { type: 'string', description: '变爻纳甲地支' },
                                    wuXing: { type: 'string', description: '变爻五行' },
                                    liuShen: { type: 'string', description: '变爻六神' },
                                    yaoCi: { type: 'string', description: '对应变爻爻辞' },
                                    relation: { type: 'string', description: '变爻关系（如回头克/回头生/化进/化退）' },
                                },
                            },
                        },
                    },
                },
                yongShen: {
                    type: 'array',
                    description: '用神分组列表（按目标六亲）',
                    items: {
                        type: 'object',
                        properties: {
                            targetLiuQin: { type: 'string', enum: ['父母', '兄弟', '子孙', '妻财', '官鬼'], description: '目标六亲' },
                            source: { type: 'string', enum: ['input', 'inferred'], description: '来源（输入指定/问题推断）' },
                            selected: {
                                type: 'object',
                                description: '主用神',
                                properties: {
                                    liuQin: { type: 'string', description: '六亲' },
                                    naJia: { type: 'string', description: '纳甲地支' },
                                    element: { type: 'string', description: '五行' },
                                    position: { type: 'number', description: '位置' },
                                    strengthScore: { type: 'number', description: '强度评分' },
                                    isStrong: { type: 'boolean', description: '是否旺相' },
                                    strengthLabel: { type: 'string', description: '强度标签' },
                                    movementState: { type: 'string', enum: ['static', 'changing', 'hidden_moving', 'day_break'], description: '动静状态' },
                                    movementLabel: { type: 'string', description: '动静状态中文标签' },
                                    isShiYao: { type: 'boolean', description: '是否世爻' },
                                    isYingYao: { type: 'boolean', description: '是否应爻' },
                                    kongWangState: { type: 'string', description: '空亡状态' },
                                    rankScore: { type: 'number', description: '综合排序分' },
                                    factors: { type: 'array', items: { type: 'string' }, description: '影响因素' },
                                },
                            },
                            candidates: {
                                type: 'array',
                                description: '备选用神列表（按 rankScore 降序）',
                                items: {
                                    type: 'object',
                                    properties: {
                                        liuQin: { type: 'string', description: '六亲' },
                                        naJia: { type: 'string', description: '纳甲地支' },
                                        element: { type: 'string', description: '五行' },
                                        position: { type: 'number', description: '位置' },
                                        strengthScore: { type: 'number', description: '强度评分' },
                                        isStrong: { type: 'boolean', description: '是否旺相' },
                                        strengthLabel: { type: 'string', description: '强度标签' },
                                        movementState: { type: 'string', enum: ['static', 'changing', 'hidden_moving', 'day_break'], description: '动静状态' },
                                        movementLabel: { type: 'string', description: '动静状态中文标签' },
                                        isShiYao: { type: 'boolean', description: '是否世爻' },
                                        isYingYao: { type: 'boolean', description: '是否应爻' },
                                        kongWangState: { type: 'string', description: '空亡状态' },
                                        rankScore: { type: 'number', description: '综合排序分' },
                                        factors: { type: 'array', items: { type: 'string' }, description: '影响因素' },
                                    },
                                },
                            },
                        },
                    },
                },
                shenSystemByYongShen: {
                    type: 'array',
                    description: '按目标用神输出的神系',
                    items: {
                        type: 'object',
                        properties: {
                            targetLiuQin: { type: 'string', enum: ['父母', '兄弟', '子孙', '妻财', '官鬼'], description: '目标六亲' },
                            yuanShen: {
                                type: 'object',
                                description: '原神',
                                properties: {
                                    liuQin: { type: 'string', description: '六亲' },
                                    wuXing: { type: 'string', description: '五行' },
                                    positions: { type: 'array', items: { type: 'number' }, description: '位置' },
                                },
                            },
                            jiShen: {
                                type: 'object',
                                description: '忌神',
                                properties: {
                                    liuQin: { type: 'string', description: '六亲' },
                                    wuXing: { type: 'string', description: '五行' },
                                    positions: { type: 'array', items: { type: 'number' }, description: '位置' },
                                },
                            },
                            chouShen: {
                                type: 'object',
                                description: '仇神',
                                properties: {
                                    liuQin: { type: 'string', description: '六亲' },
                                    wuXing: { type: 'string', description: '五行' },
                                    positions: { type: 'array', items: { type: 'number' }, description: '位置' },
                                },
                            },
                        },
                    },
                },
                globalShenSha: {
                    type: 'array',
                    description: '整盘级神煞',
                    items: { type: 'string' },
                },
                fuShen: {
                    type: 'array',
                    description: '伏神',
                    items: {
                        type: 'object',
                        properties: {
                            liuQin: { type: 'string', description: '六亲' },
                            wuXing: { type: 'string', description: '五行' },
                            naJia: { type: 'string', description: '纳甲地支' },
                            feiShenPosition: { type: 'number', description: '飞神位置' },
                            isAvailable: { type: 'boolean', description: '是否可用' },
                            availabilityReason: { type: 'string', description: '可用原因' },
                        },
                    },
                },
                liuChongGuaInfo: {
                    type: 'object',
                    description: '六冲卦信息',
                    properties: {
                        isLiuChongGua: { type: 'boolean', description: '是否六冲卦' },
                        description: { type: 'string', description: '描述' },
                    },
                },
                sanHeAnalysis: {
                    type: 'object',
                    description: '三合局分析',
                    properties: {
                        hasFullSanHe: { type: 'boolean', description: '是否有完整三合' },
                        fullSanHe: {
                            type: 'object',
                            description: '完整三合',
                            properties: {
                                name: { type: 'string', description: '三合名' },
                                result: { type: 'string', description: '结果' },
                                positions: { type: 'array', items: { type: 'number' }, description: '位置' },
                            },
                        },
                        hasBanHe: { type: 'boolean', description: '是否有半合' },
                        banHe: {
                            type: 'array',
                            description: '半合列表',
                            items: {
                                type: 'object',
                                properties: {
                                    branches: { type: 'array', items: { type: 'string' }, description: '地支' },
                                    result: { type: 'string', description: '结果' },
                                    type: { type: 'string', description: '类型' },
                                    positions: { type: 'array', items: { type: 'number' }, description: '位置' },
                                },
                            },
                        },
                    },
                },
                warnings: { type: 'array', items: { type: 'string' }, description: '凶吉警告' },
                timeRecommendations: {
                    type: 'array',
                    description: '应期建议（结构化时间窗口）',
                    items: {
                        type: 'object',
                        properties: {
                            targetLiuQin: { type: 'string', enum: ['父母', '兄弟', '子孙', '妻财', '官鬼'], description: '目标六亲' },
                            type: { type: 'string', description: '类型(favorable/unfavorable/critical)' },
                            earthlyBranch: { type: 'string', description: '地支' },
                            startDate: { type: 'string', description: '窗口开始日期(YYYY-MM-DD)' },
                            endDate: { type: 'string', description: '窗口结束日期(YYYY-MM-DD)' },
                            confidence: { type: 'number', description: '置信度(0-1)' },
                            description: { type: 'string', description: '描述' },
                        },
                    },
                },
            },
        },
    },
    {
        name: 'tarot_draw',
        description: '塔罗抽牌 - 塔罗牌抽牌占卜，支持多种牌阵',
        inputSchema: {
            type: 'object',
            properties: {
                spreadType: {
                    type: 'string',
                    enum: ['single', 'three-card', 'love', 'celtic-cross'],
                    description: '牌阵类型：single=单牌，three-card=三牌，love=爱情牌阵，celtic-cross=凯尔特十字。默认 single',
                },
                question: {
                    type: 'string',
                    description: '占卜问题（可选）',
                },
                allowReversed: {
                    type: 'boolean',
                    description: '是否允许逆位，默认 true',
                },
            },
            required: [],
        },
        outputSchema: {
            type: 'object',
            properties: {
                spreadId: { type: 'string', description: '牌阵ID' },
                spreadName: { type: 'string', description: '牌阵名称' },
                question: { type: 'string', description: '占卜问题' },
                cards: {
                    type: 'array',
                    description: '抽到的牌',
                    items: {
                        type: 'object',
                        properties: {
                            position: { type: 'string', description: '位置含义' },
                            card: {
                                type: 'object',
                                description: '牌信息',
                                properties: {
                                    name: { type: 'string', description: '英文名' },
                                    nameChinese: { type: 'string', description: '中文名' },
                                    keywords: { type: 'array', items: { type: 'string' }, description: '关键词' },
                                },
                            },
                            orientation: { type: 'string', description: '正逆位(upright/reversed)' },
                            meaning: { type: 'string', description: '牌义' },
                        },
                    },
                },
            },
        },
    },
    {
        name: 'daily_fortune',
        description: '每日运势 - 计算个性化每日运势，包含事业、感情、财运、健康等维度',
        inputSchema: {
            type: 'object',
            properties: {
                dayMaster: {
                    type: 'string',
                    enum: ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'],
                    description: '日主天干（如已知）',
                },
                birthYear: {
                    type: 'number',
                    description: '出生年（用于计算日主）',
                },
                birthMonth: {
                    type: 'number',
                    description: '出生月',
                },
                birthDay: {
                    type: 'number',
                    description: '出生日',
                },
                birthHour: {
                    type: 'number',
                    description: '出生时',
                },
                date: {
                    type: 'string',
                    description: '目标日期 (YYYY-MM-DD)，默认今天',
                },
            },
            required: [],
        },
        outputSchema: {
            type: 'object',
            properties: {
                date: { type: 'string', description: '日期' },
                dayInfo: {
                    type: 'object',
                    description: '日干支',
                    properties: {
                        stem: { type: 'string', description: '天干' },
                        branch: { type: 'string', description: '地支' },
                        ganZhi: { type: 'string', description: '干支' },
                    },
                },
                tenGod: { type: 'string', description: '流日十神' },
                scores: {
                    type: 'object',
                    description: '各维度评分（0-100）',
                    properties: {
                        overall: { type: 'number', description: '综合评分' },
                        career: { type: 'number', description: '事业评分' },
                        love: { type: 'number', description: '感情评分' },
                        wealth: { type: 'number', description: '财运评分' },
                        health: { type: 'number', description: '健康评分' },
                        social: { type: 'number', description: '社交评分' },
                    },
                },
                advice: { type: 'array', items: { type: 'string' }, description: '建议' },
                luckyColor: { type: 'string', description: '幸运颜色' },
                luckyDirection: { type: 'string', description: '幸运方位' },
                almanac: {
                    type: 'object',
                    description: '黄历',
                    properties: {
                        lunarDate: { type: 'string', description: '农历日期' },
                        lunarMonth: { type: 'string', description: '农历月份' },
                        lunarDay: { type: 'string', description: '农历日' },
                        zodiac: { type: 'string', description: '生肖' },
                        solarTerm: { type: 'string', description: '节气（如有）' },
                        suitable: { type: 'array', items: { type: 'string' }, description: '宜' },
                        avoid: { type: 'array', items: { type: 'string' }, description: '忌' },
                        chongSha: { type: 'string', description: '冲煞' },
                        pengZuBaiJi: { type: 'array', items: { type: 'string' }, description: '彭祖百忌' },
                        jishen: { type: 'array', items: { type: 'string' }, description: '吉神宜趋' },
                        xiongsha: { type: 'array', items: { type: 'string' }, description: '凶煞宜忌' },
                    },
                },
            },
        },
    },
    {
        name: 'liunian_analyze',
        description: '流年流月分析 - 根据出生时间分析当前大运、流年、流月对命主的影响，包含十神分析和吉凶趋势',
        inputSchema: {
            type: 'object',
            properties: {
                gender: {
                    type: 'string',
                    enum: ['male', 'female'],
                    description: '性别',
                },
                birthYear: {
                    type: 'number',
                    description: '出生年 (1900-2100)',
                },
                birthMonth: {
                    type: 'number',
                    description: '出生月 (1-12)',
                },
                birthDay: {
                    type: 'number',
                    description: '出生日 (1-31)',
                },
                birthHour: {
                    type: 'number',
                    description: '出生时 (0-23)',
                },
                birthMinute: {
                    type: 'number',
                    description: '出生分 (0-59)，默认 0',
                },
                calendarType: {
                    type: 'string',
                    enum: ['solar', 'lunar'],
                    description: '历法类型，默认 solar (阳历)',
                },
                isLeapMonth: {
                    type: 'boolean',
                    description: '是否闰月（仅农历有效），默认 false',
                },
                targetYear: {
                    type: 'number',
                    description: '目标年份，默认当前年',
                },
                targetMonth: {
                    type: 'number',
                    description: '目标月份 (1-12)，可选，提供后计算流月',
                },
            },
            required: ['gender', 'birthYear', 'birthMonth', 'birthDay', 'birthHour'],
        },
        outputSchema: {
            type: 'object',
            properties: {
                currentDaYun: {
                    type: 'object',
                    description: '当前大运',
                    properties: {
                        startYear: { type: 'number', description: '起始年份' },
                        endYear: { type: 'number', description: '结束年份' },
                        ganZhi: { type: 'string', description: '干支' },
                        tenGod: { type: 'string', description: '十神' },
                    },
                },
                liunian: {
                    type: 'object',
                    description: '流年',
                    properties: {
                        year: { type: 'number', description: '年份' },
                        ganZhi: { type: 'string', description: '干支' },
                        tenGod: { type: 'string', description: '十神' },
                    },
                },
                liuyue: {
                    type: 'object',
                    description: '流月（如提供targetMonth）',
                    properties: {
                        month: { type: 'number', description: '月份' },
                        ganZhi: { type: 'string', description: '干支' },
                        tenGod: { type: 'string', description: '十神' },
                    },
                },
                analysis: {
                    type: 'object',
                    description: '综合分析',
                    properties: {
                        trend: { type: 'string', description: '趋势(favorable/neutral/unfavorable)' },
                        keyFactors: { type: 'array', items: { type: 'string' }, description: '关键因素分析' },
                    },
                },
            },
        },
    },
];
