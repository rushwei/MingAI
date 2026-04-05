/**
 * 文本渲染契约层
 *
 * 这里只保留 text renderer 选项类型与统一出口，
 * 不再承载任何具体术数实现。
 */
import type { DayunOutput, DetailLevel } from '../../types.js';
export type BaziCanonicalTextOptions = {
    name?: string;
    dayun?: DayunOutput;
    detailLevel?: DetailLevel | 'more' | 'safe' | 'facts' | 'debug';
};
export type DayunCanonicalTextOptions = {
    detailLevel?: DetailLevel | 'more' | 'safe' | 'facts' | 'debug';
};
export type TarotCanonicalTextOptions = {
    birthDate?: string | null;
    detailLevel?: DetailLevel | 'safe' | 'facts' | 'debug';
};
export type ZiweiCanonicalTextOptions = {
    detailLevel?: DetailLevel | 'safe' | 'facts' | 'debug';
    horoscope?: {
        decadal: {
            palaceName: string;
            ageRange: string;
        };
        yearly: {
            palaceName: string;
            period: string;
        };
        monthly: {
            palaceName: string;
            period: string;
        };
        daily: {
            palaceName: string;
            period: string;
        };
    };
};
export type QimenCanonicalTextOptions = {
    detailLevel?: DetailLevel | 'safe' | 'facts' | 'debug';
};
export type DaliurenCanonicalTextOptions = {
    detailLevel?: DetailLevel | 'safe' | 'facts' | 'debug';
};
export type ZiweiHoroscopeCanonicalTextOptions = {
    detailLevel?: DetailLevel | 'safe' | 'facts' | 'debug';
};
export type FortuneCanonicalTextOptions = {
    detailLevel?: DetailLevel | 'safe' | 'facts' | 'debug';
};
export type MeihuaCanonicalTextOptions = {
    detailLevel?: DetailLevel | 'safe' | 'facts' | 'debug';
};
//# sourceMappingURL=text-options.d.ts.map