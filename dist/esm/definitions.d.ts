export type ColumnType = 'TEXT' | 'INTEGER' | 'REAL';
export interface SchemaColumn {
    name: string;
    type: ColumnType;
}
export interface SchemaIndex {
    name: string;
    columns: Array<{
        name: string;
        ascending?: boolean;
    }>;
}
export interface SchemaTable {
    name: string;
    columns: SchemaColumn[];
    indexes?: SchemaIndex[];
}
export interface PowerSyncConfig {
    powersyncUrl: string;
    supabaseUrl: string;
    supabaseAnonKey: string;
    schema: SchemaTable[];
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
    initialize(options: {
        config: PowerSyncConfig;
    }): Promise<void>;
    connect(): Promise<void>;
    disconnect(options?: {
        clearDatabase?: boolean;
    }): Promise<void>;
    setToken(options: {
        token: string;
    }): Promise<void>;
    execute(options: {
        sql: string;
        parameters?: any[];
    }): Promise<QueryResult>;
    getAll(options: {
        sql: string;
        parameters?: any[];
    }): Promise<QueryResult>;
    getOptional(options: {
        sql: string;
        parameters?: any[];
    }): Promise<{
        row: any | null;
    }>;
    watch(options: WatchOptions & {
        callbackId: string;
    }): Promise<{
        watchId: string;
    }>;
    unwatch(options: {
        watchId: string;
    }): Promise<void>;
    getSyncStatus(): Promise<SyncStatus>;
    getVersion(): Promise<{
        version: string;
    }>;
    writeTransaction(options: {
        sql: string[];
        parameters?: any[][];
    }): Promise<void>;
}
//# sourceMappingURL=definitions.d.ts.map