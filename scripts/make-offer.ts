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

const seed = Date.now();
const deposit = new anchor.BN(100);
const receive = new anchor.BN(50);

async function main() {
  const provider = anchor.getProvider();
  if (!provider || !provider.wallet || !provider.wallet.publicKey) {
    throw new Error("Anchor provider or wallet is not available; ensure a provider with a connected wallet is set.");
  }
  const maker = provider.wallet.publicKey;

  // Detect token program (SPL Token vs Token-2022) from mint
  const mintAcc = await provider.connection.getAccountInfo(MINT_A);
  if (!mintAcc) throw new Error("Mint account not found: " + MINT_A.toBase58());
  const tokenProgramId = mintAcc.owner.equals(TOKEN_2022_PROGRAM_ID)
    ? TOKEN_2022_PROGRAM_ID
    : TOKEN_PROGRAM_ID;

  // PDA for the escrow account
  const [escrowPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("escrow"),
      maker.toBuffer(),
      Buffer.from(new anchor.BN(seed).toArray("le", 8)),
    ],
    program.programId
  );

  const makerAta = getAssociatedTokenAddressSync(
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

  // Ensure maker ATA exists
  const info = await provider.connection.getAccountInfo(makerAta);
  if (!info) {
    const ix = createAssociatedTokenAccountInstruction(
      maker, // payer
      makerAta,
      maker, // owner
      MINT_A,
      tokenProgramId,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    const tx = new Transaction().add(ix);
    await (provider as any).sendAndConfirm(tx, []);
  }

  const txSig = await program.methods
    .makeOffer(new anchor.BN(seed), deposit, receive)
    .accounts({
      signer: maker,
      escrowOffer: escrowPda,
      mintA: MINT_A,
      mintB: MINT_A,
      makerAta,
      vault,
      tokenProgram: tokenProgramId,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("SEED:", seed);
  console.log("MAKE OFFER TX SIG:", txSig);
  console.log("MAKE OFFER TX:", `https://explorer.solana.com/tx/${txSig}?cluster=devnet`);
  console.log("Escrow PDA:", escrowPda.toBase58());
  console.log("Vault ATA:", vault.toBase58());
}

main().catch(console.error);
