import * as Index from '@mycelial/wasm'

export type Triple = [string, string, string]

export interface Instance {
  key: number
  log: Index.List
  namespace: string
  events: EventTarget
}

/*class ReadableInstanceStream {
  instance
  handler: any
  subscription: any

  constructor(instance: Instance) {
    this.instance = instance
  }

  start(controller: any) {
    const handler = (instance: Instance, ops: any, snapshot: any) => {
      controller.enqueue(ops)
    }

    this.subscription = this.instance.subscribe(handler)
  }

  cancel() {
    this.subscription()
  }
}*/

export class Instance implements Instance {
  namespace: string
  key: number
  log: Index.List
  events: EventTarget

  constructor(namespace: string, key: number) {
    this.events = new EventTarget();

    this.namespace = namespace;
    this.key = key

    this.log = Index.List.new(key)
    this.log.set_on_update((diff: any) => {
      setTimeout(() => {
        const ops = JSON.parse(diff)

        this.events.dispatchEvent(new CustomEvent('update', { detail: ops }))
      }, 0)
    })
    this.log.set_on_apply(() => {
      setTimeout(() => {
        this.events.dispatchEvent(new CustomEvent('apply', { detail: {} }))
      }, 0)
    })
  }

  apply(ops: any) {
    this.log.apply(JSON.stringify(ops))
  }

  commit(triples: Array<Triple>) {
    for (const triple of triples) {
      this.log.append(triple)
    }
  }
}

export function create(namespace: string, key: number) {
  return new Instance(namespace, key)
}

/*export function createReader(instance: Instance) {
  return new ReadableStream(new ReadableInstanceStream(instance))
}

class WritableInstanceStream {
  instance: Instance

  constructor(instance: Instance) {
    this.instance = instance
  }

  write(ops: any) {
    this.instance.apply(ops)
  }
}

export function createWriter(instance: Instance) {
  return new WritableStream(new WritableInstanceStream(instance))
}*/
