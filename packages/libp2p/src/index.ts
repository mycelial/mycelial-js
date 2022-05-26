function getTopicName(namespace: string, name: string) {
  return [namespace, name].join('/');
}

export function create(node: any, spore: any) {
  const topics = {
    states: getTopicName(spore.namespace, 'states'),
    ops: getTopicName(spore.namespace, 'ops'),
  }

  node.addEventListener('peer:discovery', (evt: any) => {
    // const peer = evt.detail
  })

  node.connectionManager.addEventListener('peer:connect', async (evt: any) => {
    const connection = evt.detail

    await node.pubsub.subscribe(topics.ops);
    await node.pubsub.subscribe(topics.states);

    setTimeout(() => {
      node.pubsub.publish(topics.states, new TextEncoder().encode(spore.log.vclock()));
    }, 100);
  })

  node.connectionManager.addEventListener('peer:disconnect', (evt: any) => {
    // const conn = evt.detail
  })

  node.pubsub.addEventListener('message', (message: any) => {
    const { topic, from, data } = message.detail;
    let ops: any;

    switch (topic) {
      case topics.states:
        const vclock = new TextDecoder().decode(data);
        ops = JSON.parse(spore.log.diff(vclock));
        if (ops.length > 0) {
          node.pubsub.publish(topics.ops, new TextEncoder().encode(JSON.stringify(ops)));
        }
        break;

      case topics.ops:
        ops = JSON.parse(new TextDecoder().decode(data));

        spore.join(ops);
        break;
      
      default:
        console.log('Error processing a message', topic);
    }
  });

  spore.subscribe((spore: any, op: any, snapshot: any) => {
    node.pubsub.publish(topics.ops, new TextEncoder().encode(JSON.stringify(op)));
  });
}