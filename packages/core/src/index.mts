import initialize, { List } from '@mycelial/wasm'
import { createCustomEvent } from './events.mjs';

export type Triple = [string, string, string]

export interface Instance {
  key: number
  log: List
  namespace: string
  events: EventTarget
}

const MAX_PEER_ID = 1000 * 1000 * 1000;

function getRandomInt(max: number) {
  return Math.floor(Math.random() * max);
}

export class Instance implements Instance {
  namespace: string
  key: number
  log: List
  events: EventTarget
  runtime: any

  constructor(namespace: string, runtime?: any) {
    this.events = new EventTarget();

    this.namespace = namespace;
    this.key = getRandomInt(MAX_PEER_ID)
    this.runtime = runtime || {}

    this.log = List.new(this.key)
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

export async function create(namespace: string, opts?: any) {
  await initialize(opts?.resolver ? opts.resolver() : undefined);

  return new Instance(namespace, opts.runtime)
}
