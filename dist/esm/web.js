import { WebPlugin } from '@capacitor/core';
export class BlueCortexPowerSyncSupabaseWeb extends WebPlugin {
    async initialize(options) {
        console.log('PowerSync Web: initialize', options);
        throw this.unimplemented('Not implemented on web.');
    }
    async connect() {
        throw this.unimplemented('Not implemented on web.');
    }
    async disconnect(options) {
        console.log('PowerSync Web: disconnect', options);
        throw this.unimplemented('Not implemented on web.');
    }
    async setToken(_options) {
        console.log('PowerSync Web: setToken (no-op on web)');
    }
    async execute(options) {
        console.log('PowerSync Web: execute', options.sql);
        throw this.unimplemented('Not implemented on web.');
    }
    async getAll(options) {
        console.log('PowerSync Web: getAll', options.sql);
        throw this.unimplemented('Not implemented on web.');
    }
    async getOptional(options) {
        console.log('PowerSync Web: getOptional', options.sql);
        throw this.unimplemented('Not implemented on web.');
    }
    async watch(options) {
        console.log('PowerSync Web: watch', options.sql);
        throw this.unimplemented('Not implemented on web.');
    }
    async unwatch(options) {
        console.log('PowerSync Web: unwatch', options.watchId);
        throw this.unimplemented('Not implemented on web.');
    }
    async getSyncStatus() {
        throw this.unimplemented('Not implemented on web.');
    }
    async getVersion() {
        throw this.unimplemented('Not implemented on web.');
    }
    async writeTransaction(options) {
        console.log('PowerSync Web: writeTransaction', options.sql);
        throw this.unimplemented('Not implemented on web.');
    }
}
