import { AbstractPowerSyncDatabase, BaseObserver, PowerSyncBackendConnector } from '@powersync/web';
import { Session, SupabaseClient } from '@supabase/supabase-js';
export type SupabaseConfig = {
    supabaseUrl: string;
    supabaseAnonKey: string;
    powersyncUrl: string;
};
export type SupabaseConnectorListener = {
    initialized: () => void;
    sessionStarted: (session: Session) => void;
};
export declare class SupabaseConnector extends BaseObserver<SupabaseConnectorListener> implements PowerSyncBackendConnector {
    readonly client: SupabaseClient;
    readonly config: SupabaseConfig;
    ready: boolean;
    currentSession: Session | null;
    constructor(config: SupabaseConfig);
    init(): Promise<void>;
    login(username: string, password: string): Promise<void>;
    signUp(email: string, password: string): Promise<void>;
    signOut(): Promise<void>;
    getCurrentUser(): import("@supabase/supabase-js").AuthUser | null;
    getAccessToken(): string | null;
    fetchCredentials(): Promise<{
        endpoint: string;
        token: string;
    }>;
    uploadData(database: AbstractPowerSyncDatabase): Promise<void>;
    updateSession(session: Session | null): void;
}
//# sourceMappingURL=SupabaseConnector.d.ts.map