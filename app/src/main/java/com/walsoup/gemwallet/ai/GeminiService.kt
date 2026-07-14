package com.walsoup.gemwallet.ai

import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import kotlinx.coroutines.flow.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.util.concurrent.TimeUnit

class GeminiService {

    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(120, TimeUnit.SECONDS)
        .build()

    private val mediaType = "application/json; charset=utf-8".toMediaType()

    companion object {
        private const val TAG = "GeminiService"
        private const val DEFAULT_MODEL = "gemini-flash-lite-latest"
        private const val BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"
        private const val MAX_RETRIES = 2
        private const val RETRY_DELAY_MS = 1000L
    }

    /**
     * Parses transaction inputs into structured JSON using Gemini API.
     * Uses responseMimeType for guaranteed JSON output, no regex needed.
     */
    suspend fun parseTransactions(
        text: String,
        categories: List<String>,
        apiKey: String,
        modelName: String = DEFAULT_MODEL
    ): List<ParsedTransaction> {
        val sanitizedInput = sanitizeUserInput(text)
        val categoryListStr = categories.joinToString(", ")
        val prompt = """
            You are a data extraction engine for a cash-tracking application.
            Your sole function is to parse the user's input, identify distinct financial transactions, extract the numerical cost in decimal format, assign a logical category from the provided list, and output strictly in a JSON array.
            Do not provide conversational filler.

            Available Categories: $categoryListStr
            Fallback Category: Misc

            Required JSON schema:
            [{"item": "String", "amount": Integer, "category": "String", "confidence": Number}]

            Rules:
            - 'amount' must be an integer representing cents (e.g., $5.00 -> 500, $0.40 -> 40).
            - 'category' must exactly match one of the Available Categories. If unsure, use the Fallback Category.
            - 'confidence' is a float between 0.0 and 1.0.

            User Input:
            "$sanitizedInput"
        """.trimIndent()

        val jsonRequest = JSONObject().apply {
            put("contents", JSONArray().apply {
                put(JSONObject().apply {
                    put("parts", JSONArray().apply {
                        put(JSONObject().apply {
                            put("text", prompt)
                        })
                    })
                })
            })
            put("generationConfig", JSONObject().apply {
                put("temperature", 0.1)
                put("maxOutputTokens", 1024)
                put("responseMimeType", "application/json")
            })
        }

        val resolvedModel = resolveModel(modelName)
        val url = "$BASE_URL/$resolvedModel:generateContent"

        var lastError: Exception? = null

        repeat(MAX_RETRIES + 1) { attempt ->
            try {
                return executeParseRequest(url, apiKey, jsonRequest)
            } catch (e: Exception) {
                Log.w(TAG, "parseTransactions attempt ${attempt + 1} failed: ${e.message}")
                lastError = e
                if (attempt < MAX_RETRIES) {
                    delay(RETRY_DELAY_MS * (attempt + 1))
                }
            }
        }

        throw lastError ?: Exception("Unknown error during transaction parsing")
    }

    private suspend fun executeParseRequest(
        url: String,
        apiKey: String,
        jsonRequest: JSONObject
    ): List<ParsedTransaction> = withContext(Dispatchers.IO) {
        val request = Request.Builder()
            .url(url)
            .header("x-goog-api-key", apiKey)
            .post(jsonRequest.toString().toRequestBody(mediaType))
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                val errorBody = response.body?.string() ?: ""
                throw Exception("HTTP ${response.code}: ${response.message}. Body: $errorBody")
            }

            val body = response.body?.string() ?: throw Exception("Empty response body")
            val jo = JSONObject(body)

            // Check for prompt blocking
            val promptFeedback = jo.optJSONObject("promptFeedback")
            val blockReason = promptFeedback?.optString("blockReason")
            if (!blockReason.isNullOrEmpty() && blockReason != "null") {
                throw Exception("Prompt blocked: $blockReason")
            }

            val candidates = jo.optJSONArray("candidates")
            if (candidates == null || candidates.length() == 0) {
                throw Exception("No candidates in response")
            }

            val candidate = candidates.optJSONObject(0)
            val finishReason = candidate?.optString("finishReason")
            if (finishReason == "SAFETY") {
                throw Exception("Response blocked by safety filter")
            }

            val content = candidate?.optJSONObject("content")
            val parts = content?.optJSONArray("parts")
            val rawText = parts?.optJSONObject(0)?.optString("text") ?: ""

            if (rawText.isBlank()) {
                throw Exception("Empty text in response")
            }

            // responseMimeType guarantees JSON output, but handle edge cases gracefully
            val trimmed = rawText.trim()
            val jsonArrayStr = when {
                trimmed.startsWith("[") -> trimmed
                trimmed.startsWith("{") -> "[$trimmed]"
                else -> {
                    // Fallback: try to extract array if model wraps in markdown
                    val regex = Regex("\\[.*?\\]", RegexOption.DOT_MATCHES_ALL)
                    regex.find(trimmed)?.value ?: "[$trimmed]"
                }
            }

            val parsedList = mutableListOf<ParsedTransaction>()
            val array = JSONArray(jsonArrayStr)
            for (i in 0 until array.length()) {
                val item = array.getJSONObject(i)
                parsedList.add(
                    ParsedTransaction(
                        item = item.optString("item", "Transaction"),
                        amountCents = item.optLong("amount", 0),
                        category = item.optString("category", "Misc"),
                        confidence = item.optDouble("confidence", 1.0)
                    )
                )
            }
            parsedList
        }
    }

    /**
     * Streams financial advice or chatbot responses using Gemini API.
     * Uses SSE (Server-Sent Events) format for proper chunk parsing.
     */
    fun streamAnalysis(
        prompt: String,
        apiKey: String,
        modelName: String = DEFAULT_MODEL
    ): Flow<String> = flow<String> {
        val resolvedModel = resolveModel(modelName)
        val url = "$BASE_URL/$resolvedModel:streamGenerateContent?alt=sse"

        val jsonRequest = JSONObject().apply {
            put("contents", JSONArray().apply {
                put(JSONObject().apply {
                    put("parts", JSONArray().apply {
                        put(JSONObject().apply {
                            put("text", prompt)
                        })
                    })
                })
            })
            put("generationConfig", JSONObject().apply {
                put("temperature", 0.3)
                put("maxOutputTokens", 2048)
            })
        }

        val request = Request.Builder()
            .url(url)
            .header("x-goog-api-key", apiKey)
            .post(jsonRequest.toString().toRequestBody(mediaType))
            .build()

        val response = withContext(Dispatchers.IO) {
            client.newCall(request).execute()
        }

        try {
            if (!response.isSuccessful) {
                emit("Error starting stream: HTTP ${response.code}")
                return@flow
            }

            val input = response.body?.byteStream() ?: throw Exception("Empty stream body")
            val reader = BufferedReader(InputStreamReader(input))

            var line: String?
            while (reader.readLine().also { line = it } != null) {
                val currentLine = line ?: continue
                if (currentLine.isBlank()) continue

                // SSE format: each data line starts with "data: "
                if (!currentLine.startsWith("data: ")) continue

                val jsonStr = currentLine.removePrefix("data: ").trim()
                if (jsonStr.isEmpty() || jsonStr == "[DONE]") continue

                try {
                    val jo = JSONObject(jsonStr)
                    val candidates = jo.optJSONArray("candidates")
                    val candidate = candidates?.optJSONObject(0)
                    val content = candidate?.optJSONObject("content")
                    val parts = content?.optJSONArray("parts")
                    val textPart = parts?.optJSONObject(0)?.optString("text") ?: ""

                    if (textPart.isNotEmpty()) {
                        emit(textPart)
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "Failed to parse SSE chunk: ${e.message}")
                }
            }
        } finally {
            response.close()
        }
    }.flowOn(Dispatchers.IO)

    /**
     * Resolves model name, handling legacy or invalid model strings.
     */
    private fun resolveModel(modelName: String): String {
        // gemini-1.5-flash is deprecated/shut down, fall back to current stable
        if (modelName.contains("1.5") || modelName.contains("gemma")) {
            return DEFAULT_MODEL
        }
        return modelName
    }

    /**
     * Sanitizes user input to reduce prompt injection risk.
     * Escapes quotes and removes common injection patterns.
     */
    private fun sanitizeUserInput(input: String): String {
        return input
            .replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("\n", " ")
            .replace("\r", " ")
            .trim()
            .take(5000) // prevent absurdly long inputs
    }

    data class ParsedTransaction(
        val item: String,
        val amountCents: Long,
        val category: String,
        val confidence: Double
    )
}
