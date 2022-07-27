import isEqual from 'lodash.isequal';

function asMessage(instance: any, kind: string, payload: string) {
  return JSON.stringify({
    version: 'v0alpha',
    kind: kind,
    topic: instance.namespace,
    identity: String(instance.key),
    payload: payload
  })
}

export function create(instance: any, opts: any) {
  const WebSocketClass = instance.runtime.getWebSocket()
  const socket = new WebSocketClass(opts.endpoint);

  const handleUpdate = (evt: any) => {
    if (socket.readyState !== 1) {
      return;
    }

    const ops = evt.detail;

    socket.send(asMessage(instance, 'diff', JSON.stringify(ops)))
  }

  instance.events.addEventListener('update', handleUpdate);

  socket.addEventListener('open', (evt: any) => {
    socket.send(asMessage(instance, 'sync', instance.log.vclock()));
  });

  const handleSync = (message: any) => {
    const currentState = JSON.parse(instance.log.vclock());
    const nextState = JSON.parse(message.payload);

    if (!isEqual(currentState, nextState)) {
      socket.send(asMessage(instance, 'sync', instance.log.vclock()))
    }

    const diff = JSON.parse(instance.log.diff(message.payload));

    if (diff.length > 0) {
      socket.send(asMessage(instance, 'diff', JSON.stringify(diff)))
    }
  }

  const handleDiff = (message: any) => {
    try {
      instance.log.apply(message.payload)
    } catch (e) {
      console.warn('Potential OutOfOrder exception happened, resyncing now')

      socket.send(asMessage(instance, 'sync', instance.log.vclock()));
    }
  }

  socket.onmessage = (evt: any) => {
    const message = JSON.parse(evt.data);

    switch (message.kind) {
      case 'sync':
        handleSync(message);
        break;
      case 'diff':
        handleDiff(message);
        break;
      default:
        console.warn('Unknown message kind, no handler implemented', message)
    }
  }

  socket.onclose = (evt: any) => {
    console.warn('Connection closed', evt)
  }

  socket.onerror = (evt: any) => {
    console.error('Error', evt)
  }

  return () => {
    instance.events.removeEventListener('update', handleUpdate);
    socket.close();
  }
}