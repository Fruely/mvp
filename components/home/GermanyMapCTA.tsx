"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

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

export default function GermanyMapCTA({ title, body, spark, button }: Props) {
  return (
    <section className="py-16 md:py-24">
      <div className="max-w-[1280px] mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16">

          <div className="relative w-full md:w-[45%] shrink-0">
            <div className="w-full min-h-[320px] rounded-2xl overflow-hidden bg-[#0F172A]">
              <CTAGermanyMap />
            </div>
          </div>

          {/* CTA Text */}
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-2xl md:text-4xl font-bold text-gray-900 leading-tight">
              {title}
            </h2>

            <p className="mt-4 text-gray-600 text-base md:text-lg leading-relaxed max-w-md">
              {body}
            </p>

            <p className="mt-3 text-gray-400 text-sm italic">
              {spark}
            </p>

            <Link
              href="/for-specialists"
              className="mt-8 inline-flex h-12 items-center justify-center rounded-lg bg-teal-600 px-8 text-sm font-semibold text-white transition-all duration-300 hover:bg-teal-700 hover:shadow-lg"
            >
              {button}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
