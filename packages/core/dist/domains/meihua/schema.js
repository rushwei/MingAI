export const meihuaDefinition = {
    name: 'meihua',
    description: '梅花易数 - 按《梅花易数》主线进行起卦与断卦，支持年月日時、物数/声数、字占、丈尺尺寸、方位/常见原典类象，以及现代两数/三数报数扩展法。输出包含：本卦/互卦/变卦/错卦/综卦、动爻、体卦/用卦、体用生克、月令旺衰、克应层次、应期线索、定性吉凶判断。禁止混入六爻纳甲/六亲/六神语义。',
    inputSchema: {
        type: 'object',
        properties: {
            question: {
                type: 'string',
                minLength: 1,
                description: '占卜问题，必须明确、非空。',
            },
            date: {
                type: 'string',
                description: '起卦日期时间，按墙上时间解释，格式 YYYY-MM-DDTHH:MM[:SS]。当前不支持时区偏移后缀。',
            },
            method: {
                type: 'string',
                enum: ['time', 'count_with_time', 'text_split', 'measure', 'classifier_pair', 'select', 'number_pair', 'number_triplet'],
                description: '起卦方式：time=年月日時；count_with_time=物数/声数；text_split=字占；measure=丈尺尺寸；classifier_pair=方位/常见原典类象；select=指定卦；number_pair/number_triplet=现代报数扩展法。',
            },
            count: {
                type: 'number',
                description: '物数/声数起卦时的数量，必须为正整数。',
            },
            countCategory: {
                type: 'string',
                enum: ['item', 'sound'],
                description: 'count_with_time 必填：数量来源。item=物数占（下卦取时数），sound=声音占（下卦取数量加时数）。',
            },
            text: {
                type: 'string',
                description: '字占文本。',
            },
            textSplitMode: {
                type: 'string',
                enum: ['auto', 'count', 'sentence_pair', 'stroke'],
                description: '字占分割方式：auto=经典优先，优先句占，其次四至十字平上去入；若多于两句，则按经典来意占取首句或末句；count=显式按字数平分/少上多下；sentence_pair=以前后两句分上下；stroke=单字左右拆笔画（需提供笔画数）。',
            },
            multiSentenceStrategy: {
                type: 'string',
                enum: ['first', 'last'],
                description: 'text_split.auto 在检测到多于两句文本时的取句方式：first=取首句，last=取末句。多于两句时必须显式提供。',
            },
            sentences: {
                type: 'array',
                items: { type: 'string' },
                minItems: 2,
                maxItems: 2,
                description: 'sentence_pair 模式下的两句文本，第一句为上卦，第二句为下卦。',
            },
            leftStrokeCount: {
                type: 'number',
                description: 'stroke 模式：单字左半边或上半边笔画数。',
            },
            rightStrokeCount: {
                type: 'number',
                description: 'stroke 模式：单字右半边或下半边笔画数。',
            },
            measureKind: {
                type: 'string',
                enum: ['丈尺', '尺寸'],
                description: 'measure 模式必填：丈尺=合丈尺之数取爻；尺寸=合尺寸之数加时取爻。',
            },
            majorValue: {
                type: 'number',
                description: 'measure 模式的大单位数值（丈或尺）。',
            },
            minorValue: {
                type: 'number',
                description: 'measure 模式的小单位数值（尺或寸）。',
            },
            upperCue: {
                type: 'string',
                description: 'classifier_pair 模式：上卦类象，如天、西北、老人、火、南等。当前内置常见原典类象，可配合类别参数消歧。',
            },
            upperCueCategory: {
                type: 'string',
                enum: ['direction', 'color', 'weather', 'person', 'body', 'animal', 'object', 'shape', 'trigram'],
                description: 'classifier_pair 模式：上卦类象类别。可选，用于消除类象歧义。',
            },
            lowerCue: {
                type: 'string',
                description: 'classifier_pair 模式：下卦类象，如地、西南、少男、水、北等。当前内置常见原典类象，可配合类别参数消歧。',
            },
            lowerCueCategory: {
                type: 'string',
                enum: ['direction', 'color', 'weather', 'person', 'body', 'animal', 'object', 'shape', 'trigram'],
                description: 'classifier_pair 模式：下卦类象类别。可选，用于消除类象歧义。',
            },
            hexagramName: {
                type: 'string',
                description: 'select 模式：指定本卦卦名或 6 位卦码。',
            },
            upperTrigram: {
                type: 'string',
                description: 'select 模式：指定上卦类象或八卦名。',
            },
            lowerTrigram: {
                type: 'string',
                description: 'select 模式：指定下卦类象或八卦名。',
            },
            movingLine: {
                type: 'number',
                description: 'select 模式：指定动爻（1-6）。',
            },
            numbers: {
                type: 'array',
                items: { type: 'number' },
                minItems: 2,
                maxItems: 3,
                description: '现代报数扩展法：number_pair 传 2 个数字，number_triplet 传 3 个数字。',
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
                description: '输出细节级别：default=主线结论；full=补充更多方法与克应说明。',
                default: 'default',
            },
        },
        required: ['question', 'date'],
        allOf: [
            {
                if: {
                    properties: {
                        method: { const: 'count_with_time' },
                    },
                    required: ['method'],
                },
                then: {
                    required: ['count', 'countCategory'],
                },
            },
            {
                if: {
                    properties: {
                        method: { const: 'text_split' },
                    },
                    required: ['method'],
                },
                then: {
                    anyOf: [
                        {
                            properties: {
                                textSplitMode: { const: 'stroke' },
                            },
                            required: ['textSplitMode', 'leftStrokeCount', 'rightStrokeCount'],
                        },
                        {
                            properties: {
                                textSplitMode: { const: 'sentence_pair' },
                            },
                            required: ['textSplitMode'],
                            anyOf: [
                                { required: ['sentences'] },
                                { required: ['text'] },
                            ],
                        },
                        {
                            required: ['text'],
                        },
                    ],
                },
            },
            {
                if: {
                    properties: {
                        method: { const: 'measure' },
                    },
                    required: ['method'],
                },
                then: {
                    required: ['measureKind', 'majorValue', 'minorValue'],
                },
            },
            {
                if: {
                    properties: {
                        method: { const: 'classifier_pair' },
                    },
                    required: ['method'],
                },
                then: {
                    required: ['upperCue', 'lowerCue'],
                },
            },
            {
                if: {
                    properties: {
                        method: { const: 'select' },
                    },
                    required: ['method'],
                },
                then: {
                    required: ['movingLine'],
                    anyOf: [
                        { required: ['hexagramName'] },
                        { required: ['upperTrigram', 'lowerTrigram'] },
                    ],
                },
            },
            {
                if: {
                    properties: {
                        method: { const: 'number_pair' },
                    },
                    required: ['method'],
                },
                then: {
                    required: ['numbers'],
                    properties: {
                        numbers: {
                            type: 'array',
                            items: { type: 'number' },
                            minItems: 2,
                            maxItems: 2,
                        },
                    },
                },
            },
            {
                if: {
                    properties: {
                        method: { const: 'number_triplet' },
                    },
                    required: ['method'],
                },
                then: {
                    required: ['numbers'],
                    properties: {
                        numbers: {
                            type: 'array',
                            items: { type: 'number' },
                            minItems: 3,
                            maxItems: 3,
                        },
                    },
                },
            },
        ],
        examples: [
            { question: '这次合作能否谈成？', method: 'time', date: '2026-04-04T10:30:00' },
            { question: '丢失物品能否找回？', method: 'count_with_time', count: 7, countCategory: 'item', date: '2026-04-04T10:30:00' },
            { question: '这件事进展如何？', method: 'measure', measureKind: '丈尺', majorValue: 2, minorValue: 3, date: '2026-04-04T10:30:00' },
            { question: '此事后续如何？', method: 'number_pair', numbers: [3, 8], date: '2026-04-04T10:30:00' },
        ],
    },
    outputSchema: {
        type: 'object',
        properties: {
            question: { type: 'string', description: '问题' },
            movingLine: { type: 'number', description: '动爻' },
            warnings: { type: 'array', items: { type: 'string' }, description: '提示信息' },
        },
    },
    annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
    },
};
