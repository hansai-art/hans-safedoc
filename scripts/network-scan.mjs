#!/usr/bin/env node
/**
 * Production repository implementation must extend this script to scan:
 * source, dependency graph and built bundle.
 * This specification package only defines the required deny terms.
 */
const denied = [
  "fetch(", "requestUrl(", "XMLHttpRequest", "WebSocket",
  "node:http", "node:https", "node:net", "node:tls", "node:dgram",
  "electron.session", "child_process"
];
console.log(JSON.stringify({ denied, policy: "Any reachable production client path fails CI." }, null, 2));
