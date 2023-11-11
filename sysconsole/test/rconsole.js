
require('..').SysConsole.replaceConsole();

console.set({
  facility: 'local0'      // default: user
    , title: 'web-01'       // default: node -- can also be set with `process.title`
    , highestLevel: 'debug'  // [emerg, alert, crit, err, warning, notice, info, debug]
    , stdout: false         // default: false
    , stderr: true          // default: true
    , syslog: true          // default: true
    , syslogHashTags: false // default: false
    , showTime: true        // default: true 
    , showLine: true        // default: true
    , showFile: true        // default: true
    , showTags: true        // default: true
})

console.emerg('level 0')

console.alert('level 1')

console.crit('level 2')

console.error('level 3')

console.warn('level 4')

console.notice('level 5')

console.info('level 6')
console.log('level 6')

console.debug('level 7', { hello: 'world' })
console.trace('level 7')
console.dir({ 'level 7': { 'deep': { 'level': { 'inspect': true } } } }, true, 5)
console.time('level 7')
console.timeEnd('level 7')
