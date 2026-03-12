"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type ProductMediaGalleryProps = {
  galeria?: string[];
  imagen?: string;
  nombre: string;
};

const isVideoUrl = (url?: string) => {
  if (!url) return false;
  return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);
};

export default function ProductMediaGallery({
  galeria,
  imagen,
  nombre,
}: ProductMediaGalleryProps) {
  const media =
    galeria && galeria.length > 0
      ? galeria
      : [imagen || "/placeholder.jpg"];

  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);

  const mediaActiva = media[activeIndex];

  const thumbsContainerRef = useRef<HTMLDivElement | null>(null);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const scrollThumbs = (direction: "up" | "down") => {
    const el = thumbsContainerRef.current;
    if (!el) return;

    const amount = 160;

    el.scrollBy({
      top: direction === "down" ? amount : -amount,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    const activeThumb = thumbRefs.current[activeIndex];
    if (!activeThumb) return;

    activeThumb.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [activeIndex]);

  const goPrevImage = () => {
    setActiveIndex((prev) => (prev === 0 ? media.length - 1 : prev - 1));
  };

  const goNextImage = () => {
    setActiveIndex((prev) => (prev === media.length - 1 ? 0 : prev + 1));
  };

  return (
    <>
      <div className="sticky top-24">
        <div className="flex gap-6 h-[520px] items-stretch">
          <div className="flex flex-col items-center gap-2 w-24 shrink-0 h-full">
            <button
              type="button"
              onClick={() => scrollThumbs("up")}
              className="z-20 w-full h-8 rounded-md border border-gray-300 bg-white/90 backdrop-blur text-base hover:bg-gray-100 transition"
              aria-label="Subir miniaturas"
            >
              ˄
            </button>

            <div className="relative w-24 flex-1 min-h-0">
              <div className="pointer-events-none absolute top-0 left-0 right-0 z-10 h-5 bg-gradient-to-b from-white/55 to-transparent rounded-t-md" />
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-5 bg-gradient-to-t from-white/55 to-transparent rounded-b-md" />

              <div
                ref={thumbsContainerRef}
                className="hide-scrollbar flex h-full flex-col gap-3 overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none]"
                style={{ scrollbarWidth: "none" }}
              >
                {media.map((item, i) => {
                  const isActive = activeIndex === i;
                  const esVideo = isVideoUrl(item);

                  return (
                    <button
                      ref={(el) => {
                        thumbRefs.current[i] = el;
                      }}
                      type="button"
                      key={`${nombre}-media-${i}`}
                      onClick={() => setActiveIndex(i)}
                      className={`group relative overflow-hidden rounded-md border-2 transition-all duration-200 shrink-0 ${
                        isActive
                          ? "border-black shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
                          : "border-gray-200 hover:border-gray-400"
                      }`}
                      aria-pressed={isActive}
                    >
                      {esVideo ? (
                        <video
                          src={item}
                          autoPlay
                          loop
                          muted
                          playsInline
                          preload="metadata"
                          className="w-[90px] h-[120px] object-cover"
                        />
                      ) : (
                        <Image
                          src={item}
                          alt={`${nombre} ${i + 1}`}
                          width={90}
                          height={120}
                          className="object-cover"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => scrollThumbs("down")}
              className="z-20 w-full h-8 rounded-md border border-gray-300 bg-white/90 backdrop-blur text-base hover:bg-gray-100 transition"
              aria-label="Bajar miniaturas"
            >
              ˅
            </button>
          </div>

          <div className="flex-1 h-full min-h-0">
            <div
              className={`relative h-full w-full overflow-hidden rounded-md bg-white ${
                isVideoUrl(mediaActiva) ? "" : "cursor-zoom-in"
              }`}
              onClick={() => setZoomOpen(true)}
            >
              {isVideoUrl(mediaActiva) ? (
                <video
                  key={mediaActiva}
                  src={mediaActiva}
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="metadata"
                  className="h-full w-full object-cover"
                />
              ) : (
                <Image
                  key={mediaActiva}
                  src={mediaActiva}
                  alt={nombre}
                  fill
                  className="object-cover transition-transform duration-500 ease-in-out hover:scale-110"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {zoomOpen && (
        <div
          className="fixed inset-0 z-[9999] bg-black/95"
          onClick={() => setZoomOpen(false)}
        >
          {media.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goPrevImage();
                }}
                className="absolute left-3 top-1/2 z-[10000] -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white text-3xl backdrop-blur"
                aria-label="Elemento anterior"
              >
                ‹
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goNextImage();
                }}
                className="absolute right-3 top-1/2 z-[10000] -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white text-3xl backdrop-blur"
                aria-label="Elemento siguiente"
              >
                ›
              </button>
            </>
          )}

          <div className="flex h-full w-full items-center justify-center p-4">
            <div
              className="relative h-full w-full max-w-[900px]"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setZoomOpen(false);
                }}
                className="absolute top-3 right-3 z-[10000] flex h-10 w-10 items-center justify-center rounded-full bg-black/25 text-white text-2xl leading-none backdrop-blur-sm transition hover:bg-black/40"
                aria-label="Cerrar visor"
              >
                ×
              </button>

              {isVideoUrl(mediaActiva) ? (
                <video
                  key={mediaActiva}
                  src={mediaActiva}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="h-full w-full object-contain"
                />
              ) : (
                <Image
                  key={mediaActiva}
                  src={mediaActiva}
                  alt={nombre}
                  fill
                  className="object-contain"
                  sizes="100vw"
                  priority
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}