pub mod drift;
pub mod meteora;

use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::{AccountMeta, Instruction};
use anchor_lang::solana_program::program::invoke_signed;

use crate::error::VaultError;

pub(crate) fn invoke_layout<'info>(
    program: &AccountInfo<'info>,
    accounts: &[AccountInfo<'info>],
    fixed_flags: &[(bool, bool)],
    data: Vec<u8>,
    signer_seeds: &[&[&[u8]]],
) -> Result<()> {
    require!(
        accounts.len() >= fixed_flags.len(),
        VaultError::CpiAccountsMissing
    );

    let metas: Vec<AccountMeta> = accounts
        .iter()
        .enumerate()
        .map(|(i, acc)| {
            let (writable, signer) = if i < fixed_flags.len() {
                fixed_flags[i]
            } else {
                (acc.is_writable, false)
            };
            if writable {
                AccountMeta::new(*acc.key, signer)
            } else {
                AccountMeta::new_readonly(*acc.key, signer)
            }
        })
        .collect();

    let mut infos = accounts.to_vec();
    infos.push(program.clone());

    let ix = Instruction {
        program_id: *program.key,
        accounts: metas,
        data,
    };

    invoke_signed(&ix, &infos, signer_seeds).map_err(Into::into)
}
