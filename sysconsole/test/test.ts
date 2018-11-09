import { SysConsole } from './sysconsole';
import { test2 } from './test2';

var sysconsole = SysConsole.replaceConsole({ syslogMsgId: true, syslogTags: true });
declare var console : SysConsole;

function func() {
    console.log('foo');
    console.info('foo');

    console.set({showDate: true});

    new Class().method();
}

class Class {
    constructor() {
        console.debug('In constructor');
        console.trace('here');
        console.alert('!!!')
    }

    method() {
        sysconsole.notice('method() called');

        Promise.resolve().then(() => {
            console.warn('then');
            throw 2;
        })
        .catch((_ex) => console.error('catch'));
    }
}

func();
test2();

console.set({highestLevel: 'notice'});
console.trace('Not shown');
console.debug('Not shown');
console.info('Not shown');
console.notice('Shown');
