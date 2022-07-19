
import { createCustomEvent } from './events.mjs';
import type { Instance } from '@mycelial/core';

function getEntities(entities: any, log: Array<any>) {
  return log.reduce((acc, [e, a, v]) => {
    const [namespace, trait] = a.split('/')

    const ents = acc.entities;

    if (!ents[e]) {
      ents[e] = {};
    }

    const entity = ents[e];

    if (!entity[namespace]) {
      entity[namespace] = {}
    }

    const ns = entity[namespace]
    ns[trait] = v

    return acc;
  }, {
    entities
  });
}

export class Store {
  instance;
  entities: any;
  events: EventTarget;

  constructor(instance: Instance) {
    this.entities = {};
    this.instance = instance;
    this.instance.events.addEventListener('update', this.handleChange);
    this.instance.events.addEventListener('apply', this.handleChange);

    this.events = new EventTarget();
  }

  handleChange = (evt: any) => {
    const idx = getEntities(this.entities, this.instance.log.to_vec());

    this.entities = idx.entities;

    this.events.dispatchEvent(createCustomEvent('change', { }));
  }

  get(key: string) {
    return (this.entities || {})[key]
  }

  subscribe(callback: (store: Store) => void){
    const handler = () => callback(this);

    this.events.addEventListener('change', handler);

    return () => {
      this.events.removeEventListener('change', handler);
    }
  }

  set(key: string, data: any) {
    this.instance.log.aggregateOps(true);

    for (const namespace of Object.keys(data)) {
      const traits = data[namespace];

      for (const trait of Object.keys(traits)) {
        const value = traits[trait];

        if (!this.entities[key]) {
          this.entities[key] = {}
        }

        const entity = this.entities[key];

        if (!entity[namespace]) {
          entity[namespace] = {};
        }

        const ns = entity[namespace];
        ns[trait] = value;

        this.entities[key] = entity;

        this.instance.log.append([
          key,
          [namespace, trait].join('/'),
          value
        ])
      }
    }

    this.instance.log.aggregateOps(false);
  }
}