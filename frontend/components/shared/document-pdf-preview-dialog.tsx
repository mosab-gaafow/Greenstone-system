'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, ExternalLink, FileText, LoaderCircle, Printer, RefreshCw, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

export interface DocumentPdfPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  docType: string;
  docNumber: string;
  pdfUrl: string;
  downloadFileName: string;
  onRetry?: () => void;
}

let _previewKeyCounter = 0;

export function DocumentPdfPreviewDialog(props: DocumentPdfPreviewDialogProps) {
  const { open, onOpenChange, docType, docNumber, pdfUrl, downloadFileName } = props;
  const [retryCount, setRetryCount] = useState(0);
  const key = open ? `${++_previewKeyCounter}-${retryCount}` : 0;

  return (
    <DocumentPdfPreviewDialogInner
      key={key}
      open={open}
      onOpenChange={onOpenChange}
      docType={docType}
      docNumber={docNumber}
      pdfUrl={pdfUrl}
      downloadFileName={downloadFileName}
      onRetry={() => setRetryCount((c) => c + 1)}
    />
  );
}

function DocumentPdfPreviewDialogInner({ open, onOpenChange, docType, docNumber, pdfUrl, downloadFileName, onRetry }: DocumentPdfPreviewDialogProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const title = `${docType} ${docNumber}`;

  // Fetch PDF blob with credentials, create object URL.
  useEffect(() => {
    if (!open || !pdfUrl) return;
    let cancelled = false;
    // loading and error already default to true/null from initial state

    fetch(pdfUrl, { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok || cancelled) throw new Error(`Server returned ${res.status}`);
        const ct = res.headers.get('content-type') ?? '';
        if (!ct.includes('application/pdf')) throw new Error('Response is not a PDF.');
        const blob = await res.blob();
        if (blob.size === 0) throw new Error('Received an empty PDF.');
        if (!cancelled) {
          const url = URL.createObjectURL(blob);
          blobUrlRef.current = url;
          setBlobUrl(url);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('PDF fetch error:', err);
          setError(err instanceof Error ? err.message : 'Could not load the document.');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pdfUrl]);

  // Revoke blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, []);

  const retry = useCallback(() => {
    if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }
    setBlobUrl(null);
    setError(null);
    onRetry?.();
  }, [onRetry]);

  const handlePrint = useCallback(() => {
    if (!blobUrl) return;
    const w = window.open(blobUrl, '_blank');
    if (w) {
      w.addEventListener('load', () => w.print(), { once: true });
    }
  }, [blobUrl]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="!max-w-[94vw] !w-[94vw] h-[92dvh] !p-0 flex flex-col gap-0 border shadow-2xl rounded-xl overflow-hidden max-sm:!max-w-[100vw] max-sm:!w-[100vw] max-sm:h-[100dvh] max-sm:rounded-none"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>

        {/* Single header */}
        <div className="flex items-center justify-between px-4 h-14 shrink-0 border-b bg-white max-sm:px-3">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="size-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium truncate">{title}</span>
          </div>
          <div className="flex items-center gap-0.5">
            <a
              href={`${pdfUrl}?disposition=attachment`}
              download={downloadFileName}
              className="inline-flex items-center justify-center size-8 max-sm:size-10 rounded-md hover:bg-accent hover:text-accent-foreground"
              title="Download"
              aria-label={`Download ${title}`}
            >
              <Download className="size-4" />
            </a>
            {blobUrl && (
              <a
                href={blobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center size-8 max-sm:size-10 rounded-md hover:bg-accent hover:text-accent-foreground"
                title="Open in new tab"
                aria-label={`Open ${title} in new tab`}
              >
                <ExternalLink className="size-4" />
              </a>
            )}
            {blobUrl && (
              <button
                type="button"
                className="inline-flex items-center justify-center size-8 max-sm:size-10 rounded-md hover:bg-accent hover:text-accent-foreground"
                title="Print"
                aria-label={`Print ${title}`}
                onClick={handlePrint}
              >
                <Printer className="size-4" />
              </button>
            )}
            <button
              type="button"
              className="inline-flex items-center justify-center size-8 max-sm:size-10 rounded-md hover:bg-accent hover:text-accent-foreground"
              title="Close preview"
              aria-label="Close document preview"
              onClick={() => onOpenChange(false)}
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 bg-muted/30">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground h-full">
              <LoaderCircle className="size-8 animate-spin" />
              <span className="text-sm">Loading document…</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground h-full px-4 text-center">
              <p className="text-sm">Preview is not supported in this browser.</p>
              <p className="text-xs text-muted-foreground/70">{error}</p>
              <div className="flex gap-2">
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
                >
                  <ExternalLink className="size-3.5" /> Open in new tab
                </a>
                <a
                  href={`${pdfUrl}?disposition=attachment`}
                  download={downloadFileName}
                  className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
                >
                  <Download className="size-3.5" /> Download PDF
                </a>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
                  onClick={retry}
                >
                  <RefreshCw className="size-3.5" /> Retry
                </button>
              </div>
            </div>
          ) : blobUrl ? (
            <iframe src={blobUrl} title={title} className="h-full w-full border-0" />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
