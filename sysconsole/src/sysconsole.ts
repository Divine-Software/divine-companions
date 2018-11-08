import { Writable } from 'stream';
import os from 'os';
import path from 'path';
import StackTrace from 'stack-trace';

export type Facility = 'kern' | 'user' | 'mail' | 'daemon' | 'auth' | 'syslog' | 'lpr' | 'news' | 'uucp' | 'cron' | 'authpriv' | 'ftp' | 'ntp' | 'security' | 'console' | 'local0' | 'local1' | 'local2' | 'local3' | 'local4' | 'local5' | 'local6' | 'local7 ';
export type Severity = 'emerg' | 'alert' | 'crit' | 'error' | 'warn' | 'notice' | 'info' | 'debug';

export interface SysConsoleOptions {
    highestLevel: Severity;

    syslog:       boolean;
    loghost:      string;
    logport:      number;

    stdout:       boolean,
    stderr:       boolean,

    hostname:     string;
    title:        string;
    facility:     Facility;

    showTime:     boolean;
    showDate:     boolean;
    showMillis:   boolean;
    showLine:     boolean;
    showFile:     boolean;
    showFunc:     boolean;
    showTags:     boolean;
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
    private _counter:   number;
    private _error:     (_message?: any, ..._optionalParams: any[]) => void;
    private _log:       (_message?: any, ..._optionalParams: any[]) => void;
    private _logBuffer: LogBuffer;
    private _options:   SysConsoleOptions;

    constructor(options?: Partial<SysConsoleOptions>) {
        const logBuffer = new LogBuffer();
        super(logBuffer);

        let rootModule = module;

        while (rootModule.parent) {
            rootModule = rootModule.parent;
        }

        this._rootDir   = path.dirname(rootModule.filename || '.');
        this._counter   = 0;
        this._error     = this.error;
        this._log       = this.log;
        this._logBuffer = logBuffer;
        this._options   = {
            highestLevel: 'debug',

            stdout:       false,
            stderr:       true,

            syslog:       true,
            loghost:      'localhost',
            logport:      514,

            hostname:     os.hostname(),
            title:        process.title,
            facility:     'user',

            showTime:     true,
            showDate:     false,
            showMillis:   true,
            showLine:     true,
            showFile:     true,
            showFunc:     true,
            showTags:     true,
        };

        this.set(options);

        // Patch all inherited methods
        for (const fn in console.Console.prototype) {
            const sc = this as any;

            if (typeof sc[fn]  === 'function') {
                const orig = sc[fn];

                sc[fn] = function() {
                    return this._wrapper(fn, orig, arguments);
                }
            }
        }
    }

    set(options?: Partial<SysConsoleOptions>): this {
        this._options = { ...this._options, ...options };
        return this;
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

    private _wrapper(name: string, fn: Function, args: ArrayLike<any>) {
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

    private _logMessage(fn: string, message: string) {
        if (!message) {
            return;
        }

        if (fn === 'log') {
            fn = 'notice';
        }
        else if (!(fn in SysConsole._severity)) {
            fn = 'debug';
        }

        let extra = '';

        if (this._options.showTime) {
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());

            if (this._options.showDate) {
                extra += now.toISOString().substr(0, 10) + ' ';
            }

            extra += now.toISOString().substr(11, this._options.showMillis ? 12 : 8) + ' ';
        }

        if (this._options.showTags) {
            extra += padStart(`[${fn.toUpperCase()}]`, ' ', SysConsole._tagLength) + ' ';
        }

        if (this._options.showFile || this._options.showLine || this._options.showFunc) {
            const frame = StackTrace.get()[3];
            const parts = [];

            if (this._options.showFile) {
                parts.push(path.relative(this._rootDir, frame.getFileName()));

                if (this._options.showLine) {
                    parts.push(frame.getLineNumber());
                }
            }

            if (this._options.showFunc) {
                const func = frame.getMethodName() || frame.getFunctionName();

                if (func) {
                    parts.push((frame.getTypeName() ? `${frame.getTypeName()}.` : '') + func);
                }
            }

            if (parts.length) {
                extra += `[${parts.join(':')}] `;
            }
        }

        if (this._options.stdout) {
            process.stdout.write(extra + message);
        }
        else if (this._options.stderr) {
            process.stderr.write(extra + message);
        }
    }
}
