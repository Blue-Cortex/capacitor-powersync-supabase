import { useEffect, useState, useRef } from 'react';
import { PowerSync, SupabaseConnector } from 'ppal-powersync';
import { powerSyncSchema } from './lib/powerSyncSchema';
import './App.css';

function App() {
  const [initialized, setInitialized] = useState(false);
  const [status, setStatus] = useState('Not initialized');
  const [lists, setLists] = useState([]);
  const connectorRef = useRef(null);

  useEffect(() => {
    initializePowerSync();
  }, []);

  const initializePowerSync = async () => {
    try {
      setStatus('Initializing PowerSync...');

      // Create the shared SupabaseConnector for auth
      const connector = new SupabaseConnector({
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
        supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        powersyncUrl: import.meta.env.VITE_POWERSYNC_URL
      });
      connectorRef.current = connector;
      await connector.init();

      // Initialize PowerSync with schema from src/lib/powerSyncSchema.ts
      await PowerSync.initialize({
        config: {
          powersyncUrl: import.meta.env.VITE_POWERSYNC_URL,
          supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
          supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          schema: powerSyncSchema,
          dbFilename: 'powersync.db'
        }
      });

      setInitialized(true);
      setStatus('PowerSync initialized successfully');

      // Get version
      const { version } = await PowerSync.getVersion();
      console.log('PowerSync version:', version);

    } catch (error) {
      console.error('Failed to initialize PowerSync:', error);
      setStatus(`Error: ${error.message}`);
    }
  };

  const handleSignIn = async () => {
    try {
      setStatus('Signing in...');
      const connector = connectorRef.current;
      if (!connector) throw new Error('Connector not initialized');

      await connector.login('test@example.com', 'password123');

      const currentUser = connector.getCurrentUser();
      console.log('Signed in:', currentUser);
      setStatus('Signed in successfully');

      // Bridge token to native for PowerSync sync
      const token = connector.getAccessToken();
      if (token) {
        await PowerSync.setToken({ token });
      }

      // Connect to PowerSync
      await PowerSync.connect();
      setStatus('Connected to PowerSync');

      // Load data
      await loadLists();

    } catch (error) {
      console.error('Sign in failed:', error);
      setStatus(`Sign in error: ${error.message}`);
    }
  };

  const loadLists = async () => {
    try {
      const { rows } = await PowerSync.getAll({
        sql: 'SELECT * FROM lists',
        parameters: []
      });

      setLists(rows);
      console.log('Loaded lists:', rows);

    } catch (error) {
      console.error('Failed to load lists:', error);
    }
  };

  return (
    <div className="App">
      <h1>PowerSync Demo</h1>

      <div style={{ padding: '20px', background: '#f0f0f0', borderRadius: '8px', marginBottom: '20px' }}>
        <strong>Status:</strong> {status}
      </div>

      {initialized && (
        <div>
          <button onClick={handleSignIn} style={{ padding: '10px 20px', marginRight: '10px' }}>
            Sign In
          </button>
          <button onClick={loadLists} style={{ padding: '10px 20px' }}>
            Load Lists
          </button>
        </div>
      )}

      {lists.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h2>Lists ({lists.length})</h2>
          <ul>
            {lists.map((list) => (
              <li key={list.id}>
                <strong>{list.name}</strong>
                <br />
                <small>Created: {list.created_at}</small>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;
