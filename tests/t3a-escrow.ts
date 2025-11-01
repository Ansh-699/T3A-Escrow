import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { T3aEscrow } from "../target/types/t3a_escrow";
import { expect } from "chai";
import { TOKEN_PROGRAM_ID, createMint, createAssociatedTokenAccount, mintTo, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";

describe("t3a_escrow", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.T3aEscrow as Program<T3aEscrow>;

  const maker = anchor.web3.Keypair.generate();
  const taker = anchor.web3.Keypair.generate();

  let mintA: PublicKey;
  let mintB: PublicKey;
  let makerAtaA: PublicKey;
  let takerAtaB: PublicKey;
  let makerAtaB: PublicKey;
  let takerAtaA: PublicKey;
  let escrowOffer: PublicKey;
  let vault: PublicKey;

  const seed = BigInt(Math.floor(Math.random() * 1000000));
  const depositAmount = 1000;
  const receiveAmount = 500;

  before(async () => {
    const provider = anchor.getProvider();
    await provider.connection.requestAirdrop(maker.publicKey, 2 * LAMPORTS_PER_SOL);
    await provider.connection.requestAirdrop(taker.publicKey, 2 * LAMPORTS_PER_SOL);

    await new Promise(resolve => setTimeout(resolve, 1000));

    mintA = await createMint(provider.connection, maker, maker.publicKey, null, 9, undefined, { commitment: "confirmed" });
    mintB = await createMint(provider.connection, taker, taker.publicKey, null, 9, undefined, { commitment: "confirmed" });

    makerAtaA = await createAssociatedTokenAccount(provider.connection, maker, mintA, maker.publicKey, { commitment: "confirmed" });
    takerAtaB = await createAssociatedTokenAccount(provider.connection, taker, mintB, taker.publicKey, { commitment: "confirmed" });
    makerAtaB = getAssociatedTokenAddressSync(mintB, maker.publicKey);
    takerAtaA = getAssociatedTokenAddressSync(mintA, taker.publicKey);

    await mintTo(provider.connection, maker, mintA, makerAtaA, maker, depositAmount * 2, [], { commitment: "confirmed" });
    await mintTo(provider.connection, taker, mintB, takerAtaB, taker, receiveAmount * 2, [], { commitment: "confirmed" });

    [escrowOffer] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), maker.publicKey.toBuffer(), new anchor.BN(seed).toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    vault = getAssociatedTokenAddressSync(mintA, escrowOffer, true);
  });

  it("Makes an offer", async () => {
    await program.methods
      .makeOffer(new anchor.BN(seed), new anchor.BN(depositAmount), new anchor.BN(receiveAmount))
      .accounts({
        signer: maker.publicKey,
        escrowOffer: escrowOffer,
        mintA: mintA,
        mintB: mintB,
        makerAta: makerAtaA,
        vault: vault,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
        systemProgram: SystemProgram.programId,
      }as any)
      .signers([maker])
      .rpc({ commitment: "confirmed" });

    const escrowAccount = await program.account.escrowOffer.fetch(escrowOffer);
    expect(escrowAccount.maker.toString()).to.equal(maker.publicKey.toString());
    expect(escrowAccount.mintA.toString()).to.equal(mintA.toString());
    expect(escrowAccount.mintB.toString()).to.equal(mintB.toString());
    expect(escrowAccount.receive.toNumber()).to.equal(receiveAmount);

    const vaultBalance = await anchor.getProvider().connection.getTokenAccountBalance(vault);
    expect(Number(vaultBalance.value.amount)).to.equal(depositAmount);
  });

  it("Takes the offer", async () => {
    await program.methods
      .takeOffer()
      .accounts({
        taker: taker.publicKey,
        maker: maker.publicKey,
        mintA: mintA,
        mintB: mintB,
        takerAtaA: takerAtaA,
        takerAtaB: takerAtaB,
        makerAtaB: makerAtaB,
        escrow: escrowOffer,
        vault: vault,
        associatedTokenProgram: new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      }as any)
      .signers([taker])
      .rpc({ commitment: "confirmed" });

    const takerBalanceA = await anchor.getProvider().connection.getTokenAccountBalance(takerAtaA);
    expect(Number(takerBalanceA.value.amount)).to.equal(depositAmount);

    const makerBalanceB = await anchor.getProvider().connection.getTokenAccountBalance(makerAtaB);
    expect(Number(makerBalanceB.value.amount)).to.equal(receiveAmount);

    const escrowInfo = await anchor.getProvider().connection.getAccountInfo(escrowOffer);
    expect(escrowInfo).to.be.null;

    const vaultInfo = await anchor.getProvider().connection.getAccountInfo(vault);
    expect(vaultInfo).to.be.null;
  });

  it("Refunds the offer", async () => {
    const newSeed = BigInt(Math.floor(Math.random() * 1000000));
    [escrowOffer] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), maker.publicKey.toBuffer(), new anchor.BN(newSeed).toArrayLike(Buffer, "le", 8)],
      program.programId
    );
    vault = getAssociatedTokenAddressSync(mintA, escrowOffer, true);

    await program.methods
      .makeOffer(new anchor.BN(newSeed), new anchor.BN(depositAmount), new anchor.BN(receiveAmount))
      .accounts({
        signer: maker.publicKey,
        escrowOffer: escrowOffer,
        mintA: mintA,
        mintB: mintB,
        makerAta: makerAtaA,
        vault: vault,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
        systemProgram: SystemProgram.programId,
      }as any)
      .signers([maker])
      .rpc({ commitment: "confirmed" });

    await program.methods
      .refundOffer()
      .accounts({
        maker: maker.publicKey,
        mintA: mintA,
        makerAtaA: makerAtaA,
        escrow: escrowOffer,
        vault: vault,
        associatedTokenProgram: new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      }as any)
      .signers([maker])
      .rpc({ commitment: "confirmed" });

    const makerBalanceA = await anchor.getProvider().connection.getTokenAccountBalance(makerAtaA);
    expect(Number(makerBalanceA.value.amount)).to.equal(depositAmount);  // Assuming previous balance was 0 after first test

    const escrowInfo = await anchor.getProvider().connection.getAccountInfo(escrowOffer);
    expect(escrowInfo).to.be.null;

    const vaultInfo = await anchor.getProvider().connection.getAccountInfo(vault);
    expect(vaultInfo).to.be.null;
  });
});