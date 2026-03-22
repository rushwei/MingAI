import type { BaziPillarsResolveOutput, BaziOutput, DayunOutput, FortuneOutput, LiuyaoOutput, QimenOutput, TarotOutput, ZiweiFlyingStarOutput, ZiweiHoroscopeOutput, ZiweiOutput } from './types.js';
import type { DaliurenOutput } from './daliuren/types.js';
export type BaziCanonicalTextOptions = {
    name?: string;
    dayun?: DayunOutput;
};
export type TarotCanonicalTextOptions = {
    birthDate?: string | null;
};
export declare function sortZiweiPalaces<T extends {
    name: string;
    index?: number;
}>(palaces: T[]): T[];
export declare function renderBaziCanonicalText(result: BaziOutput, options?: BaziCanonicalTextOptions): string;
export declare function renderBaziPillarsResolveCanonicalText(result: BaziPillarsResolveOutput): string;
export type ZiweiCanonicalTextOptions = {
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
export declare function renderZiweiCanonicalText(result: ZiweiOutput, options?: ZiweiCanonicalTextOptions): string;
export declare function renderZiweiHoroscopeCanonicalText(result: ZiweiHoroscopeOutput): string;
export declare function renderZiweiFlyingStarCanonicalText(result: ZiweiFlyingStarOutput): string;
export declare function renderLiuyaoCanonicalText(result: LiuyaoOutput): string;
export declare function renderTarotCanonicalText(result: TarotOutput, options?: TarotCanonicalTextOptions): string;
export declare function renderQimenCanonicalText(result: QimenOutput): string;
export declare function renderDaliurenCanonicalText(result: DaliurenOutput): string;
export declare function renderFortuneCanonicalText(result: FortuneOutput): string;
export declare function renderDayunCanonicalText(result: DayunOutput): string;
//# sourceMappingURL=text.d.ts.map