import type { BaziPillarsResolveOutput, BaziOutput, DetailLevel, DayunOutput, FortuneOutput, LiuyaoOutput, QimenOutput, TarotOutput, ZiweiFlyingStarOutput, ZiweiHoroscopeOutput, ZiweiOutput } from './types.js';
import type { DaliurenOutput } from './daliuren/types.js';
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
export declare function sortZiweiPalaces<T extends {
    name: string;
    index?: number;
}>(palaces: T[]): T[];
export declare function renderBaziCanonicalText(chart: BaziOutput, options?: BaziCanonicalTextOptions): string;
export declare function renderBaziPillarsResolveCanonicalText(result: BaziPillarsResolveOutput): string;
export declare function renderZiweiCanonicalText(result: ZiweiOutput, options?: ZiweiCanonicalTextOptions): string;
export declare function renderZiweiHoroscopeCanonicalText(result: ZiweiHoroscopeOutput): string;
export declare function renderZiweiFlyingStarCanonicalText(result: ZiweiFlyingStarOutput): string;
export declare function renderLiuyaoCanonicalText(result: LiuyaoOutput): string;
export declare function renderLiuyaoAISafeText(result: LiuyaoOutput): string;
export declare function renderLiuyaoLevelText(result: LiuyaoOutput, options?: {
    detailLevel?: 'default' | 'more' | 'full' | 'safe' | 'facts' | 'debug';
}): string;
export declare function renderTarotCanonicalText(result: TarotOutput, options?: TarotCanonicalTextOptions): string;
export declare function renderQimenCanonicalText(result: QimenOutput, options?: QimenCanonicalTextOptions): string;
export declare function renderDaliurenCanonicalText(result: DaliurenOutput, options?: DaliurenCanonicalTextOptions): string;
export declare function renderFortuneCanonicalText(result: FortuneOutput): string;
export declare function renderDayunCanonicalText(result: DayunOutput, options?: DayunCanonicalTextOptions): string;
//# sourceMappingURL=text.d.ts.map