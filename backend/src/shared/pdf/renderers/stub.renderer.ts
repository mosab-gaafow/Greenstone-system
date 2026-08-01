import { InternalServerError } from '../../errors/app-error.js';
import type { PdfRenderer, RenderPdfInput, RenderedPdf } from '../pdf.types.js';

/**
 * Placeholder renderer.
 *
 * Phase 1 defines the PDF abstraction without committing to a rendering engine.
 * The real renderer arrives in Phase 5 with the first official PDF (quotations),
 * per docs/technical-blueprint.md section 9.3.
 */
export class StubPdfRenderer implements PdfRenderer {
  readonly name = 'stub';

  render(_input: RenderPdfInput): Promise<RenderedPdf> {
    throw new InternalServerError(
      'PDF rendering is not implemented yet. A renderer is added in Phase 5.',
    );
  }
}
