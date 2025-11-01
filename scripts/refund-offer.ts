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

async function main() {
  const provider = anchor.getProvider();
  if (!provider || !provider.wallet || !provider.wallet.publicKey) {
    throw new Error(
      "Anchor provider or wallet is not available; ensure a provider with a connected wallet is set."
    );
  }
  const maker = provider.wallet.publicKey;

  const seedStr = process.env.SEED;
  if (!seedStr) throw new Error("Missing SEED env var for refund-offer");
  const seed = new anchor.BN(seedStr);

  const mintAcc = await provider.connection.getAccountInfo(MINT_A);
  if (!mintAcc) throw new Error("Mint account not found: " + MINT_A.toBase58());
  const tokenProgramId = mintAcc.owner.equals(TOKEN_2022_PROGRAM_ID)
    ? TOKEN_2022_PROGRAM_ID
    : TOKEN_PROGRAM_ID;

  const [escrowPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), maker.toBuffer(), Buffer.from(seed.toArray("le", 8))],
    program.programId
  );

  const makerAtaA = getAssociatedTokenAddressSync(
    MINT_A,
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

  const makerAtaInfo = await provider.connection.getAccountInfo(makerAtaA);
  if (!makerAtaInfo) {
    const ix = createAssociatedTokenAccountInstruction(
      maker,
      makerAtaA,
      maker,
      MINT_A,
      tokenProgramId,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    const tx = new Transaction().add(ix);
    await (provider as any).sendAndConfirm(tx, []);
  }

  const txSig = await program.methods
    .refundOffer()
    .accounts({
      maker,
      mintA: MINT_A,
      makerAtaA,
      escrow: escrowPda,
      vault,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      tokenProgram: tokenProgramId,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("REFUND OFFER TX SIG:", txSig);
  console.log(
    "REFUND OFFER TX:",
    `https://explorer.solana.com/tx/${txSig}?cluster=devnet`
  );
  console.log("Escrow PDA:", escrowPda.toBase58());
}

main().catch(console.error);
