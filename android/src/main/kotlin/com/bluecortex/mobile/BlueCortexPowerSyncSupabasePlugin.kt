package com.bluecortex.mobile

import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

@CapacitorPlugin(name = "BlueCortexPowerSyncSupabase")
class BlueCortexPowerSyncSupabasePlugin : Plugin() {

    private var manager: PowerSyncManager? = null
    private val watchCallbackIds = mutableMapOf<String, String>()
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    @PluginMethod
    fun initialize(call: PluginCall) {
        scope.launch {
            val config = call.getObject("config")
            if (config == null) {
                call.reject("Missing config parameter")
                return@launch
            }

            val powersyncUrl = config.getString("powersyncUrl")
            val supabaseUrl = config.getString("supabaseUrl")
            val supabaseAnonKey = config.getString("supabaseAnonKey")
            val schemaArray = config.getJSONArray("schema")

            if (powersyncUrl == null || supabaseUrl == null || supabaseAnonKey == null || schemaArray == null) {
                call.reject("Missing required configuration parameters (powersyncUrl, supabaseUrl, supabaseAnonKey, schema)")
                return@launch
            }

            val dbFilename = config.optString("dbFilename", "powersync.db")

            // Parse schema from JSON
            val schemaDefinition = mutableListOf<Map<String, Any>>()
            for (i in 0 until schemaArray.length()) {
                val tableObj = schemaArray.getJSONObject(i)
                val tableMap = mutableMapOf<String, Any>()
                tableMap["name"] = tableObj.getString("name")

                val columnsArray = tableObj.getJSONArray("columns")
                val columns = mutableListOf<Map<String, String>>()
                for (j in 0 until columnsArray.length()) {
                    val colObj = columnsArray.getJSONObject(j)
                    columns.add(mapOf(
                        "name" to colObj.getString("name"),
                        "type" to colObj.getString("type")
                    ))
                }
                tableMap["columns"] = columns

                if (tableObj.has("indexes")) {
                    val indexesArray = tableObj.getJSONArray("indexes")
                    val indexes = mutableListOf<Map<String, Any>>()
                    for (j in 0 until indexesArray.length()) {
                        val indexObj = indexesArray.getJSONObject(j)
                        val indexMap = mutableMapOf<String, Any>()
                        indexMap["name"] = indexObj.getString("name")

                        val indexColumnsArray = indexObj.getJSONArray("columns")
                        val indexColumns = mutableListOf<Map<String, Any>>()
                        for (k in 0 until indexColumnsArray.length()) {
                            val icObj = indexColumnsArray.getJSONObject(k)
                            val icMap = mutableMapOf<String, Any>("name" to icObj.getString("name"))
                            if (icObj.has("ascending")) {
                                icMap["ascending"] = icObj.getBoolean("ascending")
                            }
                            indexColumns.add(icMap)
                        }
                        indexMap["columns"] = indexColumns
                        indexes.add(indexMap)
                    }
                    tableMap["indexes"] = indexes
                }

                schemaDefinition.add(tableMap)
            }

            try {
                manager = PowerSyncManager(
                    context = context,
                    powersyncUrl = powersyncUrl,
                    supabaseUrl = supabaseUrl,
                    supabaseAnonKey = supabaseAnonKey,
                    schemaDefinition = schemaDefinition,
                    dbFilename = dbFilename
                )
                call.resolve()
            } catch (e: Exception) {
                call.reject("Failed to initialize PowerSync: ${e.message}")
            }
        }
    }

    @PluginMethod
    fun connect(call: PluginCall) {
        scope.launch {
            val mgr = manager
            if (mgr == null) {
                call.reject("PowerSync not initialized. Call initialize() first.")
                return@launch
            }

            try {
                mgr.connect()
                call.resolve()
            } catch (e: Exception) {
                call.reject("Failed to connect: ${e.message}")
            }
        }
    }

    @PluginMethod
    fun disconnect(call: PluginCall) {
        scope.launch {
            val mgr = manager
            if (mgr == null) {
                call.reject("PowerSync not initialized")
                return@launch
            }

            val clearDatabase = call.getBoolean("clearDatabase", false) ?: false

            try {
                mgr.disconnect(clearDatabase)
                call.resolve()
            } catch (e: Exception) {
                call.reject("Failed to disconnect: ${e.message}")
            }
        }
    }

    @PluginMethod
    fun setToken(call: PluginCall) {
        val mgr = manager
        if (mgr == null) {
            call.reject("PowerSync not initialized")
            return
        }

        val token = call.getString("token")
        if (token == null) {
            call.reject("Missing token parameter")
            return
        }

        mgr.setToken(token)
        call.resolve()
    }

    @PluginMethod
    fun execute(call: PluginCall) {
        scope.launch {
            val mgr = manager
            if (mgr == null) {
                call.reject("PowerSync not initialized")
                return@launch
            }

            val sql = call.getString("sql")
            if (sql == null) {
                call.reject("Missing sql parameter")
                return@launch
            }

            val parameters = call.getArray("parameters")?.toList<Any>() ?: emptyList()

            try {
                val results = mgr.execute(sql, parameters)
                val ret = JSObject()
                ret.put("rows", JSArray(results))
                call.resolve(ret)
            } catch (e: Exception) {
                call.reject("Query failed: ${e.message}")
            }
        }
    }

    @PluginMethod
    fun getAll(call: PluginCall) {
        scope.launch {
            val mgr = manager
            if (mgr == null) {
                call.reject("PowerSync not initialized")
                return@launch
            }

            val sql = call.getString("sql")
            if (sql == null) {
                call.reject("Missing sql parameter")
                return@launch
            }

            val parameters = call.getArray("parameters")?.toList<Any>() ?: emptyList()

            try {
                val results = mgr.getAll(sql, parameters)
                val ret = JSObject()
                ret.put("rows", JSArray(results))
                call.resolve(ret)
            } catch (e: Exception) {
                call.reject("Query failed: ${e.message}")
            }
        }
    }

    @PluginMethod
    fun getOptional(call: PluginCall) {
        scope.launch {
            val mgr = manager
            if (mgr == null) {
                call.reject("PowerSync not initialized")
                return@launch
            }

            val sql = call.getString("sql")
            if (sql == null) {
                call.reject("Missing sql parameter")
                return@launch
            }

            val parameters = call.getArray("parameters")?.toList<Any>() ?: emptyList()

            try {
                val result = mgr.getOptional(sql, parameters)
                val ret = JSObject()
                if (result != null) {
                    ret.put("row", JSObject.fromJSONObject(org.json.JSONObject(result)))
                } else {
                    ret.put("row", JSObject.NULL)
                }
                call.resolve(ret)
            } catch (e: Exception) {
                call.reject("Query failed: ${e.message}")
            }
        }
    }

    @PluginMethod
    fun watch(call: PluginCall) {
        scope.launch {
            val mgr = manager
            if (mgr == null) {
                call.reject("PowerSync not initialized")
                return@launch
            }

            val sql = call.getString("sql")
            val callbackId = call.getString("callbackId")
            if (sql == null || callbackId == null) {
                call.reject("Missing sql or callbackId parameter")
                return@launch
            }

            val parameters = call.getArray("parameters")?.toList<Any>() ?: emptyList()

            try {
                val watchId = mgr.watch(sql, parameters) { results ->
                    val data = JSObject()
                    data.put("rows", JSArray(results))
                    notifyListeners("watch_$callbackId", data)
                }

                watchCallbackIds[watchId] = callbackId
                val ret = JSObject()
                ret.put("watchId", watchId)
                call.resolve(ret)
            } catch (e: Exception) {
                call.reject("Watch failed: ${e.message}")
            }
        }
    }

    @PluginMethod
    fun unwatch(call: PluginCall) {
        val mgr = manager
        if (mgr == null) {
            call.reject("PowerSync not initialized")
            return
        }

        val watchId = call.getString("watchId")
        if (watchId == null) {
            call.reject("Missing watchId parameter")
            return
        }

        mgr.unwatch(watchId)
        watchCallbackIds.remove(watchId)
        call.resolve()
    }

    @PluginMethod
    fun getSyncStatus(call: PluginCall) {
        val mgr = manager
        if (mgr == null) {
            call.reject("PowerSync not initialized")
            return
        }

        val status = mgr.getSyncStatus()
        call.resolve(JSObject.fromJSONObject(org.json.JSONObject(status)))
    }

    @PluginMethod
    fun getVersion(call: PluginCall) {
        scope.launch {
            val mgr = manager
            if (mgr == null) {
                call.reject("PowerSync not initialized")
                return@launch
            }

            val version = mgr.getVersion()
            val ret = JSObject()
            ret.put("version", version)
            call.resolve(ret)
        }
    }

    @PluginMethod
    fun writeTransaction(call: PluginCall) {
        scope.launch {
            val mgr = manager
            if (mgr == null) {
                call.reject("PowerSync not initialized")
                return@launch
            }

            val sqlStatements = call.getArray("sql")?.toList<String>()
            if (sqlStatements == null) {
                call.reject("Missing sql array parameter")
                return@launch
            }

            val parameters = call.getArray("parameters")?.toList<List<Any>>() ?: emptyList()

            try {
                mgr.writeTransaction(sqlStatements, parameters)
                call.resolve()
            } catch (e: Exception) {
                call.reject("Transaction failed: ${e.message}")
            }
        }
    }
}
