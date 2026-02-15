import type { AbstractPowerSyncDatabase, PowerSyncBackendConnector, PowerSyncCredentials } from '@powersync/web';
import { SupabaseClient } from '@supabase/supabase-js';
export interface WebSupabaseConnectorConfig {
    powerSyncUrl: string;
    supabaseUrl: string;
    supabaseAnonKey: string;
}
export declare class WebSupabaseConnector implements PowerSyncBackendConnector {
    readonly powerSyncEndpoint: string;
    readonly client: SupabaseClient;
    private _token;
    constructor(config: WebSupabaseConnectorConfig);
    setToken(token: string): void;
    fetchCredentials(): Promise<PowerSyncCredentials | null>;
    uploadData(database: AbstractPowerSyncDatabase): Promise<void>;
}
//# sourceMappingURL=WebSupabaseConnector.d.ts.map