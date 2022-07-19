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

export function MycelialProvider(props: Props) {
  const [state, setState] = React.useState<{instance?: Instance, conn?: any}>({})

  React.useEffect(() => {
    props.runtime.create(props.namespace).then((instance: Instance) => {
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