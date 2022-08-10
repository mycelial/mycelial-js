# mycelial-js

**This library is an alpha release and is in active development. Please expect breaking changes!**

> Build local-first, distributed, decentralized applications

What does `local-first, distributed, decentralized applications` mean?

Up until recently, you had two options when creating an application: 
- Local applications and
- Client/server applications

Each of these types of applications has its strengths (and weaknesses). For
example, local apps are typically fast because they don't need to talk to
servers over slow networks. However, if your app needs multiple users to
collaborate on common tasks, then a local application won't work for you; you'll
probably need to create a client/server application, right? Well, maybe, but now
a third option allows you to combine many of the best features from local and
client/server applications. It's a new, best-of-both-worlds paradigm.

## How it works

Imagine you wanted to build a basic contacts application that you can share with
the people in your household. 

Ideally, anyone in your house should be able to create, update and delete shared
contacts. You might be inclined to make this a typical client/server
application, but you're not restricted to client/server anymore because of a
recent innovation called Conflict-free Replicated Data Types (CRDTs).

### What are Conflict-free Replicated Data Types (CRDTs)

CRDTs are a collection of data types similar to other data types you're probably
familiar with, such as Arrays, Maps, and Sets.

The interesting thing about CRDTs is that any local changes you make to a CRDT
can be copied and merged into a replica on a different computer without any
conflicts. So, for example, in your contacts application, you could add, update 
and delete some of our shared contacts, and the changes you make are guaranteed
to replicate and merge with my contacts without conflict. Even if we both make
edits to the same contact, at the same time, there are mechanisms to synchronize
our changes in a conflict-free way.

### How to synchronize changes
CRDTs are transport agnostic, meaning you can use any method to send updates
from one replica to another. For example, you could use WebSockets, Bluetooth,
or even [sneakernet](https://en.wikipedia.org/wiki/Sneakernet).  However,
peer-to-peer options such as [WebRTC](https://webrtc.org/) are usually
preferred.

### Local-first

A local first application means everything your application needs to function is
co-located with the application; in other words, all the logic and data required
to run your application is on your computing device. This means your application
runs fast, and it works when offline, so for example, if your car gets a flat in
a rural area with no data coverage, you can still access your contacts and
call for help.

### Distributed

Your contacts application is distributed because it doesn't just live on one
device; it lives on every device in your household.

### Decentralized

Because there is no single source of truth, ie no central server, your contacts
application is decentralized.

### Learn more about CRDTs

You don't need to know exactly how CRDTs work to use them; you just need to know
how to use our APIs. But if you're interested in learning more about CRDTs, you
can check out [crdt.tech](https://crdt.tech/) or watch our introductory
[video](https://www.youtube.com/watch?v=gZP2VUmH05A&t).

## Quickstart

1. You can install our libraries from npm.

```bash
npm install @mycelial/web # or @mycelial/nodejs
npm install @mycelial/v0
npm install @mycelial/websocket
```

2. Import our modules.

```js
import * as Mycelial from '@mycelial/web'; // or '@mycelial/nodejs'
import { Store, Entity } from '@mycelial/v0';
import * as Websocket from '@mycelial/websocket';
```

3. Create an instance of our library by calling create and passing it a namespace.

```js
// NOTE: if you use a shared public relay, you'll want to use a unique namespace. 
// The namespace is used as a pub/sub topic, so ensuring it's unique will avoid
// namespace collisions.
const instance = Mycelial.create("mycelial/contacts")
```

4. Create and attach a network adapter

```js
const disconnect = Websocket.create(instance, {
  endpoint: 'wss://v0alpha-relay.fly.dev/v0alpha'
});
```
5. Create a store

```js
const store = new Store(instance);
```

6. Subscribe to changes.
  - You can use `#subscribe` method to listen for changes in the store:
```js
const unsubscribe = store.subscribe((store) => {
  console.log('something changed')
});
```

7. Create an entity

```js
const contact = Entity.from('<unique-contact-id>', {
  kind: 'contact',
  name: 'James M.',
  email: 'james@mycelial.com',
  phone: '5555555555',
  archived: false
});
```

8. Add the entity to the store. 

```js
store.add(contact);
```

9. Query the store.

```js
const contacts = store.filter(
  (entity) =>
    entity.properties.kind === 'contact' &&
    entity.properties.archived === false,
);

for (const contact of contacts) {
  console.log(contact.properties);
}
```

Complete Snippet

```js
import * as Mycelial from '@mycelial/web'; // or '@mycelial/nodejs'
import { Store, Entity } from '@mycelial/v0';
import * as Websocket from '@mycelial/websocket';

const instance = Mycelial.create("contacts")

const disconnect = Websocket.create(instance, {
  endpoint: 'wss://v0alpha-relay.fly.dev/v0alpha'
});

const store = new Store(instance);

const unsubscribe = store.subscribe((store) => {
  console.log('something changed')
});

const contact = Entity.from('<unique-contact-id>', {
  kind: 'contact',
  name: 'James M.',
  email: 'james@mycelial.com',
  phone: '5555555555',
  archived: false
});

store.add(contact);

const contacts = store.filter(
  (entity) =>
    entity.properties.kind === 'contact' &&
    entity.properties.archived === false,
);

for (const contact of contacts) {
  console.log(contact.properties);
}
```

## Platform API

```js
import * as Mycelial from '@mycelial/web'; // or '@mycelial/nodejs'
```

### const instance = Mycelial.create(namespace: string): Instance;

Create an instance of our core library. The namespace is used as a topic for
pub/sub.

## Websocket API

```js
import * as Websocket from '@mycelial/websocket';
const instance = Mycelial.create("contacts");

const disconnect = Websocket.create(instance, {
  endpoint: 'wss://v0alpha-relay.fly.dev/v0alpha'
});

disconnect();
```

### Websocket.create(instance: Instance, { endpoint: string }): () => void

Creates a WebSocket adapter that synchronizes the replica across two or more
nodes. The return value is a function that disconnects the websocket when
called.

## Store V0 API

```js
import { Entity, Store } from '@mycelial/v0';
```

### const store = new Store(instance: Instance): ;

Instantiate a new store, passing in the CRDT instance.

### Store.prototype.subscribe(callback: (store: Store) => void): () => void

Subscribe to all store changes, both remote and local. The return value is a
function that can be called to unsubscribe.

### Store.prototype.add(entity: Entity): Entity

Add the provided entity to its index, returns a clean instance back.

### Entity.from(id: string | number, object: { [key: string]: string | number }): Entity
Create entity from id and object
- `id` – a unique key of the entity
- `object` – actual data

### Entity.prototype.update(object: { [key: string]: string | number }): Entity
Update the entity, returns a new instance
- `object` – the data to update the entity with

## License
Apache 2.0
