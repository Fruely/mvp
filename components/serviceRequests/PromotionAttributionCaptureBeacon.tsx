"use client";

import { useEffect, useRef } from "react";

type Props = {
  captureQuery: string;
};

/** Fire-and-forget first-party attribution capture; no token is exposed to JS. */
export default function PromotionAttributionCaptureBeacon({ captureQuery }: Props) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current || !captureQuery) return;
    firedRef.current = true;

    void fetch(`/api/request-attribution/capture?${captureQuery}`, {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    });
  }, [captureQuery]);

  return null;
}
