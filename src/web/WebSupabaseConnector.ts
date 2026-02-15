import type { AbstractPowerSyncDatabase, PowerSyncBackendConnector, PowerSyncCredentials } from '@powersync/web';
import { CrudEntry, UpdateType } from '@powersync/web';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * TypeScript counterpart of the Swift SupabaseConnector used by PowerSyncManager.
 * Backend connector only: setToken, fetchCredentials (endpoint + token), uploadData (CRUD to Supabase).
 */
export interface WebSupabaseConnectorConfig {
  powerSyncUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
}

const FATAL_RESPONSE_CODES = [
  new RegExp('^22...$'),
  new RegExp('^23...$'),
  new RegExp('^42501$'),
];

function isFatalError(code: string): boolean {
  return FATAL_RESPONSE_CODES.some((regex) => regex.test(code));
}

export class WebSupabaseConnector implements PowerSyncBackendConnector {
  readonly powerSyncEndpoint: string;
  readonly client: SupabaseClient;
  private _token: string | null = null;

  constructor(config: WebSupabaseConnectorConfig) {
    this.powerSyncEndpoint = config.powerSyncUrl;
    this.client = createClient(config.supabaseUrl, config.supabaseAnonKey);
  }

  setToken(token: string): void {
    this._token = token;
  }

  async fetchCredentials(): Promise<PowerSyncCredentials | null> {
    if (!this._token) {
      throw new Error('No auth token set. Call setToken() after signing in from JS.');
    }
    return {
      endpoint: this.powerSyncEndpoint,
      token: this._token,
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();
    if (!transaction) return;

    let lastEntry: CrudEntry | null = null;
    try {
      for (const entry of transaction.crud) {
        lastEntry = entry;
        const table = this.client.from(entry.table);

        switch (entry.op) {
          case UpdateType.PUT: {
            const record = { ...(entry.opData ?? {}), id: entry.id };
            const { error } = await table.upsert(record);
            if (error) throw error;
            break;
          }
          case UpdateType.PATCH: {
            if (!entry.opData) continue;
            const { error } = await table.update(entry.opData).eq('id', entry.id);
            if (error) throw error;
            break;
          }
          case UpdateType.DELETE: {
            const { error } = await table.delete().eq('id', entry.id);
            if (error) throw error;
            break;
          }
        }
      }
      await transaction.complete();
    } catch (ex: unknown) {
      const err = ex as { code?: string };
      if (typeof err?.code === 'string' && isFatalError(err.code)) {
        console.error('Data upload error - discarding:', lastEntry, ex);
        await transaction.complete();
      } else {
        throw ex;
      }
    }
  }
}
