export const ziweiFlyingStarDefinition = {
    name: 'ziwei_flying_star',
    description: '紫微斗数飞星分析 - 分析宫位间四化飞布关系，支持飞化判断、自化检测、四化落宫查询、三方四正查询',
    inputSchema: {
        type: 'object',
        properties: {
            gender: { type: 'string', enum: ['male', 'female'], description: '性别' },
            birthYear: { type: 'number', description: '出生年 (1900-2100)' },
            birthMonth: { type: 'number', description: '出生月 (1-12)' },
            birthDay: { type: 'number', description: '出生日 (1-31)' },
            birthHour: { type: 'number', description: '出生时 (0-23)' },
            birthMinute: { type: 'number', description: '出生分 (0-59)，默认 0' },
            calendarType: { type: 'string', enum: ['solar', 'lunar'], description: '历法类型，默认 solar' },
            isLeapMonth: { type: 'boolean', description: '是否闰月（仅农历有效），默认 false' },
            longitude: {
                type: 'number',
                description: '出生地经度（东经为正，如北京 116.4）。提供后自动计算真太阳时校正时辰；农历输入会先换算为公历再校正。如果只有地点名，需要在调用方先做地理编码',
            },
            queries: {
                type: 'array',
                description: '查询列表',
                minItems: 1,
                items: {
                    type: 'object',
                    properties: {
                        type: { type: 'string', enum: ['fliesTo', 'selfMutaged', 'mutagedPlaces', 'surroundedPalaces'], description: '查询类型' },
                        from: { type: 'string', description: '起飞宫位（fliesTo 用）' },
                        to: { type: 'string', description: '目标宫位（fliesTo 用）' },
                        palace: { type: 'string', description: '目标宫位（selfMutaged/mutagedPlaces/surroundedPalaces 用）' },
                        mutagens: { type: 'array', items: { type: 'string', enum: ['禄', '权', '科', '忌'] }, description: '四化类型（fliesTo/selfMutaged 用）' },
                    },
                    required: ['type'],
                },
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
                description: '输出细节级别：default=精简牌面；full=在默认基础上补充出生日期、随机种子、元素星象与数秘术',
                default: 'default',
            },
        },
        required: ['gender', 'birthYear', 'birthMonth', 'birthDay', 'birthHour', 'queries'],
        examples: [
            {
                gender: 'male', birthYear: 1990, birthMonth: 1, birthDay: 15, birthHour: 9,
                queries: [
                    { type: 'mutagedPlaces', palace: '命宫' },
                    { type: 'surroundedPalaces', palace: '命宫' },
                ],
            },
        ],
    },
    outputSchema: {
        type: 'object',
        properties: {
            results: {
                type: 'array',
                description: '查询结果',
                items: {
                    type: 'object',
                    properties: {
                        queryIndex: { type: 'number', description: '对应查询索引' },
                        type: { type: 'string', description: '查询类型' },
                        result: { description: '查询结果（boolean/数组/对象，取决于查询类型）' },
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
