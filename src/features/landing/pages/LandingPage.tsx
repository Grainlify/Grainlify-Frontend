import type { ReactNode } from "react";
import { Navbar } from "../components/Navbar";
import { Hero } from "../components/Hero";
import { EcosystemNetwork } from "../components/EcosystemNetwork";
import { BentoGrid, BentoGridItem } from "../components/BentoGrid";
import { FAQAccordion } from "../components/FAQAccordion";
import { Footer } from "../components/Footer";
import { motion } from "motion/react";
import {
  Code,
  GitBranch,
  Award,
  Scale,
  Shield,
  Zap,
  Users,
  TrendingUp,
  CheckCircle,
  CircleDashed,
  ArrowRight,
} from "lucide-react";
import { useTheme } from "../../../shared/contexts/ThemeContext";
import { useLandingStats } from "../../../shared/hooks/useLandingStats";
import { BountyPayoutsProvider, bountyPayoutLine, useBountyPayouts } from "../hooks/useBountyPayouts";
import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

export function LandingPage() {
  const { theme } = useTheme();
  const navigate = useNavigate();

  // Check for OAuth callback token in URL (fallback for wrong redirect URL)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");


    if (token) {
      // If there's a token in the URL, redirect to the proper callback handler
      navigate(`/auth/callback?token=${token}`, { replace: true });
    }
  }, [navigate]);

  return (
    <div
      className={`min-h-screen transition-colors ${
        theme === "dark"
          ? "bg-gradient-to-br from-[#1a1512] via-[#231c17] to-[#2d241d]"
          : "bg-gradient-to-br from-[#e8dfd0] via-[#d4c5b0] to-[#c9b89a]"
      }`}
    >
      <BountyPayoutsProvider>
      <Navbar />
      <Hero />
      <Bounties />
      <Mechanism />
      <BuiltAndPlanned />
      <EcosystemNetwork />
      <Features />
      <HowItWorks />
      <WhyChooseUs />
      <FAQ />
      <Footer />
      </BountyPayoutsProvider>
    </div>
  );
}

// Fades a section into view once as the user scrolls to it - applied
// consistently across every section below for a cohesive, alive-feeling page.
function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function SectionHeader({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle: string }) {
  const { theme } = useTheme();
  return (
    <Reveal className="text-center mb-16">
      {eyebrow && (
        <span className="inline-block text-sm font-semibold tracking-wide text-[#c9983a] mb-3 uppercase">
          {eyebrow}
        </span>
      )}
      <h2
        className={`text-4xl md:text-5xl font-bold mb-6 transition-colors ${
          theme === "dark" ? "text-[#e8dfd0]" : "text-[#2d2820]"
        }`}
      >
        {title}
      </h2>
      <p
        className={`text-xl max-w-2xl mx-auto transition-colors ${
          theme === "dark" ? "text-[#b8a898]" : "text-[#7a6b5a]"
        }`}
      >
        {subtitle}
      </p>
    </Reveal>
  );
}

function Features() {
  const features = [
    {
      icon: Code,
      // No AI matches anyone in GrainHack. Assignment is a weighted draw
      // computed by the backend; the AI fit assessment sits behind
      // ai_fit_assessment_enabled, which is false, so every applicant who
      // passes the hard gates is weighted as an equal fit.
      //
      // GrainHack is named in the title because the draw governs FUNDED
      // issues only. Outside an event the maintainer reviews applications and
      // chooses, which is correct - there is no money on those issues, so
      // there is nothing to make unfarmable. The mechanism description is
      // left alone: it is accurate about GrainHack.
      title: "GrainHack: Assignment by Weighted Draw",
      description:
        "Applications open for a fixed window, then one applicant is drawn. Applying first gives no advantage. First-time applicants carry 1.5x weight, and past wins stop adding weight after two.",
      className: "md:col-span-2 md:row-span-2",
      large: true,
    },
    {
      icon: Scale,
      // GrainHack only: a bounty pays the amount posted on it. The first
      // event's 8 USDC pool was split this way on the Base Sepolia testnet.
      title: "GrainHack: Rewards Decided After the Work",
      description:
        "GrainHack rewards aren't promised up front or split by headcount. Once work is merged and judged, the event's pool is shared out against what was actually delivered.",
      className: "md:col-span-1",
    },
    {
      icon: GitBranch,
      title: "Seamless Integration",
      description:
        "Connect your GitHub, track contributions, and manage everything in one place.",
    },
    {
      icon: Award,
      // Was "transparent grant distribution": no grant has been distributed.
      title: "Bounties at a Posted Price",
      description:
        "Grainlify Bounties pay the USDC amount posted on the issue, on Solana mainnet, after a person approves the payout.",
    },
    {
      icon: Shield,
      title: "Published Rules",
      description:
        "Every GrainHack draw weight, cap, gate and curve is public before an event starts, served from the same values the backend enforces. The bounty rules have a public page of their own.",
    },
    {
      icon: Zap,
      title: "Notifications",
      description:
        "Hear when you're assigned, when a draw goes to someone else, and when a bounty is paid - in the app.",
    },
    {
      icon: Users,
      title: "Open Source",
      description:
        "Grainlify's own frontend and backend are public on GitHub, so you can read the code that runs the draw.",
    },
  ];

  return (
    <section id="features" className="relative py-20 sm:py-24 md:py-32 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <SectionHeader
          eyebrow="Platform"
          title="Everything You Need to Succeed"
          subtitle="What the platform does today"
        />

        <Reveal delay={0.1}>
          <BentoGrid>
            {features.map((feature) => (
              <BentoGridItem
                key={feature.title}
                title={feature.title}
                description={feature.description}
                className={feature.className}
                large={feature.large}
                icon={<feature.icon className="w-6 h-6 text-[#c9983a]" />}
              />
            ))}
          </BentoGrid>
        </Reveal>
      </div>
    </section>
  );
}

function HowItWorks() {
  const { theme } = useTheme();

  const steps = [
    {
      number: "01",
      title: "Sign In with GitHub",
      description:
        "Your GitHub account is your Grainlify account. Your profile shows your public open-source work.",
    },
    {
      number: "02",
      title: "Find an Issue",
      description:
        "Browse verified projects by language, ecosystem and category, or open the Bounties and GrainHack pages.",
    },
    {
      number: "03",
      title: "Apply",
      description:
        "Write a short application. A maintainer chooses on ordinary issues; bounties and GrainHack issues are assigned by a weighted draw.",
    },
    {
      number: "04",
      // The points programme was retired and the Redeem page removed, so
      // there is no threshold to clear and nothing to redeem.
      title: "Get Paid",
      description:
        "A bounty pays its posted USDC amount once a person approves the payout. A GrainHack event shares its pool across accepted work after judging.",
    },
  ];

  return (
    <section id="how-it-works" className="relative py-20 sm:py-24 md:py-32 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <SectionHeader
          eyebrow="Process"
          title="How It Works"
          subtitle="Get started in four simple steps"
        />

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <Reveal key={step.number} delay={index * 0.1} className="relative">
              {/* Connector Line (desktop) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-16 left-full w-full h-0.5 bg-gradient-to-r from-[#c9983a]/50 to-transparent" />
              )}

              <div
                className={`h-full backdrop-blur-[40px] border rounded-[24px] p-8 transition-all hover:border-[#c9983a]/30 hover:shadow-[0_12px_36px_rgba(201,152,58,0.15)] hover:-translate-y-1 ${
                  theme === "dark"
                    ? "bg-white/[0.08] border-white/15 hover:bg-white/[0.12]"
                    : "bg-white/[0.15] border-white/25 hover:bg-white/[0.2]"
                }`}
              >
                <div className="text-6xl font-bold bg-gradient-to-r from-[#c9983a] to-[#d4af37] bg-clip-text text-transparent mb-6">
                  {step.number}
                </div>
                <h3
                  className={`text-2xl font-semibold mb-4 transition-colors ${
                    theme === "dark" ? "text-[#e8dfd0]" : "text-[#2d2820]"
                  }`}
                >
                  {step.title}
                </h3>
                <p
                  className={`transition-colors ${
                    theme === "dark" ? "text-[#b8a898]" : "text-[#7a6b5a]"
                  }`}
                >
                  {step.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhyChooseUs() {
  const { theme } = useTheme();
  const { display } = useLandingStats();
  const payouts = useBountyPayouts();

  // Each line is something a visitor can check today. The list used to
  // promise mentorship, "transparent grant distribution" and Stellar payouts,
  // none of which exist.
  const benefits = [
    "Projects come in through the Grainlify GitHub App, installed by their maintainers, and stay in sync with GitHub",
    "Funded issues are assigned by a weighted draw, not to whoever applies first",
    "Every GrainHack and bounty rule is published before anyone applies",
    "The bounty agent's inference spend is on a public ledger, capped at $5 for its lifetime",
    "A person approves every bounty payout before it is sent",
    "Bounties pay USDC on Solana mainnet; GrainHack has paid on the Base Sepolia testnet so far",
  ];

  const spend =
    payouts.state === "ok" && payouts.inferenceSpendUsd !== null
      ? `$${payouts.inferenceSpendUsd.toFixed(2)} of a $${payouts.inferenceCeilingUsd.toFixed(0)} cap`
      : payouts.state === "loading"
        ? "—"
        : "Unavailable";

  return (
    <section id="why-choose-us" className="relative py-20 sm:py-24 md:py-32 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Benefits */}
          <Reveal>
            <h2
              className={`text-4xl md:text-5xl font-bold mb-6 transition-colors ${
                theme === "dark" ? "text-[#e8dfd0]" : "text-[#2d2820]"
              }`}
            >
              Why Choose Grainlify?
            </h2>
            <p
              className={`text-xl mb-10 transition-colors ${
                theme === "dark" ? "text-[#b8a898]" : "text-[#7a6b5a]"
              }`}
            >
              What the platform does today, in terms you can check.
            </p>

            <div className="space-y-4">
              {benefits.map((benefit) => (
                <div key={benefit} className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-[#c9983a] to-[#d4af37] flex items-center justify-center mt-1 shadow-[0_2px_8px_rgba(201,152,58,0.4)]">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                  <p
                    className={`transition-colors ${
                      theme === "dark" ? "text-[#e8dfd0]" : "text-[#2d2820]"
                    }`}
                  >
                    {benefit}
                  </p>
                </div>
              ))}
            </div>

          </Reveal>

          {/* Right: Visual Element */}
          <Reveal delay={0.15} className="relative">
            <div
              className={`backdrop-blur-[40px] border rounded-[28px] p-8 relative overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.08)] ${
                theme === "dark"
                  ? "bg-white/[0.08] border-white/15"
                  : "bg-white/[0.15] border-white/25"
              }`}
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#c9983a]/20 rounded-full blur-3xl" />
              <div className="relative space-y-6">
                {/* Labelled as what each number counts. These read "Active
                    Users" and "Projects Funded", above a "+45%" nobody had
                    measured: the API's figures are verified projects and the
                    GitHub authors of their issues and pull requests. */}
                {[
                  {
                    icon: Award,
                    label: "Verified projects listed",
                    value: display.activeProjects,
                  },
                  {
                    icon: Users,
                    label: "GitHub contributors to those projects",
                    value: display.contributors,
                  },
                  {
                    icon: TrendingUp,
                    label: "Bounty agent inference spend",
                    value: spend,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`flex items-center space-x-4 backdrop-blur-[25px] border rounded-[16px] p-4 transition-all hover:border-[#c9983a]/30 ${
                      theme === "dark"
                        ? "bg-white/[0.06] border-white/10 hover:bg-white/[0.1]"
                        : "bg-white/[0.12] border-white/20 hover:bg-white/[0.18]"
                    }`}
                  >
                    <div className="w-12 h-12 rounded-[12px] bg-gradient-to-br from-[#c9983a]/25 to-[#d4af37]/15 border border-[#c9983a]/30 flex items-center justify-center shadow-[0_4px_12px_rgba(201,152,58,0.15)]">
                      <item.icon className="w-6 h-6 text-[#c9983a]" />
                    </div>
                    <div className="flex-1">
                      <div
                        className={`text-sm transition-colors ${
                          theme === "dark" ? "text-[#b8a898]" : "text-[#7a6b5a]"
                        }`}
                      >
                        {item.label}
                      </div>
                      <div
                        className={`text-xl font-semibold transition-colors ${
                          theme === "dark" ? "text-[#e8dfd0]" : "text-[#2d2820]"
                        }`}
                      >
                        {item.value}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}


function FAQ() {
  return (
    <section id="faq" className="relative py-20 sm:py-24 md:py-32 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <SectionHeader
          eyebrow="FAQ"
          title="Frequently Asked Questions"
          subtitle="Everything you need to know about contributing and getting paid"
        />

        <Reveal delay={0.1}>
          <FAQAccordion />
        </Reveal>
      </div>
    </section>
  );
}

// ============================================================================
// The mechanism sections. These exist because the thing that distinguishes
// Grainlify from a bounty board is how work is allocated and priced, not the
// feature list - and a reader who cannot see the mechanism in the first
// screenful assumes there isn't one.
//
// Every claim below is enforced somewhere: draw weights in
// internal/hackathon/draw.go, the diminishing curve and floor in the published
// rule set, and the built/planned split against the on-chain spec's own
// as-built record. Nothing here describes something that only runs in a test.
// ============================================================================

const MECHANISM = [
  {
    title: "Issues are drawn, not claimed",
    // ai_fit_assessment_enabled is false, globally and for the one event that
    // has run, so the fit weighting is described as built and off - not as
    // the thing deciding draws today.
    body:
      "Applications open for a fixed window. When it closes, one applicant is drawn at random, weighted - so applying first gets you nothing. Your follower count, your merge rate and your overall history are deliberately not counted: they're farmable, and they push newcomers down. First-time applicants carry a 1.5x weight until they win something, and prior wins stop adding weight after two. Weighting by fit for the specific issue is built, but switched off today, so every applicant who passes the hard gates counts as an equal fit.",
  },
  {
    title: "Rewards are retroactive and quality-gated",
    body:
      "There's no rate card. A pool is split after the event among accepted work, so what a pull request earns depends on what everyone else contributed. Each additional accepted PR is worth progressively less down a published curve. You cannot work out a specific PR's multiplier while the event runs, because it depends on how many you end up getting accepted - which nobody knows until the event closes. A reward that can't be calculated in advance can't be farmed.",
  },
  {
    title: "Published in full, and safe to publish",
    body:
      "Every draw weight, cap, gate and curve is public before an event starts - all 102 rules, served from the same values the backend enforces, with the ones declared but not yet enforced marked as such. That's only safe because knowing the rules doesn't help you beat them: there's no queue to be first in, no metric to inflate, and no payout to precompute. Transparency without exploitability is the design, not a policy.",
  },
];

function Mechanism() {
  const { theme } = useTheme();
  const dark = theme === "dark";
  return (
    <section id="mechanism" className="relative py-20 sm:py-24 md:py-32 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <SectionHeader
          eyebrow="GrainHack"
          title="How a GrainHack event allocates"
          subtitle="Three mechanisms, all of them published before an event starts"
        />
        <div className="space-y-4 sm:space-y-5">
          {MECHANISM.map((item, i) => (
            <Reveal key={item.title} delay={0.05 * i}>
              {/* Title and body sit in separate columns on desktop so the three
                  mechanisms can be read as three headlines first and prose
                  second. Stacked into one column on mobile. */}
              <div
                className={`group relative overflow-hidden rounded-[20px] border p-6 sm:p-8 backdrop-blur-[30px] transition-colors ${
                  dark
                    ? "bg-white/[0.06] border-white/10 hover:border-[#c9983a]/30"
                    : "bg-white/[0.15] border-white/25 hover:border-[#c9983a]/30"
                }`}
              >
                {/* Accent rule, clipped by the card's own overflow-hidden so it
                    cannot bleed past the rounded corner. */}
                <span
                  aria-hidden
                  className="absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b from-[#c9983a] to-[#c9983a]/0"
                />
                <div className="grid gap-4 sm:gap-8 md:grid-cols-[minmax(0,17rem)_1fr] md:items-start">
                  <div className="flex items-baseline gap-3">
                    <span className="text-[13px] font-semibold tabular-nums text-[#c9983a]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3
                      className={`text-xl sm:text-[22px] font-bold leading-snug transition-colors ${
                        dark ? "text-[#e8dfd0]" : "text-[#2d2820]"
                      }`}
                    >
                      {item.title}
                    </h3>
                  </div>
                  <p
                    className={`max-w-[68ch] text-[15px] leading-relaxed transition-colors ${
                      dark ? "text-[#b8a898]" : "text-[#7a6b5a]"
                    }`}
                  >
                    {item.body}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function PillLink({ label, href, external }: { label: string; href: string; external?: boolean }) {
  const { theme } = useTheme();
  const className = `px-4 py-2.5 rounded-[12px] border text-[13px] font-medium backdrop-blur-[30px] transition-all ${
    theme === "dark"
      ? "bg-white/[0.06] border-white/10 text-[#e8dfd0] hover:border-[#c9983a]/40"
      : "bg-white/[0.15] border-white/25 text-[#2d2820] hover:border-[#c9983a]/40"
  }`;
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {label}
    </a>
  ) : (
    <Link to={href} className={className}>
      {label}
    </Link>
  );
}

// ============================================================================
// Grainlify Bounties. Live on Solana mainnet, and the programme somebody can
// act on today. Each step is what the agent and the people around it actually
// do; the last card reads the payout count from the public ledger rather than
// stating it, so it cannot go stale.
// ============================================================================

const BOUNTY_STEPS = [
  {
    title: "Posted on Grainlify's repositories",
    body: "Each bounty is an issue on one of Grainlify's own repositories, with a set USDC amount and a window to apply in.",
  },
  {
    title: "Applicants assessed by an AI agent",
    body: "The agent assesses each applicant's fit for the issue. It buys every inference call on UsePod over x402, and that spend is on the public ledger, capped at $5 for the agent's lifetime.",
  },
  {
    title: "A weighted, replayable draw",
    body: "When the window closes, a weighted draw picks one contributor. Applying first gives no advantage, and the draw can be replayed to check it.",
  },
  {
    title: "Reviewed, then approved by a person",
    body: "The agent reviews the pull request, as advice only. A maintainer decides whether to merge, and a person approves every payout.",
  },
  {
    title: "Paid in USDC on Solana",
    body: "The approved amount is sent in USDC on Solana mainnet to the wallet the contributor linked to their GitHub account.",
  },
];

function Bounties() {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const payouts = useBountyPayouts();

  const card = `h-full backdrop-blur-[40px] border rounded-[24px] p-7 transition-colors ${
    dark ? "bg-white/[0.08] border-white/15" : "bg-white/[0.15] border-white/25"
  }`;

  return (
    <section id="bounties" className="relative py-20 sm:py-24 md:py-32 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <SectionHeader
          eyebrow="Grainlify Bounties"
          title="Bounties, run by an agent"
          subtitle="Live on Solana mainnet. A fixed USDC amount on each issue, assigned by a draw, and every payout approved by a person."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {BOUNTY_STEPS.map((step, index) => (
            <Reveal key={step.title} delay={index * 0.05}>
              <div className={card}>
                <div className="text-4xl font-bold bg-gradient-to-r from-[#c9983a] to-[#d4af37] bg-clip-text text-transparent mb-4">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <h3 className={`text-xl font-semibold mb-3 ${dark ? "text-[#e8dfd0]" : "text-[#2d2820]"}`}>{step.title}</h3>
                <p className={dark ? "text-[#b8a898]" : "text-[#7a6b5a]"}>{step.body}</p>
              </div>
            </Reveal>
          ))}

          <Reveal delay={BOUNTY_STEPS.length * 0.05}>
            <div className={`${card} ${dark ? "border-[#c9983a]/30" : "border-[#c9983a]/35"}`}>
              <div className="text-sm font-semibold tracking-wide uppercase text-[#c9983a] mb-4">Paid so far</div>
              <p className={`text-xl font-semibold mb-6 ${dark ? "text-[#e8dfd0]" : "text-[#2d2820]"}`}>{bountyPayoutLine(payouts)}</p>
              <div className="flex flex-wrap gap-3">
                {/* The Bounties pages need an account: a signed-out visitor
                    is sent to sign in and brought back here. */}
                <Link
                  to="/dashboard?tab=bounties"
                  className="px-5 py-2.5 rounded-[12px] bg-gradient-to-r from-[#c9983a] to-[#d4af37] text-[#2d2820] text-[14px] font-semibold inline-flex items-center gap-2 group shadow-[0_6px_20px_rgba(162,121,44,0.3)] border border-white/10"
                >
                  See open bounties
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
              <p className={`mt-3 text-[13px] ${dark ? "text-[#b8a898]" : "text-[#7a6b5a]"}`}>Signing in with GitHub comes first.</p>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <PillLink label="How bounties work" href="/docs/contributors/bounties" />
            <PillLink label="The bounty rules" href="/bounties/rules" />
            <PillLink label="Apply for a bounty" href="/docs/contributors/apply-for-a-bounty" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// The split is the point. Blurring built and planned is how a reviewer who
// checks one claim stops believing the rest, so these are two visibly separate
// columns and never one merged list.
//
// Wording is deliberate. The escrow layer is an interface plus a registry plus
// dispatch plus Merkle primitives, tested against an in-memory adapter, so
// "with adapters" would overstate it. Referral attribution is shipped and
// enforced server-side, but no referral has ever completed in production, so
// it is not described as live. The Soroban contract is not listed: the
// Soroban configuration was deleted and nothing has been paid on Stellar.
const BUILT = [
  "GrainHack weighted-draw assignment with published rules - 102 parameters at the public rules endpoint, 88 of them enforced today",
  "First GrainHack event run on the Base Sepolia testnet, 18-19 Sep 2026 - two issues drawn, fixed and judged accepted, and both contributors paid 4 USDC on the testnet through KeeperHub",
  "Grainlify Bounties on Solana mainnet: an AI agent assesses applicants, buying each inference call on UsePod over x402; a weighted, replayable draw picks the contributor; the agent reviews the pull request as advice only; a person approves every USDC payout",
  "A public ledger of the bounty agent's inference spend, with a $5 lifetime cap",
  "Leaderboard scored on verified merged pull requests",
  "Chain-agnostic escrow layer: adapter interface, registry, all-or-nothing multi-chain dispatch and Merkle claim primitives, tested against an in-memory adapter",
  "Role-based admin access, server-verified on every request",
  "Referral attribution shipped and server-enforced, with a signed 30-day window - not yet exercised end to end in production",
];

const PLANNED = [
  "A GrainHack event paid on mainnet",
  "Aptos settlement claims switched on - built and tested on the Aptos testnet, not live",
  "External audit before any escrow contract holds mainnet funds",
  "AI-assisted evidence gathering for judging - humans decide, with appeals",
];

function BuiltAndPlanned() {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const payouts = useBountyPayouts();

  // The first bounty payout moves itself from Planned to Built: the count is
  // read from the agent's ledger, so neither column goes stale the day it
  // happens. While the ledger is loading or unreachable, neither line shows.
  const paid = payouts.state === "ok" ? payouts.paidMainnet : null;
  const built =
    paid !== null && paid > 0
      ? [...BUILT, `${paid} ${paid === 1 ? "bounty" : "bounties"} paid in USDC on Solana mainnet`]
      : BUILT;
  const planned = paid === 0 ? ["The first bounty payout on Solana mainnet", ...PLANNED] : PLANNED;

  // Built is the column a reviewer checks, so it carries the weight: gold
  // markers, a solid top rule, full-contrast text. Planned is deliberately
  // quieter - dashed markers, muted text - so the two can never be skimmed as
  // one list of accomplishments.
  const column = (
    title: string,
    items: string[],
    tone: "built" | "planned",
  ) => {
    const built = tone === "built";
    const Marker = built ? CheckCircle : CircleDashed;
    return (
      <div
        className={`relative h-full overflow-hidden rounded-[20px] border p-6 sm:p-8 backdrop-blur-[30px] transition-colors ${
          built
            ? dark
              ? "bg-white/[0.07] border-[#c9983a]/25"
              : "bg-white/[0.2] border-[#c9983a]/30"
            : dark
              ? "bg-white/[0.03] border-white/10"
              : "bg-white/[0.1] border-white/20"
        }`}
      >
        <span
          aria-hidden
          className={`absolute inset-x-0 top-0 h-[3px] ${
            built
              ? "bg-gradient-to-r from-[#c9983a] to-[#d4af37]"
              : dark
                ? "bg-white/10"
                : "bg-black/10"
          }`}
        />
        <h3
          className={`text-lg font-bold mb-5 transition-colors ${
            dark ? "text-[#e8dfd0]" : "text-[#2d2820]"
          }`}
        >
          {title}
        </h3>
        <ul className="space-y-3.5">
          {items.map((item) => (
            <li key={item} className="flex gap-3">
              <Marker
                aria-hidden
                className={`mt-[3px] h-4 w-4 shrink-0 ${
                  built ? "text-[#c9983a]" : dark ? "text-white/30" : "text-black/25"
                }`}
              />
              <span
                className={`text-[14px] leading-relaxed transition-colors ${
                  built
                    ? dark
                      ? "text-[#d6c9b6]"
                      : "text-[#5f5344]"
                    : dark
                      ? "text-[#b8a898]"
                      : "text-[#7a6b5a]"
                }`}
              >
                {item}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <section id="status" className="relative py-20 sm:py-24 md:py-32 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <SectionHeader
          eyebrow="Status"
          title="Built, and planned"
          subtitle="Kept separate on purpose - every line on the left is something you can check"
        />
        <div className="grid gap-5 md:grid-cols-2">
          <Reveal>{column("Built and running today", built, "built")}</Reveal>
          <Reveal delay={0.05}>{column("Planned", planned, "planned")}</Reveal>
        </div>

        <Reveal delay={0.1}>
          {/* Set apart rather than tucked underneath. This paragraph is the
              page's credibility, so it should look deliberate - a reader who
              skims the two columns and stops here has read the honest part. */}
          <p
            className={`mt-8 mx-auto max-w-3xl rounded-[16px] border-l-2 border-[#c9983a] py-4 pl-5 pr-5 text-[14px] leading-relaxed transition-colors ${
              dark ? "bg-white/[0.04] text-[#c6b7a3]" : "bg-white/[0.12] text-[#6b5d4d]"
            }`}
          >
            The first GrainHack event has run, on the Base Sepolia testnet: both
            of its issues were drawn, fixed and judged accepted, and on 19
            September both contributors were paid 4 USDC each on that testnet,
            through KeeperHub. No GrainHack payout has been made on mainnet.
            GrainHack draws are executed by the backend and recorded, not yet
            anchored on-chain - commit-reveal and Merkle claims are written and
            tested, and are not yet wired to a live chain. We'd rather say that
            than imply otherwise.
          </p>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {VERIFY_LINKS.map((link) => (
              <PillLink key={link.href} {...link} />
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// Verify it yourself. Every one of these is a page a person can read - they
// used to include two raw JSON endpoints. The internal ones are the public
// docs and the public bounty rules page; the leaderboard needs sign-in, as the
// whole dashboard does. A link that 404s on a page about not overstating is
// worse than no link.
const VERIFY_LINKS: { label: string; href: string; external?: boolean }[] = [
  { label: "How a GrainHack draw works", href: "/docs/contributors/grainhack-draw" },
  { label: "The bounty rules", href: "/bounties/rules" },
  { label: "The leaderboard", href: "/dashboard?tab=leaderboard" },
  { label: "Backend source", href: "https://github.com/Grainlify/Grainlify-Backend", external: true },
  { label: "Frontend source", href: "https://github.com/Grainlify/Grainlify-Frontend", external: true },
];
