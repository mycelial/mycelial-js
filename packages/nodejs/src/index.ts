import path from 'path';
import fs from 'fs';
import url from 'url';

import WebSocket from 'isomorphic-ws';

export function resolve(meta: ImportMeta) {
  return () => {
    const module = path.join(
      path.dirname(url.fileURLToPath(meta.url)),
      'node_modules/@mycelial/wasm/dist/index_bg.wasm'
    );

    return fs.readFileSync(module)
  }
}

export function getWebSocket() {
  return WebSocket
}