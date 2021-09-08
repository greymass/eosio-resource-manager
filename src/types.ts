import {UInt64} from '@greymass/eosio'

export interface AccountDef {
    account: string
    threshold: number
    cpu_maximum: number
    cpu_minimum: number
    cpu_increment: number
    net_maximum: number
    net_minimum: number
    net_increment: number
    max_payment: string
}

export interface ResourceStats {
    used: UInt64
    available: UInt64
    max: UInt64
}
