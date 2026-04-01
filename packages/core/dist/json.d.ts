/**
 * CanonicalJSON 渲染层
 * 与 text.ts 的 render*CanonicalText() 平行，输出结构化 JSON 对象。
 */
import type { BaziOutput, BaziPillarsResolveOutput, DetailLevel, DayunOutput, FortuneOutput, LiuyaoOutput, QimenOutput, TarotOutput, ZiweiFlyingStarOutput, ZiweiHoroscopeOutput, ZiweiOutput } from './types.js';
import type { DaliurenOutput } from './daliuren/types.js';
import type { BaziCanonicalJSON, BaziPillarsResolveCanonicalJSON, DaliurenCanonicalJSON, DayunCanonicalJSON, FortuneCanonicalJSON, LiuyaoAISafeJSON, LiuyaoCanonicalJSON, QimenCanonicalJSON, TarotCanonicalJSON, ZiweiCanonicalJSON, ZiweiFlyingStarCanonicalJSON, ZiweiHoroscopeCanonicalJSON } from './json-types.js';
import type { BaziCanonicalTextOptions, DaliurenCanonicalTextOptions, QimenCanonicalTextOptions, TarotCanonicalTextOptions, ZiweiCanonicalTextOptions, ZiweiHoroscopeCanonicalTextOptions } from './text.js';
export type * from './json-types.js';
export declare function renderBaziCanonicalJSON(chart: BaziOutput, options?: BaziCanonicalTextOptions): BaziCanonicalJSON;
export declare function renderLiuyaoCanonicalJSON(result: LiuyaoOutput): LiuyaoCanonicalJSON;
export declare function renderLiuyaoAISafeJSON(result: LiuyaoOutput, options?: {
    detailLevel?: DetailLevel | 'safe' | 'facts' | 'debug';
}): LiuyaoAISafeJSON;
export declare function renderTarotCanonicalJSON(result: TarotOutput, options?: TarotCanonicalTextOptions): TarotCanonicalJSON;
export declare function renderZiweiCanonicalJSON(result: ZiweiOutput, options?: ZiweiCanonicalTextOptions): ZiweiCanonicalJSON;
export declare function renderQimenCanonicalJSON(result: QimenOutput, options?: {
    detailLevel?: QimenCanonicalTextOptions['detailLevel'];
}): QimenCanonicalJSON;
export declare function renderDaliurenCanonicalJSON(result: DaliurenOutput, options?: {
    detailLevel?: DaliurenCanonicalTextOptions['detailLevel'];
}): DaliurenCanonicalJSON;
export declare function renderFortuneCanonicalJSON(result: FortuneOutput): FortuneCanonicalJSON;
export declare function renderDayunCanonicalJSON(result: DayunOutput, options?: {
    detailLevel?: BaziCanonicalTextOptions['detailLevel'];
}): DayunCanonicalJSON;
export declare function renderBaziPillarsResolveCanonicalJSON(result: BaziPillarsResolveOutput): BaziPillarsResolveCanonicalJSON;
export declare function renderZiweiHoroscopeCanonicalJSON(result: ZiweiHoroscopeOutput, options?: {
    detailLevel?: ZiweiHoroscopeCanonicalTextOptions['detailLevel'];
}): ZiweiHoroscopeCanonicalJSON;
export declare function renderZiweiFlyingStarCanonicalJSON(result: ZiweiFlyingStarOutput): ZiweiFlyingStarCanonicalJSON;
//# sourceMappingURL=json.d.ts.map