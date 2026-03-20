import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { buildListToolsPayload } from '@mingai/core/transport';

const indexPath = resolve(process.cwd(), 'packages/mcp-server/src/index.ts');

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
  assert.match(String(ziweiTool?.inputSchema?.properties?.birthPlace?.description), /高德|地点名|地理编码/u);
  assert.match(String(baziTool?.inputSchema?.properties?.longitude?.description), /优先|birthPlace|地点名/u);
});

test('mcp server index should wire runtime place resolution into tool listing and tool calls', async () => {
  const source = await readFile(indexPath, 'utf-8');

  assert.match(source, /decorateToolListPayloadForRuntime/u);
  assert.match(source, /preprocessToolArgsForRuntimePlace/u);
  assert.match(source, /attachPlaceResolutionNoteToPayload/u);
});
