import config from 'config'
import {
    Action,
    Asset,
    Name,
    Struct,
} from '@greymass/eosio'

import { logger, slack } from './common'
import { sign } from './sign'
import { AccountDef } from './types'

const actor:string = config.get('actor')
const permission:string = config.get('permission')
const auth = { actor, permission }
const cpuSpend:Asset = Asset.from(config.has('cpu_spend') ? config.get('cpu_spend') : '0.0000 EOS')
const netSpend:Asset = Asset.from(config.has('net_spend') ? config.get('net_spend') : '0.0000 EOS')

@Struct.type('deposit')
class Deposit extends Struct {
    @Struct.field('name') owner!: Name
    @Struct.field('asset') amount!: Asset
}

@Struct.type('rentcpu')
class RentCPU extends Struct {
    @Struct.field('name') from!: Name
    @Struct.field('name') receiver!: Name
    /* tslint:disable:variable-name */
    @Struct.field('asset') loan_payment!: Asset
    @Struct.field('asset') loan_fund!: Asset
    /* tslint:enable:variable-name */
}

@Struct.type('rentnet')
class RentNET extends Struct {
    @Struct.field('name') from!: Name
    @Struct.field('name') receiver!: Name
    /* tslint:disable:variable-name */
    @Struct.field('asset') loan_payment!: Asset
    @Struct.field('asset') loan_fund!: Asset
    /* tslint:enable:variable-name */
}

function rexDeposit(cpu = false, net = false) {
    let total = 0
    if (cpu) {
        total += cpuSpend.value
    }
    if (net) {
        total += netSpend.value
    }
    const amount = Asset.from(`${total.toFixed(4)} EOS`)
    return Action.from({
        authorization: [auth],
        account: 'eosio',
        name: 'deposit',
        data: Deposit.from({
            amount,
            owner: auth.actor,
        }),
    })
}


function rexRentCPU(account: string) {
    return Action.from({
        authorization: [auth],
        account: 'eosio',
        name: 'rentcpu',
        data: RentCPU.from({
            from: auth.actor,
            receiver: Name.from(account),
            loan_payment: Asset.from(cpuSpend),
            loan_fund: Asset.from('0.0000 EOS'),
        }),
    })
}

function rexRentNET(account: string) {
    return Action.from({
        authorization: [auth],
        account: 'eosio',
        name: 'rentnet',
        data: RentNET.from({
            from: auth.actor,
            receiver: Name.from(account),
            loan_payment: Asset.from(netSpend),
            loan_fund: Asset.from('0.0000 EOS'),
        }),
    })
}

export async function rentResourcesREX(accountDef: AccountDef, cpu: boolean, net: boolean) {
    const { account } = accountDef
    // Generate the token deposit into REX
    const actions = [rexDeposit(cpu, net)]
    // If CPU is required, append action
    if (cpu) {
        actions.push(rexRentCPU(account))
    }
    // If NET is required, append action
    if (net) {
        actions.push(rexRentNET(account))
    }
    try {
        //
        const result = await sign(actions)
        if (result) {
            const { transaction_id } = result
            let spent = 0
            if (cpu) {
                spent += cpuSpend.value
            }
            if (net) {
                spent += netSpend.value
            }
            if (config.has('slack') && config.has('explorer')) {
                const explorer:string = config.get('explorer')
                let message:string = 'Leased '
                if (cpu) {
                    message += `CPU (${cpuSpend.toString()}) `
                }
                if (cpu && net) {
                    message += '& '
                }
                if (net) {
                    message += `NET (${netSpend.toString()}) `
                }
                message += `for <${explorer}/account/${account}|${account}> using ${Asset.from(`${spent} EOS`).toString()}.`
                slack.sendTransaction(transaction_id, message)
            }
            logger.debug({ spent, cpu, net, account, transaction_id }, 'REX rental completed')
            return result
        }
    } catch (err) {
        logger.info(err)
    }
}
