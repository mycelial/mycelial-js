# mycelial-js

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
how to use our APIs. But if you're interested in learning more about CRDTS, you
can checkout [crdt.tech](https://crdt.tech/)] or watch our introductory
[video](https://www.youtube.com/watch?v=gZP2VUmH05A&t).

## Quickstart

1. You can install our libraries from npm.

```bash
npm install @mycelial/core
npm install @mycelial/websocket
```

2. Import our modules.

```js
import * as Mycelial from '@mycelial/core';
import * as Websocket from '@mycelial/websocket';
```

3. Create an instance of our library, called a Spore, by calling create and 
   passing it a namespace and a unique client id.

```js
const spore = Mycelial.create("contacts", 123)
```

4. Create and attach a network transport

```js
const ws = Websocket.create(spore, {
  endpoint: 'wss://v0alpha-relay.fly.dev/v0alpha'
});
```

5. Subscribe to changes. `update` events represent local changes, `apply` events
represent remote changes.

```js
spore.events.addEventListener('update', (evt) => {
  console.log('update', evt);
});
spore.events.addEventListener('apply', (evt) => {
  console.log('apply', evt);
});
```

6. Add a record to the spore. 

```js
spore.commit([
  {
    $id: 100,
    name: "James M.",
    phone: "5555555555",
    email: "james@mycelial.com"
  }
]);
```

Complete Snippet

```js
import * as Mycelial from '@mycelial/core';
import * as Websocket from '@mycelial/websocket';

const spore = Mycelial.create("contacts", 123);

const ws = Websocket.create(spore, {
  endpoint: 'wss://v0alpha-relay.fly.dev/v0alpha'
});

spore.events.addEventListener('update', (evt) => {
  console.log('update', evt);
});
spore.events.addEventListener('apply', (evt) => {
  console.log('apply', evt);
});

spore.commit([
  {
    $id: 100,
    name: "James M.",
    phone: "5555555555",
    email: "james@mycelial.com"
  }
]);
```

## Spore API

```js
import * as Mycelial from '@mycelial/core';
```

### const spore = Mycelial.create(namespace, key)

Creates a new Spore (composition of CRDTs).

- `namespace` (string) creates a namespace that acts as a topic when publishing
  changes.
- `key` (number) a unique replica id

### spore.events.addEventListener(event, handler)

Creates event handlers, providing reactivity to changes.

- `event` ('update' | 'apply') specifies which type of event to listen to.
  'update' events occur after appending values locally, 'apply' events occur
  when remote changes are synchronized.

### spore.commit([[string, string, string | number | boolean]]) 

Appends new records to the spore. 

```js
spore.commit([
  {
    $id: 100,
    name: "James M.",
    phone: "5555555555",
    email: "james@mycelial.com"
  }
]);
```

## Websocket API

```js
import * as Websocket from '@mycelial/websocket';
const spore = Mycelial.create("contacts", 123);

const ws = Websocket.create(spore, {
  endpoint: 'wss://v0alpha-relay.fly.dev/v0alpha'
});
```

### Websocket.create(spore, endpoint)

Creates a WebSocket adapter that synchronizes the replica across two or more
nodes.


## License
Apache 2.0