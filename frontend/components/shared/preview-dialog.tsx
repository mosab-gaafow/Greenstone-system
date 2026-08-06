'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, ExternalLink, LoaderCircle, X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

export interface PreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  previewUrl: string;
  downloadUrl?: string;
  mimeType?: string;
  onClose?: () => void;
}

function PreviewDialogInner({ open, onOpenChange, title, previewUrl, downloadUrl, mimeType, onClose }: PreviewDialogProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  const isPdf = mimeType === 'application/pdf';
  const isImage = mimeType?.startsWith('image/');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch(previewUrl, { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok || cancelled) throw new Error('Failed');
        const blob = await res.blob();
        if (!cancelled) {
          const url = URL.createObjectURL(blob);
          setObjectUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return url; });
        }
      })
      .catch(() => { if (!cancelled) { setError('Could not load the preview.'); setObjectUrl(null); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    if (objectUrl) { URL.revokeObjectURL(objectUrl); setObjectUrl(null); }
    setError(null);
    onClose?.();
  }, [objectUrl, onOpenChange, onClose]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="!max-w-[95vw] !w-[95vw] h-[95vh] !p-0 flex flex-col bg-[#1e1e1e] border-0 rounded-lg overflow-hidden" showCloseButton={false}>
        <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] text-white shrink-0">
          <span className="text-sm font-medium truncate mr-4">{title}</span>
          <div className="flex items-center gap-1">
            {downloadUrl && (
              <a href={downloadUrl} download className="inline-flex items-center justify-center size-8 rounded-md text-white/80 hover:text-white hover:bg-white/10" title="Download" aria-label="Download file">
                <Download className="size-4" />
              </a>
            )}
            <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center size-8 rounded-md text-white/80 hover:text-white hover:bg-white/10" title="Open in new tab" aria-label="Open in new tab">
              <ExternalLink className="size-4" />
            </a>
            <button type="button" className="inline-flex items-center justify-center size-8 rounded-md text-white/80 hover:text-white hover:bg-white/10" title="Close preview" aria-label="Close preview" onClick={handleClose}>
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex items-center justify-center bg-[#1e1e1e]">
          {loading ? (
            <div className="flex flex-col items-center gap-2 text-white/50">
              <LoaderCircle className="size-8 animate-spin" />
              <span className="text-sm">Loading preview…</span>
            </div>
          ) : error ? (
            <div className="text-white/50 text-sm">{error}</div>
          ) : objectUrl && isPdf ? (
            <iframe src={objectUrl} className="w-full h-full border-0" title={title} />
          ) : objectUrl && isImage ? (
            <img src={objectUrl} alt={title} className="max-w-full max-h-full object-contain" />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PreviewDialog(props: PreviewDialogProps) {
  // Key by open+url: forces a fresh mount each time a new preview opens,
  // so the inner component's useEffect always fires.
  const key = useMemo(() => `${props.open}-${props.previewUrl}`, [props.open, props.previewUrl]);
  return <PreviewDialogInner key={key} {...props} />;
}
