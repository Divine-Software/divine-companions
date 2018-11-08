declare module "syslog-client" {
    export const enum Transport {
        Tcp = 1,
        Udp = 2,
    }

    export interface LogOptions {
        syslogHostname?: string;
        facility?:       number;
        severity?:       number;
        rfc3164?:        boolean;
        appName?:        string;
    }

    export interface ClientOptions extends LogOptions {
        port?:           number;
        tcpTimeout?:     number;
        dateFormatter?:  ((this: Date) => string);
        transport?:      Transport;
    }

    export class Client extends NodeJS.EventEmitter {
        constructor(target?: string, options?: ClientOptions);
        close(): this;
        log(message: string, options?: LogOptions): this;
    }

    export function createClient(target: string, options?: ClientOptions) : Client;
}