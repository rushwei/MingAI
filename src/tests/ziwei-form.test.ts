import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    buildInitialZiweiFormState,
    ZIWEI_BIRTH_TIME_REQUIRED_MESSAGE,
    ZIWEI_LEGACY_UNKNOWN_TIME_SENTINEL,
} from '../lib/divination/ziwei-form';

function createSearchParams(values: Record<string, string | null>) {
    return {
        get(key: string) {
            return values[key] ?? null;
        },
    };
}

test('buildInitialZiweiFormState marks legacy unknown-time links as requiring explicit confirmation', () => {
    const state = buildInitialZiweiFormState(createSearchParams({
        name: '命主',
        year: '1990',
        month: '1',
        day: '1',
        hour: ZIWEI_LEGACY_UNKNOWN_TIME_SENTINEL,
        minute: '37',
    }));

    assert.equal(state.requiresBirthTimeConfirmation, true);
    assert.equal(state.formData.birthHour, 12);
    assert.equal(state.formData.birthMinute, 0);
});

test('buildInitialZiweiFormState marks invalid prefills without hour as requiring explicit confirmation', () => {
    const state = buildInitialZiweiFormState(createSearchParams({
        name: '命主',
        year: '1990',
        month: '1',
        day: '1',
    }));

    assert.equal(state.requiresBirthTimeConfirmation, true);
    assert.equal(state.formData.birthHour, 12);
});

test('buildInitialZiweiFormState keeps valid explicit time and leaves confirmation off', () => {
    const state = buildInitialZiweiFormState(createSearchParams({
        name: '命主',
        year: '1990',
        month: '1',
        day: '1',
        hour: '7',
        minute: '30',
    }));

    assert.equal(state.requiresBirthTimeConfirmation, false);
    assert.equal(state.formData.birthHour, 7);
    assert.equal(state.formData.birthMinute, 30);
    assert.equal(ZIWEI_BIRTH_TIME_REQUIRED_MESSAGE.includes('出生时辰'), true);
});
