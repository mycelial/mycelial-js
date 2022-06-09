import React from 'react';
import * as Mycelial from '@mycelial/core';
import * as Websocket from '@mycelial/websocket';

export function useInstance(namespace: string, key: number, callback: (snapshot: Array<any>) => void) {
  const instance = React.useRef<any>();
  const socket = React.useRef<any>();

  const handle = React.useCallback(() => {
    if (!instance.current) {
      return;
    }

    callback(instance.current.log.to_vec())
  }, []);

  const commit = React.useCallback((facts: Array<any>) => {
    if (!instance.current) {
      console.error('The Mycelial instance is not connected yet')
      return;
    }

    instance.current.commit(facts)
  }, [])

  React.useEffect(() => {
    if (!instance.current) {
      instance.current = Mycelial.create(namespace, key)
    }

    instance.current.events.addEventListener('update', handle)
    instance.current.events.addEventListener('apply', handle)

    if (!socket.current) {
      socket.current = Websocket.create(instance.current, {
        endpoint: 'wss://v0alpha-relay.fly.dev/v0alpha'
      });
    }

    return () => {
      instance.current.events.addEventListener('update', handle)
      instance.current.events.addEventListener('apply', handle)
    }
  }, [namespace, key])

  return { commit }
}