use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    Mint, TokenAccount, TokenInterface, TransferChecked, transfer_checked
};
use anchor_spl::associated_token::AssociatedToken;

use crate::EscrowOffer;

#[derive(Accounts)]
#[instruction(seed: u64)]
pub struct Make<'info> {
    #[account(mut, signer)]
    pub signer: Signer<'info>,

    #[account(
        init,
        payer = signer,
        space = 8 + EscrowOffer::INIT_SPACE,
        seeds = [b"escrow".as_ref(), signer.key().as_ref(), seed.to_le_bytes().as_ref()],
        bump
    )]
    pub escrow_offer: Account<'info, EscrowOffer>,

    pub mint_a: InterfaceAccount<'info, Mint>,
    pub mint_b: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = mint_a,
        associated_token::authority = signer,
        associated_token::token_program = token_program
    )]
    pub maker_ata: InterfaceAccount<'info, TokenAccount>,
    
    #[account(
        init,
        payer = signer,
        associated_token::mint = mint_a,
        associated_token::authority = escrow_offer,
        associated_token::token_program = token_program
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl<'info> Make<'info> {
    pub fn transfer_lock(&self, deposit: u64) -> Result<()> {
        let cpi_accounts = TransferChecked {
            from: self.maker_ata.to_account_info(),
            mint: self.mint_a.to_account_info(),
            to: self.vault.to_account_info(),
            authority: self.signer.to_account_info(),
        };

        let cpi_program = self.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        transfer_checked(
            cpi_ctx,
            deposit,
            self.mint_a.decimals,
        )?;

        Ok(())
    }

    pub fn initialize_escrow_offer(
        &mut self,
        seed: u64,
        receive: u64,
        bump: u8,
    ) -> Result<()> {
        self.escrow_offer.set_inner(EscrowOffer {
            seed,
            maker: self.signer.key(),
            mint_a: self.mint_a.key(),
            mint_b: self.mint_b.key(),
            receive,
            bump,
        });
        Ok(())
    }
}
