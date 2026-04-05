export const ziweiCalculateDefinition = {
    name: 'ziwei_calculate',
    description: '紫微斗数排盘 - 根据出生时间计算紫微命盘，包含十二宫位、星曜（含亮度/四化/宫干自化）、大限、流年虚岁、斗君、四化分布、命主星、身主星、小限、博士十二星、三方四正。可选传入经度启用真太阳时校正',
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
                description: '输出细节级别：default=精简命盘；full=完整命盘',
                default: 'default',
            },
        },
        required: ['gender', 'birthYear', 'birthMonth', 'birthDay', 'birthHour'],
        examples: [
            { gender: 'male', birthYear: 1990, birthMonth: 1, birthDay: 15, birthHour: 9 },
            { gender: 'female', birthYear: 1995, birthMonth: 6, birthDay: 20, birthHour: 23, calendarType: 'lunar' },
            { gender: 'male', birthYear: 1990, birthMonth: 1, birthDay: 15, birthHour: 9, longitude: 116.4 },
        ],
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
                    year: {
                        type: 'object',
                        description: '年柱干支',
                        properties: {
                            gan: { type: 'string', description: '年柱天干' },
                            zhi: { type: 'string', description: '年柱地支' },
                        },
                    },
                    month: {
                        type: 'object',
                        description: '月柱干支',
                        properties: {
                            gan: { type: 'string', description: '月柱天干' },
                            zhi: { type: 'string', description: '月柱地支' },
                        },
                    },
                    day: {
                        type: 'object',
                        description: '日柱干支',
                        properties: {
                            gan: { type: 'string', description: '日柱天干' },
                            zhi: { type: 'string', description: '日柱地支' },
                        },
                    },
                    hour: {
                        type: 'object',
                        description: '时柱干支',
                        properties: {
                            gan: { type: 'string', description: '时柱天干' },
                            zhi: { type: 'string', description: '时柱地支' },
                        },
                    },
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
                        index: { type: 'number', description: '宫位索引(0-11)' },
                        isOriginalPalace: { type: 'boolean', description: '是否来因宫' },
                        changsheng12: { type: 'string', description: '长生12神' },
                        boshi12: { type: 'string', description: '博士12神' },
                        jiangqian12: { type: 'string', description: '将前12神' },
                        suiqian12: { type: 'string', description: '岁前12神' },
                        ages: { type: 'array', items: { type: 'number' }, description: '小限年龄' },
                        majorStars: {
                            type: 'array',
                            description: '主星',
                            items: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string', description: '星名' },
                                    brightness: { type: 'string', description: '亮度（庙/旺/得/利/平/不/陷）' },
                                    mutagen: { type: 'string', description: '四化（禄/权/科/忌）' },
                                    selfMutagen: { type: 'string', description: '离心自化↓（本宫宫干四化落回本宫星曜）' },
                                    oppositeMutagen: { type: 'string', description: '向心自化↑（对宫宫干四化飞入本宫星曜）' },
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
                                    selfMutagen: { type: 'string', description: '离心自化↓' },
                                    oppositeMutagen: { type: 'string', description: '向心自化↑' },
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
                                    type: { type: 'string', description: '星耀类型（adjective/flower/helper/lucun/tianma等）' },
                                    brightness: { type: 'string', description: '亮度' },
                                    mutagen: { type: 'string', description: '四化（禄/权/科/忌）' },
                                    selfMutagen: { type: 'string', description: '离心自化↓' },
                                    oppositeMutagen: { type: 'string', description: '向心自化↑' },
                                },
                            },
                        },
                        decadalRange: {
                            type: 'array',
                            description: '大限虚岁范围 [起始, 结束]',
                            items: { type: 'number' },
                        },
                        liuNianAges: {
                            type: 'array',
                            description: '流年虚岁列表',
                            items: { type: 'number' },
                        },
                        sanFangSiZheng: {
                            type: 'array',
                            description: '三方四正宫位名 [本宫, 三合1, 三合2, 对宫]',
                            items: { type: 'string' },
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
            earthlyBranchOfSoulPalace: { type: 'string', description: '命宫地支' },
            earthlyBranchOfBodyPalace: { type: 'string', description: '身宫地支' },
            time: { type: 'string', description: '时辰名' },
            timeRange: { type: 'string', description: '时辰范围' },
            mutagenSummary: {
                type: 'array',
                description: '四化分布',
                items: {
                    type: 'object',
                    properties: {
                        mutagen: { type: 'string', enum: ['禄', '权', '科', '忌'], description: '四化类型' },
                        starName: { type: 'string', description: '星曜名' },
                        palaceName: { type: 'string', description: '所在宫位' },
                    },
                },
            },
            gender: { type: 'string', description: '性别回显（male/female）' },
            douJun: { type: 'string', description: '子年斗君地支' },
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
            lifeMasterStar: { type: 'string', description: '命主星（由出生年地支决定）' },
            bodyMasterStar: { type: 'string', description: '身主星（由出生年地支决定）' },
            smallLimit: {
                type: 'array',
                description: '小限（按三合局起始宫排列，每宫对应12年周期虚岁）',
                items: {
                    type: 'object',
                    properties: {
                        palaceName: { type: 'string', description: '宫位名' },
                        ages: { type: 'array', items: { type: 'number' }, description: '虚岁列表' },
                    },
                },
            },
            scholarStars: {
                type: 'array',
                description: '博士十二星（博士/力士/青龙/小耗/将军/奏书/飞廉/喜神/病符/大耗/伏兵/官府）',
                items: {
                    type: 'object',
                    properties: {
                        starName: { type: 'string', description: '星名' },
                        palaceName: { type: 'string', description: '所在宫位' },
                    },
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
export const ziweiDefinition = ziweiCalculateDefinition;
