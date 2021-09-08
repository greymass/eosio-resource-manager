import needle from 'needle'
import config from 'config'

interface SlackMessage {
    text: string
    channel?: string
}

export class SlackWebhook {

    constructor(private url: string, private channel?: string) {}

    public async send(message: string | any) {
        if (!this.url) return
        let msg: SlackMessage
        if (typeof message === 'string') {
            msg = {
              text: `${message}`,
              channel: this.channel
            }
        } else {
            msg = message
        }
        return needle('post', this.url, msg, {json: true})
    }

    public async sendTransaction(
        transaction_id: string,
        message: string | any
    ) {
        const explorer:string = config.get('explorer')
        const msg: SlackMessage = {
            text: `[<${explorer}/transaction/${transaction_id}|tx>] ${message}`
        }
        return this.send(msg)
    }
}
