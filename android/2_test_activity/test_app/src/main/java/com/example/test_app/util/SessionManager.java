package com.example.test_app.util;

import android.content.Context;
import android.content.SharedPreferences;

public class SessionManager {
    private static final String PREF_NAME = "flower_app_session";
    private static final String KEY_TOKEN = "token";
    private static final String KEY_USERNAME = "username";
    private static final String KEY_DISPLAY_NAME = "display_name";
    private static final String KEY_ROLE = "role";

    private final SharedPreferences preferences;

    public SessionManager(Context context) {
        preferences = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
    }

    public void saveSession(String token, String username, String displayName, String role) {
        preferences.edit()
                .putString(KEY_TOKEN, token)
                .putString(KEY_USERNAME, username)
                .putString(KEY_DISPLAY_NAME, displayName)
                .putString(KEY_ROLE, role)
                .apply();
    }

    public void clearSession() {
        preferences.edit().clear().apply();
    }

    public String getToken() {
        return preferences.getString(KEY_TOKEN, "");
    }

    public String getUsername() {
        return preferences.getString(KEY_USERNAME, "");
    }

    public String getDisplayName() {
        return preferences.getString(KEY_DISPLAY_NAME, "");
    }

    public String getRole() {
        return preferences.getString(KEY_ROLE, "");
    }

    public boolean hasToken() {
        String token = getToken();
        return token != null && !token.isEmpty();
    }
}
