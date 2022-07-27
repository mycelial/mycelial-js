import path from 'path';
import fs from 'fs';
import url from 'url';
import * as Core from '@mycelial/core';

import WebSocket from 'isomorphic-ws';

export function resolve() {
  return () => {
    const module = path.join(
      path.dirname(url.fileURLToPath(import.meta.url)),
      '../node_modules/@mycelial/wasm/dist/index_bg.wasm'
    );

    return fs.readFileSync(module)
  }
}

export function getWebSocket() {
  return WebSocket
}

export async function create(namespace: string, key: any) {
  return Core.create(namespace, key, {
    resolver: resolve(),
    runtime: {
      getWebSocket,
    }
  })
}