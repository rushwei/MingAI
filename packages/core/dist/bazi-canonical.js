export function buildBaziCanonicalPillarShenSha(pillar) {
    return pillar.shenSha?.length ? [...pillar.shenSha] : [];
}
export function buildBaziCanonicalRelations(result) {
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
