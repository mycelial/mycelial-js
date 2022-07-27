import { resourceLimits } from "worker_threads";

class Entity {
  add() {}
  clear() {}
}

const log = [
  [1, "foo", "42"],
  // [1, ["bar", "baz"], "43"],
  [1, ["bar", "baz", "qux"], "43"],
]

const entity = new Entity()

for (const [e, a, v] of log) {
  if (Array.isArray(a)) {
    let child = entity;
    let c = 0;
    let len = a.length;

    for (const token of a) {
      ++c;

      console.log(child)

      if (c === len) {
        Object.defineProperty(child, token, {
          enumerable: true,
          configurable: true,
          get() {
            return v
          },
          set(v) {
            console.log('Set', a, v)
          }
        })
      } else {
        if (!child.hasOwnProperty(token)) {
          let v;
          Object.defineProperty(child, token, {
            value: {},
            writable: true,
            enumerable: true,
            configurable: true,
          })
        }
      }

      child = child[token];
    }
  } else {
    Object.defineProperty(entity, a, {
      value: v,
      writable: true,
      enumerable: true,
      configurable: true,
    })
  }
}


/*
console.log(entity)

entity.bar.baz.qux = 40
console.log(JSON.stringify(entity))

entity.bar = { foo: 1 }
console.log(JSON.stringify(entity))*/



function flattenObject(obj, parent, res = []){
  for(let key in obj){
      let propName = parent ? parent.concat([ key ]) : [ key ];
      if(typeof obj[key] == 'object'){
          flattenObject(obj[key], propName, res);
      } else {
          res.push([ propName, obj[key] ]);
      }
  }
  return res;
}



/* function flattenObject(source) {
  const result = []
  
  for (const [k, v] of Object.entries(current)) {
    while (true) {
      let current = source;
      let path = []
      if (typeof current === 'object') {
        for (const [key, value] of Object.entries(current)) {
          path.push(key)
          if (typeof value === 'object') {
            current = value
          } else {
            result.push([
              path,
              value
            ])
          }
          console.log('object', path, value)
        }
      } else {
        result.push([
          path,
          current
        ])

        break
      }
    }
  }

  return result;
}*/
/*
    for (const [key, value] of Object.entries(source)) {
      let child = value;
      let path = [];
  
      while (true) {
        if (typeof child === 'object') {
          for (const [k, v] of Object.entries(child)) {
            if (typeof v === 'object') {
              path.push(key)
              child = value;
              continue;
            }
          }
        } else {
          break;
        }
      }

        }/* else {
          path.push(key)
          result.push([
            path,
            value
          ])
          path = []

          return result;
        }
      }
    }

  for (const [key, value] of Object.entries(child)) {

    if (typeof value === 'object') {
      path.push(key)
      child = value;
      continue;
    } else {
      path.push(key)
      result.push([
        path,
        value
      ])
      path = []
    }


    /* let child = value;
    let path = [key];


    // const foo = []

    if (typeof child === 'object') {
      // let child;
      for (const [k, v] of Object.entries(child)) {
        if (typeof value === 'object') {
          child = v
          path.push(k)
        } else {
          result.push([
            path,
            v
          ])
        }
      }

      // let child = value;
      // let path = parent;

      // child = value[key]

      // continue;
    } else {
      result = result.concat([
        [path, value]
      ])
    }*/
  // }

  // return result
// }

console.log(flattenObject({
  foo: {
    bar: {
      baz: 42
    }
  },
  bar: {
    baz: {
      qux: {
        foo: 123
      }
    }
  }
}))