const fs = require("fs");
const os = require("os");
const path = require("path");
const anchor = require("@anchor-lang/core");
const { BN, web3 } = anchor;
const { Connection, Keypair, PublicKey } = web3;
const dlmm = require("@meteora-ag/dlmm");
const DLMM = dlmm.default || dlmm;
const { deriveBinArray } = dlmm;

const METEORA = new PublicKey("LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo");
const ARRAY_LOWER = -12;
const ARRAY_UPPER = -11;
const PRICE = 150000;

async function main() {
  const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, "../devnet.json")));
  const payer = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(path.join(os.homedir(), ".config/solana/id.json")))),
  );
  const connection = new Connection(cfg.rpc, "confirmed");
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(payer), { commitment: "confirmed" });
  anchor.setProvider(provider);
  const idl = JSON.parse(fs.readFileSync(path.join(__dirname, "../../target/idl/bigshort.json")));
  const program = new anchor.Program(idl, provider);

  const pool = new PublicKey(cfg.pool), vault = new PublicKey(cfg.vault);
  const position = new PublicKey(cfg.position);
  const [binArrayLower] = deriveBinArray(pool, new BN(ARRAY_LOWER), METEORA);
  const [binArrayUpper] = deriveBinArray(pool, new BN(ARRAY_UPPER), METEORA);

  const poolObj = await DLMM.create(connection, pool);
  const pos = await poolObj.getPosition(position);
  const baseQty = new BN(pos.positionData.totalXAmount.split(".")[0]);
  console.log("position base (wSOL lamports):", baseQty.toString());

  const notional = baseQty.mul(new BN(PRICE)).div(new BN(1_000_000));
  const params = {
    shortBaseQty: baseQty,
    driftCollateralQuote: notional,
    driftPnlQuote: new BN(0),
    price: new BN(PRICE),
    fundingRateBps: 0,
  };

  const ra = (pubkey) => ({ pubkey, isSigner: false, isWritable: false });
  const remaining = [ra(position), ra(binArrayLower), ra(binArrayUpper)];

  const sig = await program.methods
    .rehedge(params)
    .accountsPartial({ keeper: payer.publicKey, vault })
    .remainingAccounts(remaining)
    .rpc();
  console.log("\n[done] rehedge:", sig);

  const v = await program.account.vault.fetch(vault);
  console.log("\nvault marked:");
  console.log("  position_base_qty :", v.positionBaseQty.toString());
  console.log("  short_base_qty    :", v.shortBaseQty.toString());
  console.log("  lp_value_quote    :", (Number(v.lpValueQuote) / 1e6).toFixed(4), "USDC");
  console.log("  last_price        :", v.lastPrice.toString());
}

main().catch((e) => { console.error("FAILED:", e.message || e); if (e.logs) console.error(e.logs.join("\n")); process.exit(1); });
