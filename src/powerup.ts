import config from 'config'
import {Action, Asset, Name, Struct, UInt32, Int64} from '@greymass/eosio'

import {logger, slack} from './common'
import {sign} from './sign'
import {AccountDef} from './types'

const actor: string = config.get('actor')
const permission: string = config.get('permission')
const auth = {actor, permission}

@Struct.type('powerup')
class PowerUp extends Struct {
    @Struct.field('name') payer!: Name
    @Struct.field('name') receiver!: Name
    @Struct.field('uint32') days!: UInt32
    @Struct.field('int64') net_frac!: Int64
    @Struct.field('int64') cpu_frac!: Int64
    @Struct.field('asset') max_payment!: Asset
}

function powerup(account: string, net_frac: number, cpu_frac: number, max_payment: Asset) {
    return Action.from({
        authorization: [auth],
        account: 'eosio',
        name: 'powerup',
        data: PowerUp.from({
            payer: auth.actor,
            receiver: Name.from(account),
            days: 1,
            net_frac,
            cpu_frac,
            max_payment,
        }),
    })
}

async function getActions(
    accountDef: AccountDef,
    cpu: boolean,
    net: boolean,
    pstate: any,
    sample: any
) {
    const limit = Asset.from(accountDef.max_payment)

    let cpu_frac = 0
    let cpu_spend = 0
    let net_frac = 0
    let net_spend = 0

    if (cpu && sample) {
        cpu_spend = pstate.cpu.price_per(sample, accountDef.cpu_increment)
        logger.debug('cpu_spend', cpu_spend)
        cpu_frac = pstate.cpu.frac(sample, accountDef.cpu_increment)
        logger.debug('cpu_frac', cpu_frac)
    }

    if (net && sample) {
        net_spend = pstate.net.price_per(sample, accountDef.net_increment)
        logger.debug('net_spend', net_spend)
        net_frac = pstate.net.frac(sample, accountDef.net_increment)
        logger.debug('net_frac', net_frac)
    }

    const combined_spend = Number(cpu_spend) + Number(net_spend)
    logger.debug('combined_spend', String(combined_spend))

    const max_payment = Asset.from(combined_spend, limit.symbol)
    logger.debug('max_payment', String(max_payment))

    if (max_payment.value > limit.value) {
        logger.warn({account: accountDef.account, max_payment, limit}, 'payment too high, skipping')
        return {
            actions: [],
            cpu_spend,
            net_spend,
            max_payment,
        }
    }

    const actions = [powerup(accountDef.account, net_frac, cpu_frac, max_payment)]

    return {
        actions,
        cpu_spend,
        net_spend,
        max_payment,
    }
}

export async function rentResourcesPowerUp(
    accountDef: AccountDef,
    cpu: boolean,
    net: boolean,
    pstate: any,
    sample: any
) {
    const {account} = accountDef
    const {actions, cpu_spend, net_spend, max_payment} = await getActions(
        accountDef,
        cpu,
        net,
        pstate,
        sample
    )

    if (actions.length) {
        logger.debug({actions}, 'performing actions...')
        try {
            const result = await sign(actions)
            if (result) {
                const {transaction_id} = result
                logger.debug(
                    {max_payment, cpu_spend, net_spend, account, transaction_id},
                    'PowerUp rental completed'
                )
                if (config.has('slack') && config.has('explorer')) {
                    const explorer: string = config.get('explorer')
                    let message: string = 'PowerUp of '
                    if (cpu) {
                        message += `CPU (${Asset.from(cpu_spend, max_payment.symbol)}) `
                    }
                    if (cpu && net) {
                        message += '& '
                    }
                    if (net) {
                        message += `NET (${Asset.from(net_spend, max_payment.symbol)}) `
                    }
                    message += `for <${explorer}/account/${account}|${account}>`
                        slack.sendTransaction(transaction_id, message)
                }
                return result
            }
        } catch (err) {
            logger.error(err)
            slack.send('Error w/ PowerUp: ' + JSON.stringify(err))
        }
    } else {
        logger.warn({account}, 'Configuration did not allow PowerUp for this account.')
    }
}
