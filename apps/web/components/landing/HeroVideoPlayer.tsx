// apps/web/components/landing/HeroVideoPlayer.tsx
'use client';

import { useState } from 'react';

const VIDEO_ID = 'Z8p3672toPU';

export default function HeroVideoPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="relative w-full mx-auto">
      {/* Ambient background glow */}
      <div
        aria-hidden="true"
        className="absolute -inset-2 rounded-3xl bg-gradient-to-tr from-servora-core via-servora-bright to-servora-teal opacity-20 blur-2xl pointer-events-none"
      />

      {/* Main 16:9 Enterprise Video Frame */}
      <div className="relative rounded-2xl sm:rounded-3xl bg-servora-navy p-2 sm:p-3 shadow-2xl ring-1 ring-white/15 overflow-hidden">
        {/* Top Browser / Terminal Chrome Bar */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 mb-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
            <span className="ml-2 text-[11px] font-mono text-gray-300 truncate">
              servora.mavoratechnologies.com &bull; Platform Overview (0:46)
            </span>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-servora-teal/20 px-2.5 py-0.5 text-[10px] font-bold text-servora-teal ring-1 ring-inset ring-servora-teal/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            HD Walkthrough
          </span>
        </div>

        {/* 16:9 Aspect Ratio Container */}
        <div className="relative aspect-video w-full overflow-hidden rounded-xl sm:rounded-2xl bg-slate-950">
          {!isPlaying ? (
            <button
              type="button"
              onClick={() => setIsPlaying(true)}
              aria-label="Play Servora Promotional Video: Premium Hotel & Restaurant Management System"
              className="group relative w-full h-full flex items-center justify-center text-left focus:outline-none cursor-pointer"
            >
              {/* Official YouTube High-Res Thumbnail with Fallback */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://i.ytimg.com/vi/${VIDEO_ID}/maxresdefault.jpg`}
                alt="Servora Hotel and Restaurant Management System Promotional Video Preview"
                className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105 opacity-90"
                loading="eager"
              />

              {/* Subtle Gradient Overlay for Contrast */}
              <div className="absolute inset-0 bg-gradient-to-t from-servora-navy/90 via-servora-navy/30 to-transparent" />

              {/* Center Play Button */}
              <div className="relative z-10 flex flex-col items-center gap-3">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-servora-core/95 text-white flex items-center justify-center shadow-2xl shadow-servora-core/50 ring-4 ring-white/20 transition-all duration-300 group-hover:scale-110 group-hover:bg-servora-bright">
                  <svg
                    className="w-7 h-7 sm:w-8 sm:h-8 translate-x-0.5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-servora-navy/85 backdrop-blur-md px-4 py-1.5 text-xs font-bold text-white ring-1 ring-white/20 shadow-lg">
                  Watch Servora in Action (0:46)
                </span>
              </div>

              {/* Bottom Floating Video Highlights */}
              <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
                <div className="flex items-center gap-2 rounded-lg bg-servora-navy/85 backdrop-blur-md px-3 py-1.5 border border-white/15">
                  <span className="w-2 h-2 rounded-full bg-servora-teal" />
                  <span className="text-[11px] font-semibold text-white">
                    Front-of-House POS &bull; Live KDS &bull; Recipe BOM &bull; BI Analytics
                  </span>
                </div>
              </div>
            </button>
          ) : (
            <iframe
              className="absolute inset-0 w-full h-full border-0"
              src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1&rel=0&modestbranding=1`}
              title="SERVORA – PREMIUM HOTEL & RESTAURANT MANAGEMENT SYSTEM"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          )}
        </div>

        {/* Noscript / Fallback Link */}
        <div className="mt-2 px-2 flex items-center justify-between text-[11px] text-gray-300">
          <span>Official Platform Walkthrough by Mavora Technologies</span>
          <a
            href={`https://youtu.be/${VIDEO_ID}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-servora-teal hover:underline font-semibold"
          >
            Open on YouTube &nearr;
          </a>
        </div>
      </div>
    </div>
  );
}