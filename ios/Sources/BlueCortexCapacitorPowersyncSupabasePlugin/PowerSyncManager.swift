import Foundation
import PowerSync

@MainActor
public final class PowerSyncManager {
    public let connector: SupabaseConnector
    public let schema: Schema
    public let db: PowerSyncDatabaseProtocol
    
    private var watchCallbacks: [String: Task<Void, Never>] = [:]
    private var nextWatchId = 0

    public init(powersyncUrl: String, supabaseUrl: String, supabaseAnonKey: String, schemaDefinition: [[String: Any]], dbFilename: String = "powersync.db") throws {
        connector = SupabaseConnector(
            powerSyncUrl: powersyncUrl,
            supabaseUrl: supabaseUrl,
            supabaseAnonKey: supabaseAnonKey
        )
        
        // Build schema from JSON definition
        schema = try Self.buildSchema(from: schemaDefinition)
        
        db = PowerSyncDatabase(
            schema: schema,
            dbFilename: dbFilename
        )
    }
    
    private static func buildSchema(from definition: [[String: Any]]) throws -> Schema {
        var tables: [Table] = []
        
        for tableDict in definition {
            guard let tableName = tableDict["name"] as? String,
                  let columnsArray = tableDict["columns"] as? [[String: Any]] else {
                throw NSError(domain: "PowerSyncManager", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid table definition"])
            }
            
            var columns: [Column] = []
            for columnDict in columnsArray {
                guard let columnName = columnDict["name"] as? String,
                      let columnType = columnDict["type"] as? String else {
                    throw NSError(domain: "PowerSyncManager", code: 2, userInfo: [NSLocalizedDescriptionKey: "Invalid column definition"])
                }
                
                let column: Column
                switch columnType.uppercased() {
                case "TEXT":
                    column = Column.text(columnName)
                case "INTEGER":
                    column = Column.integer(columnName)
                case "REAL":
                    column = Column.real(columnName)
                default:
                    throw NSError(domain: "PowerSyncManager", code: 3, userInfo: [NSLocalizedDescriptionKey: "Unknown column type: \(columnType)"])
                }
                columns.append(column)
            }
            
            // Handle indexes if present
            var indexes: [Index] = []
            if let indexesArray = tableDict["indexes"] as? [[String: Any]] {
                for indexDict in indexesArray {
                    guard let indexName = indexDict["name"] as? String,
                          let indexColumns = indexDict["columns"] as? [[String: Any]] else {
                        continue
                    }
                    
                    var indexedColumns: [IndexedColumn] = []
                    for indexColumn in indexColumns {
                        guard let columnName = indexColumn["name"] as? String else {
                            continue
                        }
                        let ascending = indexColumn["ascending"] as? Bool ?? true
                        indexedColumns.append(ascending ? IndexedColumn.ascending(columnName) : IndexedColumn.descending(columnName))
                    }
                    
                    indexes.append(Index(name: indexName, columns: indexedColumns))
                }
            }
            
            let table = Table(name: tableName, columns: columns, indexes: indexes)
            tables.append(table)
        }
        
        return Schema(tables: tables)
    }

    public func setToken(_ token: String) {
        connector.setToken(token)
    }

    public func connect() async throws {
        try await db.connect(
            connector: connector,
            options: ConnectOptions(
                clientConfiguration: SyncClientConfiguration(
                    requestLogger: SyncRequestLoggerConfiguration(
                        requestLevel: .headers
                    ) { message in
                        self.db.logger.debug(message, tag: "SyncRequest")
                    }
                )
            )
        )
    }

    public func disconnect(clearDatabase: Bool = false) async throws {
        if clearDatabase {
            try await db.disconnectAndClear()
        } else {
            try await db.disconnect()
        }
    }

    public func getVersion() async -> String {
        do {
            return try await db.getPowerSyncVersion()
        } catch {
            return error.localizedDescription
        }
    }

    public func execute(sql: String, parameters: [Any] = []) async throws -> [[String: Any]] {
        let _ = try await db.execute(sql: sql, parameters: parameters)
        return []
    }

    public func getAll(sql: String, parameters: [Any] = []) async throws -> [[String: Any]] {
        let results = try await db.getAll(
            sql: sql,
            parameters: parameters,
            mapper: { cursor in
                var row: [String: Any] = [:]
                for columnName in cursor.columnNames.keys {
                    if let value = try? cursor.getStringOptional(name: columnName) {
                        row[columnName] = value
                    } else if let value = try? cursor.getIntOptional(name: columnName) {
                        row[columnName] = value
                    } else if let value = try? cursor.getDoubleOptional(name: columnName) {
                        row[columnName] = value
                    } else if let value = try? cursor.getBooleanOptional(name: columnName) {
                        row[columnName] = value
                    } else {
                        row[columnName] = NSNull()
                    }
                }
                return row
            }
        )
        return results
    }

    public func getOptional(sql: String, parameters: [Any] = []) async throws -> [String: Any]? {
        let results = try await execute(sql: sql, parameters: parameters)
        return results.first
    }

    public func watch(
        sql: String,
        parameters: [Any] = [],
        callback: @escaping ([[String: Any]]) -> Void
    ) async throws -> String {
        let watchId = "watch_\(nextWatchId)"
        nextWatchId += 1

        let task = Task {
            do {
                for try await results in try db.watch(
                    sql: sql,
                    parameters: parameters,
                    mapper: { cursor in
                        var row: [String: Any] = [:]
                        for columnName in cursor.columnNames.keys {
                            // Try different types since we don't know the column type
                            if let value = try? cursor.getStringOptional(name: columnName) {
                                row[columnName] = value
                            } else if let value = try? cursor.getIntOptional(name: columnName) {
                                row[columnName] = value
                            } else if let value = try? cursor.getDoubleOptional(name: columnName) {
                                row[columnName] = value
                            } else if let value = try? cursor.getBooleanOptional(name: columnName) {
                                row[columnName] = value
                            } else {
                                row[columnName] = NSNull()
                            }
                        }
                        return row
                    }
                ) {
                    callback(results)
                }
            } catch {
                print("Error in watch \(watchId): \(error)")
            }
        }

        watchCallbacks[watchId] = task
        return watchId
    }

    public func unwatch(watchId: String) {
        if let task = watchCallbacks[watchId] {
            task.cancel()
            watchCallbacks.removeValue(forKey: watchId)
        }
    }

    public func writeTransaction(sqlStatements: [String], parameters: [[Any]] = []) async throws {
        try await db.writeTransaction { transaction in
            for (index, sql) in sqlStatements.enumerated() {
                let params = index < parameters.count ? parameters[index] : []
                _ = try transaction.execute(sql: sql, parameters: params)
            }
        }
    }

    public func getSyncStatus() -> [String: Any] {
        let status = db.currentStatus
        return [
            "connected": status.connected,
            "lastSyncedAt": status.lastSyncedAt?.ISO8601Format() ?? "",
            "hasSynced": status.hasSynced,
            "uploading": status.uploading,
            "downloading": status.downloading
        ]
    }
}
