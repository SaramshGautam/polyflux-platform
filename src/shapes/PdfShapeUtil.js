import { HTMLContainer, Rectangle2d, ShapeUtil, resizeBox } from "tldraw";

// Minimal stub for a "pdf"-type shape.
//
// We don't have (and don't currently need) a real PDF shape/tool in this
// app — this exists purely so the whiteboard doesn't crash. tldraw's sync
// store validates every shape's `type` against the set of registered
// ShapeUtils; some rooms already have leftover shape records of type
// "pdf" saved from an earlier experiment, and with no ShapeUtil for "pdf"
// registered, the schema rejects them outright and the whole room fails
// to load (ValidationError: "At shape.type: ... got 'pdf'").
//
// Registering this stub makes "pdf" a recognized type again so those
// rooms load. It renders as a plain, inert placeholder — once it's
// visible, just select it and press Delete to remove it from the board
// for good. Intentionally NOT added to the toolbar's tool list, so no one
// can create new "pdf" shapes going forward.
export class PdfShapeUtil extends ShapeUtil {
  static type = "pdf";
  // Intentionally no `static props`. Leaving it undefined makes tldraw
  // validate `props` as "any valid JSON" rather than a strict object
  // shape, since we don't know (and don't want to assume) what the
  // original stray records actually stored there.

  getDefaultProps() {
    return {};
  }

  getGeometry(shape) {
    const { w, h } = this.sizeOf(shape);
    return new Rectangle2d({ width: w, height: h, isFilled: true });
  }

  sizeOf(shape) {
    const w = typeof shape.props?.w === "number" ? shape.props.w : 240;
    const h = typeof shape.props?.h === "number" ? shape.props.h : 160;
    return { w, h };
  }

  component(shape) {
    const { w, h } = this.sizeOf(shape);
    return (
      <HTMLContainer
        id={shape.id}
        style={{
          width: w,
          height: h,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "8px",
          border: "1.5px dashed #c9c4bc",
          borderRadius: "8px",
          background: "#f8f7f4",
          color: "#78716c",
          fontSize: "12px",
          fontFamily: "inherit",
          pointerEvents: "all",
        }}
      >
        Unsupported "pdf" shape — select and delete
      </HTMLContainer>
    );
  }

  indicator(shape) {
    const { w, h } = this.sizeOf(shape);
    return <rect width={w} height={h} />;
  }

  onResize(shape, info) {
    return resizeBox(shape, info);
  }

  canResize() {
    return true;
  }

  isAspectRatioLocked() {
    return false;
  }
}
