/**
 * MCP 工具定义
 */
export const tools = [
    {
        name: 'bazi_calculate',
        description: '八字计算 - 根据出生时间计算八字命盘，包含四柱、十神、藏干、纳音、地势（十二长生）、大运等信息',
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
                                hiddenStems: { type: 'array', items: { type: 'string' }, description: '藏干' },
                                naYin: { type: 'string', description: '纳音' },
                                diShi: { type: 'string', description: '地势（十二长生）' },
                            },
                        },
                        month: {
                            type: 'object',
                            description: '月柱',
                            properties: {
                                stem: { type: 'string', description: '天干' },
                                branch: { type: 'string', description: '地支' },
                                tenGod: { type: 'string', description: '十神' },
                                hiddenStems: { type: 'array', items: { type: 'string' }, description: '藏干' },
                                naYin: { type: 'string', description: '纳音' },
                                diShi: { type: 'string', description: '地势（十二长生）' },
                            },
                        },
                        day: {
                            type: 'object',
                            description: '日柱（日柱无十神）',
                            properties: {
                                stem: { type: 'string', description: '天干' },
                                branch: { type: 'string', description: '地支' },
                                hiddenStems: { type: 'array', items: { type: 'string' }, description: '藏干' },
                                naYin: { type: 'string', description: '纳音' },
                                diShi: { type: 'string', description: '地势（十二长生）' },
                            },
                        },
                        hour: {
                            type: 'object',
                            description: '时柱',
                            properties: {
                                stem: { type: 'string', description: '天干' },
                                branch: { type: 'string', description: '地支' },
                                tenGod: { type: 'string', description: '十神' },
                                hiddenStems: { type: 'array', items: { type: 'string' }, description: '藏干' },
                                naYin: { type: 'string', description: '纳音' },
                                diShi: { type: 'string', description: '地势（十二长生）' },
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
                                },
                            },
                        },
                    },
                },
                shenSha: {
                    type: 'object',
                    description: '神煞信息',
                    properties: {
                        tianYiGuiRen: { type: 'array', items: { type: 'string' }, description: '天乙贵人' },
                        wenChangGuiRen: { type: 'array', items: { type: 'string' }, description: '文昌贵人' },
                        yiMa: { type: 'array', items: { type: 'string' }, description: '驿马' },
                        taoHua: { type: 'array', items: { type: 'string' }, description: '桃花' },
                        huaGai: { type: 'array', items: { type: 'string' }, description: '华盖' },
                        jiangXing: { type: 'array', items: { type: 'string' }, description: '将星' },
                        yangRen: { type: 'array', items: { type: 'string' }, description: '羊刃' },
                        luShen: { type: 'array', items: { type: 'string' }, description: '禄神' },
                        tianDeGuiRen: { type: 'string', description: '天德贵人' },
                        yueDeGuiRen: { type: 'string', description: '月德贵人' },
                        kuiGang: { type: 'boolean', description: '魁罡' },
                        jinYu: { type: 'boolean', description: '金舆' },
                        tianLuodiWang: { type: 'array', items: { type: 'string' }, description: '天罗地网' },
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
                changedLines: { type: 'array', items: { type: 'number' }, description: '动爻位置(1-6)' },
                changedYaoCi: { type: 'array', items: { type: 'string' }, description: '变爻爻辞' },
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
                            change: { type: 'string', description: '变化状态(stable/changing)' },
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
                            changeAnalysis: {
                                type: 'object',
                                description: '变爻分析',
                                properties: {
                                    huaType: { type: 'string', description: '化类型' },
                                    huaLabel: { type: 'string', description: '化标签' },
                                    isGood: { type: 'boolean', description: '是否吉' },
                                },
                            },
                        },
                    },
                },
                yongShen: {
                    type: 'object',
                    description: '用神',
                    properties: {
                        type: { type: 'string', description: '用神类型' },
                        liuQin: { type: 'string', description: '六亲' },
                        element: { type: 'string', description: '五行' },
                        position: { type: 'number', description: '位置' },
                        strengthScore: { type: 'number', description: '强度评分' },
                        isStrong: { type: 'boolean', description: '是否旺相' },
                        strengthLabel: { type: 'string', description: '强度标签' },
                        kongWangState: { type: 'string', description: '空亡状态' },
                        factors: { type: 'array', items: { type: 'string' }, description: '影响因素' },
                    },
                },
                shenSystem: {
                    type: 'object',
                    description: '神系',
                    properties: {
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
                changedYaos: {
                    type: 'array',
                    description: '变爻详情',
                    items: {
                        type: 'object',
                        properties: {
                            position: { type: 'number', description: '爻位(1-6)' },
                            type: { type: 'number', description: '爻类型(0阴/1阳)' },
                            liuQin: { type: 'string', description: '六亲' },
                            naJia: { type: 'string', description: '纳甲地支' },
                            wuXing: { type: 'string', description: '五行' },
                        },
                    },
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
                    description: '时间建议',
                    items: {
                        type: 'object',
                        properties: {
                            type: { type: 'string', description: '类型(favorable/unfavorable/critical)' },
                            timeframe: { type: 'string', description: '时间范围' },
                            earthlyBranch: { type: 'string', description: '地支' },
                            description: { type: 'string', description: '描述' },
                        },
                    },
                },
                summary: {
                    type: 'object',
                    description: '总结',
                    properties: {
                        overallTrend: { type: 'string', description: '整体趋势(favorable/neutral/unfavorable)' },
                        keyFactors: { type: 'array', items: { type: 'string' }, description: '关键因素' },
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
