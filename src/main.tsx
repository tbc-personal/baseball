import { render } from 'preact';
import './ui/theme.css';
import { App } from './ui/App';

const app = document.getElementById('app');
if (app) {
  render(<App />, app);
}
