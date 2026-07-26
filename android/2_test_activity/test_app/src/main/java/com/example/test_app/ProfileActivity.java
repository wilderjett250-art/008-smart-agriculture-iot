package com.example.test_app;

import android.app.DownloadManager;
import android.content.DialogInterface;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageButton;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;

import com.example.test_app.util.ApiClient;
import com.example.test_app.util.SessionManager;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class ProfileActivity extends AppCompatActivity {
    private SessionManager sessionManager;
    private TextView tvProfileName;
    private TextView tvProfileMeta;
    private TextView tvPasswordStatus;
    private TextView tvExportStatus;
    private TextView tvUserListStatus;
    private EditText etCurrentPassword;
    private EditText etNewPassword;
    private EditText etExportGroupType;
    private EditText etExportPlantCode;
    private EditText etExportDeviceCode;
    private EditText etExportStartTime;
    private EditText etExportEndTime;
    private Button btnChangePassword;
    private Button btnLogout;
    private Button btnExportCsv;
    private Button btnExportExcel;
    private Button btnRefreshUsers;
    private LinearLayout layoutAdminUsers;
    private LinearLayout layoutUserList;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_profile);

        sessionManager = new SessionManager(this);
        tvProfileName = findViewById(R.id.tvProfileName);
        tvProfileMeta = findViewById(R.id.tvProfileMeta);
        tvPasswordStatus = findViewById(R.id.tvPasswordStatus);
        tvExportStatus = findViewById(R.id.tvExportStatus);
        tvUserListStatus = findViewById(R.id.tvUserListStatus);
        etCurrentPassword = findViewById(R.id.etCurrentPassword);
        etNewPassword = findViewById(R.id.etNewPassword);
        etExportGroupType = findViewById(R.id.etExportGroupType);
        etExportPlantCode = findViewById(R.id.etExportPlantCode);
        etExportDeviceCode = findViewById(R.id.etExportDeviceCode);
        etExportStartTime = findViewById(R.id.etExportStartTime);
        etExportEndTime = findViewById(R.id.etExportEndTime);
        btnChangePassword = findViewById(R.id.btnChangePassword);
        btnLogout = findViewById(R.id.btnLogout);
        btnExportCsv = findViewById(R.id.btnExportCsv);
        btnExportExcel = findViewById(R.id.btnExportExcel);
        btnRefreshUsers = findViewById(R.id.btnRefreshUsers);
        layoutAdminUsers = findViewById(R.id.layoutAdminUsers);
        layoutUserList = findViewById(R.id.layoutUserList);
        ImageButton btnBack = findViewById(R.id.btnProfileBack);

        String displayName = sessionManager.getDisplayName();
        if (displayName == null || displayName.isEmpty()) {
            displayName = sessionManager.getUsername();
        }
        tvProfileName.setText(displayName);
        tvProfileMeta.setText(sessionManager.getUsername() + "  ·  " + sessionManager.getRole());

        btnBack.setOnClickListener(v -> finish());
        btnLogout.setOnClickListener(v -> logout());
        btnChangePassword.setOnClickListener(v -> changePassword());
        btnExportCsv.setOnClickListener(v -> downloadDataset("csv"));
        btnExportExcel.setOnClickListener(v -> downloadDataset("excel"));
        btnRefreshUsers.setOnClickListener(v -> loadUsers());

        if ("admin".equals(sessionManager.getRole())) {
            layoutAdminUsers.setVisibility(View.VISIBLE);
            loadUsers();
        } else {
            layoutAdminUsers.setVisibility(View.GONE);
        }
    }

    private void changePassword() {
        String currentPassword = etCurrentPassword.getText().toString().trim();
        String newPassword = etNewPassword.getText().toString().trim();
        if (currentPassword.isEmpty() || newPassword.isEmpty()) {
            tvPasswordStatus.setText("请输入当前密码和新密码");
            return;
        }

        btnChangePassword.setEnabled(false);
        try {
            JSONObject payload = new JSONObject();
            payload.put("current_password", currentPassword);
            payload.put("new_password", newPassword);

            ApiClient.post("/api/auth/change-password", payload, sessionManager.getToken(), new ApiClient.JsonCallback() {
                @Override
                public void onSuccess(JSONObject jsonObject) {
                    runOnUiThread(() -> {
                        btnChangePassword.setEnabled(true);
                        tvPasswordStatus.setText("密码已更新，请重新登录");
                        logout();
                    });
                }

                @Override
                public void onFailure(String error) {
                    runOnUiThread(() -> {
                        btnChangePassword.setEnabled(true);
                        tvPasswordStatus.setText(error);
                    });
                }
            });
        } catch (JSONException e) {
            btnChangePassword.setEnabled(true);
            tvPasswordStatus.setText("请求构建失败");
        }
    }

    private void logout() {
        sessionManager.clearSession();
        Intent intent = new Intent(this, LoginActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        startActivity(intent);
        finish();
    }

    private void downloadDataset(String format) {
        String suffix = "excel".equals(format) ? "xls" : "csv";
        String fileName = "flower_dataset_" + System.currentTimeMillis() + "." + suffix;
        Uri.Builder uriBuilder = Uri.parse(ApiClient.getBaseUrl() + "/api/dataset/export").buildUpon()
                .appendQueryParameter("format", format)
                .appendQueryParameter("limit", "5000");

        appendQuery(uriBuilder, "group_type", etExportGroupType.getText().toString());
        appendQuery(uriBuilder, "plant_code", etExportPlantCode.getText().toString());
        appendQuery(uriBuilder, "device_code", etExportDeviceCode.getText().toString());
        appendQuery(uriBuilder, "start_time", etExportStartTime.getText().toString());
        appendQuery(uriBuilder, "end_time", etExportEndTime.getText().toString());

        String url = uriBuilder.build().toString();

        try {
            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
            request.setTitle("导出数据集");
            request.setDescription("正在下载 " + fileName);
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setMimeType("excel".equals(format) ? "application/vnd.ms-excel" : "text/csv");
            request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName);

            DownloadManager downloadManager = getSystemService(DownloadManager.class);
            if (downloadManager == null) {
                throw new IllegalStateException("下载服务不可用");
            }

            downloadManager.enqueue(request);
            tvExportStatus.setText("已开始下载，文件将保存到 Downloads/" + fileName);
        } catch (Exception downloadError) {
            Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            startActivity(browserIntent);
            tvExportStatus.setText("已切换浏览器下载：" + fileName);
        }
    }

    private void appendQuery(Uri.Builder uriBuilder, String key, String rawValue) {
        if (rawValue == null) {
            return;
        }
        String value = rawValue.trim();
        if (!value.isEmpty()) {
            uriBuilder.appendQueryParameter(key, value);
        }
    }

    private void loadUsers() {
        tvUserListStatus.setText("正在加载账号列表...");
        ApiClient.get("/api/auth/users", sessionManager.getToken(), new ApiClient.JsonCallback() {
            @Override
            public void onSuccess(JSONObject jsonObject) {
                runOnUiThread(() -> {
                    JSONArray array = jsonObject.optJSONArray("data");
                    renderUserList(array);
                });
            }

            @Override
            public void onFailure(String error) {
                runOnUiThread(() -> tvUserListStatus.setText(error));
            }
        });
    }

    private void renderUserList(JSONArray array) {
        layoutUserList.removeAllViews();
        if (array == null || array.length() == 0) {
            tvUserListStatus.setText("暂无账号数据");
            return;
        }

        int count = 0;
        for (int i = 0; i < array.length(); i++) {
            JSONObject item = array.optJSONObject(i);
            if (item == null) {
                continue;
            }
            layoutUserList.addView(createUserRow(item));
            count++;
        }

        tvUserListStatus.setText("共 " + count + " 个账号");
    }

    private View createUserRow(JSONObject user) {
        String username = user.optString("username", "-");
        String displayName = user.optString("display_name", "");
        String role = user.optString("role", "-");
        boolean isActive = user.optInt("is_active", 1) == 1;

        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        row.setPadding(dp(14), dp(12), dp(14), dp(12));

        LinearLayout.LayoutParams rowParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        rowParams.bottomMargin = dp(10);
        row.setLayoutParams(rowParams);
        row.setBackgroundResource(R.drawable.bg_card_alt);

        LinearLayout infoLayout = new LinearLayout(this);
        infoLayout.setOrientation(LinearLayout.VERTICAL);
        LinearLayout.LayoutParams infoParams = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        infoLayout.setLayoutParams(infoParams);

        TextView title = new TextView(this);
        title.setText(displayName == null || displayName.isEmpty() ? username : displayName + " (" + username + ")");
        title.setTextColor(getColor(R.color.text_main));
        title.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);

        TextView meta = new TextView(this);
        meta.setText("角色: " + role + "  状态: " + (isActive ? "启用" : "停用") + "  最近登录: " + user.optString("last_login_at", "-"));
        meta.setTextColor(getColor(R.color.text_muted));
        meta.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);

        infoLayout.addView(title);
        infoLayout.addView(meta);
        row.addView(infoLayout);

        if (canToggleUser(username)) {
            Button toggleButton = new Button(this);
            toggleButton.setText(isActive ? "停用" : "启用");
            toggleButton.setOnClickListener(v -> confirmToggleUser(username, isActive ? 0 : 1));
            row.addView(toggleButton);
        }

        if (canDeleteUser(username)) {
            Button deleteButton = new Button(this);
            deleteButton.setText("删除");
            deleteButton.setOnClickListener(v -> confirmDeleteUser(username));
            row.addView(deleteButton);
        }

        return row;
    }

    private boolean canDeleteUser(String username) {
        if (username == null || username.isEmpty()) {
            return false;
        }
        if (username.equals(sessionManager.getUsername())) {
            return false;
        }
        return !"admin".equals(username);
    }

    private boolean canToggleUser(String username) {
        if (username == null || username.isEmpty()) {
            return false;
        }
        if (username.equals(sessionManager.getUsername())) {
            return false;
        }
        return !"admin".equals(username);
    }

    private void confirmDeleteUser(String username) {
        new AlertDialog.Builder(this)
                .setTitle("删除账号")
                .setMessage("确认删除账号 " + username + " 吗？删除后会同时清除登录会话。")
                .setNegativeButton("取消", null)
                .setPositiveButton("删除", (DialogInterface dialog, int which) -> deleteUser(username))
                .show();
    }

    private void confirmToggleUser(String username, int nextActive) {
        String actionLabel = nextActive == 1 ? "启用" : "停用";
        String message = nextActive == 1
                ? "确认启用账号 " + username + " 吗？"
                : "确认停用账号 " + username + " 吗？停用后该账号会立即退出当前登录状态。";
        new AlertDialog.Builder(this)
                .setTitle(actionLabel + "账号")
                .setMessage(message)
                .setNegativeButton("取消", null)
                .setPositiveButton(actionLabel, (DialogInterface dialog, int which) -> toggleUserActive(username, nextActive))
                .show();
    }

    private void deleteUser(String username) {
        tvUserListStatus.setText("正在删除账号 " + username + " ...");
        try {
            JSONObject payload = new JSONObject();
            payload.put("username", username);
            ApiClient.post("/api/auth/users/delete", payload, sessionManager.getToken(), new ApiClient.JsonCallback() {
                @Override
                public void onSuccess(JSONObject jsonObject) {
                    runOnUiThread(() -> {
                        tvUserListStatus.setText("已删除账号 " + username);
                        loadUsers();
                    });
                }

                @Override
                public void onFailure(String error) {
                    runOnUiThread(() -> tvUserListStatus.setText(error));
                }
            });
        } catch (JSONException e) {
            tvUserListStatus.setText("删除请求构建失败");
        }
    }

    private void toggleUserActive(String username, int nextActive) {
        String actionLabel = nextActive == 1 ? "启用" : "停用";
        tvUserListStatus.setText("正在" + actionLabel + "账号 " + username + " ...");
        try {
            JSONObject payload = new JSONObject();
            payload.put("username", username);
            payload.put("is_active", nextActive);
            ApiClient.post("/api/auth/users/toggle-active", payload, sessionManager.getToken(), new ApiClient.JsonCallback() {
                @Override
                public void onSuccess(JSONObject jsonObject) {
                    runOnUiThread(() -> {
                        tvUserListStatus.setText("已" + actionLabel + "账号 " + username);
                        loadUsers();
                    });
                }

                @Override
                public void onFailure(String error) {
                    runOnUiThread(() -> tvUserListStatus.setText(error));
                }
            });
        } catch (JSONException e) {
            tvUserListStatus.setText("状态切换请求构建失败");
        }
    }

    private int dp(int value) {
        return Math.round(TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP,
                value,
                getResources().getDisplayMetrics()
        ));
    }
}
