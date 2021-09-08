import config from 'config'
import {Asset} from '@greymass/eosio'

import {logger, resources} from './common'
import {rentResourcesPowerUp} from './powerup'
import {rentResourcesREX} from './rex'
import {accountNeedsResources} from './utils'
import {AccountDef} from './types'
import version from './version'

const accounts: AccountDef[] = config.get('accounts')
const interval: number = config.get('interval')
const mode: string = config.get('mode')

export let pstate: any
export let rstate: any
export let sample: any

export let powerup: any
export let rex: any

async function updateResourcePrices(ms: number = 1) {
    powerup = Asset.from(pstate.cpu.price_per(sample, ms * 1000), '4,EOS')
    rex = Asset.from(rstate.price_per(sample, ms * 1000), '4,EOS')
}

async function rentResources(accountDef: AccountDef, cpu: boolean, net: boolean) {
    switch (mode.toUpperCase()) {
        case 'POWERUP': {
            return rentResourcesPowerUp(accountDef, cpu, net, pstate, sample)
        }
        case 'REX': {
            return rentResourcesREX(accountDef, cpu, net)
        }
        default:
            throw new Error('Mode in config not set, must be either `rex` or `powerup`.')
    }
}

async function manageResources(accountDef: AccountDef) {
    const needs = await accountNeedsResources(accountDef)
    logger.info({account: accountDef.account, cpu: needs.cpu, net: needs.net}, 'account demand status')
    if (needs.cpu || needs.net) {
        const rental = await rentResources(accountDef, needs.cpu, needs.net)
        logger.info({account: accountDef.account, tx: rental.transaction_id}, 'rental processed')
    }
}

async function run() {
    logger.debug('Processing state updates...')
    await Promise.all([
        (sample = await resources.getSampledUsage()),
        (pstate = await resources.v1.powerup.get_state()),
        (rstate = await resources.v1.rex.get_state()),
    ])

    logger.debug('Processing price updates...')
    await updateResourcePrices()
    logger.debug({powerup, rex}, 'system prices')

    logger.info(`Starting resource check for ${accounts.length} accounts...`)
    await Promise.all(
        accounts.map(async (accountDef: AccountDef) => {
            logger.debug({account: accountDef.account}, 'processing run for account')
            await manageResources(accountDef)
        })
    )
}

export async function main() {
    logger.info({version}, 'initializing')
    // Initialize with a first process
    run()
    // Run the process on a set interval based on the length of a round
    setInterval(run, interval)
}

function ensureExit(code: number, timeout = 3000) {
    process.exitCode = code
    setTimeout(() => {
        process.exit(code)
    }, timeout)
}

if (module === require.main) {
    process.once('uncaughtException', (error: any) => {
        logger.error(error, 'Uncaught exception')
        ensureExit(1)
    })
    main().catch((error) => {
        logger.fatal(error, 'Unable to start application')
        ensureExit(1)
    })
}
