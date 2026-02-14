import { useEffect, useState, useRef } from 'react';
import { PowerSync, SupabaseConnector } from '@blue-cortex/capacitor-powersync-supabase';
// import { powerSyncSchema } from './lib/powerSyncSchema';
import { powerSyncSchema } from './lib/ppalSchema';
import { KidsPage } from './pages/KidsPage';
import './App.css';

type Page = 'home' | 'kids';

interface User {
  id: string;
  email: string;
}

interface TodoList {
  id: string;
  name: string;
  created_at: string;
  owner_id: string;
  total_tasks: number;
  completed_tasks: number;
}

function App() {
  const [initialized, setInitialized] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('Not initialized');
  const [user, setUser] = useState<User | null>(null);
  const [lists, setLists] = useState<TodoList[]>([]);
  const [page, setPage] = useState<Page>('home');
  const listNameRef = useRef<HTMLInputElement>(null);
  const connectorRef = useRef<SupabaseConnector | null>(null);
  const authUnsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    initializePowerSync();
    return () => {
      authUnsubscribeRef.current?.();
      authUnsubscribeRef.current = null;
    };
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

      // Keep PowerSync token in sync when Supabase refreshes the JWT (e.g. before expiry)
      const {
        data: { subscription }
      } = connector.client.auth.onAuthStateChange((_event, session) => {
        if (session?.access_token) {
          PowerSync.setToken({ token: session.access_token }).catch((err) =>
            console.warn('PowerSync setToken after auth change failed:', err)
          );
        }
      });
      authUnsubscribeRef.current = subscription.unsubscribe;

      // Initialize PowerSync with schema from src/lib/powerSyncSchema.ts
      await PowerSync.initialize({
        config: {
          powersyncUrl: import.meta.env.VITE_POWERSYNC_URL,
          supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
          supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          schema: powerSyncSchema,
          dbFilename: 'parentpal.db'
        }
      });

      setInitialized(true);
      setStatus('PowerSync initialized successfully');

      // Check for existing session
      const currentUser = connector.getCurrentUser();
      if (currentUser) {
        setUser({
            id: currentUser.id,
            email: currentUser.email || ''
        });
        // Bridge token to native
        const token = connector.getAccessToken();
        if (token) {
          await PowerSync.setToken({ token });
        }
        setStatus('User already signed in');
      }

      // Get version
      console.log('PowerSync version:', (await PowerSync.getVersion()).version);

    } catch (error: any) {
      console.error('Failed to initialize PowerSync:', error);
      setStatus(`Error: ${error.message}`);
    }
  };

  const handleSignIn = async () => {
    try {
      setStatus('Signing in...');
      const connector = connectorRef.current;
      if (!connector) throw new Error('Connector not initialized');

      await connector.login('parentpal3@gmail.com', '#Test1234!');

      const currentUser = connector.getCurrentUser();
      if (currentUser) {
        setUser({
          id: currentUser.id,
          email: currentUser.email || ''
        });
      }
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

    } catch (error: any) {
      console.error('Sign in failed:', error);
      setStatus(`Sign in error: ${error.message}`);
    }
  };

  const handleSignOut = async () => {
    try {
      const connector = connectorRef.current;
      if (connector) {
        await connector.signOut();
      }
      await PowerSync.disconnect({ clearDatabase: true });
      setUser(null);
      setLists([]);
      setStatus('Signed out');
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const loadLists = async () => {
    try {
      const { rows } = await PowerSync.getAll({
        sql: `
          SELECT
            lists.*,
            COUNT(todos.id) AS total_tasks,
            SUM(
              CASE
                WHEN todos.completed = 1 THEN 1
                ELSE 0
              END
            ) as completed_tasks
          FROM
            lists
            LEFT JOIN todos ON lists.id = todos.list_id
          GROUP BY
            lists.id
          ORDER BY lists.created_at DESC;
        `,
        parameters: []
      });

      setLists(rows as TodoList[]);
      console.log('Loaded lists with counts:', rows.length);

    } catch (error) {
      console.error('Failed to load lists:', error);
    }
  };

  const createNewList = async () => {
    const name = listNameRef.current?.value;
    if (!name?.trim() || !user) return;

    try {
      await PowerSync.execute({
        sql: 'INSERT INTO lists (id, created_at, name, owner_id) VALUES (uuid(), datetime(), ?, ?)',
        parameters: [name, user.id]
      });
      if (listNameRef.current) {
        listNameRef.current.value = ''; // Clear input
      }
      loadLists(); // Refresh lists
    } catch (error) {
      console.error('Failed to create list:', error);
    }
  };

  if (user && page === 'kids') {
    return (
      <div className="App">
        <KidsPage userId={user.id} onBack={() => setPage('home')} />
      </div>
    );
  }

  return (
    <div className="App">
      <h1>PowerSync Demo</h1>

      <div style={{ padding: '20px', background: '#f0f0f0', borderRadius: '8px', marginBottom: '20px' }}>
        <strong>Status:</strong> {status} {user && `| Logged in as: ${user.email}`}
      </div>

      {initialized && (
        <div style={{ marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
          {!user ? (
            <button onClick={handleSignIn} style={{ padding: '10px 20px' }}>
              Sign In
            </button>
          ) : (
            <>
              <button onClick={handleSignOut} style={{ padding: '10px 20px', backgroundColor: '#ff4444' }}>
                Sign Out
              </button>
              <button onClick={loadLists} style={{ padding: '10px 20px' }}>
                Load Lists
              </button>
              <button onClick={() => setPage('kids')} style={{ padding: '10px 20px' }}>
                Kids
              </button>
            </>
          )}
        </div>
      )}

      {user && (
        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <input
            type="text"
            placeholder="New List Name"
            ref={listNameRef}
            style={{ padding: '8px' }}
          />
          <button onClick={createNewList}>Create List</button>
        </div>
      )}

      {lists.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h2>Lists ({lists.length})</h2>
          <ul>
            {lists.map((list) => (
              <li key={list.id} style={{ marginBottom: '10px', textAlign: 'left' }}>
                <strong>{list.name}</strong>
                <br />
                <small>Tasks: {list.completed_tasks || 0} / {list.total_tasks || 0}</small>
                <br />
                <small style={{ color: '#666' }}>Created: {new Date(list.created_at).toLocaleDateString()}</small>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;
