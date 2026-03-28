import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToString } from 'react-dom/server';
import { buildZiweiCanonicalJSON, calculateZiwei } from '@/lib/divination/ziwei';
import { ZiweiChartGrid } from '@/components/ziwei/ZiweiChartGrid';

test('ZiweiChartGrid renders core identity rows without static small-limit summaries', () => {
    const chart = calculateZiwei({
        name: '测试',
        gender: 'male',
        birthYear: 2003,
        birthMonth: 9,
        birthDay: 2,
        birthHour: 10,
        birthMinute: 0,
        calendarType: 'solar',
    });
    const canonicalChart = buildZiweiCanonicalJSON(chart);

    const markup = renderToString(
        <ZiweiChartGrid
            canonicalChart={canonicalChart}
            copyText="test"
        />
    );

    assert.match(markup, /命主：/u);
    assert.match(markup, /身主：/u);
    assert.match(markup, /斗君：/u);
    assert.match(markup, /命主星：/u);
    assert.match(markup, /身主星：/u);
    assert.match(markup, /来因宫/u);
    assert.match(markup, /stroke-width="0\.8"/u);
    assert.doesNotMatch(markup, /小限\s*\/\s*流年/u);
    assert.doesNotMatch(markup, /小限\s*\d/u);
    assert.doesNotMatch(markup, /流年\s*\d/u);
    assert.doesNotMatch(markup, /标记：来因宫/u);
});
