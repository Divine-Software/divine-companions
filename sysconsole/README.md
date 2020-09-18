# The Divine Syslog Console

This is a pure JavaScript (or TypeScript, actually) `Console` replacement for *Node.js* that sends all the log messages
to a remote syslog server via either UDP or TCP.

It's more or less [rconsole](https://github.com/tblobaum/rconsole)-compatible.

## How to use

You can instantiate the `SysConsole` object manually, but what you probably want is this:

```typescript
import { SysConsole } from '@divine/sysconsole';

declare var console : SysConsole;

SysConsole.replaceConsole({ loghost: 'localhost', facility: 'local0', title: 'MySweetApp', showFile: false, syslogTags: true, highestLevel: 'info' });
```

## History

### `2.0.0` (2020-09-18)

* Now supports passing custom `InspectOptions`.
* Color support.
* Requires *NodeJS* v10 because of this.

### `1.1.0` (2018-11-10)

* Initial public release.
