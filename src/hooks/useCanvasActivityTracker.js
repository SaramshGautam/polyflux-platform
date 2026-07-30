import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Hook to track cursor and interaction activity on the canvas.
 * Collects {x, y, timestamp} events for heat mapping.
 */
export function useCanvasActivityTracker(editor, enabled = true) {
  const [activityData, setActivityData] = useState([]);
  const rafRef = useRef(null);
  const lastTrackRef = useRef(0);
  const bufferRef = useRef([]);
  const editorRef = useRef(editor);

  // Keep editor ref up to date
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  const addActivity = useCallback(
    (x, y) => {
      bufferRef.current.push({
        x,
        y,
        timestamp: Date.now(),
      });
    },
    []
  );

  // Track cursor movement at ~60fps
  useEffect(() => {
    if (!enabled) return;

    const trackCursor = () => {
      rafRef.current = requestAnimationFrame(trackCursor);

      const now = performance.now();
      if (now - lastTrackRef.current < 50) return; // Sample ~20x per second
      lastTrackRef.current = now;

      // Get current cursor position via ref
      const editor = editorRef.current;
      if (!editor) return;

      const pagePoint = editor.inputs?.currentPagePoint;
      if (pagePoint) {
        addActivity(pagePoint.x, pagePoint.y);
      }
    };

    rafRef.current = requestAnimationFrame(trackCursor);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [enabled, addActivity]);

  // Periodically flush buffer to state (every 500ms)
  useEffect(() => {
    if (!enabled) return;

    const flushInterval = setInterval(() => {
      if (bufferRef.current.length > 0) {
        setActivityData((prev) => [...prev, ...bufferRef.current]);
        bufferRef.current = [];

        // Keep only last 1000 events to avoid memory bloat
        setActivityData((prev) => prev.slice(-1000));
      }
    }, 500);

    return () => clearInterval(flushInterval);
  }, [enabled]);

  // Track shape creation/editing events
  useEffect(() => {
    if (!enabled) return;

    const handleShapeChange = (change) => {
      const editor = editorRef.current;
      if (!editor || !Array.isArray(change?.changes)) return;

      // Track center of newly created/edited shapes
      const shapeIds = change.changes.map((c) => c.id);

      shapeIds.forEach((id) => {
        const shape = editor.getShape?.(id);
        if (shape && shape.x != null && shape.y != null) {
          // Track center and bounds
          addActivity(shape.x + (shape.props?.w ?? 0) / 2, shape.y + (shape.props?.h ?? 0) / 2);
        }
      });
    };

    const editor = editorRef.current;
    if (editor) {
      editor.on?.("change", handleShapeChange);
      return () => {
        editor.off?.("change", handleShapeChange);
      };
    }
  }, [enabled, addActivity]);

  return { activityData, setActivityData, addActivity };
}
