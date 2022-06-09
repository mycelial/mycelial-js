import * as Mycelial from '@mycelial/core';
import * as Websocket from '@mycelial/websocket';

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

(() => {
  const mycelial = Mycelial.create("orders", getRandomInt(1000));
  const ws = Websocket.create(mycelial, {
    endpoint: 'wss://v0alpha-relay.fly.dev/v0alpha'
  });

  window.mycelial = mycelial;

  mycelial.events.addEventListener('update', (evt) => {
    console.log('update', evt);
  });

  mycelial.events.addEventListener('apply', (evt) => {
    console.log('apply', evt);
  });

  mycelial.commit([
    ["id", "attribute", "value"]
  ]);
})();