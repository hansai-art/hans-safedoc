#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';

const [, , label = 'scan', secondsArg = '120', outArg] = process.argv;
if (!['scan', 'install'].includes(label)) throw new Error('label must be scan or install');
const seconds = Number(secondsArg);
if (!Number.isInteger(seconds) || seconds < 1 || seconds > 900)
  throw new Error('seconds must be an integer from 1 to 900');
const out = outArg || `/tmp/obsidian-net-${label}-${Date.now()}.jsonl`;
const port = Number(process.env.HSD_CDP_PORT || '9223');
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('invalid CDP port');
const targetTitle = process.env.HSD_CDP_TITLE || 'Hans SafeDoc Test Vault';

function redactUrl(value) {
  try {
    const url = new URL(String(value));
    url.search = '';
    url.hash = '';
    return url.href;
  } catch {
    return '[non-url]';
  }
}

const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => {
  if (!response.ok) throw new Error(`CDP target lookup failed: ${response.status}`);
  return response.json();
});
const target = targets.find(
  (candidate) => candidate.type === 'page' && candidate.title.includes(targetTitle),
);
if (!target) throw new Error(`Obsidian renderer target not found on :${port}`);
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.onopen = resolve;
  socket.onerror = reject;
});

let sequence = 0;
const pending = new Map();
const rows = [];
const emit = (source, event, data = {}) =>
  rows.push({ timestamp: new Date().toISOString(), source, event, ...data });

socket.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  if (message.id && pending.has(message.id)) {
    const handlers = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) handlers.reject(new Error(JSON.stringify(message.error)));
    else handlers.resolve(message.result);
    return;
  }
  if (message.method?.startsWith('Network.')) {
    const parameters = message.params || {};
    const rawUrl = parameters.request?.url || parameters.response?.url || parameters.url;
    if (rawUrl && !/^(app|file|data|blob):/u.test(rawUrl))
      emit('cdp', message.method, {
        url: redactUrl(rawUrl),
        type: parameters.type,
        requestId: parameters.requestId,
      });
  }
  if (message.method === 'Runtime.consoleAPICalled') {
    const values = (message.params.args || []).map((argument) => argument.value);
    if (values[0] === '__HSD_NET__' && typeof values[1] === 'string') {
      try {
        rows.push(JSON.parse(values[1]));
      } catch {
        emit('harness', 'invalid-hook-record');
      }
    }
  }
};

const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });

await send('Network.enable', { maxTotalBufferSize: 10_000_000 });
await send('Runtime.enable');
const injected = await send('Runtime.evaluate', {
  awaitPromise: true,
  returnByValue: true,
  expression: `(() => {
    if (globalThis.__HSD_NET_ARMED__) return { already: true };
    globalThis.__HSD_NET_ARMED__ = true;
    const restores = [];
    const safe = value => {
      try {
        const raw = value instanceof URL ? value.href :
          typeof value === 'string' ? value :
          value && typeof value === 'object' ? value.href || value.url || value.hostname || value.host || String(value) :
          String(value);
        try {
          const url = new URL(raw);
          url.search = '';
          url.hash = '';
          return url.href;
        } catch { return raw.slice(0, 500); }
      } catch { return '[unprintable]'; }
    };
    const log = (api, args = []) => console.debug('__HSD_NET__', JSON.stringify({
      timestamp: new Date().toISOString(),
      source: 'renderer-hook',
      event: api,
      args: Array.from(args).slice(0, 3).map(safe),
      stack: new Error().stack?.split('\\n').slice(2, 8),
    }));
    const wrap = (object, key, name) => {
      const original = object?.[key];
      if (typeof original !== 'function' || original.__hsd) return;
      const wrapped = function (...args) {
        log(name, args);
        return Reflect.apply(original, this, args);
      };
      Object.defineProperty(wrapped, '__hsd', { value: true });
      Object.setPrototypeOf(wrapped, original);
      try {
        object[key] = wrapped;
        restores.push(() => { object[key] = original; });
      } catch {}
    };
    wrap(globalThis, 'fetch', 'fetch');
    if (globalThis.XMLHttpRequest) {
      wrap(XMLHttpRequest.prototype, 'open', 'xhr.open');
      wrap(XMLHttpRequest.prototype, 'send', 'xhr.send');
    }
    if (globalThis.WebSocket) {
      const OriginalWebSocket = globalThis.WebSocket;
      try {
        globalThis.WebSocket = new Proxy(OriginalWebSocket, {
          construct(target, args, newTarget) {
            log('WebSocket', args);
            return Reflect.construct(target, args, newTarget);
          },
        });
        restores.push(() => { globalThis.WebSocket = OriginalWebSocket; });
      } catch {}
    }
    let asyncHook;
    const requireFunction = globalThis.require;
    if (typeof requireFunction === 'function') {
      const http = requireFunction('node:http');
      const https = requireFunction('node:https');
      const net = requireFunction('node:net');
      const tls = requireFunction('node:tls');
      for (const [object, key, name] of [
        [http, 'request', 'http.request'], [http, 'get', 'http.get'],
        [https, 'request', 'https.request'], [https, 'get', 'https.get'],
        [net, 'connect', 'net.connect'], [net, 'createConnection', 'net.createConnection'],
        [tls, 'connect', 'tls.connect'],
      ]) wrap(object, key, name);
      const asyncHooks = requireFunction('node:async_hooks');
      asyncHook = asyncHooks.createHook({
        init(id, type, trigger) {
          if (/^(TCP|TLS|UDP|PIPE).*WRAP$/u.test(type))
            log('async_hooks.' + type, [id, trigger]);
        },
      });
      asyncHook.enable();
    }
    globalThis.__HSD_NET_RESTORE__ = () => {
      asyncHook?.disable();
      for (const restore of restores.reverse()) {
        try { restore(); } catch {}
      }
      delete globalThis.__HSD_NET_RESTORE__;
      delete globalThis.__HSD_NET_ARMED__;
    };
    return { armed: true, node: typeof globalThis.require === 'function' };
  })()`,
});

emit('harness', 'start', {
  label,
  target: target.title,
  injected: injected.result?.value,
});
console.error(`ARMED ${label}; perform the host action now (${seconds}s).`);
await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
await send('Runtime.evaluate', {
  awaitPromise: true,
  returnByValue: true,
  expression: `(() => { globalThis.__HSD_NET_RESTORE__?.(); return true; })()`,
});
emit('harness', 'stop', { label });
socket.close();

const text = `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`;
await writeFile(out, text, { mode: 0o600 });
const sha256 = createHash('sha256').update(text).digest('hex');
await writeFile(`${out}.sha256`, `${sha256}  ${out}\n`, { mode: 0o600 });
console.log(
  JSON.stringify(
    {
      out,
      sha256,
      events: rows.length,
      networkEvents: rows.filter((row) => !['start', 'stop'].includes(row.event)).length,
    },
    null,
    2,
  ),
);
