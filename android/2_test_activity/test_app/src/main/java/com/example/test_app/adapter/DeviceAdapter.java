package com.example.test_app.adapter;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.example.test_app.R;
import com.example.test_app.model.DeviceItem;

import java.util.ArrayList;
import java.util.List;

public class DeviceAdapter extends RecyclerView.Adapter<DeviceAdapter.DeviceViewHolder> {
    public interface OnDeviceClickListener {
        void onDeviceClick(DeviceItem item);
    }

    private final List<DeviceItem> items = new ArrayList<>();
    private final OnDeviceClickListener listener;

    public DeviceAdapter(OnDeviceClickListener listener) {
        this.listener = listener;
    }

    public void submitList(List<DeviceItem> newItems) {
        items.clear();
        items.addAll(newItems);
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public DeviceViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_device, parent, false);
        return new DeviceViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull DeviceViewHolder holder, int position) {
        DeviceItem item = items.get(position);
        holder.deviceCode.setText(item.deviceCode);
        holder.metaTop.setText(item.deviceType + "  |  " + item.gatewayCode + " / 从站 " + item.slaveAddr);

        String bindingText = "植株 " + safe(item.plantCode) + "  |  盆 " + safe(item.potCode);
        holder.metaBottom.setText(bindingText);

        holder.groupChip.setText(item.groupType == null || item.groupType.isEmpty() ? "未分组" : item.groupType);
        if ("stress".equals(item.groupType)) {
            holder.groupChip.setBackgroundResource(R.drawable.bg_chip_stress);
        } else if ("control".equals(item.groupType)) {
            holder.groupChip.setBackgroundResource(R.drawable.bg_chip_control);
        } else {
            holder.groupChip.setBackgroundResource(R.drawable.bg_chip_neutral);
        }

        holder.statusText.setText(item.onlineStatus == 1 ? "在线" : "离线");
        holder.timeText.setText(item.lastCollectTime == null || item.lastCollectTime.isEmpty() ? "-" : item.lastCollectTime.replace("T", " ").replace(".000Z", ""));
        holder.itemView.setOnClickListener(v -> listener.onDeviceClick(item));
    }

    @Override
    public int getItemCount() {
        return items.size();
    }

    private String safe(String value) {
        return value == null || value.isEmpty() || "null".equals(value) ? "-" : value;
    }

    static class DeviceViewHolder extends RecyclerView.ViewHolder {
        TextView deviceCode;
        TextView metaTop;
        TextView metaBottom;
        TextView groupChip;
        TextView statusText;
        TextView timeText;

        DeviceViewHolder(@NonNull View itemView) {
            super(itemView);
            deviceCode = itemView.findViewById(R.id.tvDeviceCode);
            metaTop = itemView.findViewById(R.id.tvMetaTop);
            metaBottom = itemView.findViewById(R.id.tvMetaBottom);
            groupChip = itemView.findViewById(R.id.tvGroupChip);
            statusText = itemView.findViewById(R.id.tvStatus);
            timeText = itemView.findViewById(R.id.tvCollectTime);
        }
    }
}
