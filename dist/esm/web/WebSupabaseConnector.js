import { UpdateType } from '@powersync/web';
import { createClient } from '@supabase/supabase-js';
const FATAL_RESPONSE_CODES = [
    new RegExp('^22...$'),
    new RegExp('^23...$'),
    new RegExp('^42501$'),
];
function isFatalError(code) {
    return FATAL_RESPONSE_CODES.some((regex) => regex.test(code));
}
export class WebSupabaseConnector {
    constructor(config) {
        this._token = null;
        this.powerSyncEndpoint = config.powerSyncUrl;
        this.client = createClient(config.supabaseUrl, config.supabaseAnonKey);
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
                    case UpdateType.PUT: {
                        const record = Object.assign(Object.assign({}, ((_a = entry.opData) !== null && _a !== void 0 ? _a : {})), { id: entry.id });
                        const { error } = await table.upsert(record);
                        if (error)
                            throw error;
                        break;
                    }
                    case UpdateType.PATCH: {
                        if (!entry.opData)
                            continue;
                        const { error } = await table.update(entry.opData).eq('id', entry.id);
                        if (error)
                            throw error;
                        break;
                    }
                    case UpdateType.DELETE: {
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
