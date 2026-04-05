import type { LiuyaoAISafeJSON, LiuyaoCanonicalJSON } from '../../json-types.js';
import type { DetailLevel, LiuyaoOutput } from '../../types.js';
export declare function renderLiuyaoCanonicalJSON(result: LiuyaoOutput): LiuyaoCanonicalJSON;
export declare function renderLiuyaoAISafeJSON(result: LiuyaoOutput, options?: {
    detailLevel?: DetailLevel | 'safe' | 'facts' | 'debug';
}): LiuyaoAISafeJSON;
//# sourceMappingURL=json.d.ts.map