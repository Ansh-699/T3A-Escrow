import "dotenv/config";
import * as anchor from "@coral-xyz/anchor";
import { Program, Idl } from "@coral-xyz/anchor";
import idl from "../target/idl/t3a_escrow.json";
type T3aEscrow = Idl;
const IDL = idl as Idl;
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";

anchor.setProvider(anchor.AnchorProvider.env());
const program = anchor.workspace.T3aEscrow as unknown as Program<T3aEscrow>;

const MINT_A = new PublicKey("44rwMB76AsTSYtW8NRdvLFFT3ffLgVcHRYaSjfG1TpZb");
const MINT_B = MINT_A; 

async function main() {
  const provider = anchor.getProvider();
  if (!provider || !provider.wallet || !provider.wallet.publicKey) {
    throw new Error(
      "Anchor provider or wallet is not available; ensure a provider with a connected wallet is set."
    );
  }

  const taker = provider.wallet.publicKey;
  const maker = process.env.MAKER
    ? new PublicKey(process.env.MAKER)
    : provider.wallet.publicKey;

  const seedStr = process.env.SEED;
  if (!seedStr) throw new Error("Missing SEED env var for take-offer");
  const seed = new anchor.BN(seedStr);

  const mintAAcc = await provider.connection.getAccountInfo(MINT_A);
  if (!mintAAcc) throw new Error("Mint A not found: " + MINT_A.toBase58());
  const tokenProgramIdA = mintAAcc.owner.equals(TOKEN_2022_PROGRAM_ID)
    ? TOKEN_2022_PROGRAM_ID
    : TOKEN_PROGRAM_ID;

  const mintBAcc = await provider.connection.getAccountInfo(MINT_B);
  if (!mintBAcc) throw new Error("Mint B not found: " + MINT_B.toBase58());
  const tokenProgramIdB = mintBAcc.owner.equals(TOKEN_2022_PROGRAM_ID)
    ? TOKEN_2022_PROGRAM_ID
    : TOKEN_PROGRAM_ID;

  if (!tokenProgramIdA.equals(tokenProgramIdB)) {
    throw new Error("Mint A and B use different token programs; unsupported in this script");
  }
  const tokenProgramId = tokenProgramIdA;

  const [escrowPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), maker.toBuffer(), Buffer.from(seed.toArray("le", 8))],
    program.programId
  );

  const takerAtaA = getAssociatedTokenAddressSync(
    MINT_A,
    taker,
    false,
    tokenProgramId,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  const takerAtaB = getAssociatedTokenAddressSync(
    MINT_B,
    taker,
    false,
    tokenProgramId,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  const makerAtaB = getAssociatedTokenAddressSync(
    MINT_B,
    maker,
    false,
    tokenProgramId,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  const vault = getAssociatedTokenAddressSync(
    MINT_A,
    escrowPda,
    true,
    tokenProgramId,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const takerAtaBInfo = await provider.connection.getAccountInfo(takerAtaB);
  if (!takerAtaBInfo) {
    const ix = createAssociatedTokenAccountInstruction(
      taker,
      takerAtaB,
      taker,
      MINT_B,
      tokenProgramId,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    const tx = new Transaction().add(ix);
    await (provider as any).sendAndConfirm(tx, []);
  }

  const txSig = await program.methods
    .takeOffer()
    .accounts({
      taker,
      maker,
      mintA: MINT_A,
      mintB: MINT_B,
      takerAtaA,
      takerAtaB,
      makerAtaB,
      escrow: escrowPda,
      vault,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      tokenProgram: tokenProgramId,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("TAKE OFFER TX SIG:", txSig);
  console.log(
    "TAKE OFFER TX:",
    `https://explorer.solana.com/tx/${txSig}?cluster=devnet`
  );
  console.log("Escrow PDA:", escrowPda.toBase58());
}

main().catch(console.error);
