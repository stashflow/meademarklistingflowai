"use client";

import { motion } from "framer-motion";
import { useMotionPreference } from "@/components/common/motion-preferences";

export function MotionReveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { preference } = useMotionPreference();

  if (preference === "none") {
    return <>{children}</>;
  }

  const isAmaze = preference === "amaze";

  return (
    <motion.div
      initial={{ opacity: 0, y: isAmaze ? 24 : 10, scale: isAmaze ? 0.985 : 1 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: isAmaze ? 0.62 : 0.35,
        delay,
        ease: isAmaze ? [0.16, 1, 0.3, 1] : "easeOut",
      }}
    >
      {children}
    </motion.div>
  );
}
