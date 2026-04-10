import React, { useMemo, useState } from "react";
import DateRangeFilter from "./DateRangeFilter";
import Select from "react-select";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
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
  "#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#0088FE", "#00C49F", "#FFBB28", "#FF8042",
  "#A569BD", "#5499C7", "#48C9B0", "#F4D03F", "#DC7633", "#AAB7B8", "#E74C3C", "#1ABC9C",
  "#2ECC71", "#F39C12", "#D35400", "#34495E", "#7D3C98", "#229954", "#CA6F1E", "#B9770E",
  "#5D6D7E", "#F1948A", "#BB8FCE", "#85C1E9", "#76D7C4", "#F7DC6F", "#F0B27A", "#85929E"
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

  // Get all users to show (selected or all)
  const usersToShow = selectedUsers.length ? selectedUsers : Array.from(new Set(history.map((h) => h.userId)));

  // Find min/max date in filtered data
  let minDate = null, maxDate = null;
  filtered.forEach((h) => {
    const ts = toMs(h.timestamp);
    if (ts !== null) {
      if (minDate === null || ts < minDate) minDate = ts;
      if (maxDate === null || ts > maxDate) maxDate = ts;
    }
  });
  // If no data, return empty
  if (!minDate || !maxDate) return [];

  // Generate all date keys between minDate and maxDate
  const days = [];
  let d = new Date(minDate);
  d.setHours(0,0,0,0);
  const end = new Date(maxDate);
  end.setHours(0,0,0,0);
  while (d <= end) {
    days.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }

  // Fill missing users with zeroes for each day
  return days.map((day) => {
    const users = grouped[day] || {};
    const entry = { time: day };
    usersToShow.forEach((u) => {
      entry[u] = users[u] || 0;
    });
    return entry;
  });
}

// Aggregation function: count total actions per user
function aggregateTotalByUser(history, selectedUsers, startDate, endDate) {
  // Helper to get ms timestamp from ISO string or number
  function toMs(ts) {
    if (typeof ts === "number") return ts;
    if (typeof ts === "string") return Date.parse(ts);
    if (ts instanceof Date) return ts.getTime();
    return null;
  }
  // Filter by user and date range
  const filtered = history.filter((h) => {
    const tsMs = toMs(h.timestamp);
    return (
      (!selectedUsers.length || selectedUsers.includes(h.userId)) &&
      (!startDate || (tsMs !== null && tsMs >= startDate)) &&
      (!endDate || (tsMs !== null && tsMs <= endDate))
    );
  });
  // Count actions per user
  const counts = {};
  filtered.forEach((h) => {
    counts[h.userId] = (counts[h.userId] || 0) + 1;
  });
  // Convert to array for charting
  return Object.entries(counts).map(([userId, count]) => ({ userId, count }));
}

const PIE_COLORS = COLORS;

export default function ProvenanceTrendsChart({ history = [] }) {
    // Get all unique users
    const allUsers = useMemo(
      () => Array.from(new Set(history.map((h) => h.userId))),
      [history]
    );
    const [selectedUsers, setSelectedUsers] = useState([]); // empty = all
    const [dateRange, setDateRange] = useState([null, null]); // [start, end]
    const [activeChart, setActiveChart] = useState("line");

    // Aggregate data for chart and sort by date (oldest to newest)
    const data = useMemo(() => {
      const unsorted = aggregateHistory(history, selectedUsers, dateRange[0], dateRange[1]);
      return unsorted.sort((a, b) => new Date(a.time) - new Date(b.time));
    }, [history, selectedUsers, dateRange]);

    const totalByUser = useMemo(() => {
      return aggregateTotalByUser(history, selectedUsers, dateRange[0], dateRange[1]);
    }, [history, selectedUsers, dateRange]);

    // Set default date range for each chart to 'all time' (no restriction) when selected
    React.useEffect(() => {
      if (activeChart === "bar" || activeChart === "line") {
        setDateRange([null, null]);
      }
      // eslint-disable-next-line
    }, [activeChart]);

    return (
      <div style={{ width: "100%", maxWidth: 900, margin: "0 auto", padding: "0 8px" }}>
        <style>{`
          .ptc-btn {
            font-family: inherit;
            background: #fff;
            border: 1px solid #bbb;
            border-radius: 4px;
            padding: 6px 16px;
            cursor: pointer;
            transition: background 0.15s, box-shadow 0.15s, border 0.15s;
            margin-right: 4px;
          }
          .ptc-btn.selected {
            font-weight: bold;
            border-bottom: 2px solid #8884d8;
            background: #f5f6ff;
          }
          .ptc-btn:hover {
            background: #f0f0f0;
            box-shadow: 0 2px 8px rgba(136,132,216,0.08);
          }
          .ptc-btn:active {
            background: #e0e0e0;
            border-color: #8884d8;
          }
        `}</style>
        <div style={{ display: "flex", gap: 12, marginBottom: 32, flexWrap: 'wrap' }}>
          <button
            aria-label="Show total contributions bar chart"
            onClick={() => setActiveChart("bar")}
            className={"ptc-btn" + (activeChart === "bar" ? " selected" : "")}
          >
            Total Contributions Bar Chart
          </button>
          <button
            aria-label="Show contributions over time line chart"
            onClick={() => setActiveChart("line")}
            className={"ptc-btn" + (activeChart === "line" ? " selected" : "")}
          >
            Contributions Over Time Line Chart
          </button>
          <button
            aria-label="Show user contribution pie chart"
            onClick={() => setActiveChart("pie")}
            className={"ptc-btn" + (activeChart === "pie" ? " selected" : "")}
          >
            User Contribution Pie Chart
          </button>
        </div>
        {activeChart === "bar" && (
          <div style={{ margin: "40px 0 48px 0" }}>
            <h3 style={{ marginBottom: 16 }}>All Users: Total Contributions (Bar Chart)</h3>
            <DateRangeFilter dateRange={dateRange} setDateRange={setDateRange} />
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={totalByUser} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="userId" />
                <YAxis allowDecimals={false} label={{ value: 'Total Actions', angle: -90, position: 'insideLeft', offset: 10 }} />
                <Tooltip content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  return (
                    <div style={{ background: "#fff", border: "1px solid #ccc", padding: 10, borderRadius: 6, fontSize: 14 }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>User: {label}</div>
                      {payload.map((entry) => (
                        <div key={entry.dataKey} style={{ color: entry.color, marginBottom: 2 }}>
                          <span style={{ fontWeight: 500 }}>{entry.dataKey}:</span> {entry.value} actions
                        </div>
                      ))}
                    </div>
                  );
                }} />
                <Legend />
                <Bar dataKey="count" name="Actions" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {activeChart === "line" && (
          <div style={{ margin: "40px 0 48px 0" }}>
            <h3 style={{ marginBottom: 16 }}>User Contributions Over Time (Line Chart)</h3>
            {/* User filter with react-select */}
            <div style={{ marginBottom: 16, maxWidth: 340 }}>
              <label htmlFor="user-select" style={{ fontWeight: 500, marginRight: 8 }}>Users:</label>
              <Select
                inputId="user-select"
                aria-label="User filter dropdown"
                isMulti
                options={allUsers.map((u) => ({ value: u, label: u }))}
                value={selectedUsers.map((u) => ({ value: u, label: u }))}
                onChange={(selected) => setSelectedUsers(selected ? selected.map((o) => o.value) : [])}
                placeholder="All users"
                styles={{
                  container: (base) => ({ ...base, minWidth: 180 }),
                  menu: (base) => ({ ...base, zIndex: 9999 }),
                }}
                isClearable
                closeMenuOnSelect={false}
                noOptionsMessage={() => "No users found"}
              />
            </div>
            <DateRangeFilter dateRange={dateRange} setDateRange={setDateRange} showToday />
            <ResponsiveContainer width="100%" minWidth={0} minHeight={0} height={400}>
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
        )}
        {activeChart === "pie" && (
          <div style={{ margin: "40px 0 48px 0" }}>
            <style>{`
              @media (max-width: 600px) {
                .ptc-btn { width: 100%; margin-bottom: 8px; }
                .recharts-responsive-container { min-width: 0 !important; }
              }
            `}</style>
            <h3 style={{ marginBottom: 16 }}>User Contribution Distribution (Pie Chart)</h3>
            <DateRangeFilter dateRange={dateRange} setDateRange={setDateRange} />
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={totalByUser}
                  dataKey="count"
                  nameKey="userId"
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {totalByUser.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  return (
                    <div style={{ background: "#fff", border: "1px solid #ccc", padding: 10, borderRadius: 6, fontSize: 14 }}>
                      {payload.map((entry) => (
                        <div key={entry.name} style={{ color: entry.color, marginBottom: 2 }}>
                          <span style={{ fontWeight: 500 }}>{entry.name}:</span> {entry.value} actions
                        </div>
                      ))}
                    </div>
                  );
                }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
        {/* Add more chart panels here in the future */}
      </div>
    );
  }
