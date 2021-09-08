import {client, logger} from './common'
import {AccountDef, ResourceStats} from './types'

export function accountNeedsResource(
    accountDef: AccountDef,
    resourceType: string,
    limit: ResourceStats
): boolean {
    const {account} = accountDef

    const maximum: number = resourceType === 'cpu' ? accountDef.cpu_maximum : accountDef.net_maximum
    logger.debug(
        {account, maximum, current: limit.max.toNumber()},
        'account maximum values (current vs maximum)'
    )

    if (maximum > 0 && limit.max.toNumber() > maximum) {
        logger.warn({ resourceType, account, maximum, current: limit.max.toNumber() }, 'Skipping rental, account exceeds configured maximum.')
        return false
    }

    const used: number = 1 - limit.available.toNumber() / limit.max.toNumber()
    logger.debug(
        {account, used, threshold: accountDef.threshold},
        'account needs (used vs threshold)'
    )

    if (used > accountDef.threshold) {
        return true
    }

    const minimum: number = resourceType === 'cpu' ? accountDef.cpu_minimum : accountDef.net_minimum
    logger.debug(
        {account, minimum, current: limit.max.toNumber()},
        'account needs (current vs minimum)'
    )

    if (limit.max.toNumber() < minimum) {
        return true
    }

    return false
}

export async function accountNeedsResources(accountDef: AccountDef) {
    const {account} = accountDef
    const result = await client.v1.chain.get_account(account)
    return {
        cpu: accountNeedsResource(accountDef, 'cpu', result.cpu_limit),
        net: accountNeedsResource(accountDef, 'net', result.net_limit),
    }
}
