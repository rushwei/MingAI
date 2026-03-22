/**
 * CanonicalJSON 渲染层
 * 与 text.ts 的 render*CanonicalText() 平行，输出结构化 JSON 对象。
 */
import type { BaziOutput, BaziPillarsResolveOutput, DayunOutput, FortuneOutput, LiuyaoOutput, QimenOutput, TarotOutput, ZiweiFlyingStarOutput, ZiweiHoroscopeOutput, ZiweiOutput } from './types.js';
import type { DaliurenOutput } from './daliuren/types.js';
import type { BaziCanonicalJSON, BaziPillarsResolveCanonicalJSON, DaliurenCanonicalJSON, DayunCanonicalJSON, FortuneCanonicalJSON, LiuyaoCanonicalJSON, QimenCanonicalJSON, TarotCanonicalJSON, ZiweiCanonicalJSON, ZiweiFlyingStarCanonicalJSON, ZiweiHoroscopeCanonicalJSON } from './json-types.js';
import type { BaziCanonicalTextOptions, TarotCanonicalTextOptions, ZiweiCanonicalTextOptions } from './text.js';
export type * from './json-types.js';
export declare function renderBaziCanonicalJSON(result: BaziOutput, options?: BaziCanonicalTextOptions): BaziCanonicalJSON;
export declare function renderLiuyaoCanonicalJSON(result: LiuyaoOutput): LiuyaoCanonicalJSON;
export declare function renderTarotCanonicalJSON(result: TarotOutput, options?: TarotCanonicalTextOptions): TarotCanonicalJSON;
export declare function renderZiweiCanonicalJSON(result: ZiweiOutput, options?: ZiweiCanonicalTextOptions): ZiweiCanonicalJSON;
export declare function renderQimenCanonicalJSON(result: QimenOutput): QimenCanonicalJSON;
export declare function renderDaliurenCanonicalJSON(result: DaliurenOutput): DaliurenCanonicalJSON;
export declare function renderFortuneCanonicalJSON(result: FortuneOutput): FortuneCanonicalJSON;
export declare function renderDayunCanonicalJSON(result: DayunOutput): DayunCanonicalJSON;
export declare function renderBaziPillarsResolveCanonicalJSON(result: BaziPillarsResolveOutput): BaziPillarsResolveCanonicalJSON;
export declare function renderZiweiHoroscopeCanonicalJSON(result: ZiweiHoroscopeOutput): ZiweiHoroscopeCanonicalJSON;
export declare function renderZiweiFlyingStarCanonicalJSON(result: ZiweiFlyingStarOutput): ZiweiFlyingStarCanonicalJSON;
//# sourceMappingURL=json.d.ts.map