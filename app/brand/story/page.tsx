// app/brand/story/page.tsx
"use client";

// NOTE: these videos are third-party YouTube films (credited on each card), not Nomadica
// content. TODO(store owner): replace them with brand-owned videos when available, and then
// this page can go back to being "Our Story". The list lives in app/api/travel-shorts/route.ts.

import { useState, useEffect, useRef, useCallback, memo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, X, Loader2, ArrowRight } from "lucide-react";

interface TravelShort {
  id: string;
  videoId: string;
  thumbnail: string;
  title: string;
  channelTitle: string;
}

interface ShortsPage {
  videos: TravelShort[];
  nextPageToken: string | null;
}

async function requestPage(token: string): Promise<ShortsPage> {
  const response = await fetch(`/api/travel-shorts?pageToken=${encodeURIComponent(token)}`);
  if (!response.ok) throw new Error("Failed to fetch travel videos");
  const data = await response.json();
  return { videos: Array.isArray(data.videos) ? data.videos : [], nextPageToken: data.nextPageToken ?? null };
}

const VideoCard = memo(function VideoCard({
  video,
  index,
  onOpen,
}: {
  video: TravelShort;
  index: number;
  onOpen: (video: TravelShort, trigger: HTMLButtonElement) => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => onOpen(video, e.currentTarget)}
      aria-label={`Play video: ${video.title}, by ${video.channelTitle}`}
      className="group relative block w-full overflow-hidden rounded-2xl border border-black/5 bg-[#EFE9E1] text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6B4E37] cursor-pointer"
    >
      <div className="relative w-full aspect-[9/16] overflow-hidden">
        <Image
          src={video.thumbnail}
          alt=""
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 250px"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          priority={index < 4}
        />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10" />

        {/* Play icon: always visible, not only on hover */}
        <div aria-hidden="true" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black shadow-xl transition-transform duration-300 group-hover:scale-110">
            <Play size={20} fill="currentColor" className="ml-1" />
          </div>
        </div>

        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
          <p className="font-sans text-xs font-semibold leading-relaxed text-white line-clamp-2 m-0">{video.title}</p>
          <p className="font-sans text-xs text-white/90 mt-1 mb-0 line-clamp-1">Video by {video.channelTitle}</p>
        </div>
      </div>
    </button>
  );
});

export default function TravelInspirationPage() {
  const [videos, setVideos] = useState<TravelShort[]>([]);
  const [pageToken, setPageToken] = useState<string | null>("1");
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [activeVideo, setActiveVideo] = useState<TravelShort | null>(null);

  const isFetchingRef = useRef(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  const applyPage = useCallback((data: ShortsPage) => {
    setVideos((prev) => {
      const existingIds = new Set(prev.map((v) => v.id));
      return [...prev, ...data.videos.filter((v) => !existingIds.has(v.id))];
    });
    setPageToken(data.nextPageToken);
    setHasLoadedOnce(true);
  }, []);

  // "View more" and "Try again"
  const fetchShorts = useCallback(async (token: string) => {
    if (isFetchingRef.current || !token) return;
    isFetchingRef.current = true;
    setIsLoading(true);
    setLoadError(false);
    try {
      applyPage(await requestPage(token));
    } catch (error) {
      console.error("Error loading travel videos:", error);
      setLoadError(true);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [applyPage]);

  // First page (isLoading starts as true)
  useEffect(() => {
    let cancelled = false;
    isFetchingRef.current = true;
    requestPage("1")
      .then((data) => { if (!cancelled) applyPage(data); })
      .catch((error) => {
        console.error("Error loading travel videos:", error);
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        isFetchingRef.current = false;
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [applyPage]);

  const openVideo = useCallback((video: TravelShort, trigger: HTMLButtonElement) => {
    triggerRef.current = trigger;
    setActiveVideo(video);
    document.body.style.overflow = "hidden";
  }, []);

  const closeVideo = useCallback(() => {
    setActiveVideo(null);
    document.body.style.overflow = "";
    // Return focus to the card that opened the video
    triggerRef.current?.focus();
  }, []);

  // Dialog: focus the close button on open, close on Escape, and keep focus inside the dialog.
  useEffect(() => {
    if (!activeVideo) return;
    closeButtonRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeVideo();
    };
    const handleFocusIn = (e: FocusEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        closeButtonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", handleFocusIn);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", handleFocusIn);
    };
  }, [activeVideo, closeVideo]);

  useEffect(() => () => { document.body.style.overflow = ""; }, []);

  const retryToken = pageToken ?? "1";

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#1E1E1E]">
      <section
        aria-hidden="true"
        className="min-h-[140px] sm:min-h-[250px] md:min-h-[400px] lg:min-h-[450px]"
        style={{ position: "relative", width: "100%", aspectRatio: "2000/693", overflow: "hidden" }}
      >
        <Image src="/Shorts Banner.jpg" alt="" fill priority sizes="100vw" style={{ objectFit: "cover", objectPosition: "center" }} />
      </section>

      <main className="w-full max-w-[1400px] mx-auto px-4 sm:px-8 pb-16">
        <header className="text-center max-w-2xl mx-auto py-10 sm:py-14">
          <h1 className="font-['Playfair_Display',_serif] text-[clamp(2rem,5vw,3.25rem)] font-medium leading-tight text-[#1E1E1E] mb-4">
            Travel inspiration
          </h1>
          <p className="font-['Montserrat',_sans-serif] text-base leading-relaxed text-[rgba(30,30,30,0.8)] m-0">
            A collection of travel films from creators on YouTube, picked to spark ideas for your next trip.
            Each video is credited to its creator.
          </p>
        </header>

        {videos.length > 0 && (
          <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6 list-none p-0 m-0">
            {videos.map((video, idx) => (
              <li key={video.id}>
                <VideoCard video={video} index={idx} onOpen={openVideo} />
              </li>
            ))}
          </ul>
        )}

        <div className="w-full flex flex-col items-center justify-center py-12 gap-3">
          {loadError && (
            <div role="alert" className="text-center font-['Montserrat',_sans-serif]">
              <p className="text-sm text-[rgba(30,30,30,0.85)] mb-4">
                {hasLoadedOnce ? "Couldn't load more videos." : "We couldn't load the videos right now."}
              </p>
              <button
                type="button"
                onClick={() => fetchShorts(retryToken)}
                className="inline-flex items-center gap-2 rounded-full bg-[#6B4E37] px-7 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#5A412E] cursor-pointer"
              >
                Try again
              </button>
            </div>
          )}

          {!loadError && pageToken && hasLoadedOnce && (
            <button
              type="button"
              onClick={() => fetchShorts(pageToken)}
              disabled={isLoading}
              className="flex items-center gap-2.5 px-8 py-3.5 border border-black/20 bg-white text-black font-sans text-xs font-bold tracking-wider uppercase rounded-full shadow-sm hover:border-black/40 hover:shadow-md transition-all duration-300 disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin text-[#1E1E1E]" size={14} aria-hidden="true" />
                  Loading videos...
                </>
              ) : (
                <>
                  View more videos
                  <ArrowRight size={14} aria-hidden="true" />
                </>
              )}
            </button>
          )}

          {!hasLoadedOnce && isLoading && (
            <div role="status" className="flex flex-col items-center justify-center gap-3">
              <Loader2 className="animate-spin text-[#1E1E1E]" size={32} aria-hidden="true" />
              <span className="font-sans text-xs font-semibold text-[rgba(30,30,30,0.75)] tracking-wider uppercase">Loading videos...</span>
            </div>
          )}

          {!loadError && !pageToken && hasLoadedOnce && videos.length > 0 && (
            <p className="font-sans text-xs font-semibold text-[rgba(30,30,30,0.75)] tracking-wider uppercase m-0">
              That&apos;s all for now
            </p>
          )}

          {!loadError && hasLoadedOnce && videos.length === 0 && (
            <p className="font-['Montserrat',_sans-serif] text-sm text-[rgba(30,30,30,0.8)] m-0">No videos to show right now.</p>
          )}

          <Link
            href="/shop"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#6B4E37] px-8 py-3.5 font-sans text-xs font-bold uppercase tracking-wider text-white no-underline hover:bg-[#5A412E]"
          >
            Shop the collection <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </main>

      {activeVideo && (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/95 p-4 sm:p-6"
          onClick={closeVideo}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={`${activeVideo.title}, video by ${activeVideo.channelTitle}`}
            className="relative w-full max-w-[450px]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              ref={closeButtonRef}
              type="button"
              onClick={closeVideo}
              aria-label="Close video"
              className="absolute -top-14 right-0 z-[2010] flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white cursor-pointer"
            >
              <X size={24} aria-hidden="true" />
            </button>
            <div className="relative w-full aspect-[9/16] max-h-[80vh] bg-black overflow-hidden rounded-2xl border border-white/10">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${activeVideo.videoId}?autoplay=1&rel=0`}
                title={activeVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="absolute inset-0 w-full h-full border-0"
              />
            </div>
            <p className="mt-3 mb-0 text-center font-sans text-xs text-white">
              Video by {activeVideo.channelTitle} on YouTube
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
