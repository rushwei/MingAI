import test from 'node:test';
import assert from 'node:assert/strict';
import * as mcpCore from '@mingai/mcp-core';

test('mcp-core should only expose canonical renamed tool names', async () => {
  const toolNames = new Set(mcpCore.tools.map((item) => item.name));

  for (const name of ['liuyao', 'tarot', 'almanac', 'bazi_dayun']) {
    assert.equal(toolNames.has(name), true, `${name} should remain in the canonical tool list`);
  }

  for (const alias of ['liuyao_analyze', 'tarot_draw', 'daily_fortune', 'dayun_calculate']) {
    assert.equal(toolNames.has(alias), false, `${alias} should not remain as an extra alias tool`);
    await assert.rejects(
      () => mcpCore.handleToolCall(alias, {}),
      /未知工具/u,
      `${alias} should be rejected once tool names have been renamed`,
    );
  }
});
