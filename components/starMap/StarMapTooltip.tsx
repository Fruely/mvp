"use client";

import type { Dictionary, Lang } from "@/lib/i18n";
import { tCount } from "@/lib/i18n";
import type { StarMapRenderable } from "@/lib/starMap/types";

type StarMapTooltipProps = {
  dict: Dictionary;
  lang: Lang;
  marker: StarMapRenderable;
  style?: React.CSSProperties;
  id: string;
};

export default function StarMapTooltip({
  dict,
  lang,
  marker,
  style,
  id,
}: StarMapTooltipProps) {
  const countLabel = tCount(dict, lang, "home.starMap.specialists", marker.count);
  const recentLabel =
    marker.recentCount > 0
      ? tCount(dict, lang, "home.starMap.recent", marker.recentCount)
      : null;

  return (
    <div
      id={id}
      role="tooltip"
      className="pointer-events-none absolute z-20 min-w-[168px] rounded-[10px] border border-[#2A5553] bg-[#163D3B] px-3.5 py-3 text-left shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
      style={style}
    >
      <p className="text-sm font-semibold text-white">{marker.city}</p>
      <p className="mt-1 text-[13px] text-[#B8D4D2]">{countLabel}</p>
      {recentLabel ? (
        <p className="mt-0.5 text-xs text-[#7BA8A5]">{recentLabel}</p>
      ) : null}
    </div>
  );
}
