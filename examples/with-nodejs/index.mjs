import * as Mycelial from '@mycelial/nodejs';

(async function() {
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

  console.log(mycelial.log.to_vec())
})()