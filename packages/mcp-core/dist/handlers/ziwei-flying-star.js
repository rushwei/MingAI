/**
 * 紫微斗数飞星分析处理器
 */
import { createAstrolabeWithTrueSolar, MUTAGEN_NAMES } from './ziwei-shared.js';
function processQuery(astrolabe, query, idx) {
    switch (query.type) {
        case 'fliesTo': {
            const palace = astrolabe.palace(query.from);
            if (!palace)
                throw new Error(`宫位 "${query.from}" 不存在`);
            const mutagens = (query.mutagens || []);
            const result = palace.fliesTo(query.to, mutagens);
            return { queryIndex: idx, type: 'fliesTo', result };
        }
        case 'selfMutaged': {
            const palace = astrolabe.palace(query.palace);
            if (!palace)
                throw new Error(`宫位 "${query.palace}" 不存在`);
            const mutagens = (query.mutagens || MUTAGEN_NAMES);
            const result = palace.selfMutaged(mutagens);
            return { queryIndex: idx, type: 'selfMutaged', result };
        }
        case 'mutagedPlaces': {
            const palace = astrolabe.palace(query.palace);
            if (!palace)
                throw new Error(`宫位 "${query.palace}" 不存在`);
            const places = palace.mutagedPlaces();
            const result = MUTAGEN_NAMES.map((m, i) => ({
                mutagen: m,
                targetPalace: places[i]?.name ?? null,
            }));
            return { queryIndex: idx, type: 'mutagedPlaces', result };
        }
        case 'surroundedPalaces': {
            const surrounded = astrolabe.surroundedPalaces(query.palace);
            if (!surrounded)
                throw new Error(`宫位 "${query.palace}" 不存在`);
            const result = {
                target: { name: surrounded.target.name, index: surrounded.target.index },
                opposite: { name: surrounded.opposite.name, index: surrounded.opposite.index },
                wealth: { name: surrounded.wealth.name, index: surrounded.wealth.index },
                career: { name: surrounded.career.name, index: surrounded.career.index },
            };
            return { queryIndex: idx, type: 'surroundedPalaces', result };
        }
        default:
            throw new Error(`未知查询类型: ${query.type}`);
    }
}
export async function handleZiweiFlyingStar(input) {
    if (!input.queries || !Array.isArray(input.queries) || input.queries.length === 0) {
        throw new Error('queries 不能为空');
    }
    const { astrolabe } = createAstrolabeWithTrueSolar(input);
    const results = input.queries.map((q, i) => processQuery(astrolabe, q, i));
    return { results };
}
