import config from 'config'
import {Action, PrivateKey, SignedTransaction, Transaction} from '@greymass/eosio'

import {client, logger} from './common'

const privateKey = PrivateKey.from(config.get('key'))

export async function sign(actions: Action[]): Promise<any> {
    const info = await client.v1.chain.get_info()
    const header = info.getTransactionHeader()
    const transaction = Transaction.from({
        ...header,
        actions,
    })
    const signature = privateKey.signDigest(transaction.signingDigest(info.chain_id))
    const signedTransaction = SignedTransaction.from({
        ...transaction,
        signatures: [signature],
    })
    try {
        const result = await client.v1.chain.push_transaction(signedTransaction)
        logger.debug({result}, 'transaction completed')
        return result
    } catch (err) {
        try {
            logger.error({err}, 'error')
            const {error} = err
            const {name} = error
            switch (name) {
                case 'ram_usage_exceeded': {
                    // handle ram purchases?
                    logger.error(error)
                    break
                }
                default: {
                    logger.error(error)
                    break
                }
            }
        } catch (error) {
            logger.error(error)
        }
    }
}
