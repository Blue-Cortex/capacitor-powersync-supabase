import { WebPlugin } from '@capacitor/core';

import type {
  PowerSyncPlugin,
  PowerSyncConfig,
  QueryResult,
  SyncStatus,
  WatchOptions,
} from './definitions';
import { WebPowerSyncManager } from './web/WebPowerSyncManager';

export class BlueCortexPowerSyncSupabaseWeb extends WebPlugin implements PowerSyncPlugin {
  private manager: WebPowerSyncManager | null = null;

  async initialize(options: { config: PowerSyncConfig }): Promise<void> {
    console.log('[PowerSync Web] initialize called', { hasSchema: !!options.config?.schema, schemaLength: options.config?.schema?.length });
    const config = options.config;
    if (!config.schema) {
      throw new Error('For web, config.schema is required');
    }
    this.manager = WebPowerSyncManager.create(
      {
        powersyncUrl: config.powersyncUrl,
        supabaseUrl: config.supabaseUrl,
        supabaseAnonKey: config.supabaseAnonKey,
        dbFilename: config.dbFilename,
      },
      config.schema
    );
    console.log('[PowerSync Web] manager created');
  }

  async connect(): Promise<void> {
    console.log('[PowerSync Web] connect called', { hasManager: !!this.manager });
    if (!this.manager) throw new Error('PowerSync not initialized. Call initialize() first.');
    await this.manager.connect();
    console.log('[PowerSync Web] connect done');
  }

  async disconnect(options?: { clearDatabase?: boolean }): Promise<void> {
    if (!this.manager) throw new Error('PowerSync not initialized');
    await this.manager.disconnect(options?.clearDatabase ?? false);
  }

  async setToken(options: { token: string }): Promise<void> {
    if (this.manager) this.manager.setToken(options.token);
  }

  async execute(options: { sql: string; parameters?: any[] }): Promise<QueryResult> {
    if (!this.manager) throw new Error('PowerSync not initialized');
    return this.manager.execute(options.sql, options.parameters ?? []);
  }

  async getAll(options: { sql: string; parameters?: any[] }): Promise<QueryResult> {
    console.log('[PowerSync Web] getAll called', { sqlLength: options.sql?.length, parameters: options.parameters });
    if (!this.manager) throw new Error('PowerSync not initialized');
    const result = await this.manager.getAll(options.sql, options.parameters ?? []);
    console.log('[PowerSync Web] getAll result', { rowsLength: result?.rows?.length, rows: result?.rows });
    return result;
  }

  async getOptional(options: { sql: string; parameters?: any[] }): Promise<{ row: any | null }> {
    if (!this.manager) throw new Error('PowerSync not initialized');
    return this.manager.getOptional(options.sql, options.parameters ?? []);
  }

  async watch(options: WatchOptions & { callbackId: string }): Promise<{ watchId: string }> {
    if (!this.manager) throw new Error('PowerSync not initialized');
    const watchId = this.manager.watch(
      options.sql,
      options.parameters ?? [],
      (id, rows) => {
        this.notifyListeners('watchResult', { watchId: id, rows });
      }
    );
    return { watchId };
  }

  async unwatch(options: { watchId: string }): Promise<void> {
    if (this.manager) this.manager.unwatch(options.watchId);
  }

  async getSyncStatus(): Promise<SyncStatus> {
    if (!this.manager) throw new Error('PowerSync not initialized');
    return this.manager.getSyncStatus();
  }

  async getVersion(): Promise<{ version: string }> {
    if (!this.manager) return { version: 'unknown' };
    const version = await this.manager.getVersion();
    return { version };
  }

  async writeTransaction(options: { sql: string[]; parameters?: any[][] }): Promise<void> {
    if (!this.manager) throw new Error('PowerSync not initialized');
    await this.manager.writeTransaction(options.sql, options.parameters ?? []);
  }
}
