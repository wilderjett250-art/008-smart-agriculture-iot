package com.example.test_app.util;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;

import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.ResponseBody;

public class ApiClient {
    private static final OkHttpClient CLIENT = new OkHttpClient();
    private static final String BASE_URL = "http://115.29.195.177";
    private static final MediaType JSON = MediaType.parse("application/json; charset=utf-8");

    public static String getBaseUrl() {
        return BASE_URL;
    }

    public interface JsonCallback {
        void onSuccess(JSONObject jsonObject);
        void onFailure(String error);
    }

    public static void get(String path, String token, JsonCallback callback) {
        Request.Builder builder = new Request.Builder().url(BASE_URL + path).get();
        if (token != null && !token.isEmpty()) {
            builder.addHeader("Authorization", "Bearer " + token);
        }

        CLIENT.newCall(builder.build()).enqueue(new okhttp3.Callback() {
            @Override
            public void onFailure(okhttp3.Call call, IOException e) {
                callback.onFailure("网络请求失败: " + e.getMessage());
            }

            @Override
            public void onResponse(okhttp3.Call call, Response response) throws IOException {
                try (ResponseBody body = response.body()) {
                    if (!response.isSuccessful()) {
                        callback.onFailure("请求失败: " + response.code() + " " + response.message());
                        return;
                    }

                    String content = body != null ? body.string() : "{}";
                    try {
                        callback.onSuccess(new JSONObject(content));
                    } catch (JSONException e) {
                        callback.onFailure("响应解析失败: " + e.getMessage());
                    }
                }
            }
        });
    }

    public static void post(String path, JSONObject payload, String token, JsonCallback callback) {
        RequestBody requestBody = RequestBody.create(payload.toString(), JSON);
        Request.Builder builder = new Request.Builder()
                .url(BASE_URL + path)
                .post(requestBody)
                .addHeader("Content-Type", "application/json");

        if (token != null && !token.isEmpty()) {
            builder.addHeader("Authorization", "Bearer " + token);
        }

        CLIENT.newCall(builder.build()).enqueue(new okhttp3.Callback() {
            @Override
            public void onFailure(okhttp3.Call call, IOException e) {
                callback.onFailure("网络请求失败: " + e.getMessage());
            }

            @Override
            public void onResponse(okhttp3.Call call, Response response) throws IOException {
                try (ResponseBody body = response.body()) {
                    if (!response.isSuccessful()) {
                        callback.onFailure("请求失败: " + response.code() + " " + response.message());
                        return;
                    }

                    String content = body != null ? body.string() : "{}";
                    try {
                        callback.onSuccess(new JSONObject(content));
                    } catch (JSONException e) {
                        callback.onFailure("响应解析失败: " + e.getMessage());
                    }
                }
            }
        });
    }
}
