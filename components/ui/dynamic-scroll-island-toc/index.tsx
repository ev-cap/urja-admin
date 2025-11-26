"use client";

import { cn } from "@/lib/utils";
import {
  AnimatePresence,
  motion,
  MotionConfig,
  MotionValue,
  Transition,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { TbChevronUp } from "react-icons/tb";
import Image from "next/image";

export interface TOC_INTERFACE {
  name: string;
  value?: string;
}

interface Props {
  value?: TOC_INTERFACE;
  setValue?: (v: TOC_INTERFACE) => void;
  data: TOC_INTERFACE[];
  ref?: any;
  transition?: Transition;
  className?: string;
  lPrefix?: string;
}

const cKey = "toc-wrapper";
const iKey = "toc-items";

const DynamicScrollIslandTOC = ({
  data,
  value: _v,
  setValue: _setValue,
  ref,
  className,
  lPrefix,
  transition = { type: "spring", duration: 0.5, bounce: 0.1 },
}: Props) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(_v);
  const [mounted, setMounted] = useState(false);
  const sp = useMotionValue(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const c = ref?.current || window;

    const updateScrollProgress = () => {
      const scrollTop = c === window ? window.scrollY : c.scrollTop;
      const scrollHeight =
        c === window ? document.body.scrollHeight : c.scrollHeight;
      const clientHeight = c === window ? window.innerHeight : c.clientHeight;

      const progress = scrollTop / (scrollHeight - clientHeight) || 0;

      if (scrollHeight === clientHeight) sp.set(1);
      sp.set(progress);
    };

    c.addEventListener("scroll", updateScrollProgress);

    const resizeObserver = new ResizeObserver(updateScrollProgress);
    resizeObserver.observe(c === window ? document.body : c.firstChild);

    return () => {
      c.removeEventListener("scroll", updateScrollProgress);
      resizeObserver.disconnect();
    };
  }, [ref?.current]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") return setOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function handleSelect(value: TOC_INTERFACE) {
    setValue(value);
    _setValue?.(value);
  }

  const p = { data, open, value, setValue: handleSelect, ref, lPrefix };
  const txt = <Text sp={sp} {...p} />;
  const items = <Items {...p} />;

  const backdrop = mounted && open && createPortal(
    <motion.div
      role="button"
      aria-label="Close"
      onClick={() => setOpen(false)}
      className="fixed inset-0 bg-black/40"
      style={{ 
        zIndex: 9999,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    />,
    document.body
  );

  return (
    <>
      <AnimatePresence initial={false}>
        {backdrop}
      </AnimatePresence>

      <MotionConfig transition={transition}>
        <div
          className={cn(
            "relative cursor-pointer select-none",
            "[--height-opened:150px] [--width-opened:350px] [--width:220px]",
            "text-white/80",
            className,
          )}
          style={{ zIndex: 10000 }}
        >
        <motion.div
          role="button"
          aria-label="Open"
          tabIndex={0}
          onClick={() => setOpen((prev) => !prev)}
          layoutId={`${lPrefix}-${cKey}`}
          style={{ borderRadius: 24 }}
          className={cn(
            "relative flex h-10 cursor-pointer items-center justify-between overflow-hidden px-4 outline-hidden!",
            "min-w-[var(--width)] bg-black",
          )}
        >
          <div className="absolute top-0 left-1/2 h-full w-[calc(var(--width-opened)-50px)] -translate-x-1/2">
            <motion.div
              layoutId={`${lPrefix}-${iKey}`}
              layout="position"
              className="h-full w-full"
            />
          </div>

          {txt}
        </motion.div>

        <div className="absolute top-0 left-1/2 -translate-x-1/2">
          <AnimatePresence mode="popLayout" initial={false}>
            {open && (
              <motion.div
                role="button"
                aria-label="Close"
                tabIndex={0}
                onClick={() => setOpen((prev) => !prev)}
                layoutId={`${lPrefix}-${cKey}`}
                className={cn(
                  "cursor-pointer justify-center overflow-hidden p-5 pt-14",
                  "min-h-[var(--height-opened)] w-[var(--width-opened)] bg-black",
                )}
                style={{ borderRadius: 24 }}
              >
                <motion.div layoutId={`${lPrefix}-${iKey}`} layout="position">
                  {items}
                </motion.div>
                <div className="absolute top-3 right-3 left-3">
                  {txt}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      </MotionConfig>
    </>
  );
};

export default DynamicScrollIslandTOC;


function Items({ setValue, data }: Props) {
  return (
    <div className="group grid transition-opacity">
      {data.map((i) => (
        <button
          key={i.name}
          onClick={() => setValue?.(i)}
          aria-label={i.name}
          className="cursor-pointer text-center font-semibold transition-all group-hover:opacity-40 hover:opacity-100!"
        >
          {i.name}
        </button>
      ))}
    </div>
  );
}

function Text({
  open,
  value,
  lPrefix,
}: Props & { open: boolean; sp: MotionValue }) {
  return (
    <div className="relative flex items-center justify-center w-full">
      {/* Logo - positioned absolutely on the left */}
      <motion.div 
        layout="position"
        layoutId={`${lPrefix}-toc-logo`}
        className="absolute left-0 flex items-center"
      >
        <Image 
          src="/admin_rool_white_logo.png" 
          alt="Admin Logo" 
          width={24} 
          height={24}
          className="object-contain"
        />
      </motion.div>
      
      {/* Centered text */}
      <motion.p
        layout="position"
        layoutId={`${lPrefix}-toc-text`}
        className="font-bold text-center"
      >
        {value?.name}
      </motion.p>
      
      {/* Chevron - positioned absolutely on the right */}
      <motion.div className="absolute right-0 text-white/80">
        <motion.div
          layout="position"
          layoutId={`${lPrefix}-toc-chevron`}
          animate={{ rotate: open ? 0 : 180 }}
        >
          <TbChevronUp strokeWidth={4} />
        </motion.div>
      </motion.div>
    </div>
  );
}
