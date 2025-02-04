import { Command, Flags } from '@oclif/core'
import path from 'path'
import * as Server from '../index'
import * as DataSource from '../DataSource'
import dotenv from 'dotenv'

dotenv.config({ path: path.join(__dirname, '..', '..', '.env'), override: true })

enum EXIT_CODE {
    SUCCESS = 0,
    FAILED = 1
}
let processExitCode = EXIT_CODE.SUCCESS

export default class Start extends Command {
    static args = []
    static flags = {
        FLOWISE_USERNAME: Flags.string(),
        FLOWISE_PASSWORD: Flags.string(),
        PORT: Flags.string(),
        DEBUG: Flags.string(),
        DATABASE_PATH: Flags.string(),
        APIKEY_PATH: Flags.string(),
        EXECUTION_MODE: Flags.string()
    }

    async stopProcess() {
        console.info('Shutting down VS...')
        try {
            // Shut down the app after timeout if it ever stuck removing pools
            setTimeout(() => {
                console.info('VS was forced to shut down after 30 secs')
                process.exit(processExitCode)
            }, 30000)

            // Removing pools
            const serverApp = Server.getInstance()
            if (serverApp) await serverApp.stopApp()
        } catch (error) {
            console.error('There was an error shutting down VS...', error)
        }
        process.exit(processExitCode)
    }

    async run(): Promise<void> {
        process.on('SIGTERM', this.stopProcess)
        process.on('SIGINT', this.stopProcess)

        // Prevent throw new Error from crashing the app
        // TODO: Get rid of this and send proper error message to ui
        process.on('uncaughtException', (err) => {
            console.error('uncaughtException: ', err)
        })

        const { flags } = await this.parse(Start)
        if (flags.FLOWISE_USERNAME) process.env.FLOWISE_USERNAME = flags.FLOWISE_USERNAME
        if (flags.FLOWISE_PASSWORD) process.env.FLOWISE_PASSWORD = flags.FLOWISE_PASSWORD
        if (flags.PORT) process.env.PORT = flags.PORT
        if (flags.DATABASE_PATH) process.env.DATABASE_PATH = flags.DATABASE_PATH
        if (flags.APIKEY_PATH) process.env.APIKEY_PATH = flags.APIKEY_PATH
        if (flags.EXECUTION_MODE) process.env.EXECUTION_MODE = flags.EXECUTION_MODE
        if (flags.DEBUG) process.env.DEBUG = flags.DEBUG

        await (async () => {
            try {
                this.log('Starting VS...')
                await DataSource.init()
                await Server.start()
            } catch (error) {
                console.error('There was an error starting VS...', error)
                processExitCode = EXIT_CODE.FAILED
                // @ts-ignore
                process.emit('SIGINT')
            }
        })()
    }
}
