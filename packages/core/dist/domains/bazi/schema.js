export const baziCalculateDefinition = {
    name: 'bazi_calculate',
    description: '八字计算 - 根据出生时间计算八字命盘，输出四柱、藏干气性/十神、分柱神煞（30+种）、分柱空亡、地支刑害合冲关系、天干五合、天干冲克、地支半合、地支三会、胎元、命宫',
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
                description: '出生地点（可选，仅用于展示/存档，不会自动换算为经度）',
            },
            longitude: {
                type: 'number',
                description: '出生地经度（东经为正，如北京 116.4，上海 121.5）。提供后自动计算真太阳时校正时辰；农历输入会先换算为公历再校正。如果只有地点名，需要在调用方先做地理编码',
            },
            responseFormat: {
                type: 'string',
                enum: ['json', 'markdown'],
                description: '响应格式：json=结构化数据，markdown=人类可读文本',
                default: 'json',
            },
            detailLevel: {
                type: 'string',
                enum: ['default', 'full'],
                description: '输出细节级别：default=精简输出；full=完整输出',
                default: 'default',
            },
        },
        required: ['gender', 'birthYear', 'birthMonth', 'birthDay', 'birthHour'],
        examples: [
            { gender: 'male', birthYear: 1990, birthMonth: 1, birthDay: 15, birthHour: 9 },
            { gender: 'female', birthYear: 1995, birthMonth: 6, birthDay: 20, birthHour: 23, calendarType: 'lunar' },
        ],
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
                description: '出生地点（原样回显，不参与地理编码）',
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
                    },
                },
            },
            tianGanWuHe: {
                type: 'array',
                description: '天干五合（相邻柱天干相合）',
                items: {
                    type: 'object',
                    properties: {
                        stemA: { type: 'string', description: '天干A' },
                        stemB: { type: 'string', description: '天干B' },
                        resultElement: { type: 'string', description: '合化五行' },
                        positions: {
                            type: 'array',
                            items: { type: 'string', enum: ['年支', '月支', '日支', '时支'] },
                            description: '涉及柱位',
                        },
                    },
                },
            },
            tianGanChongKe: {
                type: 'array',
                description: '天干冲克（甲庚/乙辛/丙壬/丁癸）',
                items: {
                    type: 'object',
                    properties: {
                        stemA: { type: 'string', description: '天干A' },
                        stemB: { type: 'string', description: '天干B' },
                        positions: {
                            type: 'array',
                            items: { type: 'string', enum: ['年支', '月支', '日支', '时支'] },
                            description: '涉及柱位',
                        },
                    },
                },
            },
            diZhiBanHe: {
                type: 'array',
                description: '地支半合（三合局中两支出现且缺一支）',
                items: {
                    type: 'object',
                    properties: {
                        branches: {
                            type: 'array',
                            items: { type: 'string' },
                            description: '参与半合的地支',
                        },
                        resultElement: { type: 'string', description: '半合五行' },
                        missingBranch: { type: 'string', description: '缺失的地支' },
                        positions: {
                            type: 'array',
                            items: { type: 'string', enum: ['年支', '月支', '日支', '时支'] },
                            description: '涉及柱位',
                        },
                    },
                },
            },
            diZhiSanHui: {
                type: 'array',
                description: '地支三会（方局：寅卯辰→木/巳午未→火/申酉戌→金/亥子丑→水）',
                items: {
                    type: 'object',
                    properties: {
                        branches: {
                            type: 'array',
                            items: { type: 'string' },
                            description: '三会地支',
                        },
                        resultElement: { type: 'string', description: '三会五行' },
                        positions: {
                            type: 'array',
                            items: { type: 'string', enum: ['年支', '月支', '日支', '时支'] },
                            description: '涉及柱位',
                        },
                    },
                },
            },
            taiYuan: {
                type: 'string',
                description: '胎元（月干进一位 + 月支进三位）',
            },
            mingGong: {
                type: 'string',
                description: '命宫地支',
            },
            trueSolarTimeInfo: {
                type: 'object',
                description: '真太阳时校正信息（仅在提供 longitude 时返回；农历输入会先换算为公历再校正）',
                properties: {
                    clockTime: { type: 'string', description: '钟表时间 (HH:MM)' },
                    trueSolarTime: { type: 'string', description: '真太阳时 (HH:MM)' },
                    longitude: { type: 'number', description: '出生地经度' },
                    correctionMinutes: { type: 'number', description: '总校正量（分钟）' },
                    trueTimeIndex: { type: 'number', description: '真太阳时对应的时辰索引 (0-12)' },
                    dayOffset: { type: 'number', description: '跨日偏移（-1/0/1）' },
                },
            },
        },
    },
    annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
    },
};
export const baziDefinition = baziCalculateDefinition;
