import * as Mycelial from '@mycelial/core';

(() => {
  const mycelial = Mycelial.create("namespace", 0);

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