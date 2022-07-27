import React from 'react';
import type { Instance } from '@mycelial/core';
import * as Websocket from '@mycelial/websocket';
import { Store, Entity } from '@mycelial/v0';

export { Store, Entity } from '@mycelial/v0';

function getRandomInt(max: number) {
  return Math.floor(Math.random() * max);
}

const Context = React.createContext<any>({})

type Props = {
  namespace: string,
  runtime: any,
  opts?: {
    resolver: (meta: ImportMeta) => any
  }
  children: any
}

export function Provider(props: Props) {
  const [state, setState] = React.useState<{instance?: Instance, conn?: any}>({})

  React.useEffect(() => {
    props.runtime.create(props.namespace, getRandomInt(1000000000)).then((instance: Instance) => {
      const conn = Websocket.create(instance, {
        endpoint: 'wss://v0alpha-relay.fly.dev/v0alpha'
      });
      setState({ instance, conn });
    })
  }, [props.namespace])

  if (!state.instance) {
    return <></>
  }

  return (
    <Context.Provider value={state.instance}>
      {props.children}
    </Context.Provider>
  )
}

export function useStore(callback: (a: Store) => void, args: any = []): { add: (e: Entity) => void} {
  const instance = React.useContext(Context)

  const store = React.useRef<Store>()

  const handle = React.useCallback(() => {
    if (store.current) {
      callback(store.current)
    }
  }, args)

  const add = React.useCallback((entity: Entity) => {
    if (store.current) {
      store.current.add(entity)
    }
  }, args)

  React.useEffect(() => {
    store.current = new Store(instance)
    store.current.events.addEventListener('change', handle)

    return () => {
      store.current?.events.removeEventListener('change', handle)
    }
  }, args)

  return {
    add,
  }
}

/*export function useInstance(namespace: string, key: number, callback: (snapshot: Array<any>) => void) {
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
}*/