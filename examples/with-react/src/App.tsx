import React from 'react';
import * as Mycelial from '@mycelial/react';

import logo from './logo.svg';
import './App.css';

function getRandomInt(max: number) {
  return Math.floor(Math.random() * max);
}

function App() {
  const [state, setState] = React.useState<any>({
    snapshot: [],
  });

  const { commit } = Mycelial.useInstance("orders", getRandomInt(1000), (snapshot: any) => {
    setState({ ...state, snapshot })
  })

  const handleClick = () => {
    commit([
      {
        $id: "100500",
        name: "Hooman Name",
        email: "hooman@example.com"
      },

      {
        $id: "100501",
        name: "Person Name",
        email: "person@example.com"
      }
    ])
  }

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <button onClick={handleClick}>Add</button>
        <code>
          <pre>{JSON.stringify(state.snapshot, null, '    ')}</pre>
        </code>
      </header>
    </div>
  );
}

export default App;
