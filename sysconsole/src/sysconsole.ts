import os from 'os';
import path from 'path';
import StackTrace from 'stack-trace';
import { Writable } from 'stream';
import Syslog from 'syslog-client';
import { InspectOptions } from 'util';

/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable no-control-regex */

const Facility: Record<Facility, number> = {
    kern: 0, user: 1, mail: 2, daemon: 3, auth: 4, syslog: 5, lpr: 6, news: 7, uucp: 8, cron: 9, authpriv: 10, ftp: 11, ntp: 12, security: 13, console: 14, local0: 16, local1: 17, local2: 18, local3: 19, local4: 20, local5: 21, local6: 22, local7: 23
}

const Severity: Record<Severity, number> = {
    emerg: 0, alert: 1,  crit: 2,  error: 3, warn: 4, notice: 5, info: 6, debug: 7
}

export type Facility = 'kern' | 'user' | 'mail' | 'daemon' | 'auth' | 'syslog' | 'lpr' | 'news' | 'uucp' | 'cron' | 'authpriv' | 'ftp' | 'ntp' | 'security' | 'console' | 'local0' | 'local1' | 'local2' | 'local3' | 'local4' | 'local5' | 'local6' | 'local7';
export type Severity = 'emerg' | 'alert' | 'crit' | 'error' | 'warn' | 'notice' | 'info' | 'debug';

export type SyslogFunctions = Record<Severity, (message?: any, ..._optionalParams: any[]) => void>;

export interface SysConsoleFunctions extends SyslogFunctions {
    set(options?: Partial<SysConsoleOptions>): this;
    syslogFunctions(highestLevel?: Severity): Partial<SyslogFunctions>;
}

export interface SysConsoleOptions {
    highestLevel:   Severity;

    syslog:         boolean;
    loghost:        string;
    logport:        number;
    tcpTimeout:     number | null;

    stdout:         boolean,
    stderr:         boolean,

    hostname:       string;
    title:          string;
    facility:       Facility;

    showTime:       boolean;
    showDate:       boolean;
    showMillis:     boolean;
    showTags:       boolean;
    showLine:       boolean;
    showFile:       boolean;
    showFunc:       boolean;

    syslogHashTags: boolean;
    syslogTags:     boolean;
    syslogMsgId:    boolean | string;
}

const ANSI_REGEXP = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

function isValidFacility(facility: string): facility is Facility {
    return typeof Facility[facility as Facility] === 'number';
}

function isValidSeverity(severity: string): severity is Severity {
    return typeof Severity[severity as Severity] === 'number';
}

class LogBuffer extends Writable {
    private _buffer = '';

    constructor() {
        super({decodeStrings: false, objectMode: false});
    }

    getAndClear(): string {
        try {
            return this._buffer;
        }
        finally {
            this._buffer = '';
        }
    }

    override _write(chunk: string | Buffer, _encoding: string, callback: (error: Error | null) => void): void {
        this._buffer += chunk.toString();
        callback(null);
    }
}

function getRootModule(module: NodeModule): NodeModule {
    while (module.parent) {
        module = module.parent;
    }

    return module;
}

interface ColorStream {
    isTTY?: boolean;
    getColorDepth(env?: object): number;
}

function defaultColorForStream(stream: NodeJS.WritableStream & ColorStream): boolean {
    return stream.isTTY === true && (typeof stream.getColorDepth === 'function' ? stream.getColorDepth() > 2 : true);
}

function defaultColorOption(options: SysConsoleOptions): boolean {
    return options.stdout ? defaultColorForStream(process.stdout) : options.stderr ? defaultColorForStream(process.stderr) : false;
}

function stripANSI(message: string): string {
    return message.replace(ANSI_REGEXP, '');
}

export class SysConsole extends console.Console implements Console, SysConsoleFunctions {
    private static readonly _tagLength = Object.keys(Severity).reduce((max, tag) => Math.max(max, tag.length), 0) + 2 // '[Longest tag]'.length

    private _rootDir:   string;
    private _counter:   number;
    private _error:     (_message?: any, ..._optionalParams: any[]) => void;
    private _log:       (_message?: any, ..._optionalParams: any[]) => void;
    private _logBuffer: LogBuffer;
    private _syslog?:   Syslog.Client;

    options: SysConsoleOptions;

    constructor(options?: Partial<SysConsoleOptions>, inspectOptions?: InspectOptions) {
        const logBuffer     = new LogBuffer();
        const rootModule    = getRootModule(module);
        const rootFile      = rootModule.filename ? path.basename(rootModule.filename) : process.title;
        const defaultOptions: SysConsoleOptions = {
            highestLevel:   'debug',

            stdout:         false,
            stderr:         true,

            syslog:         true,
            loghost:        '127.0.0.1',
            logport:        514,
            tcpTimeout:     null,

            hostname:       os.hostname(),
            title:          rootFile,
            facility:       'user',

            showTime:       true,
            showDate:       false,
            showMillis:     true,
            showTags:       true,
            showLine:       true,
            showFile:       true,
            showFunc:       false,

            syslogHashTags: false,
            syslogTags:     false,
            syslogMsgId:    false,
        };

        super({
            stdout:    logBuffer,
            colorMode: inspectOptions?.colors === undefined ? defaultColorOption({ ...defaultOptions, ...options }) : undefined,
            inspectOptions,
        });

        this._rootDir   = path.dirname(rootModule.filename || '.');
        this._counter   = 0;
        this._error     = this.error;
        this._log       = this.log;
        this._logBuffer = logBuffer;
        this.options    = defaultOptions;

        this.set(options);

        // Patch all inherited methods
        for (const fn in console.Console.prototype) {
            const sc = this as any;

            if (typeof sc[fn]  === 'function') {
                const orig = sc[fn];
                sc[fn] = (...args: any[]) => sc._wrapper(fn, orig, args);
            }
        }
    }

    set(options?: Partial<SysConsoleOptions>): this {
        this.options = { ...this.options, ...options };

        if (!isValidFacility(this.options.facility)) {
            throw new TypeError(`Invalid facility value '${this.options.facility}'`);
        }

        if (!isValidSeverity(this.options.highestLevel)) {
            throw new TypeError(`Invalid highestLevel value '${this.options.highestLevel}'`);
        }

        // Extract port from loghost, if present
        if (/^[^:]*:[0-9]+$/.test(this.options.loghost)) {
            const [ host, port ] = this.options.loghost.split(':');
            this.options.loghost = host || "127.0.0.1";
            this.options.logport = Number(port);
        }

        return this._initSyslog();
    }

    /**
     * Returns an object containing all syslog functions up to and including the specified severity level.
     *
     * The result of this function is useful for passing to a `Partial<Console>` logger, so that only the functions up
     * to and including the specified severity level are forwarded to this `SysConsole` instance..
     *
     * Note that the `SysConsole`'s configured highestLevel option is still respected. The `highestLevel` parameter only
     * affects what functions to return.
     *
     * @param highestLevel  The highest severity level to include. Default is the currently set `highestLevel` option.
     * @returns             An object containing all syslog functions up to and including the specified severity level.
     */
    syslogFunctions(highestLevel: Severity = this.options.highestLevel): Partial<SyslogFunctions> {
        const result: Partial<SyslogFunctions> = {};

        for (const [severity, level] of Object.entries(Severity) as [Severity, number][]) {
            if (level <= Severity[highestLevel]) {
                result[severity] = this[severity];
            }
        }

        return result;
    }

    /**
     * Creates a new `SysConsole` instance and replaces the global console object with it.
     *
     * @param options         `SysConsole` options.
     * @param inspectOptions  Node.js `InspectOptions`.
     * @returns               The new `SysConsole` instance, which is also the new global console object.
     */
    static replaceConsole(options?: Partial<SysConsoleOptions>, inspectOptions?: InspectOptions): SysConsole {
        const sc = new SysConsole(options, inspectOptions) as any;

        try {
            global.console = sc;
        }
        catch (_ignored) {
            for (const prop of Object.keys(sc).concat(Object.getOwnPropertyNames(SysConsole.prototype))) {
                if (typeof sc[prop] === 'function' && prop.charAt(0) !== '_' && prop !== 'constructor') {
                    (global.console as any)[prop] = sc[prop].bind(sc);
                }
                else if (sc[prop] !== 'function' && prop.charAt(0) !== '_') {
                    (global.console as any)[prop] = sc[prop];
                }
            }
        }

        return sc;
    }

    emerg = (...args: any[]): void => {
        return this._wrapper('emerg', this._error, args);
    }

    alert = (...args: any[]): void => {
        return this._wrapper('alert', this._error, args);
    }

    crit = (...args: any[]): void => {
        return this._wrapper('crit', this._error, args);
    }

    notice = (...args: any[]): void => {
        return this._wrapper('notice', this._log, args);
    }

    private _initSyslog(): this {
        const target    = this.options.loghost;
        const port      = this.options.logport;
        const transport = this.options.tcpTimeout !== null ? Syslog.Transport.Tcp : Syslog.Transport.Udp;

        this._syslog?.close();
        delete this._syslog;

        if (this.options.syslog) {
            this._syslog = Syslog.createClient(target, { port, transport, tcpTimeout: this.options.tcpTimeout || undefined });
        }

        return this;
    }

    private _wrapper(name: string, fn: Function, args: ArrayLike<any>): any {
        try {
            ++this._counter;
            return fn.apply(this, args);
        }
        finally {
            --this._counter;

            if (this._counter === 0) {
                this._logMessage(name, this._logBuffer.getAndClear());
            }
        }
    }

    private _logMessage(name: string, message: string) {
        const level = isValidSeverity(name) ? name
                    : name === 'log'        ? 'info'
                    :                         'debug';

        if (!message || Severity[level] > Severity[this.options.highestLevel]) {
            return;
        }

        let consoleHeader = '';
        let syslogHeader  = '';
        let syslogMsgId   = typeof this.options.syslogMsgId === 'string' ? this.options.syslogMsgId : '';

        if (this.options.showTime) {
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());

            if (this.options.showDate) {
                consoleHeader += now.toISOString().substr(0, 10) + ' ';
            }

            consoleHeader += now.toISOString().substr(11, this.options.showMillis ? 12 : 8) + ' ';
        }

        if (this.options.showTags) {
            consoleHeader += `[${level.toUpperCase()}]`.padStart(SysConsole._tagLength) + ' ';
        }

        if (this.options.syslogHashTags) {
            syslogHeader += `#${level}`;
        }
        else if (this.options.syslogTags) {
            syslogHeader += `[${level.toUpperCase()}] `;
        }

        if (this.options.showFile || this.options.showLine || this.options.showFunc || this.options.syslogMsgId === true) {
            const frame = StackTrace.get()[3];
            const file  = path.relative(this._rootDir, frame?.getFileName() ?? 'N/A');
            const parts = [];

            if (this.options.showFile) {
                parts.push(file);

                if (this.options.showLine) {
                    parts.push(frame?.getLineNumber() ?? -1);
                }
            }

            if (this.options.syslogMsgId === true) {
                syslogMsgId = file;
            }

            if (this.options.showFunc) {
                const type = frame?.getTypeName() ? `${frame.getTypeName()}.` : '';
                const func = frame?.getMethodName() || frame?.getFunctionName();

                if (func) {
                    parts.push(type + func);
                }
            }

            if (parts.length) {
                consoleHeader += `[${parts.join(':')}] `;
                syslogHeader  += `[${parts.join(':')}] `;
            }
        }

        if (this.options.stdout) {
            process.stdout.write(consoleHeader + message);
        }
        else if (this.options.stderr) {
            process.stderr.write(consoleHeader + message);
        }

        if (this._syslog) {
            this._syslog.log(syslogHeader + stripANSI(message), {
                rfc3164:        false,
                facility:       Facility[this.options.facility],
                severity:       Severity[level],
                syslogHostname: this.options.hostname,
                appName:        this.options.title,
                msgid:          syslogMsgId || undefined,
            });
        }
    }
}
