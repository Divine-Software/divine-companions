import { Writable } from 'stream';
import os from 'os';
import path from 'path';
import StackTrace from 'stack-trace';

type Facility = 'kern' | 'user' | 'mail' | 'daemon' | 'auth' | 'syslog' | 'lpr' | 'news' | 'uucp' | 'cron' | 'authpriv' | 'ftp' | 'ntp' | 'security' | 'console' | 'local0' | 'local1' | 'local2' | 'local3' | 'local4' | 'local5' | 'local6' | 'local7 ';
type Severity = 'emerg' | 'alert' | 'crit' | 'error' | 'warn' | 'notice' | 'info' | 'debug';

const Facility: { [facility: string]: number } = {
    kern: 0, user: 1, mail: 2, daemon: 3, auth: 4, syslog: 5, lpr: 6, news: 7, uucp: 8, cron: 9, authpriv: 10, ftp: 11, ntp: 12, security: 13, console: 14, local0: 16, local1: 17, local2: 18, local3: 19, local4: 20, local5: 21, local6: 22, local7: 23
}

const Severity: { [severity: string]: number } = {
    emerg: 0, panic: 0, alert: 1,  crit: 2,  error: 3, err: 3, warn: 4, warning: 4, notice: 5, info: 6, debug: 7
}

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

const Options = Symbol('Options');

export interface SysConsole extends Console {
    [Options]: SysConsoleOptions;

    set(options?: Partial<SysConsoleOptions>): this;

    emerg(message?: any, ...optionalParams: any[]): void;
    alert(message?: any, ...optionalParams: any[]): void;
    crit(message?: any, ...optionalParams: any[]): void;
    notice(message?: any, ...optionalParams: any[]): void;
}

class LogStream extends Writable {
    static readonly tagLength = '[notice]'.length; // Longest tag

    private rootDir: string;
    private buffer = '';
    private calls = 0;

    constructor() {
        super({decodeStrings: false, objectMode: false});

        let rootModule = module;

        while (rootModule.parent) {
            rootModule = rootModule.parent;
        }

        this.rootDir = path.dirname(rootModule.filename);
    }

    _write(chunk: string | Buffer, _encoding: string, callback: (error: Error | null) => void): void {
        this.buffer += chunk.toString();
        callback(null);
    }

    beginCall() {
        ++this.calls;
    }

    finishCall(fn: string, options: SysConsoleOptions) {
        --this.calls;

        if (this.calls === 0 && this.buffer.length !== 0) {
            if (fn === 'log') {
                fn = 'notice';
            }
            else if (!(fn in Severity)) {
                fn = 'debug';
            }

            let extra = '';

            if (options.showTime) {
                const now = new Date();
                now.setMinutes(now.getMinutes() - now.getTimezoneOffset());

                if (options.showDate) {
                    extra += now.toISOString().substr(0, 10) + ' ';
                }

                extra += now.toISOString().substr(11, options.showMillis ? 12 : 8) + ' ';
            }

            if (options.showTags) {
                extra += LogStream.padStart(`[${fn.toUpperCase()}]`, ' ', LogStream.tagLength) + ' ';
            }

            if (options.showFile || options.showLine || options.showFunc) {
                const frame = StackTrace.get()[2];
                const parts = [];

                if (options.showFile) {
                    parts.push(path.relative(this.rootDir, frame.getFileName()));

                    if (options.showLine) {
                        parts.push(frame.getLineNumber());
                    }
                }

                if (options.showFunc) {
                    const func = frame.getMethodName() || frame.getFunctionName();

                    if (func) {
                        parts.push((frame.getTypeName() ? `${frame.getTypeName()}.` : '') + func);
                    }
                }

                if (parts.length) {
                    extra += `[${parts.join(':')}] `;
                }
            }

            if (options.stdout) {
                process.stdout.write(extra + this.buffer);
            }
            else if (options.stderr) {
                process.stderr.write(extra + this.buffer);
            }

            this.buffer = '';
        }
    }

    private static padStart(str: string, pad: string, length: number) {
        return (length > str.length ? Array(length - str.length + 1).join(pad) + str: str);
    }
}

const logstream  = new LogStream();
export const sysconsole = new console.Console(logstream) as SysConsole;

sysconsole.emerg  = sysconsole.error;
sysconsole.alert  = sysconsole.error;
sysconsole.crit   = sysconsole.error;
sysconsole.notice = sysconsole.log;

for (const fn in sysconsole) {
    const sc = sysconsole as any;

    if (typeof sc[fn]  === 'function') {
        const orig = sc[fn] as Function;

        sc[fn] = function() {
            try {
                logstream.beginCall();
                orig.apply(this, arguments);
            }
            finally {
                logstream.finishCall(fn, sysconsole[Options]);
            }
        }
    }
}

sysconsole.set = function(options?: Partial<SysConsoleOptions>): SysConsole {
    this[Options] = {
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
        ...this[Options],
        ...options
    }

    return this;
}

sysconsole.set();
