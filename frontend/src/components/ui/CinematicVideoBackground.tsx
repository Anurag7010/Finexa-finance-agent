import { cn } from "@/lib/utils";

interface CinematicVideoBackgroundProps {
  className?: string;
  overlayClassName?: string;
  videoSrc?: string;
}

export default function CinematicVideoBackground({
  className,
  overlayClassName,
  videoSrc = "/bd-video.mp4",
}: CinematicVideoBackgroundProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 z-0 overflow-hidden",
        className,
      )}
    >
      <video
        autoPlay
        loop
        muted
        playsInline
        poster="/favicon.svg"
        preload="metadata"
        className="absolute inset-0 h-full w-full scale-105 object-cover opacity-[0.34] saturate-[0.84] contrast-[1.06] blur-[0.5px]"
      >
        <source src={videoSrc} type="video/mp4" />
        <source src="/ambient-fingaurd.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-black/18" />
      <div
        className={cn(
          "absolute inset-0 bg-[linear-gradient(130deg,rgba(5,12,14,0.28)_10%,rgba(10,19,22,0.26)_48%,rgba(6,12,15,0.3)_100%),radial-gradient(circle_at_18%_20%,rgba(13,158,138,0.08),transparent_40%),radial-gradient(circle_at_84%_16%,rgba(29,63,74,0.16),transparent_46%)]",
          overlayClassName,
        )}
      />
    </div>
  );
}
