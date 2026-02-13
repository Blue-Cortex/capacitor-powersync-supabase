import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.js'

const root = createRoot(document.getElementById('app')!);
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
