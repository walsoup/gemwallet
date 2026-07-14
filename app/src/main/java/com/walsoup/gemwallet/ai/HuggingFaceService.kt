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
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class HuggingFaceService {

    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .build()

    private val mediaType = "application/json; charset=utf-8".toMediaType()

    suspend fun queryModel(
        prompt: String,
        token: String,
        modelName: String = "google/gemma-2b-it"
    ): String {
        val url = "https://api-inference.huggingface.co/models/$modelName"

        val jsonRequest = JSONObject().apply {
            put("inputs", prompt)
            put("parameters", JSONObject().apply {
                put("max_new_tokens", 256)
                put("temperature", 0.3)
                put("return_full_text", false)
            })
        }

        val request = Request.Builder()
            .url(url)
            .header("Authorization", "Bearer $token")
            .post(jsonRequest.toString().toRequestBody(mediaType))
            .build()

        return withContext(Dispatchers.IO) {
            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    throw Exception("Hugging Face API Error: ${response.code} ${response.message}")
                }
                val body = response.body?.string() ?: throw Exception("Empty response body")
                
                // Hugging Face standard text-gen response is an array: [{"generated_text": "..."}]
                if (body.trim().startsWith("[")) {
                    val array = JSONArray(body)
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

    /**
     * Simulated streaming of Hugging Face responses by chunking the full text output
     * since HuggingFace Inference API doesn't support easy SSE streams without special client configs.
     */
    fun streamModel(
        prompt: String,
        token: String,
        modelName: String = "google/gemma-2b-it"
    ): Flow<String> = flow {
        try {
            val responseText = queryModel(prompt, token, modelName)
            // Emit chunks to simulate streaming for a nice typing effect
            val words = responseText.split(" ")
            var buffer = ""
            for (word in words) {
                buffer += "$word "
                if (buffer.length > 20) {
                    emit(buffer)
                    buffer = ""
                    kotlinx.coroutines.delay(100)
                }
            }
            if (buffer.isNotEmpty()) {
                emit(buffer)
            }
        } catch (e: Exception) {
            emit("Hugging Face Error: ${e.message}")
        }
    }.flowOn(Dispatchers.IO)
}
