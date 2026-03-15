import { createSeededRng, resolveSeed } from '../seeded-rng.js';
import { GUA_CI, XIANG_CI, YAO_CI } from '../hexagram-texts.js';
import { Solar } from 'lunar-javascript';
import { findHexagram, getPalaceInfo, getShiYingPosition, getNaJiaByHexagram, hasInvalidYongShenTargets, normalizeYongShenTargets, performFullAnalysis, } from '../liuyao-core.js';
// ── 先天八卦数 ──
const PRE_HEAVEN_NUMBERS = {
    '乾': 1, '兑': 2, '离': 3, '震': 4,
    '巽': 5, '坎': 6, '艮': 7, '坤': 8,
};
const NUMBER_TO_TRIGRAM = {
    1: '乾', 2: '兑', 3: '离', 4: '震',
    5: '巽', 6: '坎', 7: '艮', 8: '坤',
};
const TRIGRAM_LINES = {
    '乾': [1, 1, 1], '兑': [1, 1, 0], '离': [1, 0, 1], '震': [1, 0, 0],
    '巽': [0, 1, 1], '坎': [0, 1, 0], '艮': [0, 0, 1], '坤': [0, 0, 0],
};
const EARTHLY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
function calculateChangedLines(mainCode, changedCode) {
    const lines = [];
    for (let index = 0; index < 6; index += 1) {
        if (mainCode[index] !== changedCode[index]) {
            lines.push(index + 1);
        }
    }
    return lines;
}
function calculateChangedHexagram(code, changedLines) {
    const chars = code.split('');
    for (const line of changedLines) {
        const index = line - 1;
        chars[index] = chars[index] === '1' ? '0' : '1';
    }
    return chars.join('');
}
function divine(rng) {
    const yaos = [];
    const changedLines = [];
    for (let index = 0; index < 6; index += 1) {
        const coins = [
            rng() > 0.5 ? 3 : 2,
            rng() > 0.5 ? 3 : 2,
            rng() > 0.5 ? 3 : 2,
        ];
        const sum = coins.reduce((left, right) => left + right, 0);
        let type;
        let change = 'stable';
        if (sum === 6) {
            type = 0;
            change = 'changing';
        }
        else if (sum === 7) {
            type = 1;
        }
        else if (sum === 8) {
            type = 0;
        }
        else {
            type = 1;
            change = 'changing';
        }
        if (change === 'changing') {
            changedLines.push(index + 1);
        }
        yaos.push({
            type,
            change,
            position: index + 1,
        });
    }
    return {
        yaos,
        hexagramCode: yaos.map((item) => item.type).join(''),
        changedLines,
    };
}
// ── 互卦 (Nuclear Hexagram) ──
function calculateNuclearHexagram(code) {
    // lines[1],lines[2],lines[3] as lower trigram; lines[2],lines[3],lines[4] as upper trigram
    const lowerTrigram = code[1] + code[2] + code[3];
    const upperTrigram = code[2] + code[3] + code[4];
    const nuclearCode = lowerTrigram + upperTrigram;
    const hexagram = findHexagram(nuclearCode);
    if (!hexagram)
        return undefined;
    return {
        name: hexagram.name,
        guaCi: GUA_CI[hexagram.name],
        xiangCi: XIANG_CI[hexagram.name],
    };
}
// ── 错卦 (Opposite Hexagram) ──
function calculateOppositeHexagram(code) {
    const oppositeCode = code.split('').map(c => c === '1' ? '0' : '1').join('');
    const hexagram = findHexagram(oppositeCode);
    if (!hexagram)
        return undefined;
    return {
        name: hexagram.name,
        guaCi: GUA_CI[hexagram.name],
        xiangCi: XIANG_CI[hexagram.name],
    };
}
// ── 综卦 (Reversed Hexagram) ──
function calculateReversedHexagram(code) {
    const reversedCode = code.split('').reverse().join('');
    const hexagram = findHexagram(reversedCode);
    if (!hexagram)
        return undefined;
    return {
        name: hexagram.name,
        guaCi: GUA_CI[hexagram.name],
        xiangCi: XIANG_CI[hexagram.name],
    };
}
// ── 卦身 (Hexagram Body) ──
function calculateGuaShen(hexagramCode) {
    const { shi } = getShiYingPosition(hexagramCode);
    // shi is 1-6 position
    const shiLineType = parseInt(hexagramCode[shi - 1], 10); // 1=yang, 0=yin
    let startIndex;
    if (shiLineType === 1) {
        // yang: start from 子 (index 0)
        startIndex = 0;
    }
    else {
        // yin: start from 午 (index 6)
        startIndex = 6;
    }
    const targetBranchIndex = (startIndex + (shi - 1)) % 12;
    const targetBranch = EARTHLY_BRANCHES[targetBranchIndex];
    // Scan hexagram's Najia branches to find which line has that branch
    for (let pos = 1; pos <= 6; pos++) {
        const naJia = getNaJiaByHexagram(hexagramCode, pos);
        if (naJia === targetBranch) {
            return { branch: targetBranch, linePosition: pos };
        }
    }
    return { branch: targetBranch, absent: true };
}
// ── 时间起卦 (Time-based divination) ──
function divineByTime(date) {
    const solar = Solar.fromDate(date);
    const lunar = solar.getLunar();
    const yearBranch = lunar.getYearShengXiao();
    // Map zodiac animal to branch index
    const zodiacToBranch = {
        '鼠': 1, '牛': 2, '虎': 3, '兔': 4, '龙': 5, '蛇': 6,
        '马': 7, '羊': 8, '猴': 9, '鸡': 10, '狗': 11, '猪': 12,
    };
    const yearBranchNum = zodiacToBranch[yearBranch] || 1;
    const lunarMonth = Math.abs(lunar.getMonth());
    const lunarDay = lunar.getDay();
    // Hour branch number: 子=1..亥=12
    const hour = date.getHours();
    const hourBranchIndex = Math.floor((hour + 1) / 2) % 12; // 0=子, 1=丑, ...
    const hourBranchNum = hourBranchIndex + 1;
    let upperNum = (yearBranchNum + lunarMonth + lunarDay) % 8;
    if (upperNum === 0)
        upperNum = 8;
    let lowerNum = (yearBranchNum + lunarMonth + lunarDay + hourBranchNum) % 8;
    if (lowerNum === 0)
        lowerNum = 8;
    let movingLine = (yearBranchNum + lunarMonth + lunarDay + hourBranchNum) % 6;
    if (movingLine === 0)
        movingLine = 6;
    const upperTrigram = NUMBER_TO_TRIGRAM[upperNum];
    const lowerTrigram = NUMBER_TO_TRIGRAM[lowerNum];
    const lowerLines = TRIGRAM_LINES[lowerTrigram];
    const upperLines = TRIGRAM_LINES[upperTrigram];
    // Combine: lower trigram is lines 1-3, upper trigram is lines 4-6
    const lines = [...lowerLines, ...upperLines];
    const hexagramCode = lines.join('');
    const changedLines = [movingLine];
    const yaos = lines.map((line, index) => ({
        type: line,
        change: (index + 1) === movingLine ? 'changing' : 'stable',
        position: index + 1,
    }));
    return { yaos, hexagramCode, changedLines };
}
// ── 数字起卦 (Number-based divination) ──
function divineByNumber(numbers) {
    if (numbers.length < 2 || numbers.length > 3) {
        throw new Error('数字起卦需要提供2或3个数字');
    }
    let upperNum;
    let lowerNum;
    let movingLine;
    if (numbers.length === 2) {
        upperNum = numbers[0] % 8;
        if (upperNum === 0)
            upperNum = 8;
        lowerNum = numbers[1] % 8;
        if (lowerNum === 0)
            lowerNum = 8;
        movingLine = (numbers[0] + numbers[1]) % 6;
        if (movingLine === 0)
            movingLine = 6;
    }
    else {
        upperNum = numbers[0] % 8;
        if (upperNum === 0)
            upperNum = 8;
        lowerNum = numbers[1] % 8;
        if (lowerNum === 0)
            lowerNum = 8;
        movingLine = numbers[2] % 6;
        if (movingLine === 0)
            movingLine = 6;
    }
    const upperTrigram = NUMBER_TO_TRIGRAM[upperNum];
    const lowerTrigram = NUMBER_TO_TRIGRAM[lowerNum];
    const lowerLines = TRIGRAM_LINES[lowerTrigram];
    const upperLines = TRIGRAM_LINES[upperTrigram];
    const lines = [...lowerLines, ...upperLines];
    const hexagramCode = lines.join('');
    const changedLines = [movingLine];
    const yaos = lines.map((line, index) => ({
        type: line,
        change: (index + 1) === movingLine ? 'changing' : 'stable',
        position: index + 1,
    }));
    return { yaos, hexagramCode, changedLines };
}
function toLiuyaoOutput(params) {
    const { seed, question, hexagramCode, changedCode, analysisDate, yaos } = params;
    const baseHexagram = findHexagram(hexagramCode);
    const changedHexagram = changedCode ? findHexagram(changedCode) : undefined;
    const basePalace = getPalaceInfo(hexagramCode);
    const changedPalace = changedCode ? getPalaceInfo(changedCode) : undefined;
    if (!baseHexagram) {
        throw new Error(`未找到卦象：${hexagramCode}`);
    }
    const analysis = performFullAnalysis(yaos, hexagramCode, changedCode, question, analysisDate, { yongShenTargets: params.selectedTargets });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const fullYaos = analysis.fullYaos.map(({ change: _change, ...yao }) => ({
        ...yao,
        yaoCi: YAO_CI[baseHexagram.name]?.[yao.position - 1],
    }));
    // Calculate derived hexagrams
    const nuclearHexagram = calculateNuclearHexagram(hexagramCode);
    const oppositeHexagram = calculateOppositeHexagram(hexagramCode);
    const reversedHexagram = calculateReversedHexagram(hexagramCode);
    const guaShen = calculateGuaShen(hexagramCode);
    return {
        seed,
        question,
        hexagramName: baseHexagram.name,
        hexagramGong: basePalace?.name || '',
        hexagramElement: baseHexagram.element,
        hexagramBrief: baseHexagram.nature,
        guaCi: GUA_CI[baseHexagram.name],
        xiangCi: XIANG_CI[baseHexagram.name],
        changedHexagramName: changedHexagram?.name,
        changedHexagramGong: changedPalace?.name,
        changedHexagramElement: changedHexagram?.element,
        changedGuaCi: changedHexagram ? GUA_CI[changedHexagram.name] : undefined,
        changedXiangCi: changedHexagram ? XIANG_CI[changedHexagram.name] : undefined,
        ganZhiTime: analysis.ganZhiTime,
        kongWang: analysis.kongWang,
        kongWangByPillar: analysis.kongWangByPillar,
        fullYaos,
        yongShen: analysis.yongShen,
        fuShen: analysis.fuShen,
        shenSystemByYongShen: analysis.shenSystemByYongShen,
        globalShenSha: analysis.globalShenSha,
        liuChongGuaInfo: analysis.liuChongGuaInfo,
        liuHeGuaInfo: analysis.liuHeGuaInfo,
        chongHeTransition: analysis.chongHeTransition,
        guaFanFuYin: analysis.guaFanFuYin,
        sanHeAnalysis: analysis.sanHeAnalysis,
        warnings: analysis.warnings,
        timeRecommendations: analysis.timeRecommendations,
        nuclearHexagram,
        oppositeHexagram,
        reversedHexagram,
        guaShen,
    };
}
export async function handleLiuyaoAnalyze(input) {
    const question = typeof input.question === 'string' ? input.question.trim() : '';
    if (!question) {
        throw new Error('请先明确问题后再解卦');
    }
    if (hasInvalidYongShenTargets(input.yongShenTargets)) {
        throw new Error('yongShenTargets 含非法值');
    }
    const selectedTargets = normalizeYongShenTargets(input.yongShenTargets);
    if (selectedTargets.length === 0) {
        throw new Error('请至少选择一个分析目标');
    }
    const { method = 'auto', hexagramName, changedHexagramName, date, } = input;
    let analysisDate = new Date();
    if (date) {
        analysisDate = date.includes('T')
            ? new Date(date)
            : new Date(`${date}T12:00:00`);
    }
    const dateKey = `${analysisDate.getFullYear()}-${String(analysisDate.getMonth() + 1).padStart(2, '0')}-${String(analysisDate.getDate()).padStart(2, '0')}`;
    const seed = resolveSeed(input.seed, `${question}|${method}|${dateKey}|${hexagramName || ''}|${changedHexagramName || ''}`, input.seedScope);
    const rng = createSeededRng(seed);
    let yaos;
    let hexagramCode;
    let changedCode;
    let changedLines = [];
    if (method === 'select') {
        if (!hexagramName) {
            throw new Error('select 模式必须提供 hexagramName');
        }
        const baseHexagram = findHexagram(hexagramName);
        if (!baseHexagram) {
            throw new Error(`未找到卦象：${hexagramName}`);
        }
        hexagramCode = baseHexagram.code;
        if (changedHexagramName) {
            const changedHexagram = findHexagram(changedHexagramName);
            if (!changedHexagram) {
                throw new Error(`未找到变卦：${changedHexagramName}`);
            }
            changedCode = changedHexagram.code;
            changedLines = calculateChangedLines(hexagramCode, changedCode);
        }
        yaos = hexagramCode.split('').map((char, index) => ({
            type: parseInt(char, 10),
            change: changedLines.includes(index + 1) ? 'changing' : 'stable',
            position: index + 1,
        }));
    }
    else if (method === 'time') {
        const result = divineByTime(analysisDate);
        yaos = result.yaos;
        hexagramCode = result.hexagramCode;
        changedLines = result.changedLines;
        if (changedLines.length > 0) {
            changedCode = calculateChangedHexagram(hexagramCode, changedLines);
        }
    }
    else if (method === 'number') {
        if (!input.numbers || input.numbers.length < 2) {
            throw new Error('数字起卦需要提供 numbers 数组（2或3个数字）');
        }
        const result = divineByNumber(input.numbers);
        yaos = result.yaos;
        hexagramCode = result.hexagramCode;
        changedLines = result.changedLines;
        if (changedLines.length > 0) {
            changedCode = calculateChangedHexagram(hexagramCode, changedLines);
        }
    }
    else {
        const result = divine(rng);
        yaos = result.yaos;
        hexagramCode = result.hexagramCode;
        changedLines = result.changedLines;
        if (changedLines.length > 0) {
            changedCode = calculateChangedHexagram(hexagramCode, changedLines);
        }
    }
    const output = toLiuyaoOutput({
        seed,
        question,
        hexagramCode,
        changedCode,
        analysisDate,
        yaos,
        changedLines,
        selectedTargets,
    });
    return output;
}
