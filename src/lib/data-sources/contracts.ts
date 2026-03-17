export const DATA_SOURCE_TYPES = [
    'bazi_chart',
    'ziwei_chart',
    'tarot_reading',
    'liuyao_divination',
    'mbti_reading',
    'hepan_chart',
    'face_reading',
    'palm_reading',
    'ming_record',
    'daily_fortune',
    'monthly_fortune',
    'qimen_chart',
    'daliuren_divination',
] as const;

export type DataSourceType = typeof DATA_SOURCE_TYPES[number];
