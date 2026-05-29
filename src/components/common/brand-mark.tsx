import Link from "next/link";
import Image from "next/image";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3">
      <div className="relative h-10 w-10 overflow-hidden rounded-md border border-white/10 bg-[#111827] shadow-sm shadow-black/30">
        <Image
          src="/brand/lf-favicon.png"
          alt="ListingFlow AI icon"
          fill
          sizes="40px"
          className="object-cover"
          priority
        />
      </div>
      {!compact && (
        <div className="leading-tight">
          <div className="font-semibold tracking-tight">ListingFlow AI</div>
          <div className="text-xs text-muted-foreground">MeadeMark Labs</div>
        </div>
      )}
    </Link>
  );
}
