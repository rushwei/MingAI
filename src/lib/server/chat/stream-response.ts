import { useCredit as deductCredit } from '@/lib/user/credits';

type ChatStreamResponseParams = {
  streamBody: ReadableStream<Uint8Array>;
  metadata: unknown;
  userId: string | null;
  canSkipCredit: boolean;
};

export function createChatStreamResponse({
  streamBody,
  metadata,
  userId,
  canSkipCredit,
}: ChatStreamResponseParams): Response {
  const encoder = new TextEncoder();
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  let cancelled = false;

  const cancelUpstream = async () => {
    cancelled = true;
    try {
      if (reader) {
        await reader.cancel();
      } else {
        await streamBody.cancel();
      }
    } catch {
      // ignore cancel failures
    }
  };

  const wrapped = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'meta', metadata })}\n\n`));
      reader = streamBody.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = '';
      let streamCreditDeducted = false;

      const tryDeductCreditOnFirstToken = async (chunk: Uint8Array) => {
        if (!userId || canSkipCredit || streamCreditDeducted) return;
        sseBuffer += decoder.decode(chunk, { stream: true });
        const lines = sseBuffer.split('\n');
        sseBuffer = lines.pop() ?? '';

        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line.startsWith('data:')) continue;
          const payload = line.replace(/^data:\s*/, '');
          if (!payload || payload === '[DONE]') continue;

          let parsed: unknown;
          try {
            parsed = JSON.parse(payload);
          } catch {
            continue;
          }

          const content = (parsed as { choices?: Array<{ delta?: { content?: unknown } }> })?.choices?.[0]?.delta?.content;
          if (typeof content === 'string' && content.length > 0) {
            const remaining = await deductCredit(userId);
            if (remaining === null) {
              throw new Error('CREDIT_DEDUCTION_FAILED');
            }
            streamCreditDeducted = true;
            return;
          }
        }
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done || cancelled) break;
          await tryDeductCreditOnFirstToken(value);
          if (cancelled) break;
          controller.enqueue(value);
        }
        if (!cancelled) {
          controller.close();
        }
      } catch (streamError) {
        if (cancelled) {
          return;
        }
        console.error('[chat] 流式读取失败:', streamError);
        await cancelUpstream();
        if (streamError instanceof Error && streamError.message === 'CREDIT_DEDUCTION_FAILED') {
          try {
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({ type: 'error', code: 'INSUFFICIENT_CREDITS', error: '积分不足，请充值后继续使用' })}\n\n`
            ));
            controller.close();
          } catch {
            // controller may already be closed
          }
        } else {
          controller.error(streamError);
        }
      } finally {
        decoder.decode();
        reader?.releaseLock();
      }
    },
    async cancel() {
      await cancelUpstream();
    },
  });

  return new Response(wrapped, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
