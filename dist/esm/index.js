import { registerPlugin } from '@capacitor/core';
const PowerSync = registerPlugin('BlueCortexPowerSyncSupabase', {
    web: () => import('./web').then((m) => new m.BlueCortexPowerSyncSupabaseWeb()),
});
export * from './definitions';
export * from './models';
export { PowerSync };
export { SupabaseConnector } from './SupabaseConnector';
