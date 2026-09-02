import { render } from 'preact';

function App() {
  return <h1>Baseball</h1>;
}

const app = document.getElementById('app');
if (app) {
  render(<App />, app);
}
