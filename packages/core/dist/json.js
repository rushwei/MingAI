/**
 * CanonicalJSON 渲染层
 * 与 text.ts 的 render*CanonicalText() 平行，输出结构化 JSON 对象。
 */
import { sortZiweiPalaces } from './text.js';
import { formatGuaLevelLines, KONG_WANG_LABELS, sortYaosDescending, traditionalYaoName, WANG_SHUAI_LABELS, YONG_SHEN_STATUS_LABELS, } from './liuyao-core.js';
import { GAN_WUXING } from './utils.js';
// ===== 内部工具函数 =====
function buildTrueSolarTimeJSON(info) {
    return {
        clockTime: info.clockTime,
        trueSolarTime: info.trueSolarTime,
        longitude: info.longitude,
        correctionMinutes: info.correctionMinutes,
    };
}
function buildStarJSON(star) {
    const result = { name: star.name };
    if (star.brightness)
        result.brightness = star.brightness;
    if (star.mutagen)
        result.mutagen = star.mutagen;
    if (star.selfMutagen)
        result.selfMutagen = star.selfMutagen;
    if (star.oppositeMutagen)
        result.oppositeMutagen = star.oppositeMutagen;
    return result;
}
function buildShenSystemMap(systems) {
    return new Map(systems.map((system) => [system.targetLiuQin, system]));
}
function buildShenSystemJSON(system) {
    if (!system)
        return undefined;
    const result = {};
    if (system.yuanShen)
        result.yuanShen = `${system.yuanShen.liuQin}（${system.yuanShen.wuXing}）`;
    if (system.jiShen)
        result.jiShen = `${system.jiShen.liuQin}（${system.jiShen.wuXing}）`;
    if (system.chouShen)
        result.chouShen = `${system.chouShen.liuQin}（${system.chouShen.wuXing}）`;
    return Object.keys(result).length > 0 ? result : undefined;
}
function buildHiddenStemJSON(item) {
    return {
        stem: item.stem,
        tenGod: item.tenGod,
        ...(item.qiType ? { qiType: item.qiType } : {}),
    };
}
function buildBranchRelationJSON(item) {
    return {
        type: item.type,
        branches: [...item.branches],
        description: item.description,
    };
}
function buildLiunianItemJSON(item) {
    return {
        year: item.year,
        age: item.age,
        ganZhi: item.ganZhi,
        gan: item.gan,
        zhi: item.zhi,
        tenGod: item.tenGod || '-',
        ...(item.nayin ? { nayin: item.nayin } : {}),
        hiddenStems: item.hiddenStems?.length
            ? item.hiddenStems.map(buildHiddenStemJSON)
            : [],
        ...(item.diShi ? { diShi: item.diShi } : {}),
        ...(item.shenSha?.length ? { shenSha: [...item.shenSha] } : {}),
        ...(item.branchRelations?.length ? { branchRelations: item.branchRelations.map(buildBranchRelationJSON) } : {}),
        ...(item.taiSui?.length ? { taiSui: [...item.taiSui] } : {}),
    };
}
function buildLeanHiddenStemItems(items) {
    return items?.map((item) => ({ stem: item.stem, tenGod: item.tenGod })) || [];
}
function buildDayunItemJSON(item) {
    return {
        startYear: item.startYear,
        ...(typeof item.startAge === 'number' ? { startAge: item.startAge } : {}),
        ganZhi: item.ganZhi,
        ...(item.stem ? { stem: item.stem } : {}),
        ...(item.branch ? { branch: item.branch } : {}),
        tenGod: item.tenGod || '-',
        ...(item.branchTenGod ? { branchTenGod: item.branchTenGod } : {}),
        hiddenStems: item.hiddenStems?.length
            ? item.hiddenStems.map(buildHiddenStemJSON)
            : [],
        ...(item.diShi ? { diShi: item.diShi } : {}),
        ...(item.naYin ? { naYin: item.naYin } : {}),
        ...(item.shenSha?.length ? { shenSha: [...item.shenSha] } : {}),
        ...(item.branchRelations?.length ? { branchRelations: item.branchRelations.map(buildBranchRelationJSON) } : {}),
        ...(item.liunianList?.length ? { liunianList: item.liunianList.map(buildLiunianItemJSON) } : {}),
    };
}
function buildBaziCanonicalPillarShenSha(item) {
    return item.shenSha?.length ? [...item.shenSha] : [];
}
function normalizeDetailLevel(detailLevel) {
    if (detailLevel === 'more' || detailLevel === 'facts')
        return 'more';
    if (detailLevel === 'full' || detailLevel === 'debug')
        return 'full';
    return 'default';
}
function normalizeBaziDetailLevel(detailLevel) {
    if (detailLevel === 'full' || detailLevel === 'more' || detailLevel === 'facts' || detailLevel === 'debug') {
        return 'full';
    }
    return 'default';
}
function mapLiuyaoRelationLabel(label) {
    if (!label)
        return undefined;
    return label === '平' ? undefined : label;
}
function buildLiuyaoPositionLabel(position, fullYaos) {
    if (!position)
        return undefined;
    const attached = fullYaos.find((yao) => yao.position === position);
    return attached ? `${traditionalYaoName(position, attached.type)}爻` : `${position}爻`;
}
function buildLiuyaoInteractionSources(result) {
    const participants = [];
    for (const yao of result.fullYaos || []) {
        if (yao.isChanging) {
            participants.push({
                source: '动爻',
                branch: yao.naJia,
                position: buildLiuyaoPositionLabel(yao.position, result.fullYaos),
            });
        }
        if (yao.changedYao) {
            participants.push({
                source: '变爻',
                branch: yao.changedYao.naJia,
                position: buildLiuyaoPositionLabel(yao.position, result.fullYaos),
            });
        }
    }
    participants.push({ source: '月建', branch: result.ganZhiTime.month.zhi });
    participants.push({ source: '日建', branch: result.ganZhiTime.day.zhi });
    return participants;
}
function buildBanHeParticipants(branches, sources) {
    const priority = {
        变爻: 0,
        动爻: 1,
        月建: 2,
        日建: 3,
    };
    return branches.map((branch) => {
        const matches = sources.filter((source) => source.branch === branch);
        matches.sort((left, right) => priority[left.source] - priority[right.source]);
        return matches[0] || { source: '日建', branch };
    });
}
function buildLiuyaoAISafeBoardLines(result, detailLevel) {
    return sortYaosDescending(result.fullYaos || []).map((yao) => {
        const line = {
            position: traditionalYaoName(yao.position, yao.type),
            liuShen: yao.liuShen,
            ...(detailLevel !== 'default' && yao.shenSha?.length ? { shenSha: [...yao.shenSha] } : {}),
            mainLine: {
                liuQin: yao.liuQin,
                naJia: yao.naJia,
                wuXing: yao.wuXing,
                ...(detailLevel === 'full' ? { wangShuai: WANG_SHUAI_LABELS[yao.strength.wangShuai] } : {}),
            },
            ...(detailLevel === 'full' ? { movement: yao.movementLabel } : {}),
            ...(detailLevel === 'full' && yao.kongWangState && yao.kongWangState !== 'not_kong'
                ? { kongWang: KONG_WANG_LABELS[yao.kongWangState] || yao.kongWangState }
                : {}),
        };
        if (yao.fuShen) {
            line.fuShen = {
                liuQin: yao.fuShen.liuQin,
                naJia: yao.fuShen.naJia,
                wuXing: yao.fuShen.wuXing,
            };
        }
        if (yao.changedYao) {
            line.changedTo = {
                liuQin: yao.changedYao.liuQin,
                naJia: yao.changedYao.naJia,
                wuXing: yao.changedYao.wuXing,
            };
            if (detailLevel === 'full' && mapLiuyaoRelationLabel(yao.changedYao.relation)) {
                line.transformation = mapLiuyaoRelationLabel(yao.changedYao.relation);
            }
        }
        if (yao.isShiYao)
            line.shiYing = 'shi';
        else if (yao.isYingYao)
            line.shiYing = 'ying';
        return line;
    });
}
function buildBaziCanonicalRelations(result) {
    const posBranchMap = {
        '年支': result.fourPillars.year.branch,
        '月支': result.fourPillars.month.branch,
        '日支': result.fourPillars.day.branch,
        '时支': result.fourPillars.hour.branch,
    };
    const relationParts = [];
    const seen = new Set();
    const pushUnique = (value) => {
        if (!value || seen.has(value))
            return;
        seen.add(value);
        relationParts.push(value);
    };
    for (const relation of result.relations) {
        if (relation.type === '刑') {
            const branches = [...new Set(relation.pillars.map((pillar) => posBranchMap[pillar]))].join('');
            pushUnique(`${branches}刑（${relation.description}）`);
        }
        else {
            pushUnique(relation.description);
        }
    }
    for (const item of result.tianGanChongKe) {
        pushUnique(`${item.stemA}${item.stemB}冲克`);
    }
    for (const item of result.tianGanWuHe) {
        pushUnique(`${item.stemA}${item.stemB}合${item.resultElement}`);
    }
    for (const item of result.diZhiBanHe) {
        pushUnique(`${item.branches.join('')}半合${item.resultElement}`);
    }
    for (const item of result.diZhiSanHui) {
        pushUnique(`${item.branches.join('')}三会${item.resultElement}`);
    }
    return relationParts;
}
// ===== 八字 =====
export function renderBaziCanonicalJSON(chart, options = {}) {
    const detailLevel = normalizeBaziDetailLevel(options.detailLevel);
    const { dayun } = options;
    const basicInfo = {
        gender: chart.gender === 'male' ? '男' : '女',
        dayMaster: chart.dayMaster,
        ...(detailLevel === 'full' ? { dayMasterElement: `${chart.dayMaster}${GAN_WUXING[chart.dayMaster.charAt(0)] || ''}` } : {}),
    };
    if (detailLevel === 'full' && chart.kongWang?.kongZhi?.length)
        basicInfo.kongWang = [...chart.kongWang.kongZhi];
    if (chart.birthPlace)
        basicInfo.birthPlace = chart.birthPlace;
    if (chart.trueSolarTimeInfo)
        basicInfo.trueSolarTime = buildTrueSolarTimeJSON(chart.trueSolarTimeInfo);
    if (detailLevel === 'full' && chart.taiYuan)
        basicInfo.taiYuan = chart.taiYuan;
    if (detailLevel === 'full' && chart.mingGong)
        basicInfo.mingGong = chart.mingGong;
    const fourPillars = [
        ['年柱', chart.fourPillars.year],
        ['月柱', chart.fourPillars.month],
        ['日柱', chart.fourPillars.day],
        ['时柱', chart.fourPillars.hour],
    ].map(([label, pillar]) => {
        const entry = {
            pillar: label,
            ganZhi: `${pillar.stem}${pillar.branch}`,
            tenGod: pillar.tenGod || '-',
            hiddenStems: pillar.hiddenStems.map((item) => buildHiddenStemJSON({
                stem: item.stem,
                tenGod: item.tenGod || '-',
                ...(detailLevel === 'full' ? { qiType: item.qiType } : {}),
            })),
            diShi: pillar.diShi || '-',
            ...(detailLevel === 'full' && pillar.naYin ? { naYin: pillar.naYin } : {}),
            ...(detailLevel === 'full' && pillar.shenSha?.length ? { shenSha: buildBaziCanonicalPillarShenSha(pillar) } : {}),
        };
        if (pillar.kongWang?.isKong)
            entry.isKong = true;
        return entry;
    });
    const relations = buildBaziCanonicalRelations(chart);
    const json = { basicInfo, fourPillars, relations };
    if (dayun) {
        json.dayun = {
            startInfo: `${dayun.startAge}岁（${dayun.startAgeDetail}）`,
            list: dayun.list.map((item) => buildDayunItemJSON({
                startYear: item.startYear,
                startAge: item.startAge,
                ganZhi: item.ganZhi,
                stem: detailLevel === 'full' ? item.stem : undefined,
                branch: detailLevel === 'full' ? item.branch : undefined,
                tenGod: item.tenGod,
                branchTenGod: detailLevel === 'full' ? item.branchTenGod : undefined,
                hiddenStems: detailLevel === 'full' ? item.hiddenStems : buildLeanHiddenStemItems(item.hiddenStems),
                diShi: detailLevel === 'full' ? item.diShi : undefined,
                naYin: detailLevel === 'full' ? item.naYin : undefined,
                shenSha: detailLevel === 'full' ? item.shenSha : undefined,
                branchRelations: detailLevel === 'full' ? item.branchRelations : undefined,
                liunianList: detailLevel === 'full' ? item.liunianList : undefined,
            })),
        };
    }
    return json;
}
// ===== 六爻 =====
export function renderLiuyaoCanonicalJSON(result) {
    const hexagramInfo = {
        mainHexagram: {
            name: result.hexagramName,
            gong: result.hexagramGong,
            element: result.hexagramElement,
        },
    };
    if (result.question)
        hexagramInfo.question = result.question;
    if (result.guaCi)
        hexagramInfo.mainHexagram.guaCi = result.guaCi;
    if (result.xiangCi)
        hexagramInfo.mainHexagram.xiangCi = result.xiangCi;
    if (result.changedHexagramName) {
        const changed = {
            name: result.changedHexagramName,
        };
        if (result.changedHexagramGong)
            changed.gong = result.changedHexagramGong;
        if (result.changedHexagramElement)
            changed.element = result.changedHexagramElement;
        if (result.changedGuaCi)
            changed.guaCi = result.changedGuaCi;
        if (result.changedXiangCi)
            changed.xiangCi = result.changedXiangCi;
        const changingYaoCi = (result.fullYaos || [])
            .filter((item) => item.isChanging && item.yaoCi)
            .map((yao) => ({ yaoName: traditionalYaoName(yao.position, yao.type), yaoCi: yao.yaoCi }));
        if (changingYaoCi.length > 0)
            changed.changingYaoCi = changingYaoCi;
        hexagramInfo.changedHexagram = changed;
    }
    if (result.nuclearHexagram) {
        hexagramInfo.nuclearHexagram = {
            name: result.nuclearHexagram.name,
            guaCi: result.nuclearHexagram.guaCi,
            xiangCi: result.nuclearHexagram.xiangCi,
        };
    }
    if (result.oppositeHexagram) {
        hexagramInfo.oppositeHexagram = {
            name: result.oppositeHexagram.name,
            guaCi: result.oppositeHexagram.guaCi,
            xiangCi: result.oppositeHexagram.xiangCi,
        };
    }
    if (result.reversedHexagram) {
        hexagramInfo.reversedHexagram = {
            name: result.reversedHexagram.name,
            guaCi: result.reversedHexagram.guaCi,
            xiangCi: result.reversedHexagram.xiangCi,
        };
    }
    if (result.guaShen) {
        const guaShenYao = (result.fullYaos || []).find((y) => y.position === result.guaShen.linePosition);
        const posLabel = typeof result.guaShen.linePosition === 'number'
            ? (guaShenYao ? `${traditionalYaoName(result.guaShen.linePosition, guaShenYao.type)}爻` : `${result.guaShen.linePosition}爻`)
            : undefined;
        hexagramInfo.guaShen = {
            branch: result.guaShen.branch,
        };
        if (posLabel)
            hexagramInfo.guaShen.position = posLabel;
    }
    // 干支时间
    const gz = result.ganZhiTime;
    const ganZhiTime = [
        { pillar: '年', ganZhi: `${gz.year.gan}${gz.year.zhi}`, kongWang: [...result.kongWangByPillar.year.kongDizhi] },
        { pillar: '月', ganZhi: `${gz.month.gan}${gz.month.zhi}`, kongWang: [...result.kongWangByPillar.month.kongDizhi] },
        { pillar: '日', ganZhi: `${gz.day.gan}${gz.day.zhi}`, kongWang: [...result.kongWang.kongDizhi] },
        { pillar: '时', ganZhi: `${gz.hour.gan}${gz.hour.zhi}`, kongWang: [...result.kongWangByPillar.hour.kongDizhi] },
    ];
    // 六爻
    const sortedYaos = sortYaosDescending(result.fullYaos || []);
    const globalShenShaSet = new Set(result.globalShenSha || []);
    const yaos = sortedYaos.map((yao) => {
        const yaoJSON = {
            position: traditionalYaoName(yao.position, yao.type),
            liuQin: yao.liuQin,
            liuShen: yao.liuShen,
            naJia: yao.naJia,
            wuXing: yao.wuXing,
            wangShuai: WANG_SHUAI_LABELS[yao.strength.wangShuai],
            movementState: yao.movementState,
            movementLabel: yao.movementLabel,
        };
        if (yao.isShiYao)
            yaoJSON.shiYing = '世';
        else if (yao.isYingYao)
            yaoJSON.shiYing = '应';
        if (yao.kongWangState && yao.kongWangState !== 'not_kong') {
            const kl = KONG_WANG_LABELS[yao.kongWangState];
            if (kl)
                yaoJSON.kongWang = kl;
        }
        if (yao.changSheng?.stage)
            yaoJSON.changSheng = yao.changSheng.stage;
        const localShenSha = yao.shenSha?.filter((s) => !globalShenShaSet.has(s)) || [];
        if (localShenSha.length > 0)
            yaoJSON.shenSha = localShenSha;
        if (yao.isChanging && yao.changedYao) {
            yaoJSON.changedYao = {
                liuQin: yao.changedYao.liuQin,
                naJia: yao.changedYao.naJia,
                wuXing: yao.changedYao.wuXing,
                relation: yao.changedYao.relation,
            };
        }
        if (yao.fuShen) {
            yaoJSON.fuShen = {
                liuQin: yao.fuShen.liuQin,
                naJia: yao.fuShen.naJia,
                wuXing: yao.fuShen.wuXing,
                relation: yao.fuShen.relation,
            };
        }
        return yaoJSON;
    });
    // 用神分析
    const yaoNameMap = new Map();
    for (const yao of sortedYaos)
        yaoNameMap.set(yao.position, traditionalYaoName(yao.position, yao.type));
    const posLabel = (pos) => (pos ? `${yaoNameMap.get(pos) || pos}爻` : undefined);
    const shenSystemMap = buildShenSystemMap(result.shenSystemByYongShen || []);
    const timeRecMap = new Map();
    for (const item of result.timeRecommendations || []) {
        const list = timeRecMap.get(item.targetLiuQin) || [];
        list.push(item);
        timeRecMap.set(item.targetLiuQin, list);
    }
    const yongShenAnalysis = result.yongShen.map((group) => {
        const selected = group.selected;
        const entry = {
            targetLiuQin: group.targetLiuQin,
            selectionStatus: YONG_SHEN_STATUS_LABELS[group.selectionStatus] || group.selectionStatus,
            selected: {
                liuQin: selected.liuQin,
                strengthLabel: selected.strengthLabel,
                movementLabel: selected.movementLabel,
            },
        };
        const selectedPos = posLabel(selected.position);
        if (selectedPos)
            entry.selected.position = selectedPos;
        if (selected.naJia)
            entry.selected.naJia = selected.naJia;
        if (selected.changedNaJia)
            entry.selected.changedNaJia = selected.changedNaJia;
        if (selected.huaType)
            entry.selected.huaType = selected.huaType;
        if (selected.element)
            entry.selected.element = selected.element;
        if (selected.source)
            entry.selected.source = selected.source;
        if (selected.movementState)
            entry.selected.movementState = selected.movementState;
        if (selected.isShiYao)
            entry.selected.isShiYao = true;
        if (selected.isYingYao)
            entry.selected.isYingYao = true;
        if (selected.kongWangState)
            entry.selected.kongWangState = selected.kongWangState;
        if (selected.evidence?.length)
            entry.selected.evidence = selected.evidence;
        if (group.selectionNote && group.selectionStatus !== 'resolved') {
            entry.selectionNote = group.selectionNote;
        }
        if (group.candidates?.length) {
            entry.candidates = group.candidates.map((candidate) => {
                const c = { liuQin: candidate.liuQin };
                const cPos = posLabel(candidate.position);
                if (cPos)
                    c.position = cPos;
                if (candidate.naJia)
                    c.naJia = candidate.naJia;
                if (candidate.changedNaJia)
                    c.changedNaJia = candidate.changedNaJia;
                if (candidate.huaType)
                    c.huaType = candidate.huaType;
                if (candidate.element)
                    c.element = candidate.element;
                if (candidate.source)
                    c.source = candidate.source;
                if (candidate.movementState)
                    c.movementState = candidate.movementState;
                if (candidate.isShiYao)
                    c.isShiYao = true;
                if (candidate.isYingYao)
                    c.isYingYao = true;
                if (candidate.kongWangState)
                    c.kongWangState = candidate.kongWangState;
                if (candidate.evidence?.length)
                    c.evidence = candidate.evidence;
                return c;
            });
        }
        const shenSystem = buildShenSystemJSON(shenSystemMap.get(group.targetLiuQin));
        if (shenSystem)
            entry.shenSystem = shenSystem;
        const recs = timeRecMap.get(group.targetLiuQin);
        if (recs?.length) {
            entry.timeRecommendations = recs.map((item) => ({
                trigger: item.trigger,
                basis: item.basis || [],
                description: item.description,
            }));
        }
        return entry;
    });
    return {
        hexagramInfo,
        ganZhiTime,
        yaos,
        yongShenAnalysis,
        guaLevelAnalysis: formatGuaLevelLines(result),
        warnings: result.warnings || [],
        globalShenSha: result.globalShenSha || [],
    };
}
export function renderLiuyaoAISafeJSON(result, options) {
    const detailLevel = normalizeDetailLevel(options?.detailLevel);
    const raw = renderLiuyaoCanonicalJSON(result);
    const interactionSources = buildLiuyaoInteractionSources(result);
    const combinations = [];
    if (result.sanHeAnalysis?.banHe?.length) {
        for (const item of result.sanHeAnalysis.banHe) {
            combinations.push({
                kind: '半合',
                resultElement: item.result,
                participants: buildBanHeParticipants(item.branches, interactionSources),
            });
        }
    }
    if (result.sanHeAnalysis?.fullSanHeList?.length) {
        for (const item of result.sanHeAnalysis.fullSanHeList) {
            combinations.push({
                kind: '三合',
                resultElement: item.result,
                name: item.name,
                positions: item.positions?.map((position) => buildLiuyaoPositionLabel(position, result.fullYaos) || `${position}爻`) || [],
            });
        }
    }
    const transitions = [];
    if (result.chongHeTransition && (result.chongHeTransition.type === 'chong_to_he' || result.chongHeTransition.type === 'he_to_chong')) {
        transitions.push({ kind: result.chongHeTransition.type === 'chong_to_he' ? '冲转合' : '合转冲' });
    }
    const resonances = [];
    if (result.guaFanFuYin?.isFuYin)
        resonances.push({ kind: '伏吟' });
    if (result.guaFanFuYin?.isFanYin)
        resonances.push({ kind: '反吟' });
    const payload = {
        board: {
            ...(result.question ? { question: result.question } : {}),
            mainHexagram: {
                name: result.hexagramName,
                gong: result.hexagramGong,
                element: result.hexagramElement,
                ...(result.guaCi ? { guaCi: result.guaCi } : {}),
            },
            ...(result.changedHexagramName
                ? {
                    changedHexagram: {
                        name: result.changedHexagramName,
                        ...(result.changedHexagramGong ? { gong: result.changedHexagramGong } : {}),
                        ...(result.changedHexagramElement ? { element: result.changedHexagramElement } : {}),
                        ...(result.changedGuaCi ? { guaCi: result.changedGuaCi } : {}),
                        changingYaos: (result.fullYaos || [])
                            .filter((item) => item.isChanging)
                            .map((yao) => traditionalYaoName(yao.position, yao.type)),
                        ...(((result.fullYaos || [])
                            .filter((item) => item.isChanging && item.yaoCi)
                            .map((yao) => ({ yaoName: traditionalYaoName(yao.position, yao.type), yaoCi: yao.yaoCi }))).length > 0
                            ? {
                                changingYaoCi: (result.fullYaos || [])
                                    .filter((item) => item.isChanging && item.yaoCi)
                                    .map((yao) => ({ yaoName: traditionalYaoName(yao.position, yao.type), yaoCi: yao.yaoCi })),
                            }
                            : {}),
                    },
                }
                : {}),
            ganZhiTime: raw.ganZhiTime,
        },
        fullBoard: {
            lines: buildLiuyaoAISafeBoardLines(result, detailLevel),
        },
        globalInteractions: {
            combinations,
            ...(detailLevel === 'full' && transitions.length > 0 ? { transitions } : {}),
            ...(detailLevel === 'full' && resonances.length > 0 ? { resonances } : {}),
            ...(detailLevel === 'full' ? { isLiuChongGua: result.liuChongGuaInfo?.isLiuChongGua ? '是' : '否' } : {}),
            ...(detailLevel === 'full' ? { isLiuHeGua: result.liuHeGuaInfo?.isLiuHeGua ? '是' : '否' } : {}),
            ...(detailLevel === 'full' && result.chongHeTransition && result.chongHeTransition.type !== 'none'
                ? { chongHeTransition: result.chongHeTransition.type === 'chong_to_he' ? '冲转合' : '合转冲' }
                : {}),
        },
        meta: {
            detailLevel,
        },
    };
    if (detailLevel === 'more' || detailLevel === 'full') {
        if (result.guaShen) {
            payload.board.guaShen = {
                branch: result.guaShen.branch,
                ...(result.guaShen.linePosition ? { position: buildLiuyaoPositionLabel(result.guaShen.linePosition, result.fullYaos) } : {}),
                ...(result.guaShen.absent ? { state: '飞伏' } : {}),
            };
        }
        if (result.nuclearHexagram || result.oppositeHexagram || result.reversedHexagram) {
            payload.board.derivedHexagrams = {
                ...(result.nuclearHexagram ? { nuclearHexagram: { name: result.nuclearHexagram.name } } : {}),
                ...(result.oppositeHexagram ? { oppositeHexagram: { name: result.oppositeHexagram.name } } : {}),
                ...(result.reversedHexagram ? { reversedHexagram: { name: result.reversedHexagram.name } } : {}),
            };
        }
        if (result.globalShenSha?.length) {
            payload.board.globalShenSha = [...result.globalShenSha];
        }
    }
    return payload;
}
// ===== 塔罗 =====
export function renderTarotCanonicalJSON(result, options = {}) {
    const basicInfo = { spreadName: result.spreadName };
    if (result.question)
        basicInfo.question = result.question;
    if (options.birthDate?.trim())
        basicInfo.birthDate = options.birthDate.trim();
    const cards = result.cards.map((card) => {
        const isReversed = card.orientation === 'reversed';
        const entry = {
            position: card.position,
            cardName: card.card.nameChinese,
            direction: isReversed ? '逆位' : '正位',
            keywords: isReversed && card.reversedKeywords?.length ? card.reversedKeywords : card.card.keywords,
            meaning: card.meaning,
        };
        if (card.element)
            entry.element = card.element;
        if (card.astrologicalCorrespondence)
            entry.astrologicalCorrespondence = card.astrologicalCorrespondence;
        return entry;
    });
    const json = { basicInfo, cards };
    if (result.numerology) {
        json.numerology = {
            personalityCard: {
                name: result.numerology.personalityCard.nameChinese,
                keywords: result.numerology.personalityCard.keywords || [],
                element: result.numerology.personalityCard.element,
                astrologicalCorrespondence: result.numerology.personalityCard.astrologicalCorrespondence,
            },
            soulCard: {
                name: result.numerology.soulCard.nameChinese,
                keywords: result.numerology.soulCard.keywords || [],
                element: result.numerology.soulCard.element,
                astrologicalCorrespondence: result.numerology.soulCard.astrologicalCorrespondence,
            },
            yearlyCard: {
                year: result.numerology.yearlyCard.year,
                name: result.numerology.yearlyCard.nameChinese,
                keywords: result.numerology.yearlyCard.keywords || [],
                element: result.numerology.yearlyCard.element,
                astrologicalCorrespondence: result.numerology.yearlyCard.astrologicalCorrespondence,
            },
        };
    }
    return json;
}
// ===== 紫微 =====
export function renderZiweiCanonicalJSON(result, options = {}) {
    void options;
    const basicInfo = {
        solarDate: result.solarDate,
        lunarDate: result.lunarDate,
        fourPillars: `${result.fourPillars.year.gan}${result.fourPillars.year.zhi} ${result.fourPillars.month.gan}${result.fourPillars.month.zhi} ${result.fourPillars.day.gan}${result.fourPillars.day.zhi} ${result.fourPillars.hour.gan}${result.fourPillars.hour.zhi}`,
        soul: result.soul,
        body: result.body,
        fiveElement: result.fiveElement,
    };
    if (result.gender === 'male' || result.gender === 'female') {
        basicInfo.gender = result.gender === 'male' ? '男' : '女';
    }
    if (result.time)
        basicInfo.time = result.time + (result.timeRange ? `（${result.timeRange}）` : '');
    if (result.douJun)
        basicInfo.douJun = result.douJun;
    if (result.lifeMasterStar)
        basicInfo.lifeMasterStar = result.lifeMasterStar;
    if (result.bodyMasterStar)
        basicInfo.bodyMasterStar = result.bodyMasterStar;
    if (result.trueSolarTimeInfo)
        basicInfo.trueSolarTime = buildTrueSolarTimeJSON(result.trueSolarTimeInfo);
    const palaces = sortZiweiPalaces(result.palaces).map((palace) => {
        const shensha = [palace.changsheng12, palace.boshi12, palace.jiangqian12, palace.suiqian12].filter(Boolean);
        return {
            name: palace.name,
            index: palace.index,
            ganZhi: `${palace.heavenlyStem}${palace.earthlyBranch}`,
            isBodyPalace: palace.isBodyPalace,
            isOriginalPalace: palace.isOriginalPalace,
            majorStars: palace.majorStars.map(buildStarJSON),
            minorStars: palace.minorStars.map(buildStarJSON),
            adjStars: (palace.adjStars || []).map(buildStarJSON),
            shenSha: shensha,
            decadalRange: palace.decadalRange ? `${palace.decadalRange[0]}~${palace.decadalRange[1]}` : undefined,
            liuNianAges: palace.liuNianAges || [],
            ages: palace.ages || [],
        };
    });
    const json = { basicInfo, palaces };
    if (result.smallLimit?.length)
        json.smallLimit = result.smallLimit;
    return json;
}
// ===== 奇门遁甲 =====
export function renderQimenCanonicalJSON(result) {
    const dunText = result.dunType === 'yang' ? '阳遁' : '阴遁';
    const basicInfo = {
        solarDate: result.dateInfo.solarDate,
        lunarDate: result.dateInfo.lunarDate,
        solarTerm: result.dateInfo.solarTerm,
        fourPillars: `${result.siZhu.year} ${result.siZhu.month} ${result.siZhu.day} ${result.siZhu.hour}`,
        ju: `${dunText}${result.juNumber}局`,
        yuan: result.yuan,
        xunShou: result.xunShou,
        panType: `${result.panType}（${result.juMethod}）`,
    };
    if (result.dateInfo.solarTermRange)
        basicInfo.solarTermRange = result.dateInfo.solarTermRange;
    if (result.question)
        basicInfo.question = result.question;
    const dayKongPalaces = new Set(result.kongWang.dayKong.palaces);
    const hourKongPalaces = new Set(result.kongWang.hourKong.palaces);
    const palaces = result.palaces.map((palace) => {
        const palaceElement = palace.element || '';
        const hElement = palace.heavenStemElement || GAN_WUXING[palace.heavenStem] || '';
        const eElement = palace.earthStemElement || GAN_WUXING[palace.earthStem] || '';
        const isDayKong = dayKongPalaces.has(palace.palaceIndex);
        const isHourKong = hourKongPalaces.has(palace.palaceIndex);
        return {
            palaceName: palace.palaceName,
            palaceIndex: palace.palaceIndex,
            element: palaceElement,
            elementState: palace.elementState,
            deity: palace.deity,
            heavenStem: palace.heavenStem ? `${palace.heavenStem}${hElement}` : '-',
            earthStem: palace.earthStem ? `${palace.earthStem}${eElement}` : '-',
            star: palace.star ? `${palace.star}(${palace.starElement || ''})` : '-',
            gate: palace.gate ? `${palace.gate}(${palace.gateElement || ''})` : '-',
            starElement: palace.starElement || undefined,
            gateElement: palace.gateElement || undefined,
            formations: palace.formations,
            isDayKong,
            isHourKong,
            isYiMa: palace.isYiMa || undefined,
            isRuMu: palace.isRuMu || undefined,
        };
    });
    const json = {
        basicInfo,
        palaces,
        monthPhaseMap: result.monthPhase ? { ...result.monthPhase } : {},
    };
    return json;
}
// ===== 大六壬 =====
export function renderDaliurenCanonicalJSON(result) {
    const basicInfo = {
        date: result.dateInfo.solarDate,
        bazi: result.dateInfo.bazi,
        ganZhi: {
            year: result.dateInfo.ganZhi.year,
            month: result.dateInfo.ganZhi.month,
            day: result.dateInfo.ganZhi.day,
            hour: result.dateInfo.ganZhi.hour,
        },
        yueJiang: `${result.dateInfo.yueJiang}（${result.dateInfo.yueJiangName}）`,
        kongWang: [...result.dateInfo.kongWang],
        yiMa: result.dateInfo.yiMa,
        dingMa: result.dateInfo.dingMa,
        tianMa: result.dateInfo.tianMa,
        diurnal: result.dateInfo.diurnal ? '昼' : '夜',
        keTi: {
            method: result.keTi.method,
            subTypes: result.keTi.subTypes,
            extraTypes: result.keTi.extraTypes,
        },
    };
    if (result.dateInfo.lunarDate)
        basicInfo.lunarDate = result.dateInfo.lunarDate;
    if (result.keName)
        basicInfo.keName = result.keName;
    if (result.benMing)
        basicInfo.benMing = result.benMing;
    if (result.xingNian)
        basicInfo.xingNian = result.xingNian;
    if (result.question)
        basicInfo.question = result.question;
    const keLabels = ['一课', '二课', '三课', '四课'];
    const keData = [result.siKe.yiKe, result.siKe.erKe, result.siKe.sanKe, result.siKe.siKe];
    const siKe = keLabels.map((label, i) => ({
        ke: label,
        upper: keData[i][0]?.[0] || '-',
        lower: keData[i][0]?.[1] || '-',
        tianJiang: keData[i][1] || '-',
    }));
    const chuanLabels = ['初传', '中传', '末传'];
    const chuanData = [result.sanChuan.chu, result.sanChuan.zhong, result.sanChuan.mo];
    const sanChuan = chuanLabels.map((label, i) => ({
        chuan: label,
        branch: chuanData[i][0] || '-',
        tianJiang: chuanData[i][1] || '-',
        liuQin: chuanData[i][2] || '-',
        dunGan: chuanData[i][3] || '-',
    }));
    const gongInfos = result.gongInfos.map((item) => ({
        diZhi: item.diZhi,
        wuXing: item.wuXing || undefined,
        wangShuai: item.wangShuai || undefined,
        tianZhi: item.tianZhi,
        tianJiang: item.tianJiang,
        dunGan: item.dunGan || '-',
        changSheng: item.changSheng || '-',
        jianChu: item.jianChu || '-',
    }));
    const shenSha = {};
    for (const item of result.shenSha) {
        if (!shenSha[item.value])
            shenSha[item.value] = [];
        shenSha[item.value].push(item.name);
    }
    return { basicInfo, siKe, sanChuan, gongInfos, shenSha };
}
// ===== 每日运势 =====
export function renderFortuneCanonicalJSON(result) {
    const { date, dayInfo, tenGod, almanac } = result;
    const json = {
        basicInfo: {
            date,
            dayGanZhi: dayInfo.ganZhi,
            tenGod: tenGod ?? '-',
        },
        almanac: {
            lunarDate: almanac.lunarDate || `${almanac.lunarMonth}${almanac.lunarDay}`,
            zodiac: almanac.zodiac,
            suitable: almanac.suitable,
            avoid: almanac.avoid,
            jishen: almanac.jishen || [],
            xiongsha: almanac.xiongsha || [],
        },
    };
    if (almanac.solarTerm)
        json.almanac.solarTerm = almanac.solarTerm;
    if (almanac.chongSha)
        json.almanac.chongSha = almanac.chongSha;
    if (almanac.pengZuBaiJi)
        json.almanac.pengZuBaiJi = almanac.pengZuBaiJi;
    if (almanac.taiShen)
        json.almanac.taiShen = almanac.taiShen;
    if (almanac.dayNineStar) {
        json.almanac.dayNineStar = {
            description: almanac.dayNineStar.description,
            position: almanac.dayNineStar.position,
        };
    }
    return json;
}
// ===== 大运 =====
export function renderDayunCanonicalJSON(result, options = {}) {
    const detailLevel = normalizeBaziDetailLevel(options.detailLevel);
    const json = {
        startInfo: {
            startAge: result.startAge,
            detail: result.startAgeDetail,
        },
        list: result.list.map((item) => buildDayunItemJSON({
            startYear: item.startYear,
            startAge: item.startAge,
            ganZhi: item.ganZhi,
            stem: detailLevel === 'full' ? item.stem : undefined,
            branch: detailLevel === 'full' ? item.branch : undefined,
            tenGod: item.tenGod,
            branchTenGod: detailLevel === 'full' ? item.branchTenGod : undefined,
            hiddenStems: detailLevel === 'full' ? item.hiddenStems : buildLeanHiddenStemItems(item.hiddenStems),
            diShi: detailLevel === 'full' ? item.diShi : undefined,
            naYin: detailLevel === 'full' ? item.naYin : undefined,
            shenSha: detailLevel === 'full' ? item.shenSha : undefined,
            branchRelations: detailLevel === 'full' ? item.branchRelations : undefined,
            liunianList: detailLevel === 'full' ? item.liunianList : undefined,
        })),
    };
    if (detailLevel === 'full' && result.xiaoYun.length > 0) {
        json.xiaoYun = result.xiaoYun.map((item) => ({
            age: item.age,
            ganZhi: item.ganZhi,
            tenGod: item.tenGod,
        }));
    }
    return json;
}
// ===== 四柱反推 =====
export function renderBaziPillarsResolveCanonicalJSON(result) {
    return {
        originalPillars: { ...result.pillars },
        count: result.count,
        candidates: result.candidates.map((c) => ({
            candidateId: c.candidateId,
            lunarText: c.lunarText,
            solarText: c.solarText,
            birthTime: `${c.birthHour}:${String(c.birthMinute).padStart(2, '0')}`,
            isLeapMonth: c.isLeapMonth,
        })),
    };
}
// ===== 紫微运限 =====
export function renderZiweiHoroscopeCanonicalJSON(result) {
    const periodEntries = [
        { label: '大限', data: result.decadal },
        { label: '小限', data: result.age, nominalAge: result.age.nominalAge },
        { label: '流年', data: result.yearly },
        { label: '流月', data: result.monthly },
        { label: '流日', data: result.daily },
        { label: '流时', data: result.hourly },
    ];
    const json = {
        basicInfo: {
            solarDate: result.solarDate,
            lunarDate: result.lunarDate,
            soul: result.soul,
            body: result.body,
            fiveElement: result.fiveElement,
            targetDate: result.targetDate,
        },
        periods: periodEntries.map(({ label, data, nominalAge }) => {
            const entry = {
                label,
                palaceIndex: data.index,
                name: data.name,
                ganZhi: `${data.heavenlyStem}${data.earthlyBranch}`,
                mutagen: data.mutagen,
                palaceNames: data.palaceNames,
            };
            if (nominalAge !== undefined)
                entry.nominalAge = nominalAge;
            return entry;
        }),
    };
    if (result.transitStars?.length) {
        json.transitStars = result.transitStars.map((e) => ({
            starName: e.starName,
            palaceName: e.palaceName,
        }));
    }
    if (result.yearlyDecStar) {
        const hasSuiqian = result.yearlyDecStar.suiqian12.length > 0;
        const hasJiangqian = result.yearlyDecStar.jiangqian12.length > 0;
        if (hasSuiqian || hasJiangqian) {
            json.yearlyDecStar = {
                suiqian12: result.yearlyDecStar.suiqian12,
                jiangqian12: result.yearlyDecStar.jiangqian12,
            };
        }
    }
    return json;
}
// ===== 紫微飞星 =====
export function renderZiweiFlyingStarCanonicalJSON(result) {
    return {
        results: result.results.map((r) => {
            const entry = {
                queryIndex: r.queryIndex,
                type: r.type,
            };
            if (r.type === 'fliesTo' || r.type === 'selfMutaged') {
                entry.booleanResult = r.result;
            }
            else if (r.type === 'mutagedPlaces') {
                entry.mutagedPlaces = r.result.map((p) => ({
                    mutagen: p.mutagen,
                    targetPalace: p.targetPalace,
                }));
            }
            else if (r.type === 'surroundedPalaces') {
                const s = r.result;
                entry.surroundedPalaces = {
                    target: s.target.name,
                    opposite: s.opposite.name,
                    wealth: s.wealth.name,
                    career: s.career.name,
                };
            }
            return entry;
        }),
    };
}
