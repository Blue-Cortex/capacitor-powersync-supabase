import { PowerSyncDatabase as PowerSyncDatabaseClass, Schema, Table, column, WASQLiteOpenFactory, WASQLiteVFS, } from '@powersync/web';
import { WebSupabaseConnector } from './WebSupabaseConnector';
const hasSharedWorker = typeof globalThis.SharedWorker !== 'undefined';
function buildSchemaFromDefinition(definition) {
    const tables = [];
    for (const tableDef of definition) {
        const columnMap = {};
        for (const col of tableDef.columns) {
            const t = (col.type || 'TEXT').toUpperCase();
            columnMap[col.name] =
                t === 'INTEGER' ? column.integer : t === 'REAL' ? column.real : column.text;
        }
        const indexOption = {};
        if (tableDef.indexes) {
            for (const idx of tableDef.indexes) {
                indexOption[idx.name] = idx.columns.map((c) => c.name);
            }
        }
        const table = new Table(columnMap, Object.keys(indexOption).length > 0 ? { indexes: indexOption } : undefined);
        tables.push(table.copyWithName(tableDef.name));
    }
    return new Schema(tables);
}
export class WebPowerSyncManager {
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
        const db = new PowerSyncDatabaseClass({
            schema,
            database: new WASQLiteOpenFactory({
                dbFilename: (_a = config.dbFilename) !== null && _a !== void 0 ? _a : 'powersync.db',
                vfs: WASQLiteVFS.OPFSCoopSyncVFS,
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
        const result = await this.db.execute(sql, parameters);
        return { rows: (_b = (_a = result.rows) === null || _a === void 0 ? void 0 : _a._array) !== null && _b !== void 0 ? _b : [] };
    }
    async getAll(sql, parameters = []) {
        const rows = await this.db.getAll(sql, parameters);
        return { rows: rows !== null && rows !== void 0 ? rows : [] };
    }
    async getOptional(sql, parameters = []) {
        const row = await this.db.getOptional(sql, parameters);
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
