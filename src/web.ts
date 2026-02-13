import { WebPlugin } from '@capacitor/core';

import type { 
  PowerSyncPlugin, 
  PowerSyncConfig, 
  QueryResult,
  SyncStatus,
  WatchOptions
} from './definitions';

export class BlueCortexPowerSyncSupabaseWeb extends WebPlugin implements PowerSyncPlugin {
  async initialize(options: { config: PowerSyncConfig }): Promise<void> {
    console.log('PowerSync Web: initialize', options);
    throw this.unimplemented('Not implemented on web.');
  }

  async connect(): Promise<void> {
    throw this.unimplemented('Not implemented on web.');
  }

  async disconnect(options?: { clearDatabase?: boolean }): Promise<void> {
    console.log('PowerSync Web: disconnect', options);
    throw this.unimplemented('Not implemented on web.');
  }

  async setToken(_options: { token: string }): Promise<void> {
    // No-op on web — token is managed in-process by SupabaseConnector
    console.log('PowerSync Web: setToken (no-op on web)');
  }

  async execute(options: { sql: string; parameters?: any[] }): Promise<QueryResult> {
    console.log('PowerSync Web: execute', options.sql);
    throw this.unimplemented('Not implemented on web.');
  }

  async getAll(options: { sql: string; parameters?: any[] }): Promise<QueryResult> {
    console.log('PowerSync Web: getAll', options.sql);
    throw this.unimplemented('Not implemented on web.');
  }

  async getOptional(options: { sql: string; parameters?: any[] }): Promise<{ row: any | null }> {
    console.log('PowerSync Web: getOptional', options.sql);
    throw this.unimplemented('Not implemented on web.');
  }

  async watch(options: WatchOptions & { callbackId: string }): Promise<{ watchId: string }> {
    console.log('PowerSync Web: watch', options.sql);
    throw this.unimplemented('Not implemented on web.');
  }

  async unwatch(options: { watchId: string }): Promise<void> {
    console.log('PowerSync Web: unwatch', options.watchId);
    throw this.unimplemented('Not implemented on web.');
  }

  async getSyncStatus(): Promise<SyncStatus> {
    throw this.unimplemented('Not implemented on web.');
  }

  async getVersion(): Promise<{ version: string }> {
    throw this.unimplemented('Not implemented on web.');
  }

  async writeTransaction(options: { sql: string[]; parameters?: any[][] }): Promise<void> {
    console.log('PowerSync Web: writeTransaction', options.sql);
    throw this.unimplemented('Not implemented on web.');
  }
}
