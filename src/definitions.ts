export type ColumnType = 'TEXT' | 'INTEGER' | 'REAL';

export interface SchemaColumn {
  name: string;
  type: ColumnType;
}

export interface SchemaIndex {
  name: string;
  columns: Array<{ name: string; ascending?: boolean }>;
}

export interface SchemaTable {
  name: string;
  columns: SchemaColumn[];
  indexes?: SchemaIndex[];
}

export interface PowerSyncConfig {
  /**
   * PowerSync instance URL
   */
  powersyncUrl: string;

  /**
   * Supabase project URL
   */
  supabaseUrl: string;

  /**
   * Supabase anonymous key
   */
  supabaseAnonKey: string;

  /**
   * Database schema definition
   */
  schema: SchemaTable[];

  /**
   * Database filename (optional, defaults to "powersync.db")
   */
  dbFilename?: string;
}

export interface PowerSyncUser {
  id: string;
  email?: string;
  [key: string]: any;
}

export interface PowerSyncCredentials {
  endpoint: string;
  token: string;
  expiresAt?: string;
  userId?: string;
}

export interface SyncStatus {
  connected: boolean;
  lastSyncedAt?: string;
  hasSynced: boolean;
  uploading: boolean;
  downloading: boolean;
}

export interface QueryResult {
  rows: any[];
}

export interface WatchOptions {
  sql: string;
  parameters?: any[];
  throttleMs?: number;
}

export type WatchCallback = (result: QueryResult) => void;

export interface PowerSyncPlugin {
  /**
   * Initialize the PowerSync database with configuration
   */
  initialize(options: { config: PowerSyncConfig }): Promise<void>;

  /**
   * Connect to PowerSync and start syncing
   */
  connect(): Promise<void>;

  /**
   * Disconnect from PowerSync and optionally clear local data
   */
  disconnect(options?: { clearDatabase?: boolean }): Promise<void>;

  /**
   * Set the Supabase access token on the native layer.
   * Must be called after auth completes in JS so native PowerSync can sync.
   */
  setToken(options: { token: string }): Promise<void>;

  /**
   * Execute a SQL query
   */
  execute(options: { sql: string; parameters?: any[] }): Promise<QueryResult>;

  /**
   * Execute a SQL query and return all results
   */
  getAll(options: { sql: string; parameters?: any[] }): Promise<QueryResult>;

  /**
   * Execute a SQL query and return a single result
   */
  getOptional(options: { sql: string; parameters?: any[] }): Promise<{ row: any | null }>;

  /**
   * Watch a SQL query for changes
   * Returns a watchId that can be used to stop watching
   */
  watch(options: WatchOptions & { callbackId: string }): Promise<{ watchId: string }>;

  /**
   * Stop watching a query
   */
  unwatch(options: { watchId: string }): Promise<void>;

  /**
   * Get the current sync status
   */
  getSyncStatus(): Promise<SyncStatus>;

  /**
   * Get the PowerSync version
   */
  getVersion(): Promise<{ version: string }>;

  /**
   * Execute a write transaction
   */
  writeTransaction(options: { sql: string[]; parameters?: any[][] }): Promise<void>;
}
