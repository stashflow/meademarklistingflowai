"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type MotionPreference = "none" | "simple" | "amaze";

type MotionPreferenceContext = {
  preference: MotionPreference;
  setPreference: (preference: MotionPreference) => void;
};

const MotionContext = createContext<MotionPreferenceContext>({
  preference: "simple",
  setPreference: () => undefined,
});

function readInitialPreference(): MotionPreference {
  if (typeof window === "undefined") return "simple";
  const saved = window.localStorage.getItem("listingflow-motion");
  if (saved === "none" || saved === "simple" || saved === "amaze") return saved;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "none" : "simple";
}

export function MotionPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<MotionPreference>(readInitialPreference);

  useEffect(() => {
    document.documentElement.dataset.motion = preference;
  }, [preference]);

  useEffect(() => {
    function handleMotionChange(event: Event) {
      const detail = (event as CustomEvent<MotionPreference>).detail;
      if (detail === "none" || detail === "simple" || detail === "amaze") {
        setPreferenceState(detail);
      }
    }

    window.addEventListener("listingflow-motion-change", handleMotionChange);
    return () => window.removeEventListener("listingflow-motion-change", handleMotionChange);
  }, []);

  const value = useMemo(
    () => ({
      preference,
      setPreference(nextPreference: MotionPreference) {
        window.localStorage.setItem("listingflow-motion", nextPreference);
        setPreferenceState(nextPreference);
        window.dispatchEvent(
          new CustomEvent("listingflow-motion-change", { detail: nextPreference }),
        );
      },
    }),
    [preference],
  );

  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
}

export function useMotionPreference() {
  return useContext(MotionContext);
}
