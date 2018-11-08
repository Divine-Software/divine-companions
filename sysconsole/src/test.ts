import { sysconsole } from './sysconsole';

Object.assign(console, sysconsole.set({  }));

function func() {
    console.log('foo');
    console.info('foo');

    new Class().method();
}

class Class {
    constructor() {
        console.debug('In constructor');
        console.trace('here');
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
