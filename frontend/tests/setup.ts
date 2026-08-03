import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// The frontend reads configuration at import time, so it must be present
// before any module under test is loaded.
process.env.NEXT_PUBLIC_BACKEND_URL ??= 'http://localhost:4000';

// jsdom does not implement ResizeObserver. Base UI's Popover (used by
// SearchableSelect and every Dialog-based form) needs it to position and
// mount its content — without this stub, opening a popover in a test
// silently does nothing.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
}

afterEach(() => {
  cleanup();
});
