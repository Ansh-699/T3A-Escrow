"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const anchor = __importStar(require("@coral-xyz/anchor"));
const chai_1 = require("chai");
const spl_token_1 = require("@solana/spl-token");
const web3_js_1 = require("@solana/web3.js");
describe("t3a_escrow", () => {
    anchor.setProvider(anchor.AnchorProvider.env());
    const program = anchor.workspace.T3aEscrow;
    const maker = anchor.web3.Keypair.generate();
    const taker = anchor.web3.Keypair.generate();
    let mintA;
    let mintB;
    let makerAtaA;
    let takerAtaB;
    let makerAtaB;
    let takerAtaA;
    let escrowOffer;
    let vault;
    const seed = BigInt(Math.floor(Math.random() * 1000000));
    const depositAmount = 1000;
    const receiveAmount = 500;
    before(() => __awaiter(void 0, void 0, void 0, function* () {
        const provider = anchor.getProvider();
        yield provider.connection.requestAirdrop(maker.publicKey, 2 * web3_js_1.LAMPORTS_PER_SOL);
        yield provider.connection.requestAirdrop(taker.publicKey, 2 * web3_js_1.LAMPORTS_PER_SOL);
        yield new Promise(resolve => setTimeout(resolve, 1000));
        mintA = yield (0, spl_token_1.createMint)(provider.connection, maker, maker.publicKey, null, 9, undefined, { commitment: "confirmed" });
        mintB = yield (0, spl_token_1.createMint)(provider.connection, taker, taker.publicKey, null, 9, undefined, { commitment: "confirmed" });
        makerAtaA = yield (0, spl_token_1.createAssociatedTokenAccount)(provider.connection, maker, mintA, maker.publicKey, { commitment: "confirmed" });
        takerAtaB = yield (0, spl_token_1.createAssociatedTokenAccount)(provider.connection, taker, mintB, taker.publicKey, { commitment: "confirmed" });
        makerAtaB = (0, spl_token_1.getAssociatedTokenAddressSync)(mintB, maker.publicKey);
        takerAtaA = (0, spl_token_1.getAssociatedTokenAddressSync)(mintA, taker.publicKey);
        yield (0, spl_token_1.mintTo)(provider.connection, maker, mintA, makerAtaA, maker, depositAmount * 2, [], { commitment: "confirmed" });
        yield (0, spl_token_1.mintTo)(provider.connection, taker, mintB, takerAtaB, taker, receiveAmount * 2, [], { commitment: "confirmed" });
        [escrowOffer] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("escrow"), maker.publicKey.toBuffer(), new anchor.BN(seed).toArrayLike(Buffer, "le", 8)], program.programId);
        vault = (0, spl_token_1.getAssociatedTokenAddressSync)(mintA, escrowOffer, true);
    }));
    it("Makes an offer", () => __awaiter(void 0, void 0, void 0, function* () {
        yield program.methods
            .makeOffer(new anchor.BN(seed), new anchor.BN(depositAmount), new anchor.BN(receiveAmount))
            .accounts({
            signer: maker.publicKey,
            escrowOffer: escrowOffer,
            mintA: mintA,
            mintB: mintB,
            makerAta: makerAtaA,
            vault: vault,
            tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
            associatedTokenProgram: new web3_js_1.PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
            systemProgram: web3_js_1.SystemProgram.programId,
        })
            .signers([maker])
            .rpc({ commitment: "confirmed" });
        const escrowAccount = yield program.account.escrowOffer.fetch(escrowOffer);
        (0, chai_1.expect)(escrowAccount.maker.toString()).to.equal(maker.publicKey.toString());
        (0, chai_1.expect)(escrowAccount.mintA.toString()).to.equal(mintA.toString());
        (0, chai_1.expect)(escrowAccount.mintB.toString()).to.equal(mintB.toString());
        (0, chai_1.expect)(escrowAccount.receive.toNumber()).to.equal(receiveAmount);
        const vaultBalance = yield anchor.getProvider().connection.getTokenAccountBalance(vault);
        (0, chai_1.expect)(Number(vaultBalance.value.amount)).to.equal(depositAmount);
    }));
    it("Takes the offer", () => __awaiter(void 0, void 0, void 0, function* () {
        yield program.methods
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
            associatedTokenProgram: new web3_js_1.PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
            tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
            systemProgram: web3_js_1.SystemProgram.programId,
        })
            .signers([taker])
            .rpc({ commitment: "confirmed" });
        const takerBalanceA = yield anchor.getProvider().connection.getTokenAccountBalance(takerAtaA);
        (0, chai_1.expect)(Number(takerBalanceA.value.amount)).to.equal(depositAmount);
        const makerBalanceB = yield anchor.getProvider().connection.getTokenAccountBalance(makerAtaB);
        (0, chai_1.expect)(Number(makerBalanceB.value.amount)).to.equal(receiveAmount);
        const escrowInfo = yield anchor.getProvider().connection.getAccountInfo(escrowOffer);
        (0, chai_1.expect)(escrowInfo).to.be.null;
        const vaultInfo = yield anchor.getProvider().connection.getAccountInfo(vault);
        (0, chai_1.expect)(vaultInfo).to.be.null;
    }));
    it("Refunds the offer", () => __awaiter(void 0, void 0, void 0, function* () {
        const newSeed = BigInt(Math.floor(Math.random() * 1000000));
        [escrowOffer] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("escrow"), maker.publicKey.toBuffer(), new anchor.BN(newSeed).toArrayLike(Buffer, "le", 8)], program.programId);
        vault = (0, spl_token_1.getAssociatedTokenAddressSync)(mintA, escrowOffer, true);
        yield program.methods
            .makeOffer(new anchor.BN(newSeed), new anchor.BN(depositAmount), new anchor.BN(receiveAmount))
            .accounts({
            signer: maker.publicKey,
            escrowOffer: escrowOffer,
            mintA: mintA,
            mintB: mintB,
            makerAta: makerAtaA,
            vault: vault,
            tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
            associatedTokenProgram: new web3_js_1.PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
            systemProgram: web3_js_1.SystemProgram.programId,
        })
            .signers([maker])
            .rpc({ commitment: "confirmed" });
        yield program.methods
            .refundOffer()
            .accounts({
            maker: maker.publicKey,
            mintA: mintA,
            makerAtaA: makerAtaA,
            escrow: escrowOffer,
            vault: vault,
            associatedTokenProgram: new web3_js_1.PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
            tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
            systemProgram: web3_js_1.SystemProgram.programId,
        })
            .signers([maker])
            .rpc({ commitment: "confirmed" });
        const makerBalanceA = yield anchor.getProvider().connection.getTokenAccountBalance(makerAtaA);
        (0, chai_1.expect)(Number(makerBalanceA.value.amount)).to.equal(depositAmount); // Assuming previous balance was 0 after first test
        const escrowInfo = yield anchor.getProvider().connection.getAccountInfo(escrowOffer);
        (0, chai_1.expect)(escrowInfo).to.be.null;
        const vaultInfo = yield anchor.getProvider().connection.getAccountInfo(vault);
        (0, chai_1.expect)(vaultInfo).to.be.null;
    }));
});
