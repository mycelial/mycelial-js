import { createCustomEvent } from './events.mjs';
import type { Instance } from '@mycelial/core';

type Id = string | number;

class QuerySet<T> {
  dataset: Array<T>;

  constructor(dataset: Array<T>) {
    this.dataset = dataset
  }

  map(fn: (e: T) => T): QuerySet<T> {
    return new QuerySet(this.dataset.map(fn))
  }

  filter(fn: (e: T) => T): QuerySet<T> {
    return new QuerySet(this.dataset.filter(fn))
  }

  reduce<A>(fn: (acc: A, e: T) => A, acc: A) {
    return this.dataset.reduce(fn, acc)
  }

  *[Symbol.iterator]() {
    for (const e of this.dataset) {
      yield e
    }
  }
}

class Index {
  data: Map<Id, Entity>;

  constructor() {
    this.data = new Map<Id, Entity>()
  }

  add(entity: Entity): Entity {
    this.data.set(entity.id, entity)

    return entity;
  }

  get(key: Id): Entity | undefined {
    return this.data.get(key)
  }

  map(fn: (e: Entity) => Entity): Array<Entity> {
    return Array.from(this).map(fn)
  }

  filter(fn: (e: Entity) => Boolean): Array<Entity> {
    return Array.from(this).filter(fn)
  }

  find(fn: (e: Entity) => Boolean) {
    return Array.from(this).find(fn)
  }

  reduce<A>(fn: (acc: A, e: Entity) => A, acc: A) {
    return Array.from(this).reduce(fn, acc)
  }

  *[Symbol.iterator]() {
    for (const e of this.data.values()) {
      yield e
    }
  }
}

class Property {
  data: [Id, any, any];

  constructor(data: [Id, any, any]) {
    this.data = data
  }

  get id() {
    return this.data[0]
  }

  get attribute() {
    return this.data[1]
  }

  get value() {
    return this.data[2]
  }

  get namespace() {
    return this.attribute[0]
  }

  get key() {
    return this.attribute[1]
  }

  get path() {
    return this.attribute.join('/')
  }

  get hash() {
    return [this.id, this.attribute[0], this.attribute[1], this.value].join('/')
  }

  *[Symbol.iterator]() {
    for (const c of this.data) {
      yield c
    }
  }
}

function flattenObject(eid: Id, obj: any, parent?: string[], res: Property[] = []){
  for(let key in obj){
    let propName = parent ? parent.concat([ key ]) : [ key ];
    if(typeof obj[key] == 'object' && !Array.isArray(obj[key])){
      res = flattenObject(eid, obj[key], propName, res);
    } else {
      res = res.concat([
        new Property([ eid, propName, obj[key] ])
      ]);
    }
  }
  return res;
}

export class Entity {
  id: Id;
  props: Map<string, Property>;
  changeset: Property[];
  cache: Object;

  constructor(id: Id, props?: Map<string, Property>, changeset?: Property[]) {
    this.id = id
    this.props = props || new Map()
    this.changeset = changeset || []
    this.cache = {}
  }

  static from(id: Id, obj: any) {
    return (new Entity(id)).update(obj)
  }

  add(prop: Property): Entity {
    const props = new Map(this.props)
    props.set(prop.path, prop)

    return new Entity(this.id, props, this.changeset)
  }

  update(traits: Object): Entity {
    const log = flattenObject(this.id, traits)
    const changeset = [ ...this.changeset ]

    const props = new Map(this.props)

    for (const prop of log) {
      if (props.has(prop.path)) {
        const current = props.get(prop.path)

        if (current?.hash !== prop.hash) {
          props.set(prop.path, prop)
          changeset.push(prop)
        }
      } else {
        props.set(prop.path, prop)
        changeset.push(prop)
      }
    }

    return new Entity(this.id, props, changeset)
  }

  clear(): Entity {
    return new Entity(this.id, this.props)
  }

  get properties() {
    if (Object.isFrozen(this.cache)) {
      return this.cache
    }

    const props: any = {};
    for (const prop of this.props.values()) {
      if (Array.isArray(prop.attribute)) {
        let target = props;
        let idx = 0;

        for (const token of prop.attribute) {
          ++idx;

          if (prop.attribute.length === idx) {
            target[token] = prop.value;
          } else {
            target[token] = target[token] || {}
            target = target[token]
          }
        }
      } else {
        props[prop.attribute] = prop.value
      }
    }

    const nextProps = Object.assign(this.cache, props)

    Object.freeze(this.cache)

    return nextProps
  }
}

function withIndex<T>(log: Array<[Id, any, any]>, index: T) {
  return log.reduce<T>((index: any, record) => {
    const prop = new Property(record)
    const entity = index.get(prop.id) || new Entity(prop.id);

    index.add(entity.add(prop));

    return index;
  }, index)
}

export class Store {
  instance: Instance;
  index: Index;
  events: EventTarget;

  constructor(instance: Instance) {
    this.index = new Index();
    this.events = new EventTarget();
    this.instance = instance;
    this.instance.events.addEventListener('update', this.handleChange);
    this.instance.events.addEventListener('apply', this.handleChange);
  }

  handleChange = (evt: any) => {
    this.index = withIndex(this.instance.log.to_vec(), this.index)

    this.events.dispatchEvent(createCustomEvent('change', { detail: {} }))
  }

  add(entity: Entity) {
    this.instance.log.aggregateOps(true)

    for (const property of entity.changeset) {
      this.instance.log.append(Array.from(property))
    }

    this.instance.log.aggregateOps(false)

    return this.index.add(entity.clear())
  }

  map(fn: (e: Entity) => Entity) {
    return new QuerySet(this.index.map(fn));
  }

  filter(fn: (e: Entity) => Boolean) {
    return new QuerySet(this.index.filter(fn));
  }

  find(fn: (e: Entity) => Boolean) {
    return this.index.find(fn);
  }

  reduce<A>(fn: (a: A, e: Entity) => A, acc: A) {
    return this.index.reduce(fn, acc);
  }

  *[Symbol.iterator]() {
    for (const e of this.index) {
      yield e
    }
  }
}