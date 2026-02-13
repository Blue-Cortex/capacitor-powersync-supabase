import Foundation
import PowerSync
import Supabase

@MainActor
public final class SupabaseConnector: PowerSyncBackendConnectorProtocol {
    public let powerSyncEndpoint: String
    public let client: SupabaseClient
    private(set) var token: String?

    public init(powerSyncUrl: String, supabaseUrl: String, supabaseAnonKey: String) {
        self.powerSyncEndpoint = powerSyncUrl
        self.client = SupabaseClient(
            supabaseURL: URL(string: supabaseUrl)!,
            supabaseKey: supabaseAnonKey
        )
        self.token = nil
    }

    /// Set the access token received from the JS layer after auth.
    public func setToken(_ token: String) {
        self.token = token
    }

    public func fetchCredentials() async throws -> PowerSyncCredentials? {
        guard let token = token else {
            throw NSError(
                domain: "SupabaseConnector",
                code: 1,
                userInfo: [NSLocalizedDescriptionKey: "No auth token set. Call setToken() after signing in from JS."]
            )
        }

        return PowerSyncCredentials(endpoint: powerSyncEndpoint, token: token)
    }

    public func uploadData(database: PowerSyncDatabaseProtocol) async throws {
        guard let transaction = try await database.getNextCrudTransaction() else { return }

        var lastEntry: CrudEntry?
        do {
            for entry in transaction.crud {
                lastEntry = entry
                let tableName = entry.table

                let table = client.from(tableName)

                switch entry.op {
                case .put:
                    var data = entry.opData ?? [:]
                    data["id"] = entry.id
                    try await table.upsert(data).execute()
                case .patch:
                    guard let opData = entry.opData else { continue }
                    try await table.update(opData).eq("id", value: entry.id).execute()
                case .delete:
                    try await table.delete().eq("id", value: entry.id).execute()
                }
            }

            try await transaction.complete()

        } catch {
            if let errorCode = PostgresFatalCodes.extractErrorCode(from: error),
               PostgresFatalCodes.isFatalError(errorCode)
            {
                print("Data upload error: \(error)")
                print("Discarding entry: \(lastEntry!)")
                try await transaction.complete()
                return
            }

            print("Data upload error - retrying last entry: \(lastEntry!), \(error)")
            throw error
        }
    }
}

private enum PostgresFatalCodes {
    static let fatalResponseCodes: [String] = [
        "22...",
        "23...",
        "42501",
    ]

    static func isFatalError(_ code: String) -> Bool {
        return fatalResponseCodes.contains { pattern in
            code.range(of: pattern, options: [.regularExpression]) != nil
        }
    }

    static func extractErrorCode(from error: any Error) -> String? {
        let errorString = String(describing: error)
        if let range = errorString.range(of: "code: Optional\\(\\\"([^\\\"]+)\\\"\\)", options: .regularExpression),
           let codeRange = errorString[range].range(of: "\\\"([^\\\"]+)\\\"", options: .regularExpression)
        {
            let code = errorString[codeRange].dropFirst().dropLast()
            return String(code)
        }
        return nil
    }
}
