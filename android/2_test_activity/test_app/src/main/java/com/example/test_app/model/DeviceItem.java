package com.example.test_app.model;

import org.json.JSONObject;

public class DeviceItem {
    public String deviceCode;
    public String deviceType;
    public String gatewayCode;
    public String slaveAddr;
    public String plantCode;
    public String potCode;
    public String groupType;
    public String lastCollectTime;
    public int onlineStatus;

    public static DeviceItem fromJson(JSONObject object) {
        DeviceItem item = new DeviceItem();
        item.deviceCode = object.optString("device_code", "-");
        item.deviceType = object.optString("device_type", "-");
        item.gatewayCode = object.optString("gateway_code", "-");
        item.slaveAddr = object.optString("slave_addr", "-");
        item.plantCode = object.optString("plant_code", "-");
        item.potCode = object.optString("pot_code", "-");
        item.groupType = object.optString("group_type", "");
        item.lastCollectTime = object.optString("last_collect_time", "-");
        item.onlineStatus = object.optInt("online_status", 0);
        return item;
    }
}
