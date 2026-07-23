// ====== Ad Slot Component ======
// Empty reserved slots behind adsEnabled flag. No ad network yet.

export const adsEnabled = false;

interface AdSlotProps {
  /** Unique id for the slot */
  id: string;
  /** Size variant: 'banner' (320x50) or 'rectangle' (300x250) */
  size?: 'banner' | 'rectangle';
}

export function AdSlot({ id, size = 'banner' }: AdSlotProps) {
  if (!adsEnabled) {
    // Reserved empty space — nothing shifts when ads fill later
    const height = size === 'banner' ? 50 : 250;
    return (
      <div
        id={`ad-${id}`}
        className="ad-slot"
        style={{ minHeight: height, width: '100%', maxWidth: 320 }}
        aria-hidden="true"
      />
    );
  }

  // When adsEnabled flips to true, this mounts the ad container
  return (
    <div
      id={`ad-${id}`}
      className="ad-slot ad-slot--active"
      style={{ minHeight: size === 'banner' ? 50 : 250, width: '100%', maxWidth: 320 }}
    />
  );
}