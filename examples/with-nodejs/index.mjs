import * as Mycelial from '@mycelial/core';
import path from 'path';
import fs from 'fs';
import url from 'url';

(async function() {
  const mycelial = await Mycelial.create("namespace", 0, {
    resolver: () => {
      const module = path.join(
        path.dirname(url.fileURLToPath(import.meta.url)),
        'node_modules/@mycelial/wasm/dist/web/index_bg.wasm'
      );

      return fs.readFileSync(module)
    }
  });

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