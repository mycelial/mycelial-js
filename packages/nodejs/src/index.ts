import fs from 'fs';
import * as resolver from 'import-meta-resolve';
import * as Core from '@mycelial/core';

import WebSocket from 'isomorphic-ws';

export function resolve() {
  return async (): Promise<any> => {
    const mod = await resolver.resolve('@mycelial/wasm/index_bg.wasm', import.meta.url)
    return fs.readFileSync(new URL(mod))
  }
}

export function getWebSocket() {
  return WebSocket
}

export async function create(namespace: string) {
  return Core.create(namespace, {
    resolver: await resolve(),
    runtime: {
      getWebSocket,
    }
  })
}