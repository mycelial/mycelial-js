import { Store, Entity } from '@mycelial/v0';
import * as Mycelial from '@mycelial/nodejs';

(async function() {
  const instance = await Mycelial.create("namespace");

  const store = new Store(instance);
  const unsubscribe = store.subscribe((store) => {
    console.log('Changed', store)
  })

  // Add a new project entity
  store.add(Entity.from("project-1", {
    kind: "project",
    project: {
      id: "project-1",
      name: "Mycelial"
    }
  }))

  unsubscribe();

  // Add a new todo item with a reference to the project created above
  store.add(Entity.from("item-0", {
    kind: "item",
    todo: {
      title: "A todo item",
      projectId: "project-1"
    }
  }))

  // Time to list the projects
  const projects = store.filter((e) => e.properties.kind === "project")

  for (const project of projects) {
    console.log(project.properties.project.name)

    // And here we list all the project items
    const items = store.filter((item) => {
      const props = item.properties;
      return (props.kind === "item") && (props.todo.projectId === project.id)
    })

    for (const { properties } of items) {
      console.log(properties.todo.title, properties)
    }
  }

  // We realized we missed the todo item id, let's add it
  let item = store.find((e) => e.id === "item-0")
  store.add(item.update({
    todo: {
      id: "a-todo-item",
      actually: {
        deeper: ["l", "i", "s", "t"]
      }
    }
  }))

  // Now we can see the todo entity has the todo id set

  for (const project of projects) {
    console.log(project.properties.project.name)

    const items = store.filter((item) => {
      const props = item.properties;
      return (props.kind === "item") && (props.todo.projectId === project.id)
    })

    for (const { properties } of items) {
      console.log(properties.todo.title, properties)
      console.log(properties.todo.actually)
    }
  }

  setInterval(() => {
    console.log('The timer keeps the process running');
  }, 1000 * 60 * 60);
})()