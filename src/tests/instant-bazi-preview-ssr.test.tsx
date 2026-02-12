import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToString } from 'react-dom/server';
import { InstantBaziPreview } from '@/components/bazi/InstantBaziPreview';

const RealDate = Date;

const mockDate = (iso: string) => {
    const fixed = new RealDate(iso);
    class MockDate extends RealDate {
        constructor(...args: any[]) {
            if (args.length === 0) {
                super(fixed.getTime());
            } else {
                super(args[0] as number);
            }
        }

        static now() {
            return fixed.getTime();
        }
    }

    MockDate.UTC = RealDate.UTC;
    MockDate.parse = RealDate.parse;

    globalThis.Date = MockDate as unknown as DateConstructor;
};

test('InstantBaziPreview SSR output is deterministic across time', () => {
    const originalDate = globalThis.Date;
    try {
        mockDate('2025-01-18T10:00:00Z');
        const firstRender = renderToString(<InstantBaziPreview onUseInstant={() => {}} />);

        mockDate('2025-01-18T10:00:05Z');
        const secondRender = renderToString(<InstantBaziPreview onUseInstant={() => {}} />);

        assert.strictEqual(firstRender, secondRender);
    } finally {
        globalThis.Date = originalDate;
    }
});
