import * as Core from '@mycelial/core'

export function getWebSocket() {
  return window.WebSocket
}

export async function create(namespace: string, key: any) {
  return Core.create(namespace, key, {
    runtime: {
      getWebSocket,
    }
  })
}