import { registerPlugin } from '@capacitor/core';

import type { PowerSyncPlugin } from './definitions';

const PowerSync = registerPlugin<PowerSyncPlugin>('BlueCortexPowerSyncSupabase', {
  web: () => import('./web').then(m => new m.BlueCortexPowerSyncSupabaseWeb()),
});

export * from './definitions';
export { PowerSync };
export { SupabaseConnector, type SupabaseConfig, type SupabaseConnectorListener } from './SupabaseConnector';
