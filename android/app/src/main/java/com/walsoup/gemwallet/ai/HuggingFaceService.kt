package com.walsoup.gemwallet.ai

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

data class HfChunk(val text: String)

class HuggingFaceService {

    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    private val mediaType = "application/json; charset=utf-8".toMediaType()

    fun streamModel(
        prompt: String,
        token: String,
        modelName: String = "google/gemma-4-E2B",
        cancellationToken: AtomicBoolean
    ): Flow<HfChunk> = flow {
        val url = "https://api-inference.huggingface.co/models/$modelName"
        
        val jsonBody = JSONObject().apply {
            put("inputs", prompt)
            put("parameters", JSONObject().apply {
                put("max_new_tokens", 1024)
                put("temperature", 0.3)
                put("return_full_text", false)
                put("stream", true)
            })
        }

        val request = Request.Builder()
            .url(url)
            .header("Authorization", "Bearer $token")
            .post(jsonBody.toString().toRequestBody(mediaType))
            .build()

        val response = withContext(Dispatchers.IO) {
            client.newCall(request).execute()
        }

        try {
            if (!response.isSuccessful) {
                val errorBody = response.body?.string() ?: ""
                throw Exception("Hugging Face API Error ${response.code}: $errorBody")
            }

            val input = response.body?.byteStream() ?: throw Exception("Empty stream body")
            val reader = BufferedReader(InputStreamReader(input))

            var line: String?
            while (reader.readLine().also { line = it } != null) {
                if (cancellationToken.get()) break
                val currentLine = line ?: continue
                if (currentLine.isBlank()) continue

                if (currentLine.startsWith("data:")) {
                    val jsonStr = currentLine.removePrefix("data:").trim()
                    if (jsonStr.isEmpty() || jsonStr == "[DONE]") continue
                    try {
                        val json = JSONObject(jsonStr)
                        val tokenText = json.optJSONObject("token")?.optString("text", "") ?: ""
                        if (tokenText.isNotEmpty()) {
                            emit(HfChunk(tokenText))
                        }
                    } catch (_: Exception) {}
                }
            }
        } finally {
            response.close()
        }
    }.flowOn(Dispatchers.IO)
    
    suspend fun queryModel(
        prompt: String,
        token: String,
        modelName: String = "google/gemma-4-E2B"
    ): String = withContext(Dispatchers.IO) {
        val url = "https://api-inference.huggingface.co/models/$modelName"
        
        val jsonBody = JSONObject().apply {
            put("inputs", prompt)
            put("parameters", JSONObject().apply {
                put("max_new_tokens", 1024)
                put("temperature", 0.3)
                put("return_full_text", false)
            })
        }
        
        val request = Request.Builder()
            .url(url)
            .header("Authorization", "Bearer $token")
            .post(jsonBody.toString().toRequestBody(mediaType))
            .build()
        
        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                throw Exception("Hugging Face API Error: ${response.code} ${response.message}")
            }
            val body = response.body?.string() ?: throw Exception("Empty response body")
            
            if (body.trim().startsWith("[")) {
                val array = org.json.JSONArray(body)
                if (array.length() > 0) {
                    return@withContext array.getJSONObject(0).optString("generated_text", "")
                }
            } else if (body.trim().startsWith("{")) {
                val obj = JSONObject(body)
                if (obj.has("error")) {
                    throw Exception(obj.getString("error"))
                }
                return@withContext obj.optString("generated_text", "")
            }
            body
        }
    }
}
