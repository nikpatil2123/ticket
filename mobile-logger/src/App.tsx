import { useEffect } from 'react';
import './App.css';

function App() {
  useEffect(() => {
    // Optionally handle hardware back button or other capacitor plugins here if needed
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0, overflow: 'hidden' }}>
      <iframe
        src="https://aqr.paruluniversity.ac.in/v1/logs/view?app_token=secure-mobile-token"
        style={{ width: '100%', height: '100%', border: 'none' }}
        title="Logs Viewer"
        allowFullScreen
      />
    </div>
  );
}

export default App;
