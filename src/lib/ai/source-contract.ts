/**
 * 兼容 re-export
 *
 * 统一实现已合并到 source-contracts.ts，此文件仅保留导出以避免破坏现有消费者。
 * 新代码应直接从 '@/lib/source-contracts' 导入。
 */
export {
  ANALYSIS_SOURCE_TYPES,
  type AnalysisSourceType,
  type CommonAnalysisSourceData,
  type AnalysisSourceDataMap,
  type AnalysisSourceData,
  isAnalysisSourceType,
  normalizeAnalysisSourceType,
  normalizeAnalysisSourceData,
  getSourceDataQuestion,
  getSourceDataModelId,
  getSourceDataReasoning,
} from '@/lib/source-contracts';
