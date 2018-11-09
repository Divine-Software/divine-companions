import os from 'os';
import path from 'path';
import StackTrace from 'stack-trace';
import Syslog from 'syslog-client';
import { Writable } from 'stream';

export type Facility = 'kern' | 'user' | 'mail' | 'daemon' | 'auth' | 'syslog' | 'lpr' | 'news' | 'uucp' | 'cron' | 'authpriv' | 'ftp' | 'ntp' | 'security' | 'console' | 'local0' | 'local1' | 'local2' | 'local3' | 'local4' | 'local5' | 'local6' | 'local7 ';
export type Severity = 'emerg' | 'alert' | 'crit' | 'error' | 'warn' | 'notice' | 'info' | 'debug';

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

    _write(chunk: string | Buffer, _encoding: string, callback: (error: Error | null) => void): void {
        this._buffer += chunk.toString();
        callback(null);
    }
}

function padStart(str: string, pad: string, length: number) {
    return (length > str.length ? Array(length - str.length + 1).join(pad) + str: str);
}

export class SysConsole extends console.Console {
    private static readonly _facility: { [facility: string]: number } = {
        kern: 0, user: 1, mail: 2, daemon: 3, auth: 4, syslog: 5, lpr: 6, news: 7, uucp: 8, cron: 9, authpriv: 10, ftp: 11, ntp: 12, security: 13, console: 14, local0: 16, local1: 17, local2: 18, local3: 19, local4: 20, local5: 21, local6: 22, local7: 23
    }

    private static readonly _severity: { [severity: string]: number } = {
        emerg: 0, panic: 0, alert: 1,  crit: 2,  error: 3, err: 3, warn: 4, warning: 4, notice: 5, info: 6, debug: 7
    }

    private static readonly _tagLength = '[notice]'.length; // Longest tag

    private _rootDir:   string;
    private _rootFile:  string;
    private _counter:   number;
    private _error:     (_message?: any, ..._optionalParams: any[]) => void;
    private _log:       (_message?: any, ..._optionalParams: any[]) => void;
    private _logBuffer: LogBuffer;
    private _syslog?:   Syslog.Client;

    options: SysConsoleOptions;

    constructor(options?: Partial<SysConsoleOptions>) {
        const logBuffer = new LogBuffer();
        super(logBuffer);

        let rootModule = module;

        while (rootModule.parent) {
            rootModule = rootModule.parent;
        }

        this._rootDir   = path.dirname(rootModule.filename || '.');
        this._rootFile  = rootModule.filename ? path.basename(rootModule.filename) : process.title;
        this._counter   = 0;
        this._error     = this.error;
        this._log       = this.log;
        this._logBuffer = logBuffer;
        this.options   = {
            highestLevel:   'debug',

            stdout:         false,
            stderr:         true,

            syslog:         true,
            loghost:        '127.0.0.1',
            logport:        514,
            tcpTimeout:     null,

            hostname:       os.hostname(),
            title:          this._rootFile,
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

        this.set(options);

        // Patch all inherited methods
        for (const fn in console.Console.prototype) {
            const sc = this as any;

            if (typeof sc[fn]  === 'function') {
                const orig = sc[fn];

                sc[fn] = function(this: SysConsole) {
                    return this._wrapper(fn, orig, arguments);
                }
            }
        }
    }

    set(options?: Partial<SysConsoleOptions>): this {
        this.options = { ...this.options, ...options };

        if (typeof SysConsole._facility[this.options.facility] !== 'number') {
            throw new TypeError(`Invalid facility value '${this.options.facility}'`);
        }

        if (typeof SysConsole._severity[this.options.highestLevel] !== 'number') {
            throw new TypeError(`Invalid highestLevel value '${this.options.highestLevel}'`);
        }

        return this._initSyslog();
    }

    static replaceConsole(options?: Partial<SysConsoleOptions>): SysConsole {
        const sc = new SysConsole(options) as any;

        try {
            global.console = sc;
        }
        catch (_ignored) {
            for (const fn of Object.keys(sc).concat(Object.getOwnPropertyNames(SysConsole.prototype))) {
                if (typeof sc[fn] === 'function' && fn.charAt(0) !== '_' && fn !== 'constructor') {
                    (global.console as any)[fn] = sc[fn].bind(sc);
                }
            }
        }

        return sc;
    }

    emerg(_message?: any, ..._optionalParams: any[]): void {
        return this._wrapper('emerg', this._error, arguments);
    }

    alert(_message?: any, ..._optionalParams: any[]): void {
        return this._wrapper('alert', this._error, arguments);
    }

    crit(_message?: any, ..._optionalParams: any[]): void {
        return this._wrapper('crit', this._error, arguments);
    }

    notice(_message?: any, ..._optionalParams: any[]): void {
        return this._wrapper('notice', this._log, arguments);
    }

    debug(_message?: any, ..._optionalParams: any[]): void {
        return this._wrapper('debug', this._log, arguments);
    }

    private _initSyslog(): this {
        const target    = this.options.loghost;
        const port      = this.options.logport;
        const transport = this.options.tcpTimeout !== null ? Syslog.Transport.Tcp : Syslog.Transport.Udp;

        if (this._syslog && this._syslog.target !== target &&  this._syslog.port !== port && this._syslog.transport !== transport) {
            this._syslog.close();
            this._syslog = undefined;
        }

        if (this.options.syslog && !this._syslog) {
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

    private _logMessage(level: string, message: string) {
        level = level === 'log' ? 'info' : level;

        if (typeof SysConsole._severity[level] !== 'number') {
            level = 'debug';
        }

        if (!message || SysConsole._severity[level] > SysConsole._severity[this.options.highestLevel]) {
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
            consoleHeader += padStart(`[${level.toUpperCase()}]`, ' ', SysConsole._tagLength) + ' ';
        }

        if (this.options.syslogHashTags) {
            syslogHeader += `$${level}`;
        }
        else if (this.options.syslogTags) {
            syslogHeader += `[${level.toUpperCase()}] `;
        }

        if (this.options.showFile || this.options.showLine || this.options.showFunc || this.options.syslogMsgId === true) {
            const frame = StackTrace.get()[3];
            const file  = path.relative(this._rootDir, frame.getFileName());
            const parts = [];

            if (this.options.showFile) {
                parts.push(file);

                if (this.options.showLine) {
                    parts.push(frame.getLineNumber());
                }
            }

            if (this.options.syslogMsgId === true) {
                syslogMsgId = file;
            }

            if (this.options.showFunc) {
                const type = frame.getTypeName() ? `${frame.getTypeName()}.` : '';
                const func = frame.getMethodName() || frame.getFunctionName();

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
            this._syslog.log(syslogHeader + message, {
                rfc3164:        false,
                facility:       SysConsole._facility[this.options.facility],
                severity:       SysConsole._severity[level],
                syslogHostname: this.options.hostname,
                appName:        this.options.title,
                msgid:          syslogMsgId || undefined,
            });
        }
    }
}
