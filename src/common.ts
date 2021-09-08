import * as bunyan from 'bunyan'
import config from 'config'

import {
    APIClient,
    FetchProvider,
} from '@greymass/eosio'
import {Resources} from '@greymass/eosio-resources'

import { SlackWebhook } from './slack-webhook'

const fetch = require('node-fetch')
const url:string = config.get('api')
const provider = new FetchProvider(url, {fetch})
export const client = new APIClient({provider})
export const resources = new Resources({api: client})
const slackOptions:any = config.has('slack') ? config.get('slack') : {}
export const slack = new SlackWebhook(slackOptions.url, slackOptions.channel)

const streams:any = (config.get('log') as any[]).map(({level, out}) => {
    if (out === 'stdout') {
        return {level, stream: process.stdout}
    } else if (out === 'stderr') {
        return {level, stream: process.stderr}
    } else {
        return {level, path: out}
    }
})

export const logger = bunyan.createLogger({
    name: config.get('name'),
    streams,
})
