"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export function siteDomain(url?: string | null, domain?: string | null) {
  if (domain) return domain.replace(/^www\./i, "");
  if (!url) return "";
  try {
    const host = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname;
    return host.replace(/^www\./i, "");
  } catch {
    return url.replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
  }
}

export function siteHref(url?: string | null) {
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export function faviconSrc(domain?: string | null, stored?: string | null) {
  if (stored) return stored;
  if (!domain) return "";
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
}

export function SiteMark({
  domain,
  favicon,
  name,
  size = 40,
  className,
}: {
  domain?: string | null;
  favicon?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}) {
  const host = siteDomain(null, domain);
  const google = faviconSrc(host || domain, null);
  const preferred = faviconSrc(host || domain, favicon);
  const [src, setSrc] = useState(preferred);
  const letter = (host || name || "?").replace(/^[^a-z0-9]+/i, "").slice(0, 1).toUpperCase() || "?";

  useEffect(() => {
    setSrc(preferred);
  }, [preferred]);

  return (
    <div
      className={cn(
        "rounded-xl bg-secondary border border-border overflow-hidden shrink-0 flex items-center justify-center",
        className
      )}
      style={{ width: size, height: size }}
    >
      {src ? (
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          className="w-full h-full object-contain bg-white"
          onError={() => {
            if (src && google && src !== google) setSrc(google);
            else setSrc("");
          }}
        />
      ) : (
        <span className="text-sm font-semibold text-muted-foreground">{letter}</span>
      )}
    </div>
  );
}

export function WorkSiteCard({
  siteName,
  siteUrl,
  siteDomain: domain,
  siteFavicon,
  keyword,
  clicks,
  hint,
}: {
  siteName?: string | null;
  siteUrl?: string | null;
  siteDomain?: string | null;
  siteFavicon?: string | null;
  keyword?: string | null;
  clicks?: number | null;
  hint?: string | null;
}) {
  const host = siteDomain(siteUrl, domain);
  const href = siteHref(siteUrl) || (host ? `https://${host}` : "");
  const showName = siteName && host && siteName.toLowerCase() !== host.toLowerCase();

  return (
    <div className="rounded-2xl border border-border bg-background/60 p-3.5 space-y-3">
      <div className="flex items-start gap-3">
        <SiteMark domain={host} favicon={siteFavicon} name={siteName} size={44} />
        <div className="min-w-0 flex-1">
          <div className="font-semibold leading-tight truncate">{host || siteName || "Untitled site"}</div>
          {showName ? <div className="text-xs text-muted-foreground truncate">{siteName}</div> : null}
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-accent mt-1 hover:underline"
            >
              Open site <ExternalLink className="w-3 h-3" />
            </a>
          ) : null}
        </div>
      </div>
      <div className="rounded-xl bg-secondary/70 px-3 py-2">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Search this keyword</div>
        <div className="text-sm font-medium mt-0.5 break-words">{keyword || "—"}</div>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          Clicks today <span className="text-foreground font-semibold tabular-nums">{clicks ?? 0}</span>
        </span>
        {hint ? <span className="text-muted-foreground">{hint}</span> : null}
      </div>
    </div>
  );
}
