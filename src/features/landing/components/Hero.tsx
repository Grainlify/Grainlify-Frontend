import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight, Sparkles } from "lucide-react";
import { useTheme } from "../../../shared/contexts/ThemeContext";
import { useLandingStats } from "../../../shared/hooks/useLandingStats";
import { HoverBorderGradient } from "./HoverBorderGradient";

interface LightStrand {
  top: string;
  left: string;
  width: number;
  rotate: number;
  nodes: number[];
}

// Two longer "string light" staircases climbing toward the center from
// opposite corners, each with evenly spaced glowing nodes that flicker on
// their own staggered timer - reads as one clear ascending motif per side
// (matching the reference's climbing-lights look) rather than scattered
// fragments. Adapted from Aceternity UI's Hero Section With Flickering
// Lights, whose original is a single right-side panel; mirrored here across
// both sides since this hero centers its content instead of splitting it
// two-column.
const LIGHT_STRANDS: LightStrand[] = [
  { top: "62%", left: "2%", width: 420, rotate: -22, nodes: [0.08, 0.32, 0.56, 0.8] },
  { top: "30%", left: "72%", width: 420, rotate: -22, nodes: [0.08, 0.32, 0.56, 0.8] },
];

const FLICKER_DELAYS = [0, 0.7, 1.4, 2.1, 0.5, 1.9, 1.1, 0.3];

function FlickeringLights({ isDark }: { isDark: boolean }) {
  return (
    <div aria-hidden="true" className="hidden md:block absolute inset-0 overflow-hidden">
      {LIGHT_STRANDS.map((strand, sIdx) => (
        <div
          key={sIdx}
          className="absolute"
          style={{
            top: strand.top,
            left: strand.left,
            width: strand.width,
            transform: `rotate(${strand.rotate}deg)`,
            transformOrigin: "left center",
          }}
        >
          <div
            className="h-px w-full"
            style={{
              background: `linear-gradient(to right, transparent, ${isDark ? "rgba(212,175,55,0.7)" : "rgba(166,124,46,0.55)"}, transparent)`,
            }}
          />
          {strand.nodes.map((t, nIdx) => (
            <span
              key={nIdx}
              className="animate-flicker absolute rounded-full"
              style={{
                left: `${t * 100}%`,
                top: -5,
                width: 10,
                height: 10,
                marginLeft: -5,
                background: "radial-gradient(circle, #f9e4ae 0%, #d4af37 55%, transparent 100%)",
                boxShadow: "0 0 18px 6px rgba(212,175,55,0.65)",
                animationDelay: `${FLICKER_DELAYS[(sIdx * 4 + nIdx) % FLICKER_DELAYS.length]}s`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function Hero() {
  const { theme } = useTheme();
  const { display } = useLandingStats();

  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 pt-20 overflow-hidden">
      {/* Golden Glassmorphism Orbs (hidden on very small screens to avoid overflow) */}
      <div className="hidden sm:block absolute top-1/4 left-1/4 w-64 sm:w-96 h-64 sm:h-96 rounded-full bg-[#c9983a]/30 blur-3xl animate-pulse" />
      <div className="hidden sm:block absolute bottom-1/4 right-1/4 w-64 sm:w-96 h-64 sm:h-96 rounded-full bg-[#d4af37]/20 blur-3xl animate-pulse delay-1000" />
      {/* Circuit-grid texture, gold-tinted so it reads as part of the light
          strands' motif rather than a neutral background pattern */}
      <div
        aria-hidden="true"
        className="absolute inset-0 [mask-image:radial-gradient(ellipse_75%_65%_at_50%_35%,black,transparent)]"
        style={{
          backgroundImage:
            `linear-gradient(to right, ${theme === "dark" ? "rgba(212,175,55,0.16)" : "rgba(166,124,46,0.14)"} 1px, transparent 1px), linear-gradient(to bottom, ${theme === "dark" ? "rgba(212,175,55,0.16)" : "rgba(166,124,46,0.14)"} 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />
      <FlickeringLights isDark={theme === "dark"} />

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full backdrop-blur-[30px] border mb-8 transition-colors ${
            theme === "dark"
              ? "bg-white/[0.08] border-white/15"
              : "bg-white/[0.15] border-white/25"
          }`}
        >
          <Sparkles className="w-4 h-4 text-[#c9983a]" />
          <span
            className={`text-sm font-medium transition-colors ${
              theme === "dark" ? "text-[#e8dfd0]" : "text-[#2d2820]"
            }`}
          >
            Web3 Contributors Platform
          </span>
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className={`text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight transition-colors ${
            theme === "dark" ? "text-[#e8dfd0]" : "text-[#2d2820]"
          }`}
        >
          Connect with
          <span className="bg-gradient-to-r from-[#c9983a] to-[#d4af37] bg-clip-text text-transparent">
            {" "}
            Open Source
          </span>
          <br />
          Opportunities
        </motion.h1>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className={`text-base sm:text-lg max-w-2xl mx-auto mb-8 sm:mb-12 transition-colors ${
            theme === "dark" ? "text-[#b8a898]" : "text-[#7a6b5a]"
          }`}
        >
          Grainlify bridges the gap between talented contributors and innovative
          projects, making open-source collaboration seamless and rewarding.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-2xl mx-auto"
        >
          <HoverBorderGradient
            as={Link}
            to="/signin"
            containerClassName="rounded-[16px] w-full sm:w-auto"
            bgClassName="bg-gradient-to-r from-[#c9983a] to-[#d4af37]"
            className="w-full sm:w-auto flex items-center justify-center gap-2 font-medium group"
          >
            <span>Get Started</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </HoverBorderGradient>
          <a
            href="https://grainlify-docs.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className={`w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 rounded-[16px] backdrop-blur-[30px] border font-medium transition-all inline-flex items-center justify-center ${
              theme === "dark"
                ? "bg-white/[0.08] border-white/15 text-[#e8dfd0] hover:bg-white/[0.12] hover:border-[#c9983a]/30"
                : "bg-white/[0.15] border-white/25 text-[#2d2820] hover:bg-white/[0.2] hover:border-[#c9983a]/30"
            }`}
          >
            Docs
          </a>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 sm:mt-16 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-4xl mx-auto px-2"
        >
          {[
            { label: "Active Projects", value: display.activeProjects },
            { label: "Contributors", value: display.contributors },
            { label: "Grants Distributed", value: display.grantsDistributed },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`backdrop-blur-[40px] border rounded-[20px] p-4 sm:p-6 transition-all hover:border-[#c9983a]/30 hover:shadow-[0_12px_36px_rgba(201,152,58,0.15)] hover:-translate-y-0.5 ${
                theme === "dark"
                  ? "bg-white/[0.08] border-white/15 hover:bg-white/[0.12]"
                  : "bg-white/[0.15] border-white/25 hover:bg-white/[0.2]"
              }`}
            >
              <div
                className={`text-3xl font-bold mb-2 transition-colors ${
                  theme === "dark" ? "text-[#e8dfd0]" : "text-[#2d2820]"
                }`}
              >
                {stat.value}
              </div>
              <div
                className={`transition-colors ${
                  theme === "dark" ? "text-[#b8a898]" : "text-[#7a6b5a]"
                }`}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
