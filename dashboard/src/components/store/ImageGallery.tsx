"use client";

import { useState, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, ZoomIn, Play, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface GalleryImage {
  id: string;
  url: string;
  alt: string | null;
  sortOrder: number;
}

interface ImageGalleryProps {
  images: GalleryImage[];
  productName: string;
  videoUrl?: string | null;
  videoThumbnail?: string | null;
}

export function ImageGallery({
  images,
  productName,
  videoUrl,
  videoThumbnail,
}: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [isZooming, setIsZooming] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);

  // Build combined media list (images + video at end)
  const hasVideo = !!videoUrl;
  const mediaCount = images.length + (hasVideo ? 1 : 0);
  const isVideoSelected = hasVideo && selectedIndex === images.length;

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!mainRef.current || isVideoSelected) return;
      const rect = mainRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setZoomPos({ x, y });
    },
    [isVideoSelected],
  );

  const prev = () =>
    setSelectedIndex((i) => (i - 1 + mediaCount) % mediaCount);
  const next = () => setSelectedIndex((i) => (i + 1) % mediaCount);

  if (images.length === 0 && !hasVideo) {
    return (
      <div className="aspect-[3/4] rounded-xl border bg-secondary flex items-center justify-center text-muted-foreground">
        <svg
          className="h-20 w-20"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  const currentImage = !isVideoSelected ? images[selectedIndex] : null;

  return (
    <>
      <div className="space-y-3">
        {/* Main image / video */}
        <div
          ref={mainRef}
          className="group relative aspect-[3/4] overflow-hidden rounded-xl border bg-secondary cursor-zoom-in"
          onMouseEnter={() => !isVideoSelected && setIsZooming(true)}
          onMouseLeave={() => setIsZooming(false)}
          onMouseMove={handleMouseMove}
          onClick={() => setLightboxOpen(true)}
        >
          {isVideoSelected ? (
            <div className="h-full w-full flex items-center justify-center bg-black">
              <iframe
                src={videoUrl!}
                title={productName}
                className="h-full w-full"
                allowFullScreen
              />
            </div>
          ) : currentImage ? (
            <img
              src={currentImage.url}
              alt={currentImage.alt || productName}
              className={cn(
                "h-full w-full object-cover transition-transform duration-300",
                isZooming && "scale-150",
              )}
              style={
                isZooming
                  ? { transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` }
                  : undefined
              }
              draggable={false}
            />
          ) : null}

          {/* Zoom hint */}
          {!isVideoSelected && !isZooming && (
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-lg bg-background/80 px-2.5 py-1.5 text-xs font-medium text-muted-foreground opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
              <ZoomIn className="h-3.5 w-3.5" />
              Click to expand
            </div>
          )}

          {/* Prev / Next arrows */}
          {mediaCount > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-background/80 text-foreground shadow backdrop-blur-sm opacity-0 transition-opacity group-hover:opacity-100 hover:bg-background"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-background/80 text-foreground shadow backdrop-blur-sm opacity-0 transition-opacity group-hover:opacity-100 hover:bg-background"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
        </div>

        {/* Thumbnails */}
        {mediaCount > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {images.map((img, i) => (
              <button
                key={img.id}
                onClick={() => setSelectedIndex(i)}
                className={cn(
                  "h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-all",
                  i === selectedIndex
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-transparent hover:border-border",
                )}
              >
                <img
                  src={img.url}
                  alt={img.alt || `${productName} ${i + 1}`}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
            {hasVideo && (
              <button
                onClick={() => setSelectedIndex(images.length)}
                className={cn(
                  "relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-all",
                  selectedIndex === images.length
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-transparent hover:border-border",
                )}
              >
                {videoThumbnail ? (
                  <img
                    src={videoThumbnail}
                    alt="Video"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-secondary">
                    <Play className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Play className="h-4 w-4 fill-white text-white" />
                </div>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm"
            onClick={() => setLightboxOpen(false)}
          >
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Counter */}
            <div className="absolute left-4 top-4 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium text-white">
              {selectedIndex + 1} / {mediaCount}
            </div>

            {/* Prev / Next */}
            {mediaCount > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    prev();
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    next();
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            {/* Lightbox content */}
            <motion.div
              key={selectedIndex}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="max-h-[85vh] max-w-[85vw]"
              onClick={(e) => e.stopPropagation()}
            >
              {isVideoSelected ? (
                <div className="aspect-video w-[80vw] max-w-4xl rounded-xl overflow-hidden">
                  <iframe
                    src={videoUrl!}
                    title={productName}
                    className="h-full w-full"
                    allowFullScreen
                  />
                </div>
              ) : currentImage ? (
                <img
                  src={currentImage.url}
                  alt={currentImage.alt || productName}
                  className="max-h-[85vh] max-w-[85vw] rounded-xl object-contain"
                />
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
