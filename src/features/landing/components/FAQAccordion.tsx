import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus } from "lucide-react";
import { useTheme } from "../../../shared/contexts/ThemeContext";

interface FAQItem {
  question: string;
  answer: string;
}

// Grounded in the platform's actual mechanics (same facts as the in-app Terms
// page: Didit KYC, points -> USDC-on-Stellar redemption, admin-reviewed
// payouts) rather than generic SaaS FAQ filler.
const FAQS: FAQItem[] = [
  {
    question: "How do I actually get paid for contributing?",
    answer:
      "You earn points for merged contributions and other platform activity. Once you've hit the minimum threshold, you request a redemption from your points balance - an admin reviews it, and approved requests are paid out in USDC on the Stellar network to the wallet address you provide.",
  },
  {
    question: "Why do you need KYC?",
    answer:
      "Because real money moves through the platform. We use a third-party provider (Didit) to verify identity before your first redemption, which keeps the reward pool compliant and protects against fraud - it's a one-time step, not something you repeat per payout.",
  },
  {
    question: "I maintain a project - how do I list it?",
    answer:
      "Install the Grainlify GitHub App on your repository from the Maintainers tab. We sync your issues and pull requests automatically, so you can label what's open for contribution and review submissions without leaving your normal GitHub workflow.",
  },
  {
    question: "Do I need any crypto experience to start?",
    answer:
      "No. You sign in with GitHub, browse or get matched to issues, and contribute like you normally would. The only place crypto comes in is at redemption time, when you provide a Stellar wallet address to receive USDC.",
  },
  {
    question: "What if I'm not ready to redeem yet?",
    answer:
      "Your points stay on your account - there's no expiry for simply holding them. Redeem whenever you've cleared the minimum threshold and are ready to add a wallet address.",
  },
  {
    question: "Is Grainlify free to use?",
    answer:
      "Yes, for both contributors and maintainers. There's no cost to browse issues, apply, or list a repository - we don't currently charge fees on redemptions either, though that's disclosed up front if it ever changes.",
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
