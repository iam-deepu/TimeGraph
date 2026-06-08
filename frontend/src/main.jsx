import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

// Import design tokens and base styles
import './css/variables.css';
import './css/base.css';
import './css/layout.css';
import './css/header.css';
import './css/daystrip.css';
import './css/timeline.css';
import './css/taskcard.css';
import './css/modal.css';
import './css/bottomnav.css';
import './css/notifications.css';
import './css/animations.css';
import './css/calendar-view.css';
import './css/contextmenu.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
