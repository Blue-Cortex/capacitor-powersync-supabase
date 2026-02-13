package com.bluecortex.mobile

import android.content.Context
import com.powersync.PowerSyncDatabase
import com.powersync.db.SqlCursor
import com.powersync.db.schema.Column
import com.powersync.db.schema.Index
import com.powersync.db.schema.IndexedColumn
import com.powersync.db.schema.Schema
import com.powersync.db.schema.Table
import kotlin.time.ExperimentalTime
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.atomic.AtomicInteger

class PowerSyncManager(
    context: Context,
    powersyncUrl: String,
    supabaseUrl: String,
    supabaseAnonKey: String,
    schemaDefinition: List<Map<String, Any>>,
    dbFilename: String = "powersync.db"
) {
    val connector: SupabaseConnector
    val schema: Schema
    val db: PowerSyncDatabase

    private val watchJobs = mutableMapOf<String, Job>()
    private val nextWatchId = AtomicInteger(0)
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    init {
        connector = SupabaseConnector(
            powerSyncEndpoint = powersyncUrl,
            supabaseUrl = supabaseUrl,
            supabaseKey = supabaseAnonKey
        )

        schema = buildSchema(schemaDefinition)

        db = PowerSyncDatabase(
            factory = com.powersync.DatabaseDriverFactory(context),
            schema = schema,
            dbFilename = dbFilename
        )
    }

    private fun buildSchema(definition: List<Map<String, Any>>): Schema {
        val tables = definition.map { tableDict ->
            val tableName = tableDict["name"] as? String
                ?: throw IllegalArgumentException("Invalid table definition: missing name")

            @Suppress("UNCHECKED_CAST")
            val columnsData = tableDict["columns"] as? List<Map<String, String>>
                ?: throw IllegalArgumentException("Invalid table definition: missing columns")

            val columns = columnsData.map { columnDict ->
                val columnName = columnDict["name"]
                    ?: throw IllegalArgumentException("Invalid column definition: missing name")
                val columnType = columnDict["type"]
                    ?: throw IllegalArgumentException("Invalid column definition: missing type")

                when (columnType.uppercase()) {
                    "TEXT" -> Column.text(columnName)
                    "INTEGER" -> Column.integer(columnName)
                    "REAL" -> Column.real(columnName)
                    else -> throw IllegalArgumentException("Unknown column type: $columnType")
                }
            }

            // Handle indexes
            @Suppress("UNCHECKED_CAST")
            val indexesData = tableDict["indexes"] as? List<Map<String, Any>> ?: emptyList()
            val indexes = indexesData.mapNotNull { indexDict ->
                val indexName = indexDict["name"] as? String ?: return@mapNotNull null

                @Suppress("UNCHECKED_CAST")
                val indexColumnsData = indexDict["columns"] as? List<Map<String, Any>> ?: return@mapNotNull null

                val indexedColumns = indexColumnsData.mapNotNull { ic ->
                    val colName = ic["name"] as? String ?: return@mapNotNull null
                    val ascending = ic["ascending"] as? Boolean ?: true
                    if (ascending) IndexedColumn.ascending(colName) else IndexedColumn.descending(colName)
                }

                Index(name = indexName, columns = indexedColumns)
            }

            Table(name = tableName, columns = columns, indexes = indexes)
        }

        return Schema(tables)
    }

    fun setToken(token: String) {
        connector.setToken(token)
    }

    suspend fun connect() {
        db.connect(connector)
    }

    suspend fun disconnect(clearDatabase: Boolean = false) {
        if (clearDatabase) {
            db.disconnectAndClear()
        } else {
            db.disconnect()
        }
    }

    suspend fun getVersion(): String {
        return try {
            db.getPowerSyncVersion()
        } catch (e: Exception) {
            e.message ?: "unknown error"
        }
    }

    suspend fun execute(sql: String, parameters: List<Any> = emptyList()): List<Map<String, Any?>> {
        db.execute(sql, parameters)
        return emptyList()
    }

    suspend fun getAll(sql: String, parameters: List<Any> = emptyList()): List<Map<String, Any?>> {
        return db.getAll(sql, parameters) { cursor ->
            val row = mutableMapOf<String, Any?>()
            val colNames = cursor.columnNames
            colNames.forEach { (name, _) ->
                try {
                    val s = cursor.getStringOptional(name)
                    if (s != null) {
                        row[name] = s
                        return@forEach
                    }
                } catch (e: Exception) {
                    // ignore
                }

                try {
                    val l = cursor.getLongOptional(name)
                    if (l != null) {
                        row[name] = l
                        return@forEach
                    }
                } catch (e: Exception) {
                    // ignore
                }

                try {
                    val d = cursor.getDoubleOptional(name)
                    if (d != null) {
                        row[name] = d
                        return@forEach
                    }
                } catch (e: Exception) {
                    // ignore
                }

                try {
                    val b = cursor.getBooleanOptional(name)
                    if (b != null) {
                        row[name] = b
                        return@forEach
                    }
                } catch (e: Exception) {
                    // ignore
                }
                
                row[name] = null
            }
            row
        }
    }

    suspend fun getOptional(sql: String, parameters: List<Any> = emptyList()): Map<String, Any?>? {
        return getAll(sql, parameters).firstOrNull()
    }

    fun watch(
        sql: String,
        parameters: List<Any> = emptyList(),
        callback: (List<Map<String, Any?>>) -> Unit
    ): String {
        val watchId = "watch_${nextWatchId.getAndIncrement()}"

        val job = scope.launch {
            db.watch(sql, parameters) { cursor ->
                val row = mutableMapOf<String, Any?>()
                val colNames = cursor.columnNames
                colNames.forEach { (name, _) ->
                    try {
                        val s = cursor.getStringOptional(name)
                        if (s != null) {
                            row[name] = s
                            return@forEach
                        }
                    } catch (e: Exception) {
                        // ignore
                    }

                    try {
                        val l = cursor.getLongOptional(name)
                        if (l != null) {
                            row[name] = l
                            return@forEach
                        }
                    } catch (e: Exception) {
                        // ignore
                    }

                    try {
                        val d = cursor.getDoubleOptional(name)
                        if (d != null) {
                            row[name] = d
                            return@forEach
                        }
                    } catch (e: Exception) {
                        // ignore
                    }

                    try {
                        val b = cursor.getBooleanOptional(name)
                        if (b != null) {
                            row[name] = b
                            return@forEach
                        }
                    } catch (e: Exception) {
                        // ignore
                    }

                    row[name] = null
                }
                row
            }.collectLatest { results ->
                callback(results)
            }
        }

        watchJobs[watchId] = job
        return watchId
    }

    fun unwatch(watchId: String) {
        watchJobs[watchId]?.cancel()
        watchJobs.remove(watchId)
    }

    suspend fun writeTransaction(sqlStatements: List<String>, parameters: List<List<Any>> = emptyList()) {
        db.writeTransaction { tx ->
            sqlStatements.forEachIndexed { index, sql ->
                val params = if (index < parameters.size) parameters[index] else emptyList()
                tx.execute(sql, params)
            }
        }
    }

    @Suppress("UNCHECKED_CAST")
    @OptIn(kotlin.time.ExperimentalTime::class)
    fun getSyncStatus(): Map<String, Any> {
        val status = db.currentStatus
        val isoFormatter = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        isoFormatter.timeZone = TimeZone.getTimeZone("UTC")

        return mapOf(
            "connected" to status.connected,
            "lastSyncedAt" to (status.lastSyncedAt?.let {
                isoFormatter.format(it)
            } ?: ""),
            "hasSynced" to status.hasSynced,
            "uploading" to status.uploading,
            "downloading" to status.downloading
        ) as Map<String, Any>
    }
}

// Private extensions to support optional getters
private inline fun <T> SqlCursor.getColumnValueOptional(
    name: String,
    getValue: (Int) -> T?,
): T? = columnNames[name]?.let { getValue(it) }

private fun SqlCursor.getBooleanOptional(name: String): Boolean? = getColumnValueOptional(name) { getBoolean(it) }
private fun SqlCursor.getDoubleOptional(name: String): Double? = getColumnValueOptional(name) { getDouble(it) }
private fun SqlCursor.getLongOptional(name: String): Long? = getColumnValueOptional(name) { getLong(it) }
private fun SqlCursor.getStringOptional(name: String): String? = getColumnValueOptional(name) { getString(it) }
