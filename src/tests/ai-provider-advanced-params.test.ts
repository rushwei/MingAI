import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NEWAPI_API_KEY = 'test-newapi-key';

type CapturedRequestBody = {
  temperature?: number;
  top_p?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  max_tokens?: number;
  reasoning?: {
    effort?: string;
  };
  enable_search?: boolean;
};

test('openai-compatible provider should send Cherry-like advanced defaults and omit max_tokens when unset', async (t) => {
  const { OpenAICompatibleProvider } = await import('../lib/ai/providers/openai-compatible');

  const originalFetch = global.fetch;
  let capturedBody: CapturedRequestBody | null = null;

  global.fetch = (async (_input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    capturedBody = JSON.parse(String(init?.body || '{}')) as CapturedRequestBody;
    return Response.json({
      choices: [{ message: { content: 'ok' } }],
    });
  }) as typeof fetch;

  t.after(() => {
    global.fetch = originalFetch;
  });

  const provider = new OpenAICompatibleProvider('qwen');
  await provider.chat(
    [{ role: 'user', content: 'hello' }],
    'system',
    {
      id: 'qwen-max',
      name: 'Qwen Max',
      vendor: 'qwen',
      modelId: 'qwen-max',
      apiUrl: 'https://newapi.example/v1/chat/completions',
      apiKeyEnvVar: 'NEWAPI_API_KEY',
      supportsReasoning: true,
      defaultTemperature: 0.7,
      defaultTopP: 1,
      defaultMaxTokens: undefined,
      defaultReasoningEffort: 'high',
      reasoningEffortFormat: 'reasoning_object',
      customParameters: {
        enable_search: false,
        presence_penalty: 0.5,
        frequency_penalty: 0.2,
      },
    },
    { reasoning: true }
  );

  if (!capturedBody) {
    throw new Error('request body should be captured');
  }
  const requestBody: CapturedRequestBody = capturedBody;
  assert.equal(requestBody.temperature, 0.7);
  assert.equal(requestBody.top_p, 1);
  assert.equal(requestBody.presence_penalty, 0.5);
  assert.equal(requestBody.frequency_penalty, 0.2);
  assert.equal('max_tokens' in requestBody, false);
  assert.deepEqual(requestBody.reasoning, { effort: 'high' });
  assert.equal(requestBody.enable_search, false);
});
