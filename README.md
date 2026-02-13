# Ppal PowerSync Plugin

Capacitor plugin for PowerSync with Supabase integration.

## Building the Plugin

To build the plugin locally:

```bash
bun install
bun run build
```

## Installation

```bash
bun install ppal-powersync
bunx cap sync
```

## Configuration

The plugin requires PowerSync and Supabase credentials, plus your database schema definition. All of this is passed from your React code:

```typescript
import { PowerSync, SchemaTable } from 'ppal-powersync';

// Define your database schema
const schema: SchemaTable[] = [
  {
    name: 'lists',
    columns: [
      { name: 'name', type: 'TEXT' },
      { name: 'created_at', type: 'TEXT' },
      { name: 'owner_id', type: 'TEXT' }
    ]
  },
  {
    name: 'todos',
    columns: [
      { name: 'list_id', type: 'TEXT' },
      { name: 'description', type: 'TEXT' },
      { name: 'completed', type: 'INTEGER' }
    ],
    indexes: [
      {
        name: 'list_id_idx',
        columns: [{ name: 'list_id', ascending: true }]
      }
    ]
  }
];

// Initialize with configuration from environment variables
await PowerSync.initialize({
  config: {
    powersyncUrl: import.meta.env.VITE_POWERSYNC_URL,
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    schema: schema, // Your schema definition
    dbFilename: 'powersync.db' // optional
  }
});
```

## Usage

### Authentication

```typescript
// Sign up
const { user } = await PowerSync.signUp({
  email: 'user@example.com',
  password: 'password123'
});

// Sign in
const { user } = await PowerSync.signIn({
  email: 'user@example.com',
  password: 'password123'
});

// Get current user
const { user } = await PowerSync.getCurrentUser();

// Sign out
await PowerSync.signOut();
```

### Connection

```typescript
// Connect to PowerSync
await PowerSync.connect();

// Disconnect
await PowerSync.disconnect({ clearDatabase: false });

// Get sync status
const status = await PowerSync.getSyncStatus();
console.log(status.connected, status.hasSynced);
```

### Database Operations

```typescript
// Execute a query
const result = await PowerSync.execute({
  sql: 'INSERT INTO lists (id, name, created_at, owner_id) VALUES (?, ?, ?, ?)',
  parameters: ['uuid-1', 'My List', new Date().toISOString(), userId]
});

// Get all results
const { rows } = await PowerSync.getAll({
  sql: 'SELECT * FROM lists',
  parameters: []
});

// Get single result
const { row } = await PowerSync.getOptional({
  sql: 'SELECT * FROM lists WHERE id = ?',
  parameters: ['uuid-1']
});

// Write transaction
await PowerSync.writeTransaction({
  sql: [
    'INSERT INTO lists (id, name) VALUES (?, ?)',
    'INSERT INTO todos (id, list_id, description) VALUES (?, ?, ?)'
  ],
  parameters: [
    ['list-1', 'Shopping'],
    ['todo-1', 'list-1', 'Buy milk']
  ]
});
```

### Watch Queries

```typescript
// Watch for changes
const { watchId } = await PowerSync.watch({
  sql: 'SELECT * FROM lists',
  parameters: [],
  callbackId: 'my-lists-watch'
});

// Listen for updates
PowerSync.addListener('watch_my-lists-watch', (data) => {
  console.log('Lists updated:', data.rows);
});

// Stop watching
await PowerSync.unwatch({ watchId });
```

## Platform Support

- **iOS**: Full implementation using PowerSync Swift SDK
- **Android**: Mocked implementation (returns success responses)
- **Web**: Not implemented (throws errors)

## API Reference

See [src/definitions.ts](src/definitions.ts) for complete TypeScript definitions.

## License

MIT
