import * as Core from '@mycelial/core'

export function getWebSocket() {
  return window.WebSocket
}

export async function create(namespace: string) {
  return Core.create(namespace, {
    runtime: {
      getWebSocket,
    }
  })
}