import { useTheme } from "../../../shared/contexts/ThemeContext";
import { bountyPayoutLine, useBountyPayouts } from "../hooks/useBountyPayouts";

// Which chain pays what, today. It replaced a screenshot of the Bounties page
// that showed three bounties "closing in 4 hours" - two of them since
// cancelled - which is what a static picture of live state turns into.
//
// Each card states only what has happened. GrainHack's line is history and
// cannot go stale. The bounty line is read from the agent's public ledger, so
// it changes the day the first bounty is paid without anybody editing this
// file. Aptos is built and not switched on, and says so.
export function PayoutStatus() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const payouts = useBountyPayouts();

  const rows = [
    {
      programme: "GrainHack",
      chain: "Base Sepolia testnet · USDC",
      body:
        "One event has run, 18–19 Sep 2026. Both contributors were paid 4 USDC each on the testnet, through KeeperHub. No GrainHack payout has been made on mainnet yet.",
    },
    {
      programme: "Grainlify Bounties",
      chain: "Solana mainnet · USDC",
      body: bountyPayoutLine(payouts),
    },
    {
      programme: "Aptos claims",
      chain: "Built, not live",
      body: "Settlement claims are built and tested on the Aptos testnet. Claiming is not switched on, so nothing is paid on Aptos.",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left" aria-label="Where payouts happen today">
      {rows.map((row) => (
        <div
          key={row.programme}
          className={`backdrop-blur-[40px] border rounded-[20px] p-5 sm:p-6 transition-colors ${
            isDark ? "bg-white/[0.08] border-white/15" : "bg-white/[0.15] border-white/25"
          }`}
        >
          <div className={`text-[17px] font-semibold mb-1 ${isDark ? "text-[#e8dfd0]" : "text-[#2d2820]"}`}>{row.programme}</div>
          <div className={`text-[13px] font-semibold mb-3 ${isDark ? "text-[#e8c571]" : "text-[#7a5a1c]"}`}>{row.chain}</div>
          <p className={`text-[14px] leading-relaxed ${isDark ? "text-[#b8a898]" : "text-[#6b5d4d]"}`}>{row.body}</p>
        </div>
      ))}
    </div>
  );
}
