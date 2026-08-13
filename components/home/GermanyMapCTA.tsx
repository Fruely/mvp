"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { publicLinkPrimaryClass } from "@/components/public/publicStyles";

const CTAGermanyMap = dynamic(() => import("@/components/maps/CTAGermanyMap"), {
  ssr: false,
});

type Props = {
  title: string;
  subtitle: string;
  body: string;
  spark: string;
  button: string;
  lang: string;
};

export default function GermanyMapCTA({ title, body, spark, button, lang }: Props) {
  const mapHostRef = useRef<HTMLDivElement>(null);
  const [shouldLoadMap, setShouldLoadMap] = useState(false);

  useEffect(() => {
    const node = mapHostRef.current;
    if (!node || shouldLoadMap) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoadMap(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [shouldLoadMap]);

  return (
    <section className="px-freuly-4 py-12 sm:px-freuly-6 md:py-14 lg:px-16">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-8 md:flex-row md:gap-12">
        <div ref={mapHostRef} className="relative w-full shrink-0 md:w-[45%]">
          <div className="min-h-[240px] w-full overflow-hidden rounded-freuly-card border border-freuly-border-default bg-freuly-border-subtle">
            {shouldLoadMap ? <CTAGermanyMap /> : null}
          </div>
        </div>

        <div className="flex-1 text-center md:text-left">
          <h2 className="text-freuly-section-title text-freuly-text-primary">{title}</h2>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-freuly-text-secondary">{body}</p>
          <p className="mt-3 text-[15px] font-semibold text-freuly-primary">{spark}</p>
          <Link href={`/${lang}/for-specialists`} className={`${publicLinkPrimaryClass} mt-6`}>
            {button}
          </Link>
        </div>
      </div>
    </section>
  );
}
