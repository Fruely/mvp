"use client";

import type { Dictionary } from "@/lib/i18n";
import { t } from "@/lib/i18n";

export default function MicroConfidenceLine({ dict }: { dict: Dictionary }) {
  return (
    <section className="border-t border-gray-200 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm text-gray-600">
          {t(dict, "home.confidence.line")}
        </p>
      </div>
    </section>
  );
}
