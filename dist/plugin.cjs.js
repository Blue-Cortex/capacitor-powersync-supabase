'use strict';

var core = require('@capacitor/core');
var web$1 = require('@powersync/web');
var supabaseJs = require('@supabase/supabase-js');

const FATAL_RESPONSE_CODES$1 = [
    new RegExp('^22...$'),
    new RegExp('^23...$'),
    new RegExp('^42501$'),
];
class SupabaseConnector extends web$1.BaseObserver {
    constructor(config) {
        super();
        this.config = config;
        this.client = supabaseJs.createClient(this.config.supabaseUrl, this.config.supabaseAnonKey, {
            auth: {
                persistSession: true,
            },
        });
        this.currentSession = null;
        this.ready = false;
    }
    async init() {
        if (this.ready) {
            return;
        }
        const sessionResponse = await this.client.auth.getSession();
        this.updateSession(sessionResponse.data.session);
        this.ready = true;
        this.iterateListeners((cb) => { var _a; return (_a = cb.initialized) === null || _a === void 0 ? void 0 : _a.call(cb); });
    }
    async login(username, password) {
        const { data: { session }, error, } = await this.client.auth.signInWithPassword({
            email: username,
            password: password,
        });
        if (error) {
            throw error;
        }
        this.updateSession(session);
    }
    async signUp(email, password) {
        const { data: { session }, error, } = await this.client.auth.signUp({
            email,
            password,
        });
        if (error) {
            throw error;
        }
        this.updateSession(session);
    }
    async signOut() {
        const { error } = await this.client.auth.signOut();
        if (error) {
            throw error;
        }
        this.currentSession = null;
    }
    getCurrentUser() {
        var _a, _b;
        return (_b = (_a = this.currentSession) === null || _a === void 0 ? void 0 : _a.user) !== null && _b !== void 0 ? _b : null;
    }
    getAccessToken() {
        var _a, _b;
        return (_b = (_a = this.currentSession) === null || _a === void 0 ? void 0 : _a.access_token) !== null && _b !== void 0 ? _b : null;
    }
    async fetchCredentials() {
        var _a;
        const { data: { session }, error, } = await this.client.auth.getSession();
        if (!session || error) {
            throw new Error(`Could not fetch Supabase credentials: ${error}`);
        }
        console.debug('session expires at', session.expires_at);
        return {
            endpoint: this.config.powersyncUrl,
            token: (_a = session.access_token) !== null && _a !== void 0 ? _a : '',
        };
    }
    async uploadData(database) {
        const transaction = await database.getNextCrudTransaction();
        if (!transaction) {
            return;
        }
        let lastOp = null;
        try {
            for (const op of transaction.crud) {
                lastOp = op;
                const table = this.client.from(op.table);
                let result;
                switch (op.op) {
                    case web$1.UpdateType.PUT: {
                        const record = Object.assign(Object.assign({}, op.opData), { id: op.id });
                        result = await table.upsert(record);
                        break;
                    }
                    case web$1.UpdateType.PATCH: {
                        result = await table.update(op.opData).eq('id', op.id);
                        break;
                    }
                    case web$1.UpdateType.DELETE: {
                        result = await table.delete().eq('id', op.id);
                        break;
                    }
                }
                if (result.error) {
                    console.error(result.error);
                    result.error.message = `Could not update Supabase. Received error: ${result.error.message}`;
                    throw result.error;
                }
            }
            await transaction.complete();
        }
        catch (ex) {
            console.debug(ex);
            if (typeof ex.code == 'string' && FATAL_RESPONSE_CODES$1.some((regex) => regex.test(ex.code))) {
                console.error('Data upload error - discarding:', lastOp, ex);
                await transaction.complete();
            }
            else {
                throw ex;
            }
        }
    }
    updateSession(session) {
        this.currentSession = session;
        if (!session) {
            return;
        }
        this.iterateListeners((cb) => { var _a; return (_a = cb.sessionStarted) === null || _a === void 0 ? void 0 : _a.call(cb, session); });
    }
}

const PowerSync = core.registerPlugin('BlueCortexPowerSyncSupabase', {
    web: () => Promise.resolve().then(function () { return web; }).then((m) => new m.BlueCortexPowerSyncSupabaseWeb()),
});

const FATAL_RESPONSE_CODES = [
    new RegExp('^22...$'),
    new RegExp('^23...$'),
    new RegExp('^42501$'),
];
function isFatalError(code) {
    return FATAL_RESPONSE_CODES.some((regex) => regex.test(code));
}
class WebSupabaseConnector {
    constructor(config) {
        this._token = null;
        this.powerSyncEndpoint = config.powerSyncUrl;
        this.client = supabaseJs.createClient(config.supabaseUrl, config.supabaseAnonKey);
    }
    setToken(token) {
        this._token = token;
    }
    async fetchCredentials() {
        if (!this._token) {
            throw new Error('No auth token set. Call setToken() after signing in from JS.');
        }
        return {
            endpoint: this.powerSyncEndpoint,
            token: this._token,
        };
    }
    async uploadData(database) {
        var _a;
        const transaction = await database.getNextCrudTransaction();
        if (!transaction)
            return;
        let lastEntry = null;
        try {
            for (const entry of transaction.crud) {
                lastEntry = entry;
                const table = this.client.from(entry.table);
                switch (entry.op) {
                    case web$1.UpdateType.PUT: {
                        const record = Object.assign(Object.assign({}, ((_a = entry.opData) !== null && _a !== void 0 ? _a : {})), { id: entry.id });
                        const { error } = await table.upsert(record);
                        if (error)
                            throw error;
                        break;
                    }
                    case web$1.UpdateType.PATCH: {
                        if (!entry.opData)
                            continue;
                        const { error } = await table.update(entry.opData).eq('id', entry.id);
                        if (error)
                            throw error;
                        break;
                    }
                    case web$1.UpdateType.DELETE: {
                        const { error } = await table.delete().eq('id', entry.id);
                        if (error)
                            throw error;
                        break;
                    }
                }
            }
            await transaction.complete();
        }
        catch (ex) {
            const err = ex;
            if (typeof (err === null || err === void 0 ? void 0 : err.code) === 'string' && isFatalError(err.code)) {
                console.error('Data upload error - discarding:', lastEntry, ex);
                await transaction.complete();
            }
            else {
                throw ex;
            }
        }
    }
}

const hasSharedWorker = typeof globalThis.SharedWorker !== 'undefined';
function buildSchemaFromDefinition(definition) {
    const tables = [];
    for (const tableDef of definition) {
        const columnMap = {};
        for (const col of tableDef.columns) {
            const t = (col.type || 'TEXT').toUpperCase();
            columnMap[col.name] =
                t === 'INTEGER' ? web$1.column.integer : t === 'REAL' ? web$1.column.real : web$1.column.text;
        }
        const indexOption = {};
        if (tableDef.indexes) {
            for (const idx of tableDef.indexes) {
                indexOption[idx.name] = idx.columns.map((c) => c.name);
            }
        }
        const table = new web$1.Table(columnMap, Object.keys(indexOption).length > 0 ? { indexes: indexOption } : undefined);
        tables.push(table.copyWithName(tableDef.name));
    }
    return new web$1.Schema(tables);
}
class WebPowerSyncManager {
    constructor(connector, schema, db) {
        this.watchCallbacks = new Map();
        this.nextWatchId = 0;
        this.connector = connector;
        this.schema = schema;
        this.db = db;
    }
    static create(config, schemaDefinition) {
        var _a;
        const schema = buildSchemaFromDefinition(schemaDefinition);
        const connector = new WebSupabaseConnector({
            powerSyncUrl: config.powersyncUrl,
            supabaseUrl: config.supabaseUrl,
            supabaseAnonKey: config.supabaseAnonKey,
        });
        const db = new web$1.PowerSyncDatabase({
            schema,
            database: new web$1.WASQLiteOpenFactory({
                dbFilename: (_a = config.dbFilename) !== null && _a !== void 0 ? _a : 'powersync.db',
                vfs: web$1.WASQLiteVFS.OPFSCoopSyncVFS,
                flags: { enableMultiTabs: hasSharedWorker },
            }),
            flags: { enableMultiTabs: hasSharedWorker },
        });
        return new WebPowerSyncManager(connector, schema, db);
    }
    setToken(token) {
        this.connector.setToken(token);
    }
    async connect() {
        await this.db.connect(this.connector);
    }
    async disconnect(clearDatabase = false) {
        if (clearDatabase) {
            await this.db.disconnectAndClear();
        }
        else {
            await this.db.disconnect();
        }
    }
    async getVersion() {
        var _a;
        try {
            return (_a = this.db.sdkVersion) !== null && _a !== void 0 ? _a : 'unknown';
        }
        catch (_b) {
            return 'unknown';
        }
    }
    async execute(sql, parameters = []) {
        var _a, _b;
        console.log('[WebPowerSyncManager] execute start', { sqlLength: sql === null || sql === void 0 ? void 0 : sql.length });
        const result = await this.db.writeTransaction(async (tx) => {
            return await tx.execute(sql, parameters);
        });
        const rows = (_b = (_a = result.rows) === null || _a === void 0 ? void 0 : _a._array) !== null && _b !== void 0 ? _b : [];
        console.log('[WebPowerSyncManager] execute done', { rowsLength: rows.length });
        return { rows };
    }
    async getAll(sql, parameters = []) {
        console.log('[WebPowerSyncManager] getAll start', { sqlLength: sql === null || sql === void 0 ? void 0 : sql.length });
        const rows = await this.db.readTransaction(async (tx) => {
            var _a, _b;
            const res = await tx.execute(sql, parameters);
            return (_b = (_a = res.rows) === null || _a === void 0 ? void 0 : _a._array) !== null && _b !== void 0 ? _b : [];
        });
        console.log('[WebPowerSyncManager] getAll done', { rowsLength: rows === null || rows === void 0 ? void 0 : rows.length });
        return { rows: rows !== null && rows !== void 0 ? rows : [] };
    }
    async getOptional(sql, parameters = []) {
        console.log('[WebPowerSyncManager] getOptional start', { sqlLength: sql === null || sql === void 0 ? void 0 : sql.length });
        const row = await this.db.readTransaction(async (tx) => {
            var _a;
            const res = await tx.execute(sql, parameters);
            const arr = (_a = res.rows) === null || _a === void 0 ? void 0 : _a._array;
            return (arr === null || arr === void 0 ? void 0 : arr.length) ? arr[0] : null;
        });
        console.log('[WebPowerSyncManager] getOptional done', { hasRow: row != null });
        return { row: row !== null && row !== void 0 ? row : null };
    }
    watch(sql, parameters = [], onResult) {
        const watchId = `watch_${this.nextWatchId++}`;
        const controller = new AbortController();
        this.watchCallbacks.set(watchId, controller);
        this.db.watch(sql, parameters, {
            onResult: (result) => {
                var _a, _b;
                const rows = (_b = (_a = result.rows) === null || _a === void 0 ? void 0 : _a._array) !== null && _b !== void 0 ? _b : [];
                onResult(watchId, rows);
            },
            onError: (err) => {
                if (err.name !== 'AbortError') {
                    console.error(`Watch ${watchId} error:`, err);
                }
            },
        }, { signal: controller.signal });
        return watchId;
    }
    unwatch(watchId) {
        const controller = this.watchCallbacks.get(watchId);
        if (controller) {
            controller.abort();
            this.watchCallbacks.delete(watchId);
        }
    }
    async writeTransaction(sqlStatements, parameters = []) {
        await this.db.writeTransaction(async (tx) => {
            for (let i = 0; i < sqlStatements.length; i++) {
                const params = i < parameters.length ? parameters[i] : [];
                await tx.execute(sqlStatements[i], params);
            }
        });
    }
    getSyncStatus() {
        var _a, _b, _c, _d, _e, _f;
        const status = this.db.currentStatus;
        const dataFlow = (_a = status.dataFlowStatus) !== null && _a !== void 0 ? _a : {};
        return {
            connected: status.connected,
            lastSyncedAt: (_c = (_b = status.lastSyncedAt) === null || _b === void 0 ? void 0 : _b.toISOString()) !== null && _c !== void 0 ? _c : '',
            hasSynced: (_d = status.hasSynced) !== null && _d !== void 0 ? _d : false,
            uploading: (_e = dataFlow.uploading) !== null && _e !== void 0 ? _e : false,
            downloading: (_f = dataFlow.downloading) !== null && _f !== void 0 ? _f : false,
        };
    }
}

class BlueCortexPowerSyncSupabaseWeb extends core.WebPlugin {
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

var web = /*#__PURE__*/Object.freeze({
    __proto__: null,
    BlueCortexPowerSyncSupabaseWeb: BlueCortexPowerSyncSupabaseWeb
});

exports.PowerSync = PowerSync;
exports.SupabaseConnector = SupabaseConnector;
//# sourceMappingURL=plugin.cjs.js.map
