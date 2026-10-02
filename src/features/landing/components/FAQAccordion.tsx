import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus } from "lucide-react";
import { useTheme } from "../../../shared/contexts/ThemeContext";

interface FAQItem {
  question: string;
  answer: string;
}

// Grounded in the platform's actual mechanics rather than generic SaaS FAQ
// filler - and in what is true TODAY. Four of these answers previously
// described the points-to-USDC redemption programme, which was retired, and
// three said payouts settle on Stellar, where nothing has ever been paid.
const FAQS: FAQItem[] = [
  {
    question: "How do I actually get paid for contributing?",
    answer:
      "It depends on the programme. A Grainlify bounty pays the USDC amount posted on it, on Solana mainnet, to the wallet you linked - after a maintainer merges your pull request and a person approves the payout. No bounty has been paid yet. A GrainHack event has no per-task rate: its pool is divided after the event across accepted work, against rules published before it starts. The one event so far ran on the Base Sepolia testnet, and its two contributors were paid 4 USDC each there on 19 September 2026. Ordinary issues carry no payment.",
  },
  {
    question: "Why do you need KYC?",
    answer:
      "Identity verification, through a third-party provider (Didit), is required before you can be paid from a GrainHack event or the Founding Contributor Pool, and for a referral to count. Bounties do not require it. You verify once, from Settings; if the provider later withdraws its approval, you would need to verify again before the next such payout.",
  },
  {
    question: "I maintain a project - how do I list it?",
    answer:
      "Install the Grainlify GitHub App on your repository from the Maintainers tab. We sync your issues and pull requests automatically, so you can label what's open for contribution and review submissions without leaving your normal GitHub workflow.",
  },
  {
    question: "Do I need any crypto experience to start?",
    answer:
      "No. You sign in with GitHub, apply to issues, and contribute like you normally would. Crypto comes in only at payout: to win a bounty you link a Solana wallet such as Phantom, Solflare or Backpack, by signing one message.",
  },
  {
    question: "How is an issue assigned?",
    answer:
      "It depends on whether the issue is funded. A Grainlify bounty or a GrainHack issue is assigned by a weighted draw, not first-come: applications open for a fixed window, and when it closes one applicant is drawn. Your follower count, star count, total pull requests and merge rate are deliberately not counted - they are farmable, and they push newcomers down. On a bounty, an AI agent assesses each applicant's fit for the issue; in GrainHack that assessment is built but switched off, so the weights come from the published rules, such as a bonus for first-time applicants. Outside those programmes there is no money on the issue, so the project maintainer reviews the applications and chooses who gets it.",
  },
  {
    question: "Is Grainlify free to use?",
    answer:
      "Yes, for both contributors and maintainers. There's no cost to browse issues, apply, or list a repository. A platform fee can be taken from a sponsor's total before a GrainHack event's pool is set; the rate is published with the event's rules, and it was 0% for the first event.",
  },
];

export function FAQAccordion() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="max-w-3xl mx-auto space-y-3">
      {FAQS.map((faq, index) => {
        const isOpen = openIndex === index;
        return (
          <div
            key={faq.question}
            className={`rounded-[20px] border backdrop-blur-[30px] overflow-hidden transition-colors ${
              isDark ? "bg-white/[0.06] border-white/12" : "bg-white/[0.15] border-white/25"
            } ${isOpen ? "border-[#c9983a]/40" : ""}`}
          >
            <button
              onClick={() => setOpenIndex(isOpen ? null : index)}
              aria-expanded={isOpen}
              className="w-full flex items-center justify-between gap-4 text-left px-5 sm:px-7 py-5"
            >
              <span className={`font-semibold text-[15px] sm:text-base transition-colors ${isDark ? "text-[#e8dfd0]" : "text-[#2d2820]"}`}>
                {faq.question}
              </span>
              <motion.span
                animate={{ rotate: isOpen ? 45 : 0 }}
                transition={{ duration: 0.2 }}
                className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center border ${
                  isOpen
                    ? "bg-gradient-to-br from-[#c9983a] to-[#d4af37] border-transparent"
                    : isDark
                      ? "border-white/20 text-[#e8dfd0]"
                      : "border-black/15 text-[#2d2820]"
                }`}
              >
                <Plus className={`w-4 h-4 ${isOpen ? "text-white" : ""}`} />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <p className={`px-5 sm:px-7 pb-6 text-sm sm:text-[15px] leading-relaxed transition-colors ${isDark ? "text-[#b8a898]" : "text-[#7a6b5a]"}`}>
                    {faq.answer}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
