package com.example.test_app;

import android.content.Intent;
import android.os.Bundle;

import androidx.appcompat.app.AppCompatActivity;

import com.example.test_app.util.SessionManager;

public class MainActivity extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        SessionManager sessionManager = new SessionManager(this);
        Intent intent = sessionManager.hasToken()
                ? new Intent(this, DeviceListActivity.class)
                : new Intent(this, LoginActivity.class);
        startActivity(intent);
        finish();
    }
}
