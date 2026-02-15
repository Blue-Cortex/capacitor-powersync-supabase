import { WebPlugin } from '@capacitor/core';
import { WebPowerSyncManager } from './web/WebPowerSyncManager';
export class BlueCortexPowerSyncSupabaseWeb extends WebPlugin {
    constructor() {
        super(...arguments);
        this.manager = null;
    }
    async initialize(options) {
        var _a, _b, _c;
        console.log('[PowerSync Web] initialize called', { hasSchema: !!((_a = options.config) === null || _a === void 0 ? void 0 : _a.schema), schemaLength: (_c = (_b = options.config) === null || _b === void 0 ? void 0 : _b.schema) === null || _c === void 0 ? void 0 : _c.length });
        const config = options.config;
        if (!config.schema) {
            throw new Error('For web, config.schema is required');
        }
        this.manager = WebPowerSyncManager.create({
            powersyncUrl: config.powersyncUrl,
            supabaseUrl: config.supabaseUrl,
            supabaseAnonKey: config.supabaseAnonKey,
            dbFilename: config.dbFilename,
        }, config.schema);
        console.log('[PowerSync Web] manager created');
    }
    async connect() {
        console.log('[PowerSync Web] connect called', { hasManager: !!this.manager });
        if (!this.manager)
            throw new Error('PowerSync not initialized. Call initialize() first.');
        await this.manager.connect();
        console.log('[PowerSync Web] connect done');
    }
    async disconnect(options) {
        var _a;
        if (!this.manager)
            throw new Error('PowerSync not initialized');
        await this.manager.disconnect((_a = options === null || options === void 0 ? void 0 : options.clearDatabase) !== null && _a !== void 0 ? _a : false);
    }
    async setToken(options) {
        if (this.manager)
            this.manager.setToken(options.token);
    }
    async execute(options) {
        var _a;
        if (!this.manager)
            throw new Error('PowerSync not initialized');
        return this.manager.execute(options.sql, (_a = options.parameters) !== null && _a !== void 0 ? _a : []);
    }
    async getAll(options) {
        var _a, _b, _c;
        console.log('[PowerSync Web] getAll called', { sqlLength: (_a = options.sql) === null || _a === void 0 ? void 0 : _a.length, parameters: options.parameters });
        if (!this.manager)
            throw new Error('PowerSync not initialized');
        const result = await this.manager.getAll(options.sql, (_b = options.parameters) !== null && _b !== void 0 ? _b : []);
        console.log('[PowerSync Web] getAll result', { rowsLength: (_c = result === null || result === void 0 ? void 0 : result.rows) === null || _c === void 0 ? void 0 : _c.length, rows: result === null || result === void 0 ? void 0 : result.rows });
        return result;
    }
    async getOptional(options) {
        var _a;
        if (!this.manager)
            throw new Error('PowerSync not initialized');
        return this.manager.getOptional(options.sql, (_a = options.parameters) !== null && _a !== void 0 ? _a : []);
    }
    async watch(options) {
        var _a;
        if (!this.manager)
            throw new Error('PowerSync not initialized');
        const watchId = this.manager.watch(options.sql, (_a = options.parameters) !== null && _a !== void 0 ? _a : [], (id, rows) => {
            this.notifyListeners('watchResult', { watchId: id, rows });
        });
        return { watchId };
    }
    async unwatch(options) {
        if (this.manager)
            this.manager.unwatch(options.watchId);
    }
    async getSyncStatus() {
        if (!this.manager)
            throw new Error('PowerSync not initialized');
        return this.manager.getSyncStatus();
    }
    async getVersion() {
        if (!this.manager)
            return { version: 'unknown' };
        const version = await this.manager.getVersion();
        return { version };
    }
    async writeTransaction(options) {
        var _a;
        if (!this.manager)
            throw new Error('PowerSync not initialized');
        await this.manager.writeTransaction(options.sql, (_a = options.parameters) !== null && _a !== void 0 ? _a : []);
    }
}
