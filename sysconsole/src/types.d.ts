declare module "syslog-client" {
    export const enum Transport {
        Tcp = 1,
        Udp = 2,
    }

    export interface CommonOptions {
        syslogHostname?: string;
        facility?:       number;
        severity?:       number;
        rfc3164?:        boolean;
        appName?:        string;
    }

    export interface ClientOptions extends CommonOptions {
        port?:           number;
        tcpTimeout?:     number;
        dateFormatter?:  ((this: Date) => string);
        transport?:      Transport;
    }

    export interface LogOptions extends CommonOptions {
        msgid?:          string;
        timestamp?:      Date;
    }

    export class Client extends NodeJS.EventEmitter {
        target: string;
        port: number;
        transport: Transport;
        connecting?: boolean;

        constructor(target?: string, options?: ClientOptions);
        close(): this;
        log(message: string, options?: LogOptions): this;
    }

    export function createClient(target: string, options?: ClientOptions) : Client;
}