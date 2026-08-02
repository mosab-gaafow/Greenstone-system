import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import { InternalServerError } from '../../errors/app-error.js';
import type { PdfRenderer, RenderPdfInput, RenderedPdf } from '../pdf.types.js';

/**
 * Real PDF renderer, per docs/technical-blueprint.md section 9.3.
 *
 * Launches a fresh, isolated Chromium instance per render and closes it
 * immediately after. Official documents are generated rarely enough (an
 * invoice or receipt at a time, never in bulk) that a persistent browser
 * pool would add complexity this volume does not need.
 */
export class PlaywrightPdfRenderer implements PdfRenderer {
  readonly name = 'playwright';

  async render(input: RenderPdfInput): Promise<RenderedPdf> {
    const browser = await chromium.launch({ headless: true });

    try {
      const page = await browser.newPage();
      // Chromium's print-to-pdf reads the PDF Title metadata from the
      // document's own `<title>` tag — the caller's HTML must set it to
      // `input.documentTitle` (see pdf.types.ts).
      await page.setContent(input.html, { waitUntil: 'load' });

      const content = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '16mm', bottom: '16mm', left: '14mm', right: '14mm' },
        displayHeaderFooter: false,
        tagged: true,
      });

      return { content, checksum: createHash('sha256').update(content).digest('hex') };
    } catch (error) {
      throw new InternalServerError('The PDF could not be generated.', { cause: error });
    } finally {
      await browser.close();
    }
  }
}
