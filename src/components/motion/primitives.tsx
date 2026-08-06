"use client";

import { motion, useReducedMotion, type HTMLMotionProps, type Variants } from "framer-motion";
import { forwardRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

const easeOut = [0.25, 1, 0.5, 1] as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18, filter: "blur(6px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.7, ease: easeOut } },
};

export const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

export function FadeUp({
  children,
  className,
  delay = 0,
  once = true,
  as: Tag = "div",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  once?: boolean;
  as?: keyof typeof motion;
} & HTMLMotionProps<"div">) {
  const reduce = useReducedMotion();
  const Comp = motion[Tag] as typeof motion.div;
  return (
    <Comp
      initial={reduce ? false : "hidden"}
      whileInView="visible"
      viewport={{ once, margin: "-10% 0px" }}
      variants={fadeUp}
      transition={{ delay, duration: 0.7, ease: easeOut }}
      className={className}
      {...rest}
    >
      {children}
    </Comp>
  );
}

export function Stagger({
  children,
  className,
  once = true,
}: {
  children: ReactNode;
  className?: string;
  once?: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : "hidden"}
      whileInView="visible"
      viewport={{ once, margin: "-10% 0px" }}
      variants={stagger}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Magnetic wrapper — pushes a child element toward the cursor by a small delta.
 * Purely visual: no layout thrash, respects reduced-motion.
 */
export const Magnetic = forwardRef<HTMLDivElement, { children: ReactNode; className?: string; strength?: number }>(
  ({ children, className, strength = 12 }, ref) => {
    const reduce = useReducedMotion();
    return (
      <motion.div
        ref={ref}
        className={cn("inline-flex", className)}
        onMouseMove={(e) => {
          if (reduce) return;
          const el = e.currentTarget as HTMLDivElement;
          const rect = el.getBoundingClientRect();
          const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
          const y = (e.clientY - rect.top - rect.height / 2) / rect.height;
          el.style.transform = `translate3d(${x * strength}px, ${y * strength}px, 0)`;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = "translate3d(0,0,0)";
        }}
        transition={{ type: "spring", stiffness: 250, damping: 20 }}
      >
        {children}
      </motion.div>
    );
  }
);
Magnetic.displayName = "Magnetic";

/** Animated integer counter — counts up to `value` when scrolled into view. */
export function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      className={cn("font-mono tabular-nums", className)}
      initial={reduce ? { opacity: 1 } : { opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: easeOut }}
    >
      {value.toLocaleString()}
    </motion.span>
  );
}
