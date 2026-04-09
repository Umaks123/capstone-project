import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import Login from './components/Login';
import { CloudUpload } from 'lucide-react';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <div style={{ padding: '50px', fontFamily: 'Arial', textAlign: 'center' }}>
      <header>
        <CloudUpload size={48} color="#2563eb" />
        <h1>Secure Cloud App</h1>
      </header>
      
      <main style={{ marginTop: '30px' }}>
        {!isAuthenticated ? (
          <Login onLoginSuccess={() => setIsAuthenticated(true)} />
        ) : (
          <FileUpload />
        )}
      </main>
    </div>
  );
}
export default App;