export const ziweiHoroscopeDefinition = {
    name: 'ziwei_horoscope',
    description: '紫微斗数运限 - 根据出生时间和目标日期计算大限、小限、流年、流月、流日、流时运限信息，含流年星曜（流禄/流羊/流陀/流昌/流曲/流魁/流钺/流马/流鸾/流喜）及流年神煞（岁前/将前十二星）',
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
            targetDate: { type: 'string', description: '目标日期 (YYYY-MM-DD)，默认今天' },
            targetTimeIndex: { type: 'number', description: '目标时辰索引 (0-12)，默认当前时辰' },
            responseFormat: {
                type: 'string',
                enum: ['json', 'markdown'],
                description: '响应格式：json=结构化数据，markdown=人类可读文本',
                default: 'json',
            },
            detailLevel: {
                type: 'string',
                enum: ['default', 'full'],
                description: '输出细节级别：default=精简牌面；full=在默认基础上补充完整信息',
                default: 'default',
            },
        },
        required: ['gender', 'birthYear', 'birthMonth', 'birthDay', 'birthHour'],
        examples: [
            { gender: 'male', birthYear: 1990, birthMonth: 1, birthDay: 15, birthHour: 9, targetDate: '2026-03-13' },
        ],
    },
    outputSchema: {
        type: 'object',
        properties: {
            solarDate: { type: 'string', description: '阳历出生日期' },
            lunarDate: { type: 'string', description: '农历出生日期' },
            soul: { type: 'string', description: '命主' },
            body: { type: 'string', description: '身主' },
            fiveElement: { type: 'string', description: '五行局' },
            targetDate: { type: 'string', description: '目标日期' },
            decadal: { type: 'object', description: '大限', properties: { index: { type: 'number' }, name: { type: 'string' }, heavenlyStem: { type: 'string' }, earthlyBranch: { type: 'string' }, palaceNames: { type: 'array', items: { type: 'string' } }, mutagen: { type: 'array', items: { type: 'string' } } } },
            age: { type: 'object', description: '小限', properties: { index: { type: 'number' }, name: { type: 'string' }, heavenlyStem: { type: 'string' }, earthlyBranch: { type: 'string' }, palaceNames: { type: 'array', items: { type: 'string' } }, mutagen: { type: 'array', items: { type: 'string' } }, nominalAge: { type: 'number', description: '虚岁' } } },
            yearly: { type: 'object', description: '流年' },
            monthly: { type: 'object', description: '流月' },
            daily: { type: 'object', description: '流日' },
            hourly: { type: 'object', description: '流时' },
            transitStars: {
                type: 'array',
                description: '流年星曜（流禄/流羊/流陀/流昌/流曲/流魁/流钺/流马/流鸾/流喜及其所在宫位）',
                items: {
                    type: 'object',
                    properties: {
                        starName: { type: 'string', description: '星名' },
                        palaceName: { type: 'string', description: '所在宫位' },
                    },
                },
            },
            yearlyDecStar: {
                type: 'object',
                description: '流年神煞（岁前十二星、将前十二星）',
                properties: {
                    jiangqian12: { type: 'array', items: { type: 'string' }, description: '将前十二星' },
                    suiqian12: { type: 'array', items: { type: 'string' }, description: '岁前十二星' },
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
