import React from 'react';
import * as Mycelial from '@mycelial/core';
import * as Websocket from '@mycelial/websocket';

import logo from './logo.svg';
import './App.css';


function getRandomInt(max: number) {
  return Math.floor(Math.random() * max);
}

function App() {
  const [state, setState] = React.useState([]);

  React.useEffect(() => {
    const instance = Mycelial.create("orders", getRandomInt(1000));
    instance.commit([ ["a", "b", "c"] ])

    const ws = Websocket.create(instance, {
      endpoint: 'wss://v0alpha-relay.fly.dev/v0alpha'
    });

    instance.events.addEventListener('update', (evt) => {
      console.log('update', evt);

      setState(instance.log.to_vec());
    });

    instance.events.addEventListener('apply', (evt) => {
      console.log('apply', evt);

      setState(instance.log.to_vec());
    });
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <code>
          <pre>{JSON.stringify(state, null, '    ')}</pre>
        </code>
      </header>
    </div>
  );
}

export default App;
