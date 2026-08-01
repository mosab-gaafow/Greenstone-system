import { cn } from '@/lib/utils';

/**
 * Hollow-block masonry, drawn to scale.
 *
 * Greenstone makes hollow blocks, so the brand surface is built from the
 * product itself rather than from a generic gradient: blocks laid in running
 * bond, each course offset by half a block, every block showing its two voids.
 *
 * It is drawn as an SVG pattern so it stays sharp at any size and costs nothing
 * to download. Decorative, so it is hidden from assistive technology.
 */
export function Blockwork({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={cn('h-full w-full', className)}>
      <defs>
        {/*
         * One tile holds two courses. Blocks are 90 wide on a 96 pitch, which
         * leaves 6 for the mortar joint. The second course starts half a block
         * across, which is what makes it running bond rather than stack bond.
         */}
        <pattern id="greenstone-bond" width="192" height="96" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="currentColor" strokeWidth="1.25">
            {/* Upper course */}
            <BlockFace x={0} y={0} />
            <BlockFace x={96} y={0} />

            {/* Lower course, offset by half a block */}
            <BlockFace x={-48} y={48} />
            <BlockFace x={48} y={48} />
            <BlockFace x={144} y={48} />
          </g>
        </pattern>
      </defs>

      <rect width="100%" height="100%" fill="url(#greenstone-bond)" />
    </svg>
  );
}

/** A single block face: the outline plus its two voids. */
function BlockFace({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${String(x)} ${String(y)})`}>
      <rect x="0" y="0" width="90" height="42" />
      <rect x="10" y="9" width="30" height="24" />
      <rect x="50" y="9" width="30" height="24" />
    </g>
  );
}
