use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct EscrowOffer {
    pub seed: u64,
    pub maker: Pubkey,
    pub mint_a: Pubkey,
    pub mint_b: Pubkey,
    pub receive: u64,
    pub bump: u8,
}