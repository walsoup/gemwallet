package com.walsoup.gemwallet.ai

import android.util.Log
import kotlinx.coroutines.Dispatchers
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
        .readTimeout(60, TimeUnit.SECONDS)
        .build()

    private val mediaType = "application/json; charset=utf-8".toMediaType()

    /**
     * Parses transaction inputs into structured JSON using Gemini API
     */
    suspend fun parseTransactions(
        text: String,
        categories: List<String>,
        apiKey: String,
        modelName: String = "gemini-1.5-flash"
    ): List<ParsedTransaction> {
        val categoryListStr = categories.joinToString(", ")
        val prompt = """
            You are a data extraction engine for a cash-tracking application. 
            Your sole function is to parse the user's input, identify distinct financial transactions, extract the numerical cost in decimal format, assign a logical category from the provided list, and output strictly in a JSON array. 
            Do not provide conversational filler.

            Available Categories: ${categoryListStr}
            Fallback Category: Misc

            Required JSON schema:
            [{"item": "String", "amount": Number, "category": "String", "confidence": Number}]

            Rules:
            - 'amount' must be an integer representing cents (e.g., $5.00 -> 500, $0.40 -> 40).
            - 'category' must exactly match one of the Available Categories. If unsure, use the Fallback Category.
            - 'confidence' is a float between 0.0 and 1.0.

            User Input:
            "$text"
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
            })
        }

        // Use the model provided but map known custom placeholders if they fail
        val resolvedModel = if (modelName.contains("gemma")) "gemini-1.5-flash" else modelName
        val url = "https://generativelanguage.googleapis.com/v1beta/models/$resolvedModel:generateContent?key=$apiKey"

        val request = Request.Builder()
            .url(url)
            .post(jsonRequest.toString().toRequestBody(mediaType))
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                throw Exception("HTTP Error: ${response.code} ${response.message}")
            }
            val body = response.body?.string() ?: throw Exception("Empty response body")
            val jo = JSONObject(body)
            val candidates = jo.optJSONArray("candidates")
            val content = candidates?.optJSONObject(0)?.optJSONObject("content")
            val parts = content?.optJSONArray("parts")
            val rawText = parts?.optJSONObject(0)?.optString("text") ?: ""

            // Extract JSON array
            val regex = Regex("\\[.*\\]", RegexOption.DOT_MATCHES_ALL)
            val matchResult = regex.find(rawText)
            val jsonArrayStr = matchResult?.value ?: rawText

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
            return parsedList
        }
    }

    /**
     * Streams financial advice or chatbot responses using Gemini API
     */
    fun streamAnalysis(
        prompt: String,
        apiKey: String,
        modelName: String = "gemini-1.5-flash"
    ): Flow<String> = flow<String> {
        // Map gemma custom placeholder to gemini model to ensure live calls work
        val resolvedModel = if (modelName.contains("gemma")) "gemini-1.5-flash" else modelName
        val url = "https://generativelanguage.googleapis.com/v1beta/models/$resolvedModel:streamGenerateContent?key=$apiKey"

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
                put("maxOutputTokens", 512)
                put("topP", 0.85)
            })
        }

        val request = Request.Builder()
            .url(url)
            .post(jsonRequest.toString().toRequestBody(mediaType))
            .build()

        val response = client.newCall(request).execute()
        try {
            if (!response.isSuccessful) {
                emit("Error starting stream: HTTP ${response.code}")
                return@flow
            }
            val input = response.body?.byteStream() ?: throw Exception("Empty stream body")
            val reader = BufferedReader(InputStreamReader(input))
            var line: String?
            val buffer = StringBuilder()

            // SSE or chunked parsing
            while (reader.readLine().also { line = it } != null) {
                val currentLine = line?.trim() ?: continue
                if (currentLine.isEmpty()) continue

                // Check for JSON chunk
                if (currentLine.startsWith("\"text\":") || currentLine.contains("\"text\"")) {
                    // Extract text string using simple regex or JSON parser on the line
                    // Since it's nested JSON, let's collect full chunks if they represent JSON objects
                }
                
                buffer.append(currentLine)
                
                // Gemini returns JSON array chunks: [ { ... }, { ... } ] or similar
                // We can parse the buffer when we detect a complete JSON block
                try {
                    val candidateJson = if (buffer.startsWith("[")) {
                        buffer.toString()
                    } else {
                        "[${buffer}]"
                    }
                    val arr = JSONArray(candidateJson)
                    for (i in 0 until arr.length()) {
                        val jo = arr.optJSONObject(i)
                        val candidates = jo?.optJSONArray("candidates")
                        val content = candidates?.optJSONObject(0)?.optJSONObject("content")
                        val parts = content?.optJSONArray("parts")
                        val textPart = parts?.optJSONObject(0)?.optString("text") ?: ""
                        if (textPart.isNotEmpty()) {
                            emit(textPart)
                        }
                    }
                    buffer.setLength(0) // Clear buffer on success
                } catch (e: Exception) {
                    // Buffer incomplete, keep reading lines
                }
            }
            
            // Final check on remaining buffer
            if (buffer.isNotEmpty()) {
                try {
                    val cleanStr = buffer.toString().trim()
                    if (cleanStr.startsWith("{")) {
                        val jo = JSONObject(cleanStr)
                        val candidates = jo.optJSONArray("candidates")
                        val content = candidates?.optJSONObject(0)?.optJSONObject("content")
                        val parts = content?.optJSONArray("parts")
                        val textPart = parts?.optJSONObject(0)?.optString("text") ?: ""
                        if (textPart.isNotEmpty()) {
                            emit(textPart)
                        }
                    }
                } catch (e: Exception) {
                    // Ignore final errors
                }
            }
        } finally {
            response.close()
        }.flowOn(Dispatchers.IO)
    }

    data class ParsedTransaction(
        val item: String,
        val amountCents: Long,
        val category: String,
        val confidence: Double
    )
}
