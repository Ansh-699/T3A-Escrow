pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("7LxAAWCdkN23D7dCghPsxGKkKqx7GSWZnuCpJxEWJVe8");

#[program]
pub mod t3a_escrow {
    use super::*;

    pub fn make_offer(ctx: Context<Make>, seed: u64, deposit: u64, receive: u64) -> Result<()> {
        ctx.accounts.initialize_escrow_offer(seed, receive, ctx.bumps.escrow_offer)?;
        ctx.accounts.transfer_lock(deposit)?;
        Ok(())
    }
    pub fn take_offer(ctx: Context<Take>) -> Result<()> {
       ctx.accounts.depoit_and_receive()?;
       ctx.accounts.close_escrow_offer()?;
         Ok(())
    }
    pub fn refund_offer(ctx: Context<Refund>) -> Result<()> {
        ctx.accounts.refund_and_close()?;
        Ok(())
    }
}
