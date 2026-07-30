import React, { useEffect, useRef, useState } from "react";

const PANEL_WIDTH = 300;
const CANVAS_HEIGHT = 230;
const GRID_MIN = 40;
const GRID_MAX = 160;

function getCreatorName(shapeId, shapeCreatorMap) {
  if (!shapeId) return "Unknown";
  const rawName = shapeCreatorMap?.[shapeId];
  if (typeof rawName !== "string") return "Unknown";
  const trimmed = rawName.trim();
  return trimmed || "Unknown";
}

function getCreatorHue(name) {
  if (!name || name === "Unknown") return 220;

  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) % 360;
  }

  return hash;
}

function getCreatorInitials(name) {
  if (!name || name === "Unknown") return "?";

  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function getShapeBounds(editor, shape) {
  if (!shape) return null;

  const liveBounds = editor?.getShapePageBounds?.(shape.id);
  if (liveBounds) {
    return {
      minX: liveBounds.minX,
      minY: liveBounds.minY,
      maxX: liveBounds.maxX,
      maxY: liveBounds.maxY,
      width: liveBounds.maxX - liveBounds.minX,
      height: liveBounds.maxY - liveBounds.minY,
    };
  }

  const width = shape.props?.w || shape.props?.width || 1;
  const height = shape.props?.h || shape.props?.height || 1;
  const x = Number(shape.x) || 0;
  const y = Number(shape.y) || 0;

  return {
    minX: x,
    minY: y,
    maxX: x + width,
    maxY: y + height,
    width,
    height,
  };
}

function buildHeatMapData(editor, shapeCreatorMap, gridSize) {
  const shapes = editor?.getCurrentPageShapes?.() || [];
  const artifactEntries = shapes
    .filter((shape) => shape && shape.type !== "frame")
    .map((shape) => {
      const bounds = getShapeBounds(editor, shape);
      if (!bounds) return null;

      const width = Math.max(1, bounds.width);
      const height = Math.max(1, bounds.height);

      return {
        id: shape.id,
        type: shape.type || "shape",
        creator: getCreatorName(shape.id, shapeCreatorMap),
        bounds: {
          minX: bounds.minX,
          minY: bounds.minY,
          maxX: bounds.maxX,
          maxY: bounds.maxY,
          width,
          height,
        },
      };
    })
    .filter(Boolean);

  if (artifactEntries.length === 0) {
    const viewportBounds = editor?.getViewportPageBounds?.();
    const fallbackBounds = viewportBounds
      ? {
          minX: viewportBounds.minX,
          minY: viewportBounds.minY,
          maxX: viewportBounds.maxX,
          maxY: viewportBounds.maxY,
          width: Math.max(1, viewportBounds.maxX - viewportBounds.minX),
          height: Math.max(1, viewportBounds.maxY - viewportBounds.minY),
        }
      : {
          minX: 0,
          minY: 0,
          maxX: 1000,
          maxY: 1000,
          width: 1000,
          height: 1000,
        };

    return {
      artifactEntries,
      shapeCount: 0,
      attributedShapeCount: 0,
      creators: [],
      maxCellCount: 0,
      grid: [],
      cols: 0,
      rows: 0,
      canvasBounds: fallbackBounds,
      viewportBounds,
    };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const creatorTotals = {};
  let attributedShapeCount = 0;

  artifactEntries.forEach((entry) => {
    minX = Math.min(minX, entry.bounds.minX);
    minY = Math.min(minY, entry.bounds.minY);
    maxX = Math.max(maxX, entry.bounds.maxX);
    maxY = Math.max(maxY, entry.bounds.maxY);

    creatorTotals[entry.creator] = (creatorTotals[entry.creator] || 0) + 1;
    if (entry.creator !== "Unknown") {
      attributedShapeCount += 1;
    }
  });

  const padding = Math.max(gridSize * 0.5, 30);
  const canvasBounds = {
    minX: minX - padding,
    minY: minY - padding,
    maxX: maxX + padding,
    maxY: maxY + padding,
  };
  canvasBounds.width = Math.max(1, canvasBounds.maxX - canvasBounds.minX);
  canvasBounds.height = Math.max(1, canvasBounds.maxY - canvasBounds.minY);

  const cols = Math.max(1, Math.ceil(canvasBounds.width / gridSize));
  const rows = Math.max(1, Math.ceil(canvasBounds.height / gridSize));
  const grid = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      count: 0,
      creators: {},
    }))
  );

  let maxCellCount = 0;

  artifactEntries.forEach((entry) => {
    const colStart = Math.max(
      0,
      Math.floor((entry.bounds.minX - canvasBounds.minX) / gridSize)
    );
    const rowStart = Math.max(
      0,
      Math.floor((entry.bounds.minY - canvasBounds.minY) / gridSize)
    );
    const colEnd = Math.min(
      cols,
      Math.ceil((entry.bounds.maxX - canvasBounds.minX) / gridSize)
    );
    const rowEnd = Math.min(
      rows,
      Math.ceil((entry.bounds.maxY - canvasBounds.minY) / gridSize)
    );

    for (let row = rowStart; row < rowEnd; row += 1) {
      for (let col = colStart; col < colEnd; col += 1) {
        grid[row][col].count += 1;
        grid[row][col].creators[entry.creator] =
          (grid[row][col].creators[entry.creator] || 0) + 1;
        maxCellCount = Math.max(maxCellCount, grid[row][col].count);
      }
    }
  });

  const creators = Object.entries(creatorTotals)
    .map(([name, count]) => ({ name, count, hue: getCreatorHue(name) }))
    .sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count;
      return left.name.localeCompare(right.name);
    });

  return {
    artifactEntries,
    shapeCount: artifactEntries.length,
    attributedShapeCount,
    creators,
    maxCellCount,
    grid,
    cols,
    rows,
    canvasBounds,
    viewportBounds: editor?.getViewportPageBounds?.() || null,
  };
}

function drawHeatMap(canvas, analysis) {
  const context = canvas.getContext("2d");
  if (!context) return;

  const devicePixelRatio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  canvas.width = Math.round(width * devicePixelRatio);
  canvas.height = Math.round(height * devicePixelRatio);
  context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

  context.clearRect(0, 0, width, height);
  context.fillStyle = "#f8fafc";
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "#cbd5e1";
  context.lineWidth = 1;
  context.strokeRect(0.5, 0.5, width - 1, height - 1);

  if (!analysis || analysis.shapeCount === 0) {
    context.fillStyle = "#64748b";
    context.font = "12px sans-serif";
    context.textAlign = "center";
    context.fillText("No artifacts on this page yet", width / 2, height / 2);
    return;
  }

  const { canvasBounds, viewportBounds, grid, rows, cols, maxCellCount } = analysis;
  const scaleX = width / canvasBounds.width;
  const scaleY = height / canvasBounds.height;
  const cellWidth = width / cols;
  const cellHeight = height / rows;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const cell = grid[row][col];
      if (!cell || cell.count === 0) continue;

      const dominantCreator = Object.entries(cell.creators).sort(
        (left, right) => right[1] - left[1]
      )[0]?.[0];
      const ratio = maxCellCount > 0 ? cell.count / maxCellCount : 0;
      const hue = getCreatorHue(dominantCreator);
      const alpha = 0.18 + ratio * 0.67;

      const x = col * cellWidth;
      const y = row * cellHeight;

      context.fillStyle = `hsla(${hue}, 78%, 50%, ${alpha})`;
      context.fillRect(x, y, cellWidth, cellHeight);

      context.strokeStyle = `hsla(${hue}, 60%, 35%, 0.16)`;
      context.strokeRect(x, y, cellWidth, cellHeight);

      if (cellWidth >= 20 && cellHeight >= 18) {
        context.fillStyle = "rgba(15, 23, 42, 0.88)";
        context.font = "10px sans-serif";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(
          getCreatorInitials(dominantCreator),
          x + cellWidth / 2,
          y + cellHeight / 2
        );
      }
    }
  }

  if (viewportBounds) {
    const viewportX = (viewportBounds.minX - canvasBounds.minX) * scaleX;
    const viewportY = (viewportBounds.minY - canvasBounds.minY) * scaleY;
    const viewportWidth = (viewportBounds.maxX - viewportBounds.minX) * scaleX;
    const viewportHeight = (viewportBounds.maxY - viewportBounds.minY) * scaleY;

    context.save();
    context.strokeStyle = "#0f172a";
    context.lineWidth = 2;
    context.setLineDash([5, 4]);
    context.strokeRect(viewportX, viewportY, viewportWidth, viewportHeight);
    context.restore();
  }
}

export function CanvasHeatMapOverlay({
  editor,
  showHeatMap,
  gridSize = 80,
  onGridSizeChange,
  shapeCreatorMap,
}) {
  const canvasRef = useRef(null);
  const latestAnalysisRef = useRef(null);
  const summaryKeyRef = useRef("");
  const [summary, setSummary] = useState({
    shapeCount: 0,
    attributedShapeCount: 0,
    creators: [],
  });

  useEffect(() => {
    if (!showHeatMap || !editor) return undefined;

    const redraw = () => {
      const analysis = buildHeatMapData(editor, shapeCreatorMap, gridSize);
      latestAnalysisRef.current = analysis;

      const summaryKey = JSON.stringify({
        shapeCount: analysis.shapeCount,
        attributedShapeCount: analysis.attributedShapeCount,
        creators: analysis.creators.map(({ name, count }) => ({ name, count })),
      });

      if (summaryKey !== summaryKeyRef.current) {
        summaryKeyRef.current = summaryKey;
        setSummary({
          shapeCount: analysis.shapeCount,
          attributedShapeCount: analysis.attributedShapeCount,
          creators: analysis.creators,
        });
      }

      if (canvasRef.current) {
        drawHeatMap(canvasRef.current, analysis);
      }
    };

    redraw();
    const intervalId = window.setInterval(redraw, 500);
    window.addEventListener("resize", redraw);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("resize", redraw);
    };
  }, [editor, gridSize, shapeCreatorMap, showHeatMap]);

  if (!showHeatMap) return null;

  const topCreators = summary.creators.slice(0, 5);
  const unattributedCount = Math.max(0, summary.shapeCount - summary.attributedShapeCount);

  const handleMinimapClick = (event) => {
    if (!editor || !latestAnalysisRef.current || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const relativeX = (event.clientX - rect.left) / rect.width;
    const relativeY = (event.clientY - rect.top) / rect.height;
    const { canvasBounds } = latestAnalysisRef.current;

    const target = {
      x: canvasBounds.minX + relativeX * canvasBounds.width,
      y: canvasBounds.minY + relativeY * canvasBounds.height,
    };

    if (editor.centerOnPoint) {
      editor.centerOnPoint(target);
      return;
    }

    const camera = editor.getCamera?.();
    editor.setCamera?.({
      x: target.x,
      y: target.y,
      z: camera?.z || 1,
    });
  };

  return (
    <div
      style={{
        position: "fixed",
        right: 20,
        top: 92,
        width: PANEL_WIDTH,
        border: "1px solid #dbe3ef",
        borderRadius: 12,
        boxShadow: "0 12px 28px rgba(15, 23, 42, 0.16)",
        backgroundColor: "#ffffff",
        zIndex: 1000,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "12px 14px 10px",
          borderBottom: "1px solid #e2e8f0",
          background: "linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)",
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
          Hybrid artifact heat map
        </div>
        <div style={{ marginTop: 4, fontSize: 12, lineHeight: 1.4, color: "#475569" }}>
          Opacity shows artifact density. Cell color and initials show the dominant creator in
          that area.
        </div>
      </div>

      <div style={{ padding: 12 }}>
        <canvas
          ref={canvasRef}
          onClick={handleMinimapClick}
          style={{
            width: "100%",
            height: CANVAS_HEIGHT,
            display: "block",
            borderRadius: 10,
            cursor: "pointer",
            background: "#f8fafc",
          }}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            marginTop: 10,
            fontSize: 12,
            color: "#334155",
          }}
        >
          <span>{summary.shapeCount} artifacts</span>
          <span>{summary.attributedShapeCount} with creator data</span>
        </div>
        <div style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>
          Dashed outline = current viewport
        </div>

        <div style={{ marginTop: 12 }}>
          <label
            htmlFor="heat-map-grid-size"
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 6,
              fontSize: 12,
              fontWeight: 600,
              color: "#334155",
            }}
          >
            <span>Cell size</span>
            <span>{gridSize}px</span>
          </label>
          <input
            id="heat-map-grid-size"
            type="range"
            min={GRID_MIN}
            max={GRID_MAX}
            step={10}
            value={gridSize}
            onChange={(event) => onGridSizeChange?.(Number(event.target.value))}
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
            Creator legend
          </div>

          {topCreators.length === 0 ? (
            <div style={{ fontSize: 12, color: "#64748b" }}>
              Creator data will appear here as shapes are attributed.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 6 }}>
              {topCreators.map((creator) => (
                <div
                  key={creator.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    fontSize: 12,
                    color: "#334155",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <span
                      aria-hidden="true"
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        backgroundColor: `hsl(${creator.hue}, 78%, 50%)`,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      title={creator.name}
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {creator.name}
                    </span>
                  </div>
                  <span style={{ color: "#64748b", flexShrink: 0 }}>{creator.count}</span>
                </div>
              ))}
            </div>
          )}

          {unattributedCount > 0 ? (
            <div style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>
              {unattributedCount} artifact{unattributedCount === 1 ? "" : "s"} still lack creator
              attribution.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
