import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// The frontend reads configuration at import time, so it must be present
// before any module under test is loaded.
process.env.NEXT_PUBLIC_BACKEND_URL ??= 'http://localhost:4000';

afterEach(() => {
  cleanup();
});
