import React from 'react';
import * as Mycelial from '@mycelial/react';
import * as Web from '@mycelial/web';

import logo from './logo.svg';
import './App.css';

function App() {
  return (
    <Mycelial.Provider runtime={Web} namespace='users'>
      <Content />
    </Mycelial.Provider>
  )
}

function Content() {
  const [state, setState] = React.useState<any>({});

  const { add } = Mycelial.useStore((store: Mycelial.Store) => {
    const hooman = store.find((e: Mycelial.Entity) => e.id === "hooman")
    setState({ hooman })
  }, [])

  const handleClick = () => {
    add(Mycelial.Entity.from("hooman", {
      human: {
        id: "foo",
        name: "Hooman Name",
        email: "hooman@example.com"
      }
    }))
  }

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <button onClick={handleClick}>Add</button>
        <code>
          <pre>{JSON.stringify(state.hooman?.properties, null, '    ')}</pre>
        </code>
      </header>
    </div>
  );
}

export default App;
