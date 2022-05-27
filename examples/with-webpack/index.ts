import * as Mycelial from '@mycelial/core';

(() => {
  const mycelial = Mycelial.create(0);

  mycelial.subscribe((instance, op, snapshot) => {
    console.log(instance, op, snapshot);
  });

  mycelial.commit([
    ["id", "attribute", "value"]
  ]);
})();