import { StateNode } from "tldraw";

export class GroupTool extends StateNode {
  static id = "group";

  onEnter() {
    this.editor.setCursor({ type: "default", rotation: 0 });
  }

  onPointerDown() {
    const selectedShapes = this.editor.selectedShapes;

    if (!selectedShapes || selectedShapes.length === 0) {
      console.log("No shapes selected.");
      return;
    }

    if (selectedShapes.length > 1) {
      this.editor.groupShapes(selectedShapes.map((shape) => shape.id));
      console.log("Shapes grouped.");
    } else {
      console.log("Select multiple shapes to group them.");
    }
  }
}
