import * as Mycelial from '@mycelial/core';
import * as Websocket from '@mycelial/websocket';

(async () => {
  const mycelial = await Mycelial.create("orders");
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
    {
      $id: "id",
      attribute: "value"
    }
  ]);
})();