import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Solar } from 'lunar-javascript';
import { normalizeBirthDateForCalendarSwitch, getEarthlyBranchByHour } from '@/lib/bazi-form-utils';

test('normalizeBirthDateForCalendarSwitch uses now when switching from pillars to solar', () => {
    const now = new Date(2024, 1, 10, 9, 30); // 2024-02-10 09:30
    const result = normalizeBirthDateForCalendarSwitch(
        {
            calendarType: 'pillars',
            birthYear: 0,
            birthMonth: 0,
            birthDay: 0,
            isLeapMonth: false,
            birthHour: 9,
            birthMinute: 30,
        },
        'solar',
        now
    );

    assert.equal(result.birthYear, 2024);
    assert.equal(result.birthMonth, 2);
    assert.equal(result.birthDay, 10);
    assert.equal(result.isLeapMonth, false);
});

test('normalizeBirthDateForCalendarSwitch converts solar to lunar safely', () => {
    const now = new Date(2024, 1, 10, 9, 30);
    const solar = Solar.fromYmdHms(2024, 2, 10, 9, 30, 0);
    const lunar = solar.getLunar();

    const result = normalizeBirthDateForCalendarSwitch(
        {
            calendarType: 'solar',
            birthYear: 2024,
            birthMonth: 2,
            birthDay: 10,
            isLeapMonth: false,
            birthHour: 9,
            birthMinute: 30,
        },
        'lunar',
        now
    );

    assert.equal(result.birthYear, lunar.getYear());
    assert.equal(result.birthMonth, Math.abs(lunar.getMonth()));
    assert.equal(result.birthDay, lunar.getDay());
    assert.equal(result.isLeapMonth, lunar.getMonth() < 0);
});

test('getEarthlyBranchByHour returns correct branch', () => {
    assert.equal(getEarthlyBranchByHour(23), '子');
    assert.equal(getEarthlyBranchByHour(0), '子');
    assert.equal(getEarthlyBranchByHour(1), '丑');
    assert.equal(getEarthlyBranchByHour(9), '巳');
    assert.equal(getEarthlyBranchByHour(10), '巳');
    assert.equal(getEarthlyBranchByHour(11), '午');
});
