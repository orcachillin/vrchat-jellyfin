import React from 'react';
import { createRoot } from 'react-dom/client';
import { HeroUIProvider } from '@heroui/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles.css';

const container = document.getElementById('root');
const root = createRoot(container!);

document.documentElement.classList.add('dark');

root.render(
  <React.StrictMode>
    <HeroUIProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </HeroUIProvider>
  </React.StrictMode>
);
