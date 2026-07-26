package com.example.test_app.adapter;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.example.test_app.R;
import com.example.test_app.model.HistoryItem;

import java.util.ArrayList;
import java.util.List;

public class HistoryAdapter extends RecyclerView.Adapter<HistoryAdapter.HistoryViewHolder> {
    private final List<HistoryItem> items = new ArrayList<>();
    private boolean airMode = false;

    public void submitList(List<HistoryItem> newItems, boolean airMode) {
        items.clear();
        items.addAll(newItems);
        this.airMode = airMode;
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public HistoryViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_history, parent, false);
        return new HistoryViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull HistoryViewHolder holder, int position) {
        HistoryItem item = items.get(position);
        holder.time.setText(item.collectedAt == null ? "-" : item.collectedAt.replace("T", " ").replace(".000Z", ""));
        holder.first.setText("温度 " + item.temperature);
        holder.second.setText("湿度 " + item.humidity);
        if (airMode) {
            holder.third.setText("CO2 " + item.co2);
            holder.fourth.setText("Lux " + item.lux);
            holder.fifth.setVisibility(View.GONE);
            holder.sixth.setVisibility(View.GONE);
            holder.seventh.setVisibility(View.GONE);
            holder.eighth.setVisibility(View.GONE);
        } else {
            holder.third.setText("pH " + item.ph);
            holder.fourth.setText("EC " + item.ec);
            holder.fifth.setVisibility(View.VISIBLE);
            holder.sixth.setVisibility(View.VISIBLE);
            holder.seventh.setVisibility(View.VISIBLE);
            holder.eighth.setVisibility(View.VISIBLE);
            holder.fifth.setText("盐度 " + item.salinity);
            holder.sixth.setText("氮 " + item.nitrogen);
            holder.seventh.setText("磷 " + item.phosphorus);
            holder.eighth.setText("钾 " + item.potassium);
        }
    }

    @Override
    public int getItemCount() {
        return items.size();
    }

    static class HistoryViewHolder extends RecyclerView.ViewHolder {
        TextView time;
        TextView first;
        TextView second;
        TextView third;
        TextView fourth;
        TextView fifth;
        TextView sixth;
        TextView seventh;
        TextView eighth;

        HistoryViewHolder(@NonNull View itemView) {
            super(itemView);
            time = itemView.findViewById(R.id.tvHistoryTime);
            first = itemView.findViewById(R.id.tvHistoryFirst);
            second = itemView.findViewById(R.id.tvHistorySecond);
            third = itemView.findViewById(R.id.tvHistoryThird);
            fourth = itemView.findViewById(R.id.tvHistoryFourth);
            fifth = itemView.findViewById(R.id.tvHistoryFifth);
            sixth = itemView.findViewById(R.id.tvHistorySixth);
            seventh = itemView.findViewById(R.id.tvHistorySeventh);
            eighth = itemView.findViewById(R.id.tvHistoryEighth);
        }
    }
}
