import type { PowerSyncDatabase } from '@powersync/web';
import {
  PowerSyncDatabase as PowerSyncDatabaseClass,
  Schema,
  Table,
  column,
  WASQLiteOpenFactory,
  WASQLiteVFS,
} from '@powersync/web';

import type { SchemaTable } from '../definitions';
import { WebSupabaseConnector } from './WebSupabaseConnector';

export interface WebPowerSyncManagerConfig {
  powersyncUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  dbFilename?: string;
}

const hasSharedWorker =
  typeof (globalThis as unknown as { SharedWorker?: unknown }).SharedWorker !== 'undefined';

/**
 * Build a PowerSync Schema from a definition array (mirrors Swift PowerSyncManager.buildSchema).
 */
function buildSchemaFromDefinition(definition: SchemaTable[]): Schema {
  const tables: Table[] = [];
  for (const tableDef of definition) {
    const columnMap: Record<string, typeof column.text | typeof column.integer | typeof column.real> = {};
    for (const col of tableDef.columns) {
      const t = (col.type || 'TEXT').toUpperCase();
      columnMap[col.name] =
        t === 'INTEGER' ? column.integer : t === 'REAL' ? column.real : column.text;
    }
    const indexOption: Record<string, string[]> = {};
    if (tableDef.indexes) {
      for (const idx of tableDef.indexes) {
        indexOption[idx.name] = idx.columns.map((c) => c.name);
      }
    }
    const table = new Table(
      columnMap,
      Object.keys(indexOption).length > 0 ? { indexes: indexOption } : undefined
    );
    tables.push(table.copyWithName(tableDef.name));
  }
  return new Schema(tables);
}

/**
 * Web implementation of PowerSyncManager. Owns connector, schema, and PowerSyncDatabase;
 * exposes the same API as the native plugin for use by web.ts.
 */
export class WebPowerSyncManager {
  readonly connector: WebSupabaseConnector;
  readonly schema: Schema;
  readonly db: PowerSyncDatabase;

  private watchCallbacks = new Map<string, AbortController>();
  private nextWatchId = 0;

  private constructor(
    connector: WebSupabaseConnector,
    schema: Schema,
    db: PowerSyncDatabase
  ) {
    this.connector = connector;
    this.schema = schema;
    this.db = db;
  }

  static create(
    config: WebPowerSyncManagerConfig,
    schemaDefinition: SchemaTable[]
  ): WebPowerSyncManager {
    const schema = buildSchemaFromDefinition(schemaDefinition);
    const connector = new WebSupabaseConnector({
      powerSyncUrl: config.powersyncUrl,
      supabaseUrl: config.supabaseUrl,
      supabaseAnonKey: config.supabaseAnonKey,
    });
    const db = new PowerSyncDatabaseClass({
      schema,
      database: new WASQLiteOpenFactory({
        dbFilename: config.dbFilename ?? 'powersync.db',
        vfs: WASQLiteVFS.OPFSCoopSyncVFS,
        flags: { enableMultiTabs: hasSharedWorker },
      }),
      flags: { enableMultiTabs: hasSharedWorker },
    });
    return new WebPowerSyncManager(connector, schema, db);
  }

  setToken(token: string): void {
    this.connector.setToken(token);
  }

  async connect(): Promise<void> {
    await this.db.connect(this.connector);
  }

  async disconnect(clearDatabase = false): Promise<void> {
    if (clearDatabase) {
      await this.db.disconnectAndClear();
    } else {
      await this.db.disconnect();
    }
  }

  async getVersion(): Promise<string> {
    try {
      return (this.db as { sdkVersion?: string }).sdkVersion ?? 'unknown';
    } catch {
      return 'unknown';
    }
  }

  async execute(sql: string, parameters: any[] = []): Promise<{ rows: any[] }> {
    const result = await this.db.execute(sql, parameters);
    return { rows: (result as { rows?: { _array?: any[] } }).rows?._array ?? [] };
  }

  async getAll(sql: string, parameters: any[] = []): Promise<{ rows: any[] }> {
    const rows = await this.db.getAll(sql, parameters);
    return { rows: rows ?? [] };
  }

  async getOptional(sql: string, parameters: any[] = []): Promise<{ row: any | null }> {
    const row = await this.db.getOptional(sql, parameters);
    return { row: row ?? null };
  }

  watch(
    sql: string,
    parameters: any[] = [],
    onResult: (watchId: string, rows: any[]) => void
  ): string {
    const watchId = `watch_${this.nextWatchId++}`;
    const controller = new AbortController();
    this.watchCallbacks.set(watchId, controller);

    this.db.watch(
      sql,
      parameters,
      {
        onResult: (result) => {
          const rows = (result as { rows?: { _array?: any[] } }).rows?._array ?? [];
          onResult(watchId, rows);
        },
        onError: (err) => {
          if ((err as Error).name !== 'AbortError') {
            console.error(`Watch ${watchId} error:`, err);
          }
        },
      },
      { signal: controller.signal }
    );

    return watchId;
  }

  unwatch(watchId: string): void {
    const controller = this.watchCallbacks.get(watchId);
    if (controller) {
      controller.abort();
      this.watchCallbacks.delete(watchId);
    }
  }

  async writeTransaction(sqlStatements: string[], parameters: any[][] = []): Promise<void> {
    await this.db.writeTransaction(async (tx) => {
      for (let i = 0; i < sqlStatements.length; i++) {
        const params = i < parameters.length ? parameters[i] : [];
        await tx.execute(sqlStatements[i], params);
      }
    });
  }

  getSyncStatus(): {
    connected: boolean;
    lastSyncedAt: string;
    hasSynced: boolean;
    uploading: boolean;
    downloading: boolean;
  } {
    const status = this.db.currentStatus;
    const dataFlow = status.dataFlowStatus ?? {};
    return {
      connected: status.connected,
      lastSyncedAt: status.lastSyncedAt?.toISOString() ?? '',
      hasSynced: status.hasSynced ?? false,
      uploading: dataFlow.uploading ?? false,
      downloading: dataFlow.downloading ?? false,
    };
  }
}
