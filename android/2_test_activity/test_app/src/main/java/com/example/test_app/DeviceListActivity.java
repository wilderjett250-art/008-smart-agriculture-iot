package com.example.test_app;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.ImageButton;
import android.widget.Spinner;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import com.example.test_app.adapter.DeviceAdapter;
import com.example.test_app.model.DeviceItem;
import com.example.test_app.util.ApiClient;
import com.example.test_app.util.SessionManager;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public class DeviceListActivity extends AppCompatActivity {
    private final List<DeviceItem> allDevices = new ArrayList<>();
    private final List<DeviceItem> filteredDevices = new ArrayList<>();
    private SessionManager sessionManager;
    private DeviceAdapter adapter;
    private SwipeRefreshLayout swipeRefreshLayout;
    private Spinner spinnerFilter;
    private TextView tvAccountSummary;
    private TextView tvTotalDevices;
    private TextView tvSoilDevices;
    private TextView tvAirDevices;
    private TextView tvPlants;
    private TextView tvLatestAir;
    private TextView tvEmpty;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_device_list);

        sessionManager = new SessionManager(this);
        if (!sessionManager.hasToken()) {
            backToLogin();
            return;
        }

        tvAccountSummary = findViewById(R.id.tvAccountSummary);
        tvTotalDevices = findViewById(R.id.tvTotalDevices);
        tvSoilDevices = findViewById(R.id.tvSoilDevices);
        tvAirDevices = findViewById(R.id.tvAirDevices);
        tvPlants = findViewById(R.id.tvPlants);
        tvLatestAir = findViewById(R.id.tvLatestAir);
        tvEmpty = findViewById(R.id.tvEmpty);
        spinnerFilter = findViewById(R.id.spinnerFilter);
        swipeRefreshLayout = findViewById(R.id.swipeRefreshLayout);
        RecyclerView recyclerView = findViewById(R.id.recyclerDevices);
        ImageButton btnProfile = findViewById(R.id.btnProfile);
        ImageButton btnRefresh = findViewById(R.id.btnRefresh);

        tvAccountSummary.setText(buildAccountSummary());

        adapter = new DeviceAdapter(item -> {
            Intent intent = new Intent(DeviceListActivity.this, DeviceDetailActivity.class);
            intent.putExtra("device_code", item.deviceCode);
            intent.putExtra("device_type", item.deviceType);
            intent.putExtra("plant_code", item.plantCode);
            intent.putExtra("pot_code", item.potCode);
            startActivity(intent);
        });

        recyclerView.setLayoutManager(new LinearLayoutManager(this));
        recyclerView.setAdapter(adapter);

        ArrayAdapter<String> filterAdapter = new ArrayAdapter<>(
                this,
                android.R.layout.simple_spinner_dropdown_item,
                new String[]{"全部设备", "土壤设备", "空气设备"}
        );
        spinnerFilter.setAdapter(filterAdapter);
        spinnerFilter.setOnItemSelectedListener(new SimpleItemSelectedListener(position -> applyFilter()));

        swipeRefreshLayout.setOnRefreshListener(this::loadData);
        btnRefresh.setOnClickListener(v -> loadData());
        btnProfile.setOnClickListener(v -> startActivity(new Intent(this, ProfileActivity.class)));

        loadData();
    }

    @Override
    protected void onResume() {
        super.onResume();
        tvAccountSummary.setText(buildAccountSummary());
    }

    private String buildAccountSummary() {
        String displayName = sessionManager.getDisplayName();
        if (displayName == null || displayName.isEmpty()) {
            displayName = sessionManager.getUsername();
        }
        return displayName + "  ·  " + sessionManager.getRole();
    }

    private void loadData() {
        swipeRefreshLayout.setRefreshing(true);
        loadOverview();
        loadDevices();
    }

    private void loadOverview() {
        ApiClient.get("/api/dashboard/overview", sessionManager.getToken(), new ApiClient.JsonCallback() {
            @Override
            public void onSuccess(JSONObject jsonObject) {
                runOnUiThread(() -> {
                    JSONObject data = jsonObject.optJSONObject("data");
                    if (data == null) {
                        return;
                    }
                    tvTotalDevices.setText(data.optString("total_devices", "0"));
                    tvSoilDevices.setText(data.optString("soil_devices", "0"));
                    tvAirDevices.setText(data.optString("air_devices", "0"));
                    tvPlants.setText(data.optString("total_plants", "0"));
                    JSONObject latestAir = data.optJSONObject("latest_air");
                    if (latestAir != null) {
                        tvLatestAir.setText("空气 " + latestAir.optString("temperature", "-") + "°C · " + latestAir.optString("humidity", "-") + "%");
                    } else {
                        tvLatestAir.setText("暂无空气记录");
                    }
                });
            }

            @Override
            public void onFailure(String error) {
                runOnUiThread(() -> tvLatestAir.setText(error));
            }
        });
    }

    private void loadDevices() {
        ApiClient.get("/api/device/list", sessionManager.getToken(), new ApiClient.JsonCallback() {
            @Override
            public void onSuccess(JSONObject jsonObject) {
                runOnUiThread(() -> {
                    swipeRefreshLayout.setRefreshing(false);
                    allDevices.clear();
                    JSONArray array = jsonObject.optJSONArray("data");
                    if (array != null) {
                        for (int i = 0; i < array.length(); i++) {
                            JSONObject item = array.optJSONObject(i);
                            if (item != null) {
                                allDevices.add(DeviceItem.fromJson(item));
                            }
                        }
                    }
                    applyFilter();
                });
            }

            @Override
            public void onFailure(String error) {
                runOnUiThread(() -> {
                    swipeRefreshLayout.setRefreshing(false);
                    tvEmpty.setVisibility(View.VISIBLE);
                    tvEmpty.setText(error);
                });
            }
        });
    }

    private void applyFilter() {
        filteredDevices.clear();
        int position = spinnerFilter.getSelectedItemPosition();
        for (DeviceItem item : allDevices) {
            if (position == 1 && !"soil_4in1".equals(item.deviceType)) {
                continue;
            }
            if (position == 2 && !"air_4in1".equals(item.deviceType)) {
                continue;
            }
            filteredDevices.add(item);
        }

        adapter.submitList(filteredDevices);
        tvEmpty.setVisibility(filteredDevices.isEmpty() ? View.VISIBLE : View.GONE);
        if (filteredDevices.isEmpty()) {
            tvEmpty.setText("当前筛选条件下没有设备");
        }
    }

    private void backToLogin() {
        Intent intent = new Intent(this, LoginActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        startActivity(intent);
        finish();
    }
}
