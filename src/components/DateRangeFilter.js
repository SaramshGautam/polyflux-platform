import React from "react";

export default function DateRangeFilter({ dateRange, setDateRange, showToday = false }) {
  return (
    <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <label>
        Start Date:
        <input
          type="date"
          aria-label="Start date"
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
          aria-label="End date"
          value={dateRange[1] ? new Date(dateRange[1]).toISOString().slice(0, 10) : ""}
          onChange={(e) => {
            setDateRange([dateRange[0], e.target.value ? new Date(e.target.value).getTime() : null]);
          }}
          style={{ marginLeft: 8 }}
        />
      </label>
      <button
        aria-label="Reset date filter"
        style={{
          padding: "4px 12px",
          background: "#e0e0e0",
          border: "1px solid #bbb",
          borderRadius: 4,
          cursor: "pointer",
          marginLeft: 16,
          fontWeight: 'bold',
        }}
        onClick={() => setDateRange([null, null])}
        title="Reset date filter to show all contributions"
      >
        Reset Date Filter
      </button>
      {showToday && (
        <button
          aria-label="Show only today's activity"
          style={{
            padding: "4px 12px",
            background: "#f0f0f0",
            border: "1px solid #bbb",
            borderRadius: 4,
            cursor: "pointer",
            marginLeft: 8,
            fontWeight: 'bold',
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
      )}
    </div>
  );
}
