import { useState, useEffect } from 'react';
import { Gallery } from './components/Gallery';
import { Editor } from './editor';
import './App.css';

function App() {
  const [route, setRoute] = useState(window.location.hash);

  useEffect(() => {
    const handleHashChange = () => setRoute(window.location.hash);
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Simple hash-based routing
  if (route === '#/editor') {
    return <Editor />;
  }

  return <Gallery />;
}

export default App;
