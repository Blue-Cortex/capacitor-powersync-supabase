import { WebPlugin } from '@capacitor/core';
import type { PowerSyncPlugin, PowerSyncConfig, QueryResult, SyncStatus, WatchOptions } from './definitions';
export declare class BlueCortexPowerSyncSupabaseWeb extends WebPlugin implements PowerSyncPlugin {
    initialize(options: {
        config: PowerSyncConfig;
    }): Promise<void>;
    connect(): Promise<void>;
    disconnect(options?: {
        clearDatabase?: boolean;
    }): Promise<void>;
    setToken(_options: {
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
//# sourceMappingURL=web.d.ts.map