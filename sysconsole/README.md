# The Divine Syslog Console

This is a pure JavaScript (or TypeScript, actually) `Console` replacement for *Node.js* that sends all the log messages
to a remote syslog server via either UDP or TCP.

It's more or less [rconsole]()-compatible.

## How to use

You can instantiate the `SysConsole` object manually, but what you probably want is this:

```typescript
import { SysConsole } from '@divine/sysconsole';

declare var console : SysConsole;

SysConsole.replaceConsole({ loghost: 'localhost', facility: 'local0', title: 'MySweetApp', showFile: false, syslogTags: true, highestLevel: 'info' });
```
