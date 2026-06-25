const fs = require("fs");
const os = require("os");
const path = require("path");
const anchor = require("@anchor-lang/core");
const { BN, web3 } = anchor;
const { Connection, Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, sendAndConfirmTransaction } = web3;
const { TOKEN_PROGRAM_ID, createMint, getOrCreateAssociatedTokenAccount, mintTo } = require("@solana/spl-token");
const dlmm = require("@meteora-ag/dlmm");
const DLMM = dlmm.default || dlmm;
const { ActivationType, deriveCustomizablePermissionlessLbPair } = dlmm;

const RPC = "https://api.devnet.solana.com";
const WSOL = new PublicKey("So11111111111111111111111111111111111111112");
const METEORA = new PublicKey("LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo");

async function main() {
  const payer = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(path.join(os.homedir(), ".config/solana/id.json")))),
  );
  const connection = new Connection(RPC, "confirmed");
  const wallet = new anchor.Wallet(payer);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  anchor.setProvider(provider);
  const idl = JSON.parse(fs.readFileSync(path.join(__dirname, "../../target/idl/bigshort.json")));
  const program = new anchor.Program(idl, provider);
  const pid = program.programId;
  console.log("payer:", payer.publicKey.toBase58(), "bal", (await connection.getBalance(payer.publicKey)) / 1e9);

  const USDC = await createMint(connection, payer, payer.publicKey, null, 6);
  const ata = await getOrCreateAssociatedTokenAccount(connection, payer, USDC, payer.publicKey);
  await mintTo(connection, payer, USDC, ata.address, payer, 1_000_000_000000);
  console.log("[1] test-USDC:", USDC.toBase58());

  const [pool] = deriveCustomizablePermissionlessLbPair(WSOL, USDC, METEORA);
  const binStep = new BN(25), feeBps = new BN(25), activeId = new BN(-759);
  if (!(await connection.getAccountInfo(pool))) {
    const tx = await DLMM.createCustomizablePermissionlessLbPair(
      connection, binStep, WSOL, USDC, activeId, feeBps, ActivationType.Timestamp, false, payer.publicKey,
    );
    const sig = await sendAndConfirmTransaction(connection, tx, [payer], { commitment: "confirmed" });
    console.log("[2] pool created:", sig);
  }
  const poolObj = await DLMM.create(connection, pool);
  console.log("    pool:", pool.toBase58(), "activeId", poolObj.lbPair.activeId);

  const position = Keypair.generate();
  console.log("[3] position:", position.publicKey.toBase58());

  const enc = (s) => Buffer.from(s);
  const [vault] = PublicKey.findProgramAddressSync([enc("vault"), USDC.toBuffer()], pid);
  const [shareMint] = PublicKey.findProgramAddressSync([enc("share"), vault.toBuffer()], pid);
  const [quoteVault] = PublicKey.findProgramAddressSync([enc("quote"), vault.toBuffer()], pid);
  const [baseVault] = PublicKey.findProgramAddressSync([enc("base"), vault.toBuffer()], pid);

  const driftUser = Keypair.generate().publicKey;
  const sig = await program.methods
    .initializeVault(payer.publicKey, position.publicKey, driftUser, 500, 1000, 100)
    .accountsPartial({
      authority: payer.publicKey, quoteMint: USDC, baseMint: WSOL,
      vault, shareMint, quoteVault, baseVault,
      tokenProgram: TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId, rent: SYSVAR_RENT_PUBKEY,
    })
    .rpc();
  console.log("[4] initialize_vault:", sig);
  console.log("    vault:", vault.toBase58());

  const out = {
    rpc: RPC, programId: pid.toBase58(),
    quoteMint: USDC.toBase58(), baseMint: WSOL.toBase58(),
    pool: pool.toBase58(), binStep: 25, activeId: poolObj.lbPair.activeId,
    reserveX: poolObj.lbPair.reserveX.toBase58(), reserveY: poolObj.lbPair.reserveY.toBase58(),
    vault: vault.toBase58(), shareMint: shareMint.toBase58(),
    quoteVault: quoteVault.toBase58(), baseVault: baseVault.toBase58(),
    position: position.publicKey.toBase58(),
    positionSecret: Array.from(position.secretKey),
    payerUsdcAta: ata.address.toBase58(),
  };
  fs.writeFileSync(path.join(__dirname, "../devnet.json"), JSON.stringify(out, null, 2));
  console.log("\n[done] setup saved to surf/devnet.json");
}

main().catch((e) => { console.error("FAILED:", e.message || e); if (e.logs) console.error(e.logs.join("\n")); process.exit(1); });
