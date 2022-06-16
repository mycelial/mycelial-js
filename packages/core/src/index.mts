import * as Index from '@mycelial/wasm'
import { createCustomEvent } from './events.mjs';

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

        this.events.dispatchEvent(createCustomEvent('update', { detail: ops }))
      }, 0)
    })
    this.log.set_on_apply(() => {
      setTimeout(() => {
        this.events.dispatchEvent(createCustomEvent('apply', { detail: {} }))
      }, 0)
    })
  }

  apply(ops: any) {
    this.log.apply(JSON.stringify(ops))
  }

  commit(entities: Array<any>) {
    withAggregate(this.log, () => {
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

function withAggregate(log: Index.List, cb: () => void) {
  log.aggregateOps(true);
  cb();
  log.aggregateOps(false);
}

export function create(namespace: string, key: number) {
  return new Instance(namespace, key)
}
