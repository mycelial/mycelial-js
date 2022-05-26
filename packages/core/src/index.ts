import * as Index from '@mycelial/wasm'

export type Triple = [string, string, string]

export interface IIndex {
  append(triple: Triple): void
  set_on_update(callback: (a: string) => void): void
}

export interface ISpore {
  key: number
  log: IIndex
  namespace: string
}

class ReadableSporeStream {
  spore
  handler: any
  subscription: any

  constructor(spore: Spore) {
    this.spore = spore
  }

  start(controller: any) {
    const handler = (spore: Spore, ops: any, snapshot: any) => {
      controller.enqueue(ops)
    }

    this.subscription = this.spore.subscribe(handler)
  }

  cancel() {
    this.subscription()
  }
}

export class Spore implements ISpore {
  key: number
  log: Index.List
  eventTarget: EventTarget
  namespace: string

  constructor(namespace: string, key: number) {
    this.eventTarget = new EventTarget()

    this.namespace = namespace;
    this.key = key

    this.log = Index.List.new(key)
    this.log.set_on_update((diff: any) => {
      setTimeout(() => {
        const ops = JSON.parse(diff)

        this.eventTarget.dispatchEvent(new CustomEvent('op', { detail: ops }))
      }, 0)
    })
  }

  apply(ops: any) {
    this.log.apply(JSON.stringify(ops))
    this.eventTarget.dispatchEvent(new CustomEvent('op', { detail: ops }))
  }

  join(ops: any) {
    this.log.apply(JSON.stringify(ops))
  }

  commit(triples: Array<Triple>) {
    for (const triple of triples) {
      this.log.append(triple)
    }
  }

  subscribe(callback: any) {
    const handler = (evt: any) => {
      callback(this, evt.detail, this.log.to_vec())
    }

    this.eventTarget.addEventListener('op', handler)

    return () => {
      this.eventTarget.removeEventListener('op', handler)
    }
  }
}

export function create(key: number) {
  return new Spore(key)
}

export function createSpore(key: number) {
  return new Spore(key)
}

export function createReader(spore: Spore) {
  return new ReadableStream(new ReadableSporeStream(spore))
}

class WritableSporeStream {
  spore: Spore

  constructor(spore: Spore) {
    this.spore = spore
  }

  write(ops: any) {
    this.spore.apply(ops)
  }
}

export function createWriter(spore: Spore) {
  return new WritableStream(new WritableSporeStream(spore))
}
