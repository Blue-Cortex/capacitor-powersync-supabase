/// <reference types="vite/client" />

import type { QueryOptions } from '@blue-cortex/capacitor-powersync-supabase';

declare module '@blue-cortex/capacitor-powersync-supabase' {
  interface PowerSyncPlugin {
    query<T = unknown>(options: QueryOptions): Promise<{ rows: T[] }>;
  }
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_POWERSYNC_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
