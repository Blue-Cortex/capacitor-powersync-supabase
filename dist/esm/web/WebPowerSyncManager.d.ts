import type { PowerSyncDatabase } from '@powersync/web';
import { Schema } from '@powersync/web';
import type { SchemaTable } from '../definitions';
import { WebSupabaseConnector } from './WebSupabaseConnector';
export interface WebPowerSyncManagerConfig {
    powersyncUrl: string;
    supabaseUrl: string;
    supabaseAnonKey: string;
    dbFilename?: string;
}
export declare class WebPowerSyncManager {
    readonly connector: WebSupabaseConnector;
    readonly schema: Schema;
    readonly db: PowerSyncDatabase;
    private watchCallbacks;
    private nextWatchId;
    private constructor();
    static create(config: WebPowerSyncManagerConfig, schemaDefinition: SchemaTable[]): WebPowerSyncManager;
    setToken(token: string): void;
    connect(): Promise<void>;
    disconnect(clearDatabase?: boolean): Promise<void>;
    getVersion(): Promise<string>;
    execute(sql: string, parameters?: any[]): Promise<{
        rows: any[];
    }>;
    getAll(sql: string, parameters?: any[]): Promise<{
        rows: any[];
    }>;
    getOptional(sql: string, parameters?: any[]): Promise<{
        row: any | null;
    }>;
    watch(sql: string, parameters: any[] | undefined, onResult: (watchId: string, rows: any[]) => void): string;
    unwatch(watchId: string): void;
    writeTransaction(sqlStatements: string[], parameters?: any[][]): Promise<void>;
    getSyncStatus(): {
        connected: boolean;
        lastSyncedAt: string;
        hasSynced: boolean;
        uploading: boolean;
        downloading: boolean;
    };
}
//# sourceMappingURL=WebPowerSyncManager.d.ts.map