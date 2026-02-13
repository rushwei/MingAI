import test from 'node:test';
import assert from 'node:assert/strict';

import * as mcpCore from '../dist/index.js';

test('liuyao tool description guides target selection by question semantics', () => {
  const tool = mcpCore.tools.find((item) => item.name === 'liuyao_analyze');
  assert.ok(tool, 'liuyao_analyze tool missing');
  assert.equal(tool.inputSchema?.required?.includes('yongShenTargets'), true);

  assert.match(
    tool.description,
    /先根据问题语义(选择|判断)目标.*再调用|先判断后调用/u,
    'tool description should mention semantic target selection before invocation',
  );
  assert.doesNotMatch(
    tool.description,
    /rankScore|排序分/u,
    'tool description should not expose score fields',
  );

  const yongShenTargets = tool.inputSchema?.properties?.yongShenTargets;
  assert.equal(yongShenTargets?.type, 'array');
  assert.match(
    yongShenTargets?.description ?? '',
    /父母|兄弟|子孙|妻财|官鬼/u,
    'yongShenTargets description should include scenario hints',
  );
  assert.match(
    yongShenTargets?.description ?? '',
    /场景|语义|先判断|有问题时必填|不再自动/u,
    'yongShenTargets description should include conditional usage guidance',
  );
  assert.match(
    yongShenTargets?.description ?? '',
    /功名求官|文书证件|子女后辈|同辈竞争|钱财交易/u,
    'yongShenTargets description should include classic scenario hints',
  );

  const yongShenProps = tool.outputSchema?.properties?.yongShen?.items?.properties;
  assert.equal(yongShenProps?.selected, undefined, 'selected output should be removed');
  assert.equal(yongShenProps?.source, undefined, 'source output should be removed');
  const candidates = tool.outputSchema?.properties?.yongShen?.items?.properties?.candidates;
  assert.match(candidates?.description ?? '', /顺序|排序|越后|参考|主用神/u);
  assert.equal(candidates?.items?.properties?.rankScore, undefined, 'candidate output should hide rankScore');
  assert.equal(tool.outputSchema?.properties?.rankScoreNote, undefined, 'rankScoreNote should be removed');
});
