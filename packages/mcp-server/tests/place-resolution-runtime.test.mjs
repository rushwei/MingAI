import test from 'node:test';
import assert from 'node:assert/strict';

import { buildListToolsPayload } from '@mingai/core/mcp';

test('mcp server runtime place resolution should geocode city-level birthPlace when longitude is absent', async (t) => {
  const originalFetch = global.fetch;
  const originalKey = process.env.AMAP_WEB_SERVICE_KEY;
  process.env.AMAP_WEB_SERVICE_KEY = 'test-amap-key';

  global.fetch = async () => new Response(JSON.stringify({
    status: '1',
    geocodes: [
      {
        formatted_address: '广东省河源市',
        location: '114.700215,23.744276',
        adcode: '441600',
        level: '市',
      },
    ],
  }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

  t.after(() => {
    global.fetch = originalFetch;
    if (originalKey === undefined) {
      delete process.env.AMAP_WEB_SERVICE_KEY;
    } else {
      process.env.AMAP_WEB_SERVICE_KEY = originalKey;
    }
  });

  const { preprocessToolArgsForRuntimePlace } = await import('../dist/place-resolution.js');
  const result = await preprocessToolArgsForRuntimePlace('ziwei_calculate', {
    gender: 'male',
    birthYear: 1990,
    birthMonth: 1,
    birthDay: 1,
    birthHour: 12,
    birthPlace: '广东河源',
  });

  assert.equal(result.toolArgs.longitude, 114.700215);
  assert.equal(result.placeResolutionInfo?.source, 'birth_place');
  assert.equal(result.placeResolutionInfo?.trueSolarTimeApplied, true);
  assert.equal(result.placeResolutionInfo?.level, '市');
});

test('mcp server runtime place resolution should preserve manual longitude and skip geocoding', async (t) => {
  const originalFetch = global.fetch;
  const originalKey = process.env.AMAP_WEB_SERVICE_KEY;
  process.env.AMAP_WEB_SERVICE_KEY = 'test-amap-key';

  global.fetch = async () => {
    throw new Error('fetch should not be called when longitude already exists');
  };

  t.after(() => {
    global.fetch = originalFetch;
    if (originalKey === undefined) {
      delete process.env.AMAP_WEB_SERVICE_KEY;
    } else {
      process.env.AMAP_WEB_SERVICE_KEY = originalKey;
    }
  });

  const { preprocessToolArgsForRuntimePlace } = await import('../dist/place-resolution.js');
  const result = await preprocessToolArgsForRuntimePlace('bazi_calculate', {
    gender: 'male',
    birthYear: 1990,
    birthMonth: 1,
    birthDay: 1,
    birthHour: 12,
    birthPlace: '广东河源',
    longitude: 114.7,
  });

  assert.equal(result.toolArgs.longitude, 114.7);
  assert.equal(result.placeResolutionInfo?.source, 'manual_longitude');
  assert.equal(result.placeResolutionInfo?.trueSolarTimeApplied, true);
});

test('mcp server runtime place resolution should degrade on province-level geocode precision', async (t) => {
  const originalFetch = global.fetch;
  const originalKey = process.env.AMAP_WEB_SERVICE_KEY;
  process.env.AMAP_WEB_SERVICE_KEY = 'test-amap-key';

  global.fetch = async () => new Response(JSON.stringify({
    status: '1',
    geocodes: [
      {
        formatted_address: '广东省',
        location: '113.266887,23.133306',
        adcode: '440000',
        level: '省',
      },
    ],
  }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

  t.after(() => {
    global.fetch = originalFetch;
    if (originalKey === undefined) {
      delete process.env.AMAP_WEB_SERVICE_KEY;
    } else {
      process.env.AMAP_WEB_SERVICE_KEY = originalKey;
    }
  });

  const { preprocessToolArgsForRuntimePlace } = await import('../dist/place-resolution.js');
  const result = await preprocessToolArgsForRuntimePlace('ziwei_horoscope', {
    gender: 'male',
    birthYear: 1990,
    birthMonth: 1,
    birthDay: 1,
    birthHour: 12,
    birthPlace: '广东省',
  });

  assert.equal(result.toolArgs.longitude, undefined);
  assert.equal(result.placeResolutionInfo?.source, 'fallback');
  assert.equal(result.placeResolutionInfo?.fallbackReason, 'precision_too_low');
  assert.equal(result.placeResolutionInfo?.trueSolarTimeApplied, false);
});

test('mcp server tool payload should advertise runtime birthPlace resolution without changing core itself', async () => {
  const { decorateToolListPayloadForRuntime } = await import('../dist/place-resolution.js');

  const corePayload = buildListToolsPayload();
  const ziweiCore = corePayload.tools.find((tool) => tool.name === 'ziwei_calculate');
  assert.equal(typeof ziweiCore?.inputSchema?.properties?.birthPlace, 'undefined');

  const decorated = decorateToolListPayloadForRuntime(corePayload);
  const ziweiTool = decorated.tools.find((tool) => tool.name === 'ziwei_calculate');
  const baziTool = decorated.tools.find((tool) => tool.name === 'bazi_calculate');

  assert.equal(typeof ziweiTool?.inputSchema?.properties?.birthPlace, 'object');
  assert.equal(typeof ziweiTool?.outputSchema?.properties?.placeResolutionInfo, 'object');
  assert.equal(typeof baziTool?.inputSchema?.properties?.birthPlace, 'object');
  assert.equal(typeof baziTool?.outputSchema?.properties?.placeResolutionInfo, 'object');
});

test('mcp server runtime place resolution should preserve invalid non-object args for core validation', async () => {
  const { preprocessToolArgsForRuntimePlace } = await import('../dist/place-resolution.js');
  const result = await preprocessToolArgsForRuntimePlace('ziwei_calculate', null);

  assert.equal(result.toolArgs, null);
  assert.equal(result.placeResolutionInfo, undefined);
});
