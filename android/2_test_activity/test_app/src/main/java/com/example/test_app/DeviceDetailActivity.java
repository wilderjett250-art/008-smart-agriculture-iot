package com.example.test_app;

import android.os.Bundle;
import android.view.View;
import android.widget.ImageButton;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.example.test_app.adapter.HistoryAdapter;
import com.example.test_app.model.HistoryItem;
import com.example.test_app.util.ApiClient;
import com.example.test_app.util.SessionManager;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public class DeviceDetailActivity extends AppCompatActivity {
    private SessionManager sessionManager;
    private String deviceCode;
    private String deviceType;
    private HistoryAdapter historyAdapter;
    private TextView tvDeviceTitle;
    private TextView tvMeta;
    private TextView tvMetric1Label;
    private TextView tvMetric1Value;
    private TextView tvMetric2Label;
    private TextView tvMetric2Value;
    private TextView tvMetric3Label;
    private TextView tvMetric3Value;
    private TextView tvMetric4Label;
    private TextView tvMetric4Value;
    private TextView tvMetric5Label;
    private TextView tvMetric5Value;
    private TextView tvMetric6Label;
    private TextView tvMetric6Value;
    private TextView tvMetric7Label;
    private TextView tvMetric7Value;
    private TextView tvMetric8Label;
    private TextView tvMetric8Value;
    private LinearLayout layoutMetricRow3;
    private LinearLayout layoutMetricRow4;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_device_detail);

        sessionManager = new SessionManager(this);
        deviceCode = getIntent().getStringExtra("device_code");
        deviceType = getIntent().getStringExtra("device_type");
        String plantCode = getIntent().getStringExtra("plant_code");
        String potCode = getIntent().getStringExtra("pot_code");

        tvDeviceTitle = findViewById(R.id.tvDetailTitle);
        tvMeta = findViewById(R.id.tvDetailMeta);
        tvMetric1Label = findViewById(R.id.tvMetric1Label);
        tvMetric1Value = findViewById(R.id.tvMetric1Value);
        tvMetric2Label = findViewById(R.id.tvMetric2Label);
        tvMetric2Value = findViewById(R.id.tvMetric2Value);
        tvMetric3Label = findViewById(R.id.tvMetric3Label);
        tvMetric3Value = findViewById(R.id.tvMetric3Value);
        tvMetric4Label = findViewById(R.id.tvMetric4Label);
        tvMetric4Value = findViewById(R.id.tvMetric4Value);
        tvMetric5Label = findViewById(R.id.tvMetric5Label);
        tvMetric5Value = findViewById(R.id.tvMetric5Value);
        tvMetric6Label = findViewById(R.id.tvMetric6Label);
        tvMetric6Value = findViewById(R.id.tvMetric6Value);
        tvMetric7Label = findViewById(R.id.tvMetric7Label);
        tvMetric7Value = findViewById(R.id.tvMetric7Value);
        tvMetric8Label = findViewById(R.id.tvMetric8Label);
        tvMetric8Value = findViewById(R.id.tvMetric8Value);
        layoutMetricRow3 = findViewById(R.id.layoutMetricRow3);
        layoutMetricRow4 = findViewById(R.id.layoutMetricRow4);

        ImageButton btnBack = findViewById(R.id.btnBack);
        ImageButton btnRefresh = findViewById(R.id.btnDetailRefresh);
        RecyclerView recyclerHistory = findViewById(R.id.recyclerHistory);

        tvDeviceTitle.setText(deviceCode);
        tvMeta.setText("植株 " + safe(plantCode) + "  /  盆 " + safe(potCode) + "  /  " + safe(deviceType));
        bindMetricLabels();

        historyAdapter = new HistoryAdapter();
        recyclerHistory.setLayoutManager(new LinearLayoutManager(this));
        recyclerHistory.setAdapter(historyAdapter);

        btnBack.setOnClickListener(v -> finish());
        btnRefresh.setOnClickListener(v -> loadData());

        loadData();
    }

    private boolean isAirDevice() {
        return "air_4in1".equals(deviceType);
    }

    private void bindMetricLabels() {
        if (isAirDevice()) {
            tvMetric1Label.setText("空气温度");
            tvMetric2Label.setText("空气湿度");
            tvMetric3Label.setText("二氧化碳");
            tvMetric4Label.setText("光照强度");
            layoutMetricRow3.setVisibility(View.GONE);
            layoutMetricRow4.setVisibility(View.GONE);
        } else {
            tvMetric1Label.setText("土壤温度");
            tvMetric2Label.setText("土壤湿度");
            tvMetric3Label.setText("土壤 pH");
            tvMetric4Label.setText("土壤电导率");
            tvMetric5Label.setText("土壤盐度");
            tvMetric6Label.setText("土壤氮");
            tvMetric7Label.setText("土壤磷");
            tvMetric8Label.setText("土壤钾");
            layoutMetricRow3.setVisibility(View.VISIBLE);
            layoutMetricRow4.setVisibility(View.VISIBLE);
        }
    }

    private void loadData() {
        loadLatest();
        loadHistory();
    }

    private void loadLatest() {
        ApiClient.get("/api/sensor/latest?device_code=" + deviceCode, sessionManager.getToken(), new ApiClient.JsonCallback() {
            @Override
            public void onSuccess(JSONObject jsonObject) {
                runOnUiThread(() -> {
                    JSONObject data = jsonObject.optJSONObject("data");
                    if (data == null) {
                        return;
                    }
                    if (isAirDevice()) {
                        tvMetric1Value.setText(data.optString("temperature", "-") + " °C");
                        tvMetric2Value.setText(data.optString("humidity", "-") + " %");
                        tvMetric3Value.setText(data.optString("co2", "-") + " ppm");
                        tvMetric4Value.setText(data.optString("lux", "-") + " lux");
                    } else {
                        tvMetric1Value.setText(data.optString("temperature", "-") + " °C");
                        tvMetric2Value.setText(data.optString("humidity", "-") + " %");
                        tvMetric3Value.setText(data.optString("ph", "-"));
                        tvMetric4Value.setText(data.optString("ec", "-"));
                        tvMetric5Value.setText(data.optString("salinity", "-"));
                        tvMetric6Value.setText(data.optString("nitrogen", "-"));
                        tvMetric7Value.setText(data.optString("phosphorus", "-"));
                        tvMetric8Value.setText(data.optString("potassium", "-"));
                    }
                });
            }

            @Override
            public void onFailure(String error) {
                runOnUiThread(() -> tvMetric1Value.setText(error));
            }
        });
    }

    private void loadHistory() {
        ApiClient.get("/api/sensor/history?device_code=" + deviceCode + "&limit=20", sessionManager.getToken(), new ApiClient.JsonCallback() {
            @Override
            public void onSuccess(JSONObject jsonObject) {
                runOnUiThread(() -> {
                    List<HistoryItem> items = new ArrayList<>();
                    JSONArray array = jsonObject.optJSONArray("data");
                    if (array != null) {
                        for (int i = 0; i < array.length(); i++) {
                            JSONObject item = array.optJSONObject(i);
                            if (item != null) {
                                items.add(HistoryItem.fromJson(item));
                            }
                        }
                    }
                    historyAdapter.submitList(items, isAirDevice());
                });
            }

            @Override
            public void onFailure(String error) {
                runOnUiThread(() -> {
                    List<HistoryItem> items = new ArrayList<>();
                    HistoryItem item = new HistoryItem();
                    item.collectedAt = "加载失败";
                    item.temperature = error;
                    item.humidity = "-";
                    item.ph = "-";
                    item.ec = "-";
                    item.salinity = "-";
                    item.nitrogen = "-";
                    item.phosphorus = "-";
                    item.potassium = "-";
                    item.co2 = "-";
                    item.lux = "-";
                    items.add(item);
                    historyAdapter.submitList(items, isAirDevice());
                });
            }
        });
    }

    private String safe(String value) {
        return value == null || value.isEmpty() || "null".equals(value) ? "-" : value;
    }
}
