import { test } from 'node:test';
import assert from 'node:assert/strict';

test('calculateResult chooses dominant dimensions from answers', () => {
    const mbti = require('../lib/mbti') as any;

    const questions = [
        { question: 'Q1', choice_a: { value: 'E', text: 'A' }, choice_b: { value: 'I', text: 'B' } },
        { question: 'Q2', choice_a: { value: 'S', text: 'A' }, choice_b: { value: 'N', text: 'B' } },
        { question: 'Q3', choice_a: { value: 'T', text: 'A' }, choice_b: { value: 'F', text: 'B' } },
        { question: 'Q4', choice_a: { value: 'J', text: 'A' }, choice_b: { value: 'P', text: 'B' } },
    ];

    const answers = [
        { questionIndex: 0, likertValue: 1 },
        { questionIndex: 1, likertValue: 1 },
        { questionIndex: 2, likertValue: 1 },
        { questionIndex: 3, likertValue: 1 },
    ];

    const result = mbti.calculateResult(questions, answers);

    assert.equal(result.type, 'ESTJ');
    assert.equal(result.percentages.EI.E, 100);
    assert.equal(result.percentages.SN.S, 100);
    assert.equal(result.percentages.TF.T, 100);
    assert.equal(result.percentages.JP.J, 100);
});
