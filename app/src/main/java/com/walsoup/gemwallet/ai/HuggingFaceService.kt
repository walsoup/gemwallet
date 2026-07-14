package com.walsoup.gemwallet.ai

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.isActive
import kotlinx.coroutines.withContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.sse.EventSource
import okhttp3.sse.EventSourceListener
import okhttp3.sse.EventSources
import org.json.JSONObject
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

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

        val resultBuffer = StringBuilder()
        val done = AtomicBoolean(false)
        val errorRef = kotlin.concurrent.AtomicReference<Throwable?>(null)
        
        EventSources.createFactory(client).newEventSource(request, object : EventSourceListener() {
            override fun onEvent(eventSource: EventSource, id: String?, type: String?, data: String) {
                if (cancellationToken.get()) {
                    eventSource.cancel()
                    return
                }
                
                try {
                    val json = JSONObject(data)
                    val tokenText = json.optJSONObject("token")?.optString("text", "") ?: ""
                    
                    if (tokenText.isNotEmpty()) {
                        resultBuffer.append(tokenText)
                    }
                } catch (_: Exception) {}
            }
            
            override fun onClosed(eventSource: EventSource) {
                done.set(true)
            }
            
            override fun onFailure(eventSource: EventSource, t: Throwable?, response: okhttp3.Response?) {
                errorRef.set(t ?: Exception("SSE failed: ${response?.code} ${response?.message}"))
                done.set(true)
            }
        })
        
        while (!done.get() && !cancellationToken.get()) {
            kotlinx.coroutines.delay(100)
        }
        
        errorRef.get()?.let { throw it }
        
        val fullText = resultBuffer.toString()
        if (fullText.isNotEmpty() && !cancellationToken.get()) {
            val words = fullText.split(" ")
            var buffer = ""
            for (word in words) {
                if (cancellationToken.get()) break
                buffer += "$word "
                if (buffer.length >= 30) {
                    emit(HfChunk(buffer))
                    buffer = ""
                    kotlinx.coroutines.delay(60)
                }
            }
            if (buffer.isNotEmpty()) {
                emit(HfChunk(buffer))
            }
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
