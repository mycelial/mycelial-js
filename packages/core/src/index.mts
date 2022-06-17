import initialize, { List } from '@mycelial/wasm'
import { createCustomEvent } from './events.mjs';

export type Triple = [string, string, string]

export interface Instance {
  key: number
  log: List
  namespace: string
  events: EventTarget
}

export class Instance implements Instance {
  namespace: string
  key: number
  log: List
  events: EventTarget

  constructor(namespace: string, key: number) {
    this.events = new EventTarget();

    this.namespace = namespace;
    this.key = key

    this.log = List.new(key)
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

function withAggregate(log: List, cb: () => void) {
  log.aggregateOps(true);
  cb();
  log.aggregateOps(false);
}

export async function create(namespace: string, key: number, opts?: any) {
  await initialize(opts?.resolver ? opts.resolver() : undefined);

  return new Instance(namespace, key)
}
