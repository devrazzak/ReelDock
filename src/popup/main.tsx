import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';

import './styles.css';

// The design system's dark variant follows the `.dark` class; the popup follows the OS setting.
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
document.documentElement.classList.toggle('dark', darkQuery.matches);

const root = document.getElementById('root');
if (!root) throw new Error('Popup root element is missing');

createRoot(root).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
