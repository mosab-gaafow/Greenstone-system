import { getEnv } from '../../config/env.js';
import { StubPdfRenderer } from './renderers/stub.renderer.js';
import { PlaywrightPdfRenderer } from './renderers/playwright.renderer.js';
import type { PdfRenderer, RenderPdfInput, RenderedPdf } from './pdf.types.js';

/**
 * PDF entry point. Business modules call this, not a renderer directly.
 */

let cachedRenderer: PdfRenderer | undefined;

export function getPdfRenderer(): PdfRenderer {
  if (!cachedRenderer) {
    const { PDF_RENDERER } = getEnv();

    switch (PDF_RENDERER) {
      case 'stub':
        cachedRenderer = new StubPdfRenderer();
        break;
      case 'playwright':
        cachedRenderer = new PlaywrightPdfRenderer();
        break;
      default: {
        const exhaustive: never = PDF_RENDERER;
        throw new Error(`Unsupported PDF renderer: ${String(exhaustive)}`);
      }
    }
  }

  return cachedRenderer;
}

/** Clears the cached renderer. Test-only. */
export function resetPdfRendererCache(): void {
  cachedRenderer = undefined;
}

export async function renderPdf(input: RenderPdfInput): Promise<RenderedPdf> {
  return getPdfRenderer().render(input);
}
