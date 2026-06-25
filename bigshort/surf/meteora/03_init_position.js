const fs = require("fs");
const os = require("os");
const path = require("path");
const anchor = require("@anchor-lang/core");
const { web3 } = anchor;
const { Connection, Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } = web3;
const dlmm = require("@meteora-ag/dlmm");
const { deriveEventAuthority } = dlmm;

const METEORA = new PublicKey("LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo");
const LOWER_BIN_ID = -775;
const WIDTH = 40;

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

  const vault = new PublicKey(cfg.vault);
  const pool = new PublicKey(cfg.pool);
  const position = Keypair.fromSecretKey(Uint8Array.from(cfg.positionSecret));
  const [eventAuthority] = deriveEventAuthority(METEORA);

  if (await connection.getAccountInfo(position.publicKey)) {
    console.log("[skip] position already initialized:", position.publicKey.toBase58());
    return;
  }

  const remaining = [
    { pubkey: METEORA, isSigner: false, isWritable: false },
    { pubkey: payer.publicKey, isSigner: true, isWritable: true },
    { pubkey: position.publicKey, isSigner: true, isWritable: true },
    { pubkey: pool, isSigner: false, isWritable: false },
    { pubkey: vault, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    { pubkey: eventAuthority, isSigner: false, isWritable: false },
    { pubkey: METEORA, isSigner: false, isWritable: false },
  ];

  console.log("vault   :", vault.toBase58());
  console.log("position:", position.publicKey.toBase58());
  const sig = await program.methods
    .meteoraInitPosition(LOWER_BIN_ID, WIDTH)
    .accountsPartial({ keeper: payer.publicKey, vault })
    .remainingAccounts(remaining)
    .signers([position])
    .rpc();
  console.log("\n[done] meteora_init_position:", sig);

  const info = await connection.getAccountInfo(position.publicKey);
  console.log("       position owner:", info.owner.toBase58(), "size:", info.data.length);
  cfg.lowerBinId = LOWER_BIN_ID;
  cfg.width = WIDTH;
  fs.writeFileSync(path.join(__dirname, "../devnet.json"), JSON.stringify(cfg, null, 2));
}

main().catch((e) => { console.error("FAILED:", e.message || e); if (e.logs) console.error(e.logs.join("\n")); process.exit(1); });
