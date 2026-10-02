import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Sparkles } from "lucide-react";
import { useTheme } from "../../../shared/contexts/ThemeContext";
import { useLandingStats } from "../../../shared/hooks/useLandingStats";
import { PayoutStatus } from "./PayoutStatus";

// Aceternity's "Hero Section With Noise Background", recoloured to the warm
// palette and gold #c9983a. Deliberate departures from the block:
//
//  1. Its `dark:` variants are gone. This app is Tailwind v4 with no
//     `@custom-variant dark`, so `dark:` resolves to prefers-color-scheme -
//     the OS setting - while the page's own toggle drives `theme` from
//     ThemeContext. Ported verbatim, the hero would have followed the OS
//     while everything around it followed the switch.
//  2. No product shot. A screenshot of live state (bounties with a countdown)
//     is false as soon as the state moves on; a payout status panel sits in
//     its place.
//
// Its typo'd classes (`dark:hover:bg-fuschia-600`, `darhk:text-white`) and two
// invalid hex colours in the button shadows are dropped rather than ported.

export function Hero() {
  const { theme } = useTheme();
  const { display } = useLandingStats();
  const isDark = theme === "dark";
  const reduceMotion = useReducedMotion();

  // Motion is allowed on the landing page, but every animation here starts
  // from a visible resting state when reduced motion is requested, rather
  // than being parked at opacity 0 waiting for a transition that never runs.
  const rise = (delay: number) =>
    reduceMotion
      ? { initial: { opacity: 1, y: 0 }, animate: { opacity: 1, y: 0 } }
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, delay },
        };

  return (
    <section className="relative flex w-full items-center justify-center overflow-hidden px-4 sm:px-6 pt-28 pb-20 md:pt-36 md:pb-28">
      <Background isDark={isDark} reduceMotion={reduceMotion} />

      {/* 86rem = 1376px, the smallest container that fits the measured 1357px
            second heading line at 1440 while keeping the px-4 gutter. max-w-7xl
            (1280px) was 77px short and still wrapped to three lines. Only the
            heading is affected - the paragraph, shot and stats set their own
            narrower max widths. */}
        <div className="relative z-10 mx-auto w-full max-w-[86rem] text-center">
        <Badge isDark={isDark} reduceMotion={reduceMotion} />

        <motion.h1
          {...rise(0.1)}
          className={`text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-tight transition-colors ${
            isDark ? "text-[#e8dfd0]" : "text-[#2d2820]"
          }`}
        >
          {/* Scoped before the claim, deliberately.
              This read "Assignment by weighted draw / Rewards decided after
              the work", which describes GrainHack as though it were the
              platform. Outside GrainHack and Grainlify Bounties the maintainer
              chooses - so a reader who stopped at line one had been told
              something that is not true of ordinary issues. Scoping first
              means the short read is still correct. */}
          <span className="bg-gradient-to-r from-[#c9983a] to-[#d4af37] bg-clip-text text-transparent">
            Funded issues
          </span>{" "}
          aren&apos;t first-come
          {/* Authored break, deliberately. Left to the container the line becomes
              an automatic wrap that moves with the font or the width, and the
              two halves of the scoped claim stop being a fixed pair. */}
          <br />
          A weighted draw assigns them
        </motion.h1>

        <motion.p
          {...rise(0.2)}
          className={`text-base sm:text-lg max-w-2xl mx-auto mb-8 sm:mb-12 transition-colors ${
            isDark ? "text-[#b8a898]" : "text-[#7a6b5a]"
          }`}
        >
          GrainHack events and Grainlify Bounties both assign work by a weighted
          draw, under rules published before anyone applies. Nobody wins an issue
          by refreshing fastest.
        </motion.p>

        <motion.div
          {...rise(0.3)}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-2xl mx-auto"
        >
          {/* Ink on gold, not white on gold. White measures 2.6:1 against
              #c9983a (issue #1057); the warm ink measures 5.5:1. */}
          <Link
            to="/signin"
            className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 rounded-[16px] bg-gradient-to-r from-[#c9983a] to-[#d4af37] text-[#2d2820] font-semibold inline-flex items-center justify-center gap-2 group shadow-[0_6px_20px_rgba(162,121,44,0.35)] hover:shadow-[0_8px_28px_rgba(162,121,44,0.45)] transition-all border border-white/10"
          >
            <span>Start contributing</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            to="/docs/contributors/grainhack"
            className={`w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 rounded-[16px] backdrop-blur-[30px] border font-medium transition-all inline-flex items-center justify-center ${
              isDark
                ? "bg-white/[0.08] border-white/15 text-[#e8dfd0] hover:bg-white/[0.12] hover:border-[#c9983a]/30"
                : "bg-white/[0.15] border-white/25 text-[#2d2820] hover:bg-white/[0.2] hover:border-[#c9983a]/30"
            }`}
          >
            Read the rules
          </Link>
        </motion.div>

        {/* Where the product shot was. The screenshot showed bounties
            "closing in 4 hours" that were later cancelled: a picture of live
            state is false within a day. This says which chain pays what,
            from history and from the live ledger. */}
        <motion.div {...rise(0.4)} className="mt-12 sm:mt-16 w-full max-w-5xl mx-auto">
          <h2
            className={`text-sm font-semibold tracking-wide uppercase mb-4 ${
              isDark ? "text-[#e8c571]" : "text-[#7a5a1c]"
            }`}
          >
            Where payouts happen today
          </h2>
          <PayoutStatus />
        </motion.div>

        {/* Two figures, each labelled as what the API counts. "Projects
            Funded" and "Active Users" were the same two numbers under labels
            they did not mean: the first is verified projects, the second is
            distinct GitHub authors of issues and pull requests in them. The
            "Grants Distributed" tile is gone - the API hard-codes it to 0
            because no grants table exists, so it measured nothing. */}
        <motion.div
          {...rise(0.5)}
          className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-5xl mx-auto"
        >
          {[
            { label: "Verified projects listed", value: display.activeProjects },
            { label: "GitHub contributors to those projects", value: display.contributors },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`backdrop-blur-[40px] border rounded-[20px] p-4 sm:p-6 transition-all hover:border-[#c9983a]/30 hover:shadow-[0_12px_36px_rgba(201,152,58,0.15)] hover:-translate-y-0.5 ${
                isDark
                  ? "bg-white/[0.08] border-white/15 hover:bg-white/[0.12]"
                  : "bg-white/[0.15] border-white/25 hover:bg-white/[0.2]"
              }`}
            >
              <div
                className={`text-3xl font-bold mb-2 transition-colors ${
                  isDark ? "text-[#e8dfd0]" : "text-[#2d2820]"
                }`}
              >
                {stat.value}
              </div>
              <div className={isDark ? "text-[#b8a898]" : "text-[#7a6b5a]"}>
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function Badge({ isDark, reduceMotion }: { isDark: boolean; reduceMotion: boolean | null }) {
  return (
    <motion.div
      initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? undefined : { duration: 0.5 }}
      className="relative mx-auto mb-8 flex w-fit items-center justify-center overflow-hidden rounded-full p-px"
    >
      {/* The block's sweeping gradient, in gold. It is the one looping
          animation here, so it stops entirely under reduced motion rather
          than slowing down. */}
      {!reduceMotion && (
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-transparent via-transparent to-[#c9983a]"
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          style={{ width: "300px", height: "20px" }}
        />
      )}
      <div
        className={`relative z-10 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium backdrop-blur-[30px] border transition-colors ${
          isDark
            ? "bg-[#2d2820]/90 border-white/15 text-[#e8dfd0]"
            : "bg-white/90 border-white/25 text-[#2d2820]"
        }`}
      >
        <Sparkles className="w-4 h-4 text-[#c9983a]" />
        Open source, allocated by rule
      </div>
    </motion.div>
  );
}

function Background({ isDark, reduceMotion }: { isDark: boolean; reduceMotion: boolean | null }) {
  const [strips, setStrips] = useState<number[]>([]);

  useEffect(() => {
    const calculateStrips = () => {
      setStrips(Array.from({ length: Math.ceil(window.innerWidth / 80) }, (_, i) => i));
    };
    calculateStrips();
    window.addEventListener("resize", calculateStrips);
    return () => window.removeEventListener("resize", calculateStrips);
  }, []);

  return (
    <motion.div
      aria-hidden="true"
      initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={reduceMotion ? undefined : { duration: 1 }}
      className="absolute inset-0 z-0 flex [mask-image:radial-gradient(circle_at_center,white_0%,white_30%,transparent_70%)]"
    >
      <div
        className="absolute inset-0 h-full w-full scale-[1.2] transform opacity-[0.05] [mask-image:radial-gradient(#fff,transparent,75%)]"
        style={{ backgroundImage: "url(/noise.webp)", backgroundSize: "20%" }}
      />
      {strips.map((index) => (
        <div
          key={index}
          className={`h-full w-20 ${
            isDark
              ? "bg-gradient-to-r from-[#211d17] to-[#181510] shadow-[2px_0px_0px_0px_#2f2920]"
              : "bg-gradient-to-r from-[#e6dccb] to-[#efe7d9] shadow-[2px_0px_0px_0px_#d8ccb6]"
          }`}
        />
      ))}
    </motion.div>
  );
}
