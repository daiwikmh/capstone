# The Big Short

A non-custodial Solana vault that earns Meteora trading fees **without** the price-risk bleed that normally eats those fees. It does this by pairing every liquidity position with an offsetting short on Drift, so the directional risk roughly nets to zero and what's left is mostly fee yield.

You deposit once. The vault does the rest.

---

## The problem

When you provide concentrated liquidity on Meteora, you earn fees — but you quietly lose money whenever the price trends. That hidden loss is **impermanent loss (IL)**. It's like renting out your car: rent comes in the front door, depreciation leaks out the back.

## The fix

Alongside the LP position, the vault opens a **short** on Drift. If the price moves and the LP loses, the short gains — they cancel out. You're left with the fees.

The vault always holds two positions, and keeps them balanced:

| Leg | Venue | Role |
|-----|-------|------|
| **LP leg** | Meteora DLMM | Earns fees, exposed to price |
| **Hedge leg** | Drift perps | A short that offsets the LP's price exposure |

## Why it's balanceable

There's a useful fact about LP positions: the amount of price risk a position carries is (almost exactly) equal to **how much of the risky token it currently holds**. Hold 10 SOL inside Meteora → the correct hedge is short 10 SOL on Drift.

That "how much do we hold" number is something the **contract reads and verifies on-chain** from Meteora's own per-bin reserves — it never has to trust anyone's claim about it.

## The trust model

Solana contracts can't run on a timer, so an off-chain **keeper** sends the rebalance transactions. But the keeper is never trusted:

> The keeper *proposes* a change. The contract *checks* it against strict rules and **rejects** anything unsafe.

The keeper can do its job, but it physically cannot steal funds, over-leverage, or leave the vault unhedged. The worst a broken or malicious keeper can do is *nothing*.

Every rebalance must pass three on-chain safety rules:

1. **Stay balanced** — the short must closely match the LP's risky-token amount.
2. **Keep a safety margin** — never let the short drift close to liquidation.
3. **Funding brake** — if holding the short gets too expensive, the keeper may only *shrink* it, never grow it.

If any rule fails, the whole transaction reverts and nothing changes.

---

## Architecture

```
                          ┌──────────────────────────┐
                          │         Depositor         │
                          │  deposit USDC / withdraw  │
                          └────────────┬─────────────┘
                                       │ shares (priced at NAV)
                                       ▼
        ┌──────────────────────────────────────────────────────────┐
        │                  bigshort program (vault PDA)              │
        │                                                            │
        │   Vault state ── shares ── NAV ── safety rulebook          │
        │                                                            │
        │   instructions:                                            │
        │     initialize_vault · deposit · withdraw                  │
        │     rehedge (enforces the 3 safety rules)                  │
        │     set_pause                                              │
        │                                                            │
        │   dlmm.rs ── reads Meteora bins → derives risky-token qty  │
        └──────┬─────────────────────────────────────────┬──────────┘
               │ CPI (vault PDA signs)                    │ CPI
               ▼                                          ▼
     ┌───────────────────┐                      ┌───────────────────┐
     │   Meteora DLMM    │                      │      Drift v2      │
     │  (LP leg — fees)  │                      │  (hedge leg — short)│
     └───────────────────┘                      └───────────────────┘
               ▲                                          ▲
               │ proposes rebalances, never holds funds   │
               └────────────────────┬─────────────────────┘
                                    │
                          ┌─────────┴─────────┐
                          │   off-chain keeper │
                          └───────────────────┘
```

**How money flows over a day:**

```
1. Deposit USDC            → receive shares (your receipt of ownership)
2. Keeper deploys cash     → liquidity into Meteora + matching short on Drift
3. Price moves all day     → keeper calls rehedge; contract re-checks the 3 rules
4. Withdraw                → hand back shares, get your slice of (fees − hedging cost)
```

Deposits and withdrawals are priced by **NAV** (net asset value = LP leg + hedge leg + idle cash), exactly like units of a fund — nobody gets a better or worse price than the vault is actually worth.

---

## Status

| Piece | Status |
|-------|--------|
| Vault, shares, NAV, deposit / withdraw | Live on devnet |
| The 3 safety rules (`rehedge`) | Live, exercised on devnet against a real position |
| On-chain risky-token calculator (`dlmm.rs`) | Built and unit-tested; verified against live Meteora data |
| Meteora LP leg (init position, add liquidity, rehedge mark) | Proven end-to-end on devnet via the vault's own CPI |
| Drift hedge leg | Keeper-reported / simulated — real Drift CPI is the remaining integration |
| Web app (landing + live dashboard) | Built, reads live vault state |

The vault brain, the rulebook, and the Meteora leg are real and running on devnet. The Drift hedge leg is the next piece to wire up against live markets.

---

## Glossary

- **Concentrated liquidity** — LPing within a chosen price range: more fees, more IL risk.
- **Impermanent loss (IL)** — the hidden loss an LP takes when price trends.
- **Hedge / short** — a position that profits when price falls, used to cancel the LP's price risk.
- **Delta** — how much your value changes when price changes. *Delta-neutral* = price moves don't hurt you.
- **Perp** — the perpetual contract on Drift used to short.
- **Funding** — the ongoing cost of holding a perp short; the main price you pay for the hedge.
- **Keeper** — the off-chain bot that triggers rebalances, fully constrained by the contract.
- **NAV** — the vault's total current value, used to price shares fairly.
- **Liquidation** — a position forcibly closed when its margin runs out; the vault guards against this.
