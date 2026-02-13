package com.bluecortex.mobile

import co.touchlab.kermit.Logger
import com.powersync.PowerSyncDatabase
import com.powersync.connectors.PowerSyncBackendConnector
import com.powersync.connectors.PowerSyncCredentials
import com.powersync.db.crud.CrudEntry
import com.powersync.db.crud.CrudTransaction
import com.powersync.db.crud.UpdateType
import com.powersync.db.runWrapped
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.annotations.SupabaseInternal
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.postgrest.from
import io.ktor.client.plugins.HttpSend
import io.ktor.client.plugins.plugin
import io.ktor.client.statement.bodyAsText
import io.ktor.utils.io.InternalAPI
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonPrimitive

@OptIn(SupabaseInternal::class, InternalAPI::class)
public open class SupabaseConnector(
    private val powerSyncEndpoint: String,
    supabaseUrl: String,
    supabaseKey: String
) : PowerSyncBackendConnector() {

    private val json = Json { coerceInputValues = true }
    private var errorCode: String? = null

    public companion object PostgresFatalCodes {
        // Using Regex patterns for Postgres error codes
        private val FATAL_RESPONSE_CODES =
            listOf(
                // Class 22 — Data Exception
                "^22...".toRegex(),
                // Class 23 — Integrity Constraint Violation
                "^23...".toRegex(),
                // INSUFFICIENT PRIVILEGE
                "^42501$".toRegex(),
            )

        public fun isFatalError(code: String): Boolean =
            FATAL_RESPONSE_CODES.any { pattern ->
                pattern.matches(code)
            }
    }

    val client: SupabaseClient = createSupabaseClient(
        supabaseUrl = supabaseUrl,
        supabaseKey = supabaseKey
    ) {
        install(Auth)
        install(Postgrest)
    }

    @Volatile
    private var token: String? = null

    fun setToken(newToken: String) {
        this.token = newToken
    }

    init {
        require(client.pluginManager.getPluginOrNull(Auth) != null) { "The Auth plugin must be installed on the Supabase client" }
        require(
            client.pluginManager.getPluginOrNull(Postgrest) != null,
        ) { "The Postgrest plugin must be installed on the Supabase client" }

        // This retrieves the error code from the response
        // as this is not accessible in the Supabase client RestException
        // to handle fatal Postgres errors
        client.httpClient.httpClient.plugin(HttpSend).intercept { request ->
            val resp = execute(request)
            val response = resp.response
            if (response.status.value >= 400) {
                val responseText = response.bodyAsText()

                try {
                    val error =
                        json.decodeFromString<Map<String, String?>>(
                            responseText,
                        )
                    errorCode = error["code"]
                } catch (e: Exception) {
                    Logger.e("Failed to parse error response: $e")
                }
            }
            resp
        }
    }


    /**
     * Get credentials for PowerSync.
     */
    override suspend fun fetchCredentials(): PowerSyncCredentials =
        runWrapped {
            val currentToken = token
                ?: throw IllegalStateException("No auth token set. Call setToken() after signing in from JS.")

            PowerSyncCredentials(
                endpoint = powerSyncEndpoint,
                token = currentToken,
            )
        }

//    override suspend fun uploadData(database: PowerSyncDatabase) {
//        val transaction = database.getNextCrudTransaction() ?: return
//
//        var lastEntry: CrudEntry? = null
//        try {
//            val authToken = token
//
//            for (entry in transaction.crud) {
//                lastEntry = entry
//                val tableName = entry.table
//
//                when (entry.op) {
//                    UpdateType.PUT -> {
//                        val data = (entry.opData ?: emptyMap()).toMutableMap()
//                        data["id"] = entry.id
//                        client.from(tableName).upsert(data) {
//                             if (authToken != null) header("Authorization", "Bearer $authToken")
//                        }
//                    }
//                    UpdateType.PATCH -> {
//                        val opData = entry.opData ?: continue
//                        client.from(tableName).update(opData) {
//                            if (authToken != null) header("Authorization", "Bearer $authToken")
//                            filter {
//                                eq("id", entry.id)
//                            }
//                        }
//                    }
//                    UpdateType.DELETE -> {
//                        client.from(tableName).delete {
//                            if (authToken != null) header("Authorization", "Bearer $authToken")
//                            filter {
//                                eq("id", entry.id)
//                            }
//                        }
//                    }
//                }
//            }
//
//            transaction.complete()
//
//        } catch (e: Exception) {
//            val errorCode = extractPostgresErrorCode(e)
//            if (errorCode != null && isFatalPostgresError(errorCode)) {
//                println("Data upload error: $e")
//                println("Discarding entry: $lastEntry")
//                transaction.complete()
//                return
//            }
//
//            println("Data upload error - retrying last entry: $lastEntry, $e")
//            throw e
//        }
//    }

    /**
     * Uses the PostgREST APIs to upload a given [entry] to the backend database.
     *
     * This method should report errors during the upload as an exception that would be caught by [uploadData].
     */
    public suspend fun uploadCrudEntry(entry: CrudEntry) {
        val table = client.from(entry.table)

        when (entry.op) {
            UpdateType.PUT -> {
                val data =
                    buildMap {
                        put("id", JsonPrimitive(entry.id))
                        entry.opData?.jsonValues?.let { putAll(it) }
                    }
                table.upsert(data)
            }
            UpdateType.PATCH -> {
                table.update(entry.opData!!.jsonValues) {
                    filter {
                        eq("id", entry.id)
                    }
                }
            }
            UpdateType.DELETE -> {
                table.delete {
                    filter {
                        eq("id", entry.id)
                    }
                }
            }
        }
    }

    /**
     * Handles an error during the upload. This method can be overridden to log errors or customize error handling.
     *
     * By default, it discards the rest of a transaction when the error code indicates that this is a fatal postgres
     * error that can't be retried. Otherwise, it rethrows the exception so that the PowerSync SDK will retry.
     *
     * @param tx The full [CrudTransaction] we're in the process of uploading.
     * @param entry The [CrudEntry] for which an upload has failed.
     * @param exception The [Exception] thrown by the Supabase client.
     * @param [errorCode] The postgres error code, if any.
     * @throws Exception If the upload should be retried. If this method doesn't throw, it should mark [tx] as complete
     * by invoking [CrudTransaction.complete]. In that case, the local write would be lost.
     */
    public suspend fun handleError(
        tx: CrudTransaction,
        entry: CrudEntry,
        exception: Exception,
        errorCode: String?,
    ) {
        if (errorCode != null && isFatalError(errorCode)) {
            /**
             * Instead of blocking the queue with these errors,
             * discard the (rest of the) transaction.
             *
             * Note that these errors typically indicate a bug in the application.
             * If protecting against data loss is important, save the failing records
             * elsewhere instead of discarding, and/or notify the user.
             */
            Logger.e("Data upload error: ${exception.message}")
            Logger.e("Discarding entry: $entry")
            tx.complete(null)
            return
        }

        Logger.e("Data upload error - retrying last entry: $entry, $exception")
        throw exception
    }

    /**
     * Upload local changes to the app backend (in this case Supabase).
     *
     * This function is called whenever there is data to upload, whether the device is online or offline.
     * If this call throws an error, it is retried periodically.
     */
    override suspend fun uploadData(database: PowerSyncDatabase) {
        return runWrapped {
            val transaction = database.getNextCrudTransaction() ?: return@runWrapped

            var lastEntry: CrudEntry? = null
            try {
                for (entry in transaction.crud) {
                    lastEntry = entry
                    uploadCrudEntry(entry)
                }

                transaction.complete(null)
            } catch (e: Exception) {
                if (lastEntry != null) {
                    handleError(transaction, lastEntry, e, errorCode)
                } else {
                    throw e
                }
            }
        }
    }
}
