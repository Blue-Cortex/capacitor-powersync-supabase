import Foundation
import Capacitor

@objc(BlueCortexPowerSyncSupabasePlugin)
public class BlueCortexPowerSyncSupabasePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BlueCortexPowerSyncSupabasePlugin"
    public let jsName = "BlueCortexPowerSyncSupabase"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "initialize", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "connect", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "disconnect", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setToken", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "execute", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getAll", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "query", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getOptional", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "watch", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "unwatch", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getSyncStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getVersion", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "writeTransaction", returnType: CAPPluginReturnPromise)
    ]
    
    private var manager: PowerSyncManager?
    private var watchCallbackIds: [String: String] = [:]

    @objc public func initialize(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard let config = call.getObject("config") else {
                call.reject("Missing config parameter")
                return
            }
            
            guard let powersyncUrl = config["powersyncUrl"] as? String,
                  let supabaseUrl = config["supabaseUrl"] as? String,
                  let supabaseAnonKey = config["supabaseAnonKey"] as? String,
                  let schema = config["schema"] as? [[String: Any]] else {
                call.reject("Missing required configuration parameters (powersyncUrl, supabaseUrl, supabaseAnonKey, schema)")
                return
            }
            
            let dbFilename = config["dbFilename"] as? String ?? "powersync.db"
            
            do {
                self.manager = try PowerSyncManager(
                    powersyncUrl: powersyncUrl,
                    supabaseUrl: supabaseUrl,
                    supabaseAnonKey: supabaseAnonKey,
                    schemaDefinition: schema,
                    dbFilename: dbFilename
                )
                
                call.resolve()
            } catch {
                call.reject("Failed to initialize PowerSync: \(error.localizedDescription)")
            }
        }
    }

    @objc public func connect(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard let manager = self.manager else {
                call.reject("PowerSync not initialized. Call initialize() first.")
                return
            }
            
            do {
                try await manager.connect()
                call.resolve()
            } catch {
                call.reject("Failed to connect: \(error.localizedDescription)")
            }
        }
    }

    @objc public func disconnect(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard let manager = self.manager else {
                call.reject("PowerSync not initialized")
                return
            }
            
            let clearDatabase = call.getBool("clearDatabase") ?? false
            
            do {
                try await manager.disconnect(clearDatabase: clearDatabase)
                call.resolve()
            } catch {
                call.reject("Failed to disconnect: \(error.localizedDescription)")
            }
        }
    }

    @objc public func setToken(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard let manager = self.manager else {
                call.reject("PowerSync not initialized")
                return
            }
            
            guard let token = call.getString("token") else {
                call.reject("Missing token parameter")
                return
            }
            
            manager.setToken(token)
            call.resolve()
        }
    }

    @objc public func execute(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard let manager = self.manager else {
                call.reject("PowerSync not initialized")
                return
            }
            
            guard let sql = call.getString("sql") else {
                call.reject("Missing sql parameter")
                return
            }
            
            let parameters = call.getArray("parameters") as? [Any] ?? []
            
            do {
                let results = try await manager.execute(sql: sql, parameters: parameters)
                call.resolve(["rows": results])
            } catch {
                call.reject("Query failed: \(error.localizedDescription)")
            }
        }
    }

    @objc public func getAll(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard let manager = self.manager else {
                call.reject("PowerSync not initialized")
                return
            }
            
            guard let sql = call.getString("sql") else {
                call.reject("Missing sql parameter")
                return
            }
            
            let parameters = call.getArray("parameters") as? [Any] ?? []
            
            do {
                let results = try await manager.getAll(sql: sql, parameters: parameters)
                call.resolve(["rows": results])
            } catch {
                call.reject("Query failed: \(error.localizedDescription)")
            }
        }
    }

    /// Typed query – same as getAll, returns { rows }. Use from JS as PowerSync.query<YourType>({ sql, parameters }).
    @objc public func query(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard let manager = self.manager else {
                call.reject("PowerSync not initialized")
                return
            }
            
            guard let sql = call.getString("sql") else {
                call.reject("Missing sql parameter")
                return
            }
            
            let parameters = call.getArray("parameters") as? [Any] ?? []
            
            do {
                let results = try await manager.getAll(sql: sql, parameters: parameters)
                call.resolve(["rows": results])
            } catch {
                call.reject("Query failed: \(error.localizedDescription)")
            }
        }
    }

    @objc public func getOptional(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard let manager = self.manager else {
                call.reject("PowerSync not initialized")
                return
            }
            
            guard let sql = call.getString("sql") else {
                call.reject("Missing sql parameter")
                return
            }
            
            let parameters = call.getArray("parameters") as? [Any] ?? []
            
            do {
                let result = try await manager.getOptional(sql: sql, parameters: parameters)
                if let result = result {
                    call.resolve(["row": result])
                } else {
                    call.resolve(["row": NSNull()])
                }
            } catch {
                call.reject("Query failed: \(error.localizedDescription)")
            }
        }
    }

    @objc public func watch(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard let manager = self.manager else {
                call.reject("PowerSync not initialized")
                return
            }
            
            guard let sql = call.getString("sql"),
                  let callbackId = call.getString("callbackId") else {
                call.reject("Missing sql or callbackId parameter")
                return
            }
            
            let parameters = call.getArray("parameters") as? [Any] ?? []
            
            do {
                let watchId = try await manager.watch(sql: sql, parameters: parameters) { results in
                    self.notifyListeners("watch_\(callbackId)", data: ["rows": results])
                }
                
                self.watchCallbackIds[watchId] = callbackId
                call.resolve(["watchId": watchId])
            } catch {
                call.reject("Watch failed: \(error.localizedDescription)")
            }
        }
    }

    @objc public func unwatch(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard let manager = self.manager else {
                call.reject("PowerSync not initialized")
                return
            }
            
            guard let watchId = call.getString("watchId") else {
                call.reject("Missing watchId parameter")
                return
            }
            
            manager.unwatch(watchId: watchId)
            watchCallbackIds.removeValue(forKey: watchId)
            call.resolve()
        }
    }

    @objc public func getSyncStatus(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard let manager = self.manager else {
                call.reject("PowerSync not initialized")
                return
            }
            
            let status = manager.getSyncStatus()
            call.resolve(status)
        }
    }

    @objc public func getVersion(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard let manager = self.manager else {
                call.reject("PowerSync not initialized")
                return
            }
            
            let version = await manager.getVersion()
            call.resolve(["version": version])
        }
    }

    @objc public func writeTransaction(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard let manager = self.manager else {
                call.reject("PowerSync not initialized")
                return
            }
            
            guard let sqlStatements = call.getArray("sql") as? [String] else {
                call.reject("Missing sql array parameter")
                return
            }
            
            let parameters = call.getArray("parameters") as? [[Any]] ?? []
            
            do {
                try await manager.writeTransaction(sqlStatements: sqlStatements, parameters: parameters)
                call.resolve()
            } catch {
                call.reject("Transaction failed: \(error.localizedDescription)")
            }
        }
    }
}
