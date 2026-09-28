"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const EqualizerField = dynamic(() => import("./EqualizerField"), { ssr: false });

function supportsStage(): boolean {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  if ((navigator.hardwareConcurrency ?? 4) <= 2) return false;
  try {
    return !!document.createElement("canvas").getContext("webgl2");
  } catch {
    return false;
  }
}

// Fixed, decorative, and non-interactive: the gradient always renders, and
// the WebGL field is layered on top only where it will run well.
export function StageBackground() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setEnabled(supportsStage());
    update();
    motion.addEventListener("change", update);
    return () => motion.removeEventListener("change", update);
  }, []);

  return (
    <div aria-hidden="true" className="stage-fallback pointer-events-none fixed inset-0 -z-10">
      {enabled && (
        <div className="absolute inset-0 opacity-90">
          <EqualizerField />
        </div>
      )}
      <div className="absolute inset-0 bg-[radial-gradient(90%_70%_at_50%_40%,transparent,rgb(11_7_22/0.6))]" />
    </div>
  );
}
