import * as Index from '@mycelial/wasm'

export type Triple = [string, string, string]

export interface Instance {
  key: number
  log: Index.List
  namespace: string
  events: EventTarget
}

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

  commit(entities: Array<any>) {
    with_aggregate(this.log, () => {
      for (const entity of entities) {
        if (entity.$id) {
          for (const [attr, value] of Object.entries(entity)) {
            this.log.append([
              entity.$id,
              attr,
              value
            ])
          }
        }
      }
    })
  }
}

function with_aggregate(log: Index.List, cb: () => void) {
  log.aggregate_hooks(true);
  cb();
  log.aggregate_hooks(false);
}

export function create(namespace: string, key: number) {
  return new Instance(namespace, key)
}
