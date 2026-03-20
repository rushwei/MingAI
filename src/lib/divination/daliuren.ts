import type { DaliurenOutput } from '@mingai/core/daliuren';

export function generateDaliurenResultText(result: DaliurenOutput): string {
    const formatGuiRen = (map: Record<string, string> | undefined): string => {
        if (!map) return '';
        return Object.entries(map).map(([key, value]) => `${key}${value}`).join('、');
    };

    const lines: string[] = [
        '# 大六壬排盘',
        '',
        '## 基本信息',
        `- **日期**: ${result.dateInfo.solarDate}`,
        `- **农历**: ${result.dateInfo.lunarDate || '-'}`,
        `- **八字**: ${result.dateInfo.bazi}`,
        `- **月将**: ${result.dateInfo.yueJiang}（${result.dateInfo.yueJiangName}）`,
        `- **旬**: ${result.dateInfo.xun}`,
        `- **空亡**: ${result.dateInfo.kongWang.join('、')}`,
        `- **驿马**: ${result.dateInfo.yiMa}`,
        `- **丁马**: ${result.dateInfo.dingMa}`,
        `- **天马**: ${result.dateInfo.tianMa}`,
        `- **昼夜**: ${result.dateInfo.diurnal ? '昼' : '夜'}`,
        result.question ? `- **占事**: ${result.question}` : '',
        '',
        '## 阴阳贵人',
        `- **阳贵人**: ${formatGuiRen(result.yinYangGuiRen?.yangGuiRen) || '-'}`,
        `- **阴贵人**: ${formatGuiRen(result.yinYangGuiRen?.yinGuiRen) || '-'}`,
        '',
        '## 四课',
        '',
        '| 课 | 上神 | 下神 | 天将 |',
        '|---|------|------|------|',
        `| 一课 | ${result.siKe.yiKe[0]?.[0] || '-'} | ${result.siKe.yiKe[0]?.[1] || '-'} | ${result.siKe.yiKe[1] || '-'} |`,
        `| 二课 | ${result.siKe.erKe[0]?.[0] || '-'} | ${result.siKe.erKe[0]?.[1] || '-'} | ${result.siKe.erKe[1] || '-'} |`,
        `| 三课 | ${result.siKe.sanKe[0]?.[0] || '-'} | ${result.siKe.sanKe[0]?.[1] || '-'} | ${result.siKe.sanKe[1] || '-'} |`,
        `| 四课 | ${result.siKe.siKe[0]?.[0] || '-'} | ${result.siKe.siKe[0]?.[1] || '-'} | ${result.siKe.siKe[1] || '-'} |`,
        '',
        '## 三传',
        '',
        '| 传 | 地支 | 天将 | 六亲 | 遁干 |',
        '|---|------|------|------|------|',
        `| 初传 | ${result.sanChuan.chu[0] || '-'} | ${result.sanChuan.chu[1] || '-'} | ${result.sanChuan.chu[2] || '-'} | ${result.sanChuan.chu[3] || '-'} |`,
        `| 中传 | ${result.sanChuan.zhong[0] || '-'} | ${result.sanChuan.zhong[1] || '-'} | ${result.sanChuan.zhong[2] || '-'} | ${result.sanChuan.zhong[3] || '-'} |`,
        `| 末传 | ${result.sanChuan.mo[0] || '-'} | ${result.sanChuan.mo[1] || '-'} | ${result.sanChuan.mo[2] || '-'} | ${result.sanChuan.mo[3] || '-'} |`,
        '',
        '## 课体',
        `- **取传法**: ${result.keTi.method}`,
        result.keTi.subTypes.length > 0 ? `- **课体**: ${result.keTi.subTypes.join('、')}` : '',
        result.keTi.extraTypes.length > 0 ? `- **附加**: ${result.keTi.extraTypes.join('、')}` : '',
        result.keName ? `- **课名**: ${result.keName}` : '',
        '',
    ];

    if (result.benMing || result.xingNian) {
        lines.push('## 本命行年');
        if (result.benMing) lines.push(`- **本命**: ${result.benMing}`);
        if (result.xingNian) lines.push(`- **行年**: ${result.xingNian}`);
        lines.push('');
    }

    if (result.gongInfos.length > 0) {
        lines.push('## 十二宫');
        lines.push('');
        lines.push('| 地盘 | 天盘 | 天将 | 遁干 | 长生 | 五行 | 旺衰 | 建除 |');
        lines.push('|------|------|------|------|------|------|------|------|');
        for (const gong of result.gongInfos) {
            lines.push(`| ${gong.diZhi} | ${gong.tianZhi} | ${gong.tianJiangShort || gong.tianJiang} | ${gong.dunGan || '-'} | ${gong.changSheng || '-'} | ${gong.wuXing || '-'} | ${gong.wangShuai || '-'} | ${gong.jianChu || '-'} |`);
        }
        lines.push('');
    }

    if (result.shenSha.length > 0) {
        lines.push('## 神煞');
        lines.push('');
        for (const shenSha of result.shenSha) {
            lines.push(`- ${shenSha.name}: ${shenSha.value}${shenSha.description ? `（${shenSha.description}）` : ''}`);
        }
    }

    return lines.filter(Boolean).join('\n');
}
