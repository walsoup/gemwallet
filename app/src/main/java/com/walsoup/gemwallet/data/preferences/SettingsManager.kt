package com.walsoup.gemwallet.data.preferences

import android.content.Context
import android.content.SharedPreferences
import android.util.Base64
import android.util.Log
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.security.MessageDigest
import java.security.SecureRandom
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.PBEKeySpec

class SettingsManager private constructor(context: Context) {

    private val prefs: SharedPreferences = context.getSharedPreferences(
        "gemwallet_settings", Context.MODE_PRIVATE
    )

    private val securePrefs: SharedPreferences = try {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        EncryptedSharedPreferences.create(
            context,
            "gemwallet_secure_settings_enc",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    } catch (e: Exception) {
        Log.e("SettingsManager", "EncryptedSharedPreferences init failed, secure storage unavailable", e)
        throw SecurityException("Failed to initialize encrypted preferences", e)
    }

    data class SettingsState(
        val themePreference: String = "dark",
        val oledTrueBlackEnabled: Boolean = true,
        val highContrastEnabled: Boolean = false,
        val themePrimary: String = "#ff6b6b",
        val themeSecondary: String = "#52dea2",
        val secureAccessEnabled: Boolean = false,
        val biometricAuthEnabled: Boolean = false,
        val notificationsTransactionAlerts: Boolean = true,
        val notificationsWeeklySummary: Boolean = true,
        val notificationsSavingsGoalProgress: Boolean = true,
        val notificationsBudgetWarnings: Boolean = true,
        val passcodeEnabled: Boolean = false,
        val currencyCode: String = "USD",
        val language: String = "en-US",
        val region: String = "US",
        val aiProvider: String = "google",
        val aiFeaturesEnabled: Boolean = false,
        val gemmaModel: String = "gemma-4-31b-it",
        val localModelId: String = "gemma-4-e2b-it",
        val localModelDownloaded: Boolean = false,
        val smartCategorizationEnabled: Boolean = true,
        val advancedSummariesEnabled: Boolean = false,
        val includeNotesInExport: Boolean = true,
        val setupCoachDismissed: Boolean = false,
        val backupConfigured: Boolean = false,
        val customGreetingName: String = "",
        val hasCompletedOnboarding: Boolean = false,
        val voiceAssistantEnabled: Boolean = false,
        val isLoaded: Boolean = true
    )

    private val _settingsState = MutableStateFlow(loadSettings())
    val settingsState: StateFlow<SettingsState> = _settingsState.asStateFlow()

    private fun loadSettings(): SettingsState {
        return SettingsState(
            themePreference = prefs.getString("themePreference", "dark") ?: "dark",
            oledTrueBlackEnabled = prefs.getBoolean("oledTrueBlackEnabled", true),
            highContrastEnabled = prefs.getBoolean("highContrastEnabled", false),
            themePrimary = prefs.getString("themePrimary", "#ff6b6b") ?: "#ff6b6b",
            themeSecondary = prefs.getString("themeSecondary", "#52dea2") ?: "#52dea2",
            secureAccessEnabled = prefs.getBoolean("secureAccessEnabled", false),
            biometricAuthEnabled = prefs.getBoolean("biometricAuthEnabled", false),
            notificationsTransactionAlerts = prefs.getBoolean("notificationsTransactionAlerts", true),
            notificationsWeeklySummary = prefs.getBoolean("notificationsWeeklySummary", true),
            notificationsSavingsGoalProgress = prefs.getBoolean("notificationsSavingsGoalProgress", true),
            notificationsBudgetWarnings = prefs.getBoolean("notificationsBudgetWarnings", true),
            passcodeEnabled = prefs.getBoolean("passcodeEnabled", false),
            currencyCode = prefs.getString("currencyCode", "USD") ?: "USD",
            language = prefs.getString("language", "en-US") ?: "en-US",
            region = prefs.getString("region", "US") ?: "US",
            aiProvider = prefs.getString("aiProvider", "google") ?: "google",
            aiFeaturesEnabled = prefs.getBoolean("aiFeaturesEnabled", false),
            gemmaModel = prefs.getString("gemmaModel", "gemma-4-31b-it") ?: "gemma-4-31b-it",
            localModelId = prefs.getString("localModelId", "gemma-4-e2b-it") ?: "gemma-4-e2b-it",
            localModelDownloaded = prefs.getBoolean("localModelDownloaded", false),
            smartCategorizationEnabled = prefs.getBoolean("smartCategorizationEnabled", true),
            advancedSummariesEnabled = prefs.getBoolean("advancedSummariesEnabled", false),
            includeNotesInExport = prefs.getBoolean("includeNotesInExport", true),
            setupCoachDismissed = prefs.getBoolean("setupCoachDismissed", false),
            backupConfigured = prefs.getBoolean("backupConfigured", false),
            customGreetingName = prefs.getString("customGreetingName", "") ?: "",
            hasCompletedOnboarding = prefs.getBoolean("hasCompletedOnboarding", false),
            voiceAssistantEnabled = prefs.getBoolean("voiceAssistantEnabled", false),
            isLoaded = true
        )
    }

    private fun updatePrefs(block: SharedPreferences.Editor.() -> Unit) {
        val editor = prefs.edit()
        editor.block()
        editor.apply()
        _settingsState.value = loadSettings()
    }

    private fun updatePrefsAndNotify(block: SharedPreferences.Editor.() -> Unit): SettingsState {
        val editor = prefs.edit()
        editor.block()
        editor.apply()
        val newState = loadSettings()
        _settingsState.value = newState
        return newState
    }

    companion object {
        @Volatile private var INSTANCE: SettingsManager? = null

        fun getInstance(context: Context): SettingsManager {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: SettingsManager(context.applicationContext).also { INSTANCE = it }
            }
        }
    }

    // Theme
    fun setThemePreference(valStr: String) = updatePrefs { putString("themePreference", valStr) }
    fun setOledTrueBlackEnabled(enabled: Boolean) = updatePrefs { putBoolean("oledTrueBlackEnabled", enabled) }
    fun setHighContrastEnabled(enabled: Boolean) = updatePrefs { putBoolean("highContrastEnabled", enabled) }
    fun setThemePrimary(color: String) = updatePrefs { putString("themePrimary", color.trim()) }
    fun setThemeSecondary(color: String) = updatePrefs { putString("themeSecondary", color.trim()) }

    // Security
    fun setSecureAccessEnabled(enabled: Boolean) = updatePrefs { putBoolean("secureAccessEnabled", enabled) }
    fun setBiometricAuthEnabled(enabled: Boolean) = updatePrefs { putBoolean("biometricAuthEnabled", enabled) }

    // Notifications
    fun setNotificationsTransactionAlerts(enabled: Boolean) = updatePrefs { putBoolean("notificationsTransactionAlerts", enabled) }
    fun setNotificationsWeeklySummary(enabled: Boolean) = updatePrefs { putBoolean("notificationsWeeklySummary", enabled) }
    fun setNotificationsSavingsGoalProgress(enabled: Boolean) = updatePrefs { putBoolean("notificationsSavingsGoalProgress", enabled) }
    fun setNotificationsBudgetWarnings(enabled: Boolean) = updatePrefs { putBoolean("notificationsBudgetWarnings", enabled) }

    // Passcode with old PIN verification
    fun setPasscodePin(newPin: String, oldPin: String? = null): Result<Unit> {
        return try {
            val currentHash = securePrefs.getString("passcodePinHash", "") ?: ""
            if (currentHash.isNotEmpty()) {
                if (oldPin == null || !verifyPasscodePin(oldPin, currentHash)) {
                    return Result.failure(SecurityException("Current passcode incorrect"))
                }
            }
            val newHash = if (newPin.isNotEmpty()) pbkdf2Hash(newPin) else ""
            securePrefs.edit().putString("passcodePinHash", newHash).apply()
            updatePrefs { putBoolean("passcodeEnabled", newHash.isNotEmpty()) }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun removePasscode(currentPin: String): Result<Unit> {
        return try {
            val currentHash = securePrefs.getString("passcodePinHash", "") ?: ""
            if (currentHash.isEmpty()) {
                return Result.success(Unit)
            }
            if (!verifyPasscodePin(currentPin, currentHash)) {
                return Result.failure(SecurityException("Current passcode incorrect"))
            }
            securePrefs.edit().remove("passcodePinHash").apply()
            updatePrefs { putBoolean("passcodeEnabled", false) }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun verifyPasscodePin(enteredPin: String): Boolean {
        val storedHash = securePrefs.getString("passcodePinHash", "") ?: ""
        return verifyPasscodePin(enteredPin, storedHash)
    }

    // Region / Localization
    fun setCurrencyCode(code: String) = updatePrefs { putString("currencyCode", code) }
    fun setLanguage(lang: String) = updatePrefs { putString("language", lang) }
    fun setRegion(reg: String) = updatePrefs { putString("region", reg) }

    // AI
    fun setAiProvider(provider: String) = updatePrefs { putString("aiProvider", provider) }
    fun setAiFeaturesEnabled(enabled: Boolean) = updatePrefs { putBoolean("aiFeaturesEnabled", enabled) }
    fun setGemmaModel(model: String) = updatePrefs { putString("gemmaModel", model) }
    fun setLocalModelId(modelId: String) = updatePrefs { putString("localModelId", modelId) }
    fun setLocalModelDownloaded(downloaded: Boolean) = updatePrefs { putBoolean("localModelDownloaded", downloaded) }
    fun setSmartCategorizationEnabled(enabled: Boolean) = updatePrefs { putBoolean("smartCategorizationEnabled", enabled) }
    fun setAdvancedSummariesEnabled(enabled: Boolean) = updatePrefs { putBoolean("advancedSummariesEnabled", enabled) }

    // Export / Misc
    fun setIncludeNotesInExport(enabled: Boolean) = updatePrefs { putBoolean("includeNotesInExport", enabled) }
    fun setSetupCoachDismissed(dismissed: Boolean) = updatePrefs { putBoolean("setupCoachDismissed", dismissed) }
    fun setBackupConfigured(configured: Boolean) = updatePrefs { putBoolean("backupConfigured", configured) }
    fun setCustomGreetingName(name: String) = updatePrefs { putString("customGreetingName", name) }
    fun setHasCompletedOnboarding(completed: Boolean) = updatePrefs { putBoolean("hasCompletedOnboarding", completed) }
    fun setVoiceAssistantEnabled(enabled: Boolean) = updatePrefs { putBoolean("voiceAssistantEnabled", enabled) }

    fun clearAllData() {
        updatePrefs { clear() }
        securePrefs.edit().clear().apply()
    }

    fun resetSettings() {
        securePrefs.edit().remove("passcodePinHash").apply()
        updatePrefs {
            val onboarded = prefs.getBoolean("hasCompletedOnboarding", false)
            clear()
            putBoolean("hasCompletedOnboarding", onboarded)
        }
    }

    // Secure Storage for API Keys
    fun getGeminiApiKey(): String = securePrefs.getString("gemini_api_key", "") ?: ""

    fun setGeminiApiKey(key: String) {
        securePrefs.edit().putString("gemini_api_key", key).apply()
    }

    fun deleteGeminiApiKey() {
        securePrefs.edit().remove("gemini_api_key").apply()
    }

    fun getHuggingFaceToken(): String = securePrefs.getString("hugging_face_token", "") ?: ""

    fun setHuggingFaceToken(token: String) {
        securePrefs.edit().putString("hugging_face_token", token).apply()
    }

    fun deleteHuggingFaceToken() {
        securePrefs.edit().remove("hugging_face_token").apply()
    }

    private fun pbkdf2Hash(pin: String): String {
        val random = SecureRandom()
        val salt = ByteArray(16)
        random.nextBytes(salt)
        return hashPinWithSalt(pin, salt)
    }

    private fun hashPinWithSalt(pin: String, salt: ByteArray): String {
        val iterations = 600_000 // OWASP 2023+ recommendation
        val keyLength = 256
        val spec = PBEKeySpec(pin.toCharArray(), salt, iterations, keyLength)
        val skf = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
        val hash = skf.generateSecret(spec).encoded
        return Base64.encodeToString(salt, Base64.NO_WRAP) + ":" + Base64.encodeToString(hash, Base64.NO_WRAP)
    }

    fun verifyPasscodePin(enteredPin: String, storedHash: String): Boolean {
        if (storedHash.isEmpty()) return false
        return try {
            val parts = storedHash.split(":")
            if (parts.size != 2) return false
            val salt = Base64.decode(parts[0], Base64.NO_WRAP)
            val storedPinHashBytes = Base64.decode(parts[1], Base64.NO_WRAP)
            val computedHashString = hashPinWithSalt(enteredPin, salt)
            val computedPinHashBytes = Base64.decode(computedHashString.split(":")[1], Base64.NO_WRAP)
            MessageDigest.isEqual(storedPinHashBytes, computedPinHashBytes)
        } catch (e: Exception) {
            false
        }
    }
}
