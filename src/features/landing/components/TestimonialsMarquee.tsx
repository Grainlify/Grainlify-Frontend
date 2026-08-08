import { Github } from "lucide-react";
import { useTheme } from "../../../shared/contexts/ThemeContext";

export interface MarqueeTestimonial {
  quote: string;
  name: string;
  designation: string;
  photo: string;
}

interface TestimonialsMarqueeProps {
  testimonials: MarqueeTestimonial[];
}

// Adapted from Aceternity UI's Testimonials Marquee Grid Boxed: two rows of
// boxed cards scrolling in opposite directions on an infinite CSS loop
// (each row renders the list twice back-to-back and animates exactly -50%,
// so the seam between the two copies is invisible), pausable on hover. The
// reference demo shows real companies (Spotify, Twitch, OpenAI...) as
// testimonial-givers - that's Aceternity's own demo content, not something to
// carry over, since attributing quotes to real companies Grainlify has no
// relationship with would misrepresent them. This keeps Grainlify's own
// testimonial copy and swaps the per-card "company logo" for a small GitHub
// mark instead, which is simply true of every account on the platform.
export function TestimonialsMarquee({ testimonials }: TestimonialsMarqueeProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const reversed = [...testimonials].reverse();

  return (
    <div className="space-y-5">
      <MarqueeRow testimonials={testimonials} direction="animate-marquee" isDark={isDark} />
      <MarqueeRow testimonials={reversed} direction="animate-marquee-reverse" isDark={isDark} />
    </div>
  );
}

function MarqueeRow({
  testimonials,
  direction,
  isDark,
}: {
  testimonials: MarqueeTestimonial[];
  direction: string;
  isDark: boolean;
}) {
  const doubled = [...testimonials, ...testimonials];

  return (
    <div className="pause-on-hover overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
      <div className={`flex w-max gap-5 ${direction}`}>
        {doubled.map((t, i) => (
          <TestimonialCard key={`${t.name}-${i}`} t={t} isDark={isDark} />
        ))}
      </div>
    </div>
  );
}

function TestimonialCard({ t, isDark }: { t: MarqueeTestimonial; isDark: boolean }) {
  return (
    <div
      className={`shrink-0 w-[320px] min-h-[190px] rounded-[20px] border p-6 backdrop-blur-[30px] transition-colors ${
        isDark ? "bg-white/[0.06] border-white/12" : "bg-white/[0.18] border-white/28"
      }`}
    >
      <div className="flex items-center gap-3 mb-4">
        <img
          src={t.photo}
          alt={t.name}
          loading="lazy"
          decoding="async"
          className="w-11 h-11 rounded-full object-cover border-2 border-[#c9983a]/30 flex-shrink-0"
        />
        <div className="min-w-0">
          <div className={`font-semibold text-sm truncate transition-colors ${isDark ? "text-[#e8dfd0]" : "text-[#2d2820]"}`}>
            {t.name}
          </div>
          <div className="text-xs text-[#c9983a] truncate">{t.designation}</div>
        </div>
        <Github className={`w-4 h-4 ml-auto flex-shrink-0 ${isDark ? "text-white/25" : "text-black/20"}`} />
      </div>
      <p className={`text-sm leading-relaxed line-clamp-4 transition-colors ${isDark ? "text-[#d4c5b0]" : "text-[#5a4d3f]"}`}>
        &ldquo;{t.quote}&rdquo;
      </p>
    </div>
  );
}
