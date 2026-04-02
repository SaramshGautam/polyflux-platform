import React, { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

// Helper for date formatting
function formatDateLabel(dateStr) {
  const d = new Date(dateStr);
  // Format as 'Apr 1' or 'Apr 1, 2026' if year changes
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Custom tooltip for more details
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #ccc", padding: 10, borderRadius: 6, fontSize: 14 }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>Date: {formatDateLabel(label)}</div>
      {payload.map((entry, idx) => (
        <div key={entry.dataKey} style={{ color: entry.color, marginBottom: 2 }}>
          <span style={{ fontWeight: 500 }}>{entry.dataKey}:</span> {entry.value} actions
        </div>
      ))}
    </div>
  );
}
// Optionally use dayjs for date formatting
// import dayjs from "dayjs";

// Helper to assign a color to each user
const COLORS = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff7300",
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
];
function getColorForUser(userId, idx) {
  return COLORS[idx % COLORS.length];
}

// Aggregation function: group by user and day
function aggregateHistory(history, selectedUsers, startDate, endDate) {
  // Helper to get ms timestamp from ISO string or number
  function toMs(ts) {
    if (typeof ts === "number") return ts;
    if (typeof ts === "string") return Date.parse(ts);
    if (ts instanceof Date) return ts.getTime();
    return null;
  }

  // Filter by user and date range (robust to string/number)
  const filtered = history.filter((h) => {
    const tsMs = toMs(h.timestamp);
    return (
      (!selectedUsers.length || selectedUsers.includes(h.userId)) &&
      (!startDate || (tsMs !== null && tsMs >= startDate)) &&
      (!endDate || (tsMs !== null && tsMs <= endDate))
    );
  });

  // Group by user and day
  const grouped = {};
  filtered.forEach((h) => {
    const dateObj = new Date(toMs(h.timestamp));
    const timeKey = dateObj.toISOString().slice(0, 10); // YYYY-MM-DD
    if (!grouped[timeKey]) grouped[timeKey] = {};
    if (!grouped[timeKey][h.userId]) grouped[timeKey][h.userId] = 0;
    grouped[timeKey][h.userId]++;
  });

  // Convert to array for charting
  return Object.entries(grouped).map(([time, users]) => ({
    time,
    ...users,
  }));
}


export default function ProvenanceTrendsChart({ history = [] }) {
    // Get all unique users
    const allUsers = useMemo(
      () => Array.from(new Set(history.map((h) => h.userId))),
      [history]
    );
    const [selectedUsers, setSelectedUsers] = useState([]); // empty = all
    const [dateRange, setDateRange] = useState([null, null]); // [start, end]

    // Aggregate data for chart and sort by date (oldest to newest)
    const data = useMemo(() => {
      const unsorted = aggregateHistory(history, selectedUsers, dateRange[0], dateRange[1]);
      return unsorted.sort((a, b) => new Date(a.time) - new Date(b.time));
    }, [history, selectedUsers, dateRange]);

    return (
      <div style={{ width: "100%", maxWidth: 900, margin: "0 auto" }}>
        <h3>User Contributions Over Time</h3>
        {/* User filter */}
        <div style={{ marginBottom: 12 }}>
          <label>
            Users:
            <select
              multiple
              value={selectedUsers}
              onChange={(e) => {
                const options = Array.from(e.target.selectedOptions).map((o) => o.value);
                setSelectedUsers(options);
              }}
              style={{ minWidth: 120, marginLeft: 8 }}
            >
              {allUsers.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
            <span style={{ marginLeft: 8, fontSize: 12 }}>
              (Ctrl/Cmd+Click to multi-select)
            </span>
          </label>
        </div>
        {/* Today quick filter button */}
        <div style={{ marginBottom: 12 }}>
          <button
            style={{
              padding: "4px 12px",
              background: "#f0f0f0",
              border: "1px solid #bbb",
              borderRadius: 4,
              cursor: "pointer",
              marginRight: 12,
            }}
            onClick={() => {
              const now = new Date();
              const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
              setDateRange([startOfDay, now.getTime()]);
            }}
            title="Show only today's activity"
          >
            Today
          </button>
        </div>
        {/* Date range filter (simple) */}
        <div style={{ marginBottom: 12 }}>
          <label>
            Start Date:
            <input
              type="date"
              value={dateRange[0] ? new Date(dateRange[0]).toISOString().slice(0, 10) : ""}
              onChange={(e) => {
                setDateRange([e.target.value ? new Date(e.target.value).getTime() : null, dateRange[1]]);
              }}
              style={{ marginLeft: 8 }}
            />
          </label>
          <label style={{ marginLeft: 16 }}>
            End Date:
            <input
              type="date"
              value={dateRange[1] ? new Date(dateRange[1]).toISOString().slice(0, 10) : ""}
              onChange={(e) => {
                setDateRange([dateRange[0], e.target.value ? new Date(e.target.value).getTime() : null]);
              }}
              style={{ marginLeft: 8 }}
            />
          </label>
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="time"
              tickFormatter={formatDateLabel}
              minTickGap={10}
              angle={-25}
              textAnchor="end"
              height={50}
            />
            <YAxis allowDecimals={false} label={{ value: 'Number of Actions', angle: -90, position: 'insideLeft', offset: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {allUsers
              .filter((u) => !selectedUsers.length || selectedUsers.includes(u))
              .map((userId, idx) => (
                <Line
                  key={userId}
                  type="monotone"
                  dataKey={userId}
                  stroke={getColorForUser(userId, idx)}
                  connectNulls
                  dot
                />
              ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }
         