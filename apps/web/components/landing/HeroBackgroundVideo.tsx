// apps/web/components/landing/HeroBackgroundVideo.tsx
'use client';

interface HeroBackgroundVideoProps {
  videoId?: string;
  title?: string;
}

export default function HeroBackgroundVideo({
  videoId = 'Z8p3672toPU',
  title = 'Servora Hospitality Platform Ambient Background Video',
}: HeroBackgroundVideoProps) {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 -z-10 overflow-hidden pointer-events-none select-none bg-servora-pale"
    >
      {/* Full-bleed responsive 16:9 cover wrapper */}
      <div className="absolute inset-0 flex items-center justify-center motion-reduce:hidden">
        <iframe
          className="w-[177.78vh] min-w-full h-[56.25vw] min-h-full scale-110 opacity-75 border-0"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&rel=0&modestbranding=1&playsinline=1&disablekb=1&fs=0&iv_load_policy=3`}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          tabIndex={-1}
        />
      </div>

      {/* Directional scrim: stronger behind left text, clearer across the right/center */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/85 via-white/55 to-servora-pale/35" />

      {/* Subtle top & bottom blend into the page */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-servora-pale/90" />
    </div>
  );
}