import { SysConsole } from './sysconsole';

var sysconsole = SysConsole.replaceConsole();
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
