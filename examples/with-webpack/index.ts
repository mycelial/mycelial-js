import * as Mycelial from '@mycelial/web';

(async () => {
  const mycelial = await Mycelial.create("namespace");

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