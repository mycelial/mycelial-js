import React from 'react';
import * as Mycelial from '@mycelial/core';
import * as Websocket from '@mycelial/websocket';
import { Store } from '@mycelial/v0';


export const MycelialContext = React.createContext<Mycelial.Instance | null>(null)

export function useStore(callback: (a: Store) => void, args: any) {
  const instance = React.useContext(MycelialContext)

  if (instance === null) {
    return;
  }

  const store = React.useRef<Store>()

  const handle = React.useCallback(() => {
    if (store.current) {
      callback(store.current)
    }
  }, args)

  React.useEffect(() => {
    store.current = new Store(instance)
    store.current.events.addEventListener('change', handle)
  }, args)
}

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
    const initialize = async () => {
        if (!instance.current) {
        instance.current = await Mycelial.create(namespace, key)
      }

      instance.current.events.addEventListener('update', handle)
      instance.current.events.addEventListener('apply', handle)

      if (!socket.current) {
        socket.current = Websocket.create(instance.current, {
          endpoint: 'wss://v0alpha-relay.fly.dev/v0alpha'
        });
      }
    }

    initialize().catch(console.error);

    return () => {
      instance.current.events.addEventListener('update', handle)
      instance.current.events.addEventListener('apply', handle)
    }
  }, [namespace, key])

  return { commit }
}