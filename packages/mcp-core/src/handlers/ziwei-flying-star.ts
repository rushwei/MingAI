/**
 * 紫微斗数飞星分析处理器
 */

import type { Mutagen } from 'iztro';
import type {
  ZiweiFlyingStarInput,
  ZiweiFlyingStarOutput,
  FlyingStarQuery,
  FlyingStarResult,
  MutagedPlaceInfo,
  SurroundedPalaceInfo,
} from '../types.js';
import { createAstrolabe, MUTAGEN_NAMES } from './ziwei-shared.js';

const MUTAGEN_ORDER = MUTAGEN_NAMES;

function processQuery(
  astrolabe: ReturnType<typeof createAstrolabe>,
  query: FlyingStarQuery,
  idx: number,
): FlyingStarResult {
  switch (query.type) {
    case 'fliesTo': {
      const palace = astrolabe.palace(query.from);
      if (!palace) throw new Error(`宫位 "${query.from}" 不存在`);
      const mutagens = (query.mutagens || []) as Mutagen[];
      const result = palace.fliesTo(query.to, mutagens);
      return { queryIndex: idx, type: 'fliesTo', result };
    }
    case 'selfMutaged': {
      const palace = astrolabe.palace(query.palace);
      if (!palace) throw new Error(`宫位 "${query.palace}" 不存在`);
      const mutagens = (query.mutagens || MUTAGEN_ORDER) as Mutagen[];
      const result = palace.selfMutaged(mutagens);
      return { queryIndex: idx, type: 'selfMutaged', result };
    }
    case 'mutagedPlaces': {
      const palace = astrolabe.palace(query.palace);
      if (!palace) throw new Error(`宫位 "${query.palace}" 不存在`);
      const places = palace.mutagedPlaces();
      const result: MutagedPlaceInfo[] = MUTAGEN_ORDER.map((m, i) => ({
        mutagen: m,
        targetPalace: places[i]?.name ?? null,
      }));
      return { queryIndex: idx, type: 'mutagedPlaces', result };
    }
    case 'surroundedPalaces': {
      const surrounded = astrolabe.surroundedPalaces(query.palace);
      if (!surrounded) throw new Error(`宫位 "${query.palace}" 不存在`);
      const result: SurroundedPalaceInfo = {
        target: { name: surrounded.target.name, index: surrounded.target.index },
        opposite: { name: surrounded.opposite.name, index: surrounded.opposite.index },
        wealth: { name: surrounded.wealth.name, index: surrounded.wealth.index },
        career: { name: surrounded.career.name, index: surrounded.career.index },
      };
      return { queryIndex: idx, type: 'surroundedPalaces', result };
    }
    default:
      throw new Error(`未知查询类型: ${(query as { type: string }).type}`);
  }
}

export async function handleZiweiFlyingStar(input: ZiweiFlyingStarInput): Promise<ZiweiFlyingStarOutput> {
  if (!input.queries || !Array.isArray(input.queries) || input.queries.length === 0) {
    throw new Error('queries 不能为空');
  }

  const astrolabe = createAstrolabe(input);
  const results = input.queries.map((q, i) => processQuery(astrolabe, q, i));

  return { results };
}
