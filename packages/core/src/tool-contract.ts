/**
 * Tool contract — 单个工具的统一装配契约
 * 内部统一以 contract 语义表达“定义 + 执行器 + 渲染器 + schema”。
 */

import type { ToolDefinition } from './tool-schema.js';

export type RenderOptions = {
  detailLevel?: 'default' | 'more' | 'full' | 'safe' | 'facts' | 'debug';
};

export interface ToolContract<TInput = unknown, TOutput = unknown> {
  definition: ToolDefinition;
  execute: (input: TInput) => TOutput | Promise<TOutput>;
  renderText: (result: TOutput, options?: RenderOptions) => string;
  renderJSON: (result: TOutput, options?: RenderOptions) => unknown;
  canonicalOutputSchema?: { type: 'object'; properties: Record<string, unknown>; };
  debugRenderText?: (result: TOutput, options?: RenderOptions) => string;
  debugRenderJSON?: (result: TOutput, options?: RenderOptions) => unknown;
  mergeRuntimeExtras?: (canonicalJSON: unknown, rawResult: unknown) => unknown;
}

type DetailLevelRenderer<TOutput, TResult> = (
  result: TOutput,
  options?: { detailLevel?: RenderOptions['detailLevel']; },
) => TResult;

function bindDetailLevelRenderer<TOutput, TResult>(
  renderer: DetailLevelRenderer<TOutput, TResult>,
): (result: TOutput, options?: RenderOptions) => TResult {
  return (result, options) => renderer(
    result,
    options?.detailLevel === undefined ? undefined : { detailLevel: options.detailLevel },
  );
}

export function defineToolContract<TInput, TOutput>(
  contract: ToolContract<TInput, TOutput>,
): ToolContract<TInput, TOutput> {
  return contract;
}

export function defineCanonicalToolContract<TInput, TOutput>(
  contract: Omit<ToolContract<TInput, TOutput>, 'renderText' | 'renderJSON'> & {
    renderText: DetailLevelRenderer<TOutput, string>;
    renderJSON: DetailLevelRenderer<TOutput, unknown>;
  },
): ToolContract<TInput, TOutput> {
  return defineToolContract({
    ...contract,
    renderText: bindDetailLevelRenderer(contract.renderText),
    renderJSON: bindDetailLevelRenderer(contract.renderJSON),
  });
}

export function mergePlaceResolutionInfo(canonicalJSON: unknown, rawResult: unknown): unknown {
  if (typeof canonicalJSON !== 'object' || canonicalJSON === null) return canonicalJSON;
  if (typeof rawResult !== 'object' || rawResult === null) return canonicalJSON;
  if (!('placeResolutionInfo' in rawResult)) return canonicalJSON;
  return {
    ...canonicalJSON,
    placeResolutionInfo: (rawResult as { placeResolutionInfo?: unknown; }).placeResolutionInfo,
  };
}
