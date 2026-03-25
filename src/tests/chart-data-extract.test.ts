import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon';

test('extractChartBlocks should parse valid chart blocks from markdown', async () => {
    const { extractChartBlocks } = await import('../lib/visualization/chart-data-extract');

    const markdown = `这是分析文本...

\`\`\`chart
{
  "chartType": "fortune_radar",
  "title": "当前运势评分",
  "data": { "period": "2026年", "scores": {}, "overallScore": 75, "overallLabel": "良好" }
}
\`\`\`

继续分析...

\`\`\`chart
{
  "chartType": "life_fortune_trend",
  "title": "大运趋势",
  "data": { "currentAge": 35, "currentYear": 2026, "periods": [] }
}
\`\`\`
`;

    const results = extractChartBlocks(markdown);
    assert.equal(results.length, 2);
    assert.equal(results[0].chartType, 'fortune_radar');
    assert.equal(results[0].title, '当前运势评分');
    assert.equal(results[1].chartType, 'life_fortune_trend');
    assert.equal(results[1].title, '大运趋势');
});

test('extractChartBlocks should skip malformed JSON blocks', async () => {
    const { extractChartBlocks } = await import('../lib/visualization/chart-data-extract');

    const markdown = `\`\`\`chart
{ invalid json }
\`\`\`

\`\`\`chart
{ "chartType": "fortune_radar", "title": "有效图表", "data": {} }
\`\`\``;

    const results = extractChartBlocks(markdown);
    assert.equal(results.length, 1);
    assert.equal(results[0].title, '有效图表');
});

test('extractChartsFromMessages should deduplicate by chartType + title', async () => {
    const { extractChartsFromMessages } = await import('../lib/visualization/chart-data-extract');

    const messages = [
        {
            role: 'assistant',
            content: '```chart\n{"chartType":"fortune_radar","title":"运势","data":{"v":1}}\n```',
        },
        {
            role: 'user',
            content: '再分析一下',
        },
        {
            role: 'assistant',
            content: '```chart\n{"chartType":"fortune_radar","title":"运势","data":{"v":2}}\n```',
        },
    ];

    const results = extractChartsFromMessages(messages);
    assert.equal(results.length, 1);
    // Should keep the latest version
    assert.deepEqual((results[0].raw as any).data, { v: 2 });
});

test('formatPreviousChartsForPrompt should produce non-empty text for non-empty input', async () => {
    const { formatPreviousChartsForPrompt } = await import('../lib/visualization/chart-data-extract');

    const charts = [
        { chartType: 'fortune_radar' as const, title: '运势评分', raw: {} as any },
        { chartType: 'life_fortune_trend' as const, title: '大运趋势', raw: {} as any },
    ];

    const text = formatPreviousChartsForPrompt(charts);
    assert.ok(text.includes('运势评分'));
    assert.ok(text.includes('大运趋势'));
    assert.ok(text.includes('fortune_radar'));
});

test('formatPreviousChartsForPrompt should return empty string for empty input', async () => {
    const { formatPreviousChartsForPrompt } = await import('../lib/visualization/chart-data-extract');
    assert.equal(formatPreviousChartsForPrompt([]), '');
});
