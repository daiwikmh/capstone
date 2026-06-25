const fs = require("fs");
const os = require("os");
const path = require("path");
const anchor = require("@anchor-lang/core");
const { BN, web3 } = anchor;
const { Connection, Keypair, PublicKey, SystemProgram, ComputeBudgetProgram, sendAndConfirmTransaction, Transaction } = web3;
const { TOKEN_PROGRAM_ID, mintTo, getAccount, createSyncNativeInstruction } = require("@solana/spl-token");
const dlmm = require("@meteora-ag/dlmm");
const DLMM = dlmm.default || dlmm;
const { deriveBinArray, deriveEventAuthority } = dlmm;

const METEORA = new PublicKey("LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo");
const ARRAY_LOWER = -12;
const ARRAY_UPPER = -11;

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

  const USDC = new PublicKey(cfg.quoteMint), WSOL = new PublicKey(cfg.baseMint);
  const pool = new PublicKey(cfg.pool), vault = new PublicKey(cfg.vault);
  const position = new PublicKey(cfg.position);
  const baseVault = new PublicKey(cfg.baseVault), quoteVault = new PublicKey(cfg.quoteVault);
  const reserveX = new PublicKey(cfg.reserveX), reserveY = new PublicKey(cfg.reserveY);
  const [binArrayLower] = deriveBinArray(pool, new BN(ARRAY_LOWER), METEORA);
  const [binArrayUpper] = deriveBinArray(pool, new BN(ARRAY_UPPER), METEORA);
  const [eventAuthority] = deriveEventAuthority(METEORA);
  const poolObj = await DLMM.create(connection, pool);

  const toInit = [];
  for (const [idx, key] of [[ARRAY_LOWER, binArrayLower], [ARRAY_UPPER, binArrayUpper]]) {
    if (!(await connection.getAccountInfo(key))) toInit.push(new BN(idx));
  }
  if (toInit.length) {
    const ixs = await poolObj.initializeBinArrays(toInit, payer.publicKey);
    const tx = new Transaction().add(...ixs);
    const sig = await sendAndConfirmTransaction(connection, tx, [payer], { commitment: "confirmed" });
    console.log("[1] bin arrays", toInit.map((b) => b.toNumber()), "initialized:", sig);
  } else {
    console.log("[1] bin arrays already exist");
  }

  await mintTo(connection, payer, USDC, quoteVault, payer, 200_000000);
  const wrapTx = new Transaction().add(
    SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: baseVault, lamports: 200_000_000 }),
    createSyncNativeInstruction(baseVault),
  );
  await sendAndConfirmTransaction(connection, wrapTx, [payer], { commitment: "confirmed" });
  const qv0 = await getAccount(connection, quoteVault), bv0 = await getAccount(connection, baseVault);
  console.log("[2] funded vault — base(wSOL):", Number(bv0.amount) / 1e9, " quote(USDC):", Number(qv0.amount) / 1e6);

  const param = {
    amountX: new BN(150_000_000),
    amountY: new BN(150_000000),
    activeId: cfg.activeId,
    maxActiveBinSlippage: 10,
    strategyParameters: {
      minBinId: -773, maxBinId: -745,
      strategyType: { spotBalanced: {} },
      parameteres: Array(64).fill(0),
    },
  };

  const ra = (pubkey, isWritable) => ({ pubkey, isSigner: false, isWritable });
  const remaining = [
    ra(METEORA, false),
    ra(position, true),
    ra(pool, true),
    ra(METEORA, false),
    ra(baseVault, true),
    ra(quoteVault, true),
    ra(reserveX, true),
    ra(reserveY, true),
    ra(WSOL, false),
    ra(USDC, false),
    ra(binArrayLower, true),
    ra(binArrayUpper, true),
    ra(vault, false),
    ra(TOKEN_PROGRAM_ID, false),
    ra(TOKEN_PROGRAM_ID, false),
    ra(eventAuthority, false),
    ra(METEORA, false),
  ];

  const sig = await program.methods
    .meteoraAddLiquidity(param)
    .accountsPartial({ keeper: payer.publicKey, vault })
    .remainingAccounts(remaining)
    .preInstructions([ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 })])
    .rpc();
  console.log("\n[3] meteora_add_liquidity:", sig);

  const qv1 = await getAccount(connection, quoteVault), bv1 = await getAccount(connection, baseVault);
  const rx = await getAccount(connection, reserveX), ry = await getAccount(connection, reserveY);
  console.log("\n[4] readback:");
  console.log("    base_vault wSOL :", Number(bv0.amount) / 1e9, "->", Number(bv1.amount) / 1e9);
  console.log("    quote_vault USDC:", Number(qv0.amount) / 1e6, "->", Number(qv1.amount) / 1e6);
  console.log("    pool reserveX   :", Number(rx.amount) / 1e9, "wSOL");
  console.log("    pool reserveY   :", Number(ry.amount) / 1e6, "USDC");
  console.log("\n[done] liquidity added to vault-owned Meteora position via CPI");
}

main().catch((e) => { console.error("FAILED:", e.message || e); if (e.logs) console.error(e.logs.join("\n")); process.exit(1); });
