/**
 * 六十四卦文本 fallback（与 MCP 公共数据同源）
 *
 * 说明：
 * - 该文件仅做命名桥接，供 Web 侧既有调用使用。
 * - 实际数据源位于 packages/core/src/hexagram-texts.ts。
 */

export {
    GUA_CI as HEXAGRAM_GUA_CI_FALLBACK,
    XIANG_CI as HEXAGRAM_XIANG_CI_FALLBACK,
    YAO_CI as HEXAGRAM_YAO_CI_FALLBACK,
} from '../../../packages/core/src/hexagram-texts';
