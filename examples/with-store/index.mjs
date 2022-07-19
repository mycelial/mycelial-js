import * as Mycelial from '@mycelial/core';
import { Store } from '@mycelial/v0';
import path from 'path';
import fs from 'fs';
import url from 'url';

(async function() {
  const instance = await Mycelial.create("namespace", 0, {
    resolver: () => {
      const module = path.join(
        path.dirname(url.fileURLToPath(import.meta.url)),
        'node_modules/@mycelial/wasm/dist/index_bg.wasm'
      );

      return fs.readFileSync(module)
    }
  });

  const store = new Store(instance);

  const unsubscribe = store.subscribe((store) => {
    console.log('Entities', store.get('art'));
  });

  store.set("userid", {
    user: {
      name: 'username'
    },
    order: {
      total: 10
    }
  })

  console.log(store.get("userid"));
  
  store.set("42", {
    order: {
      id: "42",
    }
  })

  console.log(store.get("42"))

  store.set("24", {
    order: {
      itemId: "24",
    }
  })

  console.log(store.get("24"))
  
  setInterval(() => {
    console.log('The timer keeps the process running');
  }, 1000 * 60 * 60);

  setTimeout(() => {
    store.set("userid", {
      user: {
        email: "example@mycelial.com"
      }
    })
  }, 5000);
})()