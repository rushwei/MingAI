import test from 'node:test';
import assert from 'node:assert/strict';

test('getProvider should fall back to generic openai-compatible provider for unknown chat vendors', async () => {
  const { getProvider } = await import('../lib/ai/providers');

  const provider = getProvider({
    id: 'gpt-5.4',
    name: 'ChatGPT 5.4',
    vendor: 'ChatGPT' as never,
    usageType: 'chat',
    modelId: 'gpt-5.4',
    apiUrl: 'https://newapi.example/v1/chat/completions',
    apiKeyEnvVar: 'NEWAPI_API_KEY',
    supportsReasoning: true,
  });

  assert.equal(provider.vendor, 'openai');
});
