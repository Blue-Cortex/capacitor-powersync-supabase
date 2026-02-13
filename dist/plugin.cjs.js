'use strict';

var core = require('@capacitor/core');
var web$1 = require('@powersync/web');
var supabaseJs = require('@supabase/supabase-js');

const FATAL_RESPONSE_CODES = [
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
            if (typeof ex.code == 'string' && FATAL_RESPONSE_CODES.some((regex) => regex.test(ex.code))) {
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

class BlueCortexPowerSyncSupabaseWeb extends core.WebPlugin {
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

var web = /*#__PURE__*/Object.freeze({
    __proto__: null,
    BlueCortexPowerSyncSupabaseWeb: BlueCortexPowerSyncSupabaseWeb
});

exports.PowerSync = PowerSync;
exports.SupabaseConnector = SupabaseConnector;
//# sourceMappingURL=plugin.cjs.js.map
