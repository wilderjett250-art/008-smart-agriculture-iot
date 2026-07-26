package com.example.test_app;

import android.content.Intent;
import android.os.Bundle;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import com.example.test_app.util.ApiClient;
import com.example.test_app.util.SessionManager;

import org.json.JSONException;
import org.json.JSONObject;

public class LoginActivity extends AppCompatActivity {
    private EditText etUsername;
    private EditText etPassword;
    private TextView tvError;
    private Button btnLogin;
    private SessionManager sessionManager;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_login);

        sessionManager = new SessionManager(this);
        etUsername = findViewById(R.id.etUsername);
        etPassword = findViewById(R.id.etPassword);
        tvError = findViewById(R.id.tvError);
        btnLogin = findViewById(R.id.btnLogin);

        if (sessionManager.hasToken()) {
            goToDevices();
            return;
        }

        btnLogin.setOnClickListener(v -> doLogin());
    }

    private void doLogin() {
        String username = etUsername.getText().toString().trim();
        String password = etPassword.getText().toString().trim();
        if (username.isEmpty() || password.isEmpty()) {
            tvError.setText("请输入用户名和密码");
            return;
        }

        tvError.setText("");
        btnLogin.setEnabled(false);

        try {
            JSONObject payload = new JSONObject();
            payload.put("username", username);
            payload.put("password", password);

            ApiClient.post("/api/auth/login", payload, null, new ApiClient.JsonCallback() {
                @Override
                public void onSuccess(JSONObject jsonObject) {
                    runOnUiThread(() -> {
                        btnLogin.setEnabled(true);
                        try {
                            JSONObject data = jsonObject.getJSONObject("data");
                            JSONObject user = data.getJSONObject("user");
                            sessionManager.saveSession(
                                    data.optString("access_token", ""),
                                    user.optString("username", ""),
                                    user.optString("display_name", ""),
                                    user.optString("role", "")
                            );
                            goToDevices();
                        } catch (JSONException e) {
                            tvError.setText("登录响应解析失败");
                        }
                    });
                }

                @Override
                public void onFailure(String error) {
                    runOnUiThread(() -> {
                        btnLogin.setEnabled(true);
                        tvError.setText(error);
                    });
                }
            });
        } catch (JSONException e) {
            btnLogin.setEnabled(true);
            tvError.setText("请求构建失败");
        }
    }

    private void goToDevices() {
        Intent intent = new Intent(this, DeviceListActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        startActivity(intent);
        finish();
    }
}
