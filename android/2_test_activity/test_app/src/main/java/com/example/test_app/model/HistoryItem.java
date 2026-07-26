package com.example.test_app.model;

import org.json.JSONObject;

public class HistoryItem {
    public String collectedAt;
    public String temperature;
    public String humidity;
    public String ph;
    public String ec;
    public String salinity;
    public String nitrogen;
    public String phosphorus;
    public String potassium;
    public String co2;
    public String lux;

    public static HistoryItem fromJson(JSONObject object) {
        HistoryItem item = new HistoryItem();
        item.collectedAt = object.optString("collected_at", "-");
        item.temperature = object.optString("temperature", "-");
        item.humidity = object.optString("humidity", "-");
        item.ph = object.optString("ph", "-");
        item.ec = object.optString("ec", "-");
        item.salinity = object.optString("salinity", "-");
        item.nitrogen = object.optString("nitrogen", "-");
        item.phosphorus = object.optString("phosphorus", "-");
        item.potassium = object.optString("potassium", "-");
        item.co2 = object.optString("co2", "-");
        item.lux = object.optString("lux", "-");
        return item;
    }
}
