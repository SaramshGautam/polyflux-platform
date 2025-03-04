// import React from "react";
// import {
//   DefaultActionsMenu,
//   DefaultActionsMenuContent,
//   TldrawUiMenuItem,
//   useEditor,
// } from "tldraw";

// export default function CustomActionsMenu() {
//   const editor = useEditor();

//   const groupAndArrange = () => {
//     const selectedShapes = editor.selectedShapeIds;

//     if (selectedShapes.length < 2) {
//       window.alert("Please select at least two shapes to group!");
//       return;
//     }

//     // Group shapes
//     const groupId = editor.groupShapes(selectedShapes);
//     console.log("Shapes grouped with ID:", groupId);

//     // Find group bounds
//     const groupBounds = editor.getBounds(groupId);
//     const centerX = (groupBounds.minX + groupBounds.maxX) / 2;
//     const centerY = (groupBounds.minY + groupBounds.maxY) / 2;

//     // Add a circle
//     const circleId = editor.createShape({
//       id: editor.createShapeId(),
//       type: "geo",
//       x: centerX,
//       y: centerY + 150,
//       props: {
//         geo: "circle",
//         width: 50,
//         height: 50,
//         color: "blue",
//       },
//     });
//     console.log("Circle added with ID:", circleId);

//     // Arrange shapes around the circle
//     const radius = 100;
//     const angleStep = (2 * Math.PI) / selectedShapes.length;
//     selectedShapes.forEach((shapeId, index) => {
//       const angle = index * angleStep;
//       const newX = centerX + radius * Math.cos(angle);
//       const newY = centerY + radius * Math.sin(angle);

//       editor.updateShape(shapeId, { x: newX, y: newY });
//     });
//     console.log("Shapes arranged around the circle.");

//     // Add arrows connecting shapes to the circle
//     selectedShapes.forEach((shapeId) => {
//       const shapeBounds = editor.getBounds(shapeId);
//       editor.createShape({
//         id: editor.createShapeId(),
//         type: "arrow",
//         props: {
//           start: {
//             bound: shapeId,
//             point: { x: shapeBounds.midX, y: shapeBounds.midY },
//           },
//           end: { bound: circleId, point: { x: centerX, y: centerY + 150 } },
//         },
//       });
//     });
//     console.log("Arrows added connecting shapes to the circle.");
//   };

//   return (
//     <DefaultActionsMenu>
//       <DefaultActionsMenuContent />
//       <TldrawUiMenuItem
//         id="custom-group"
//         label="Custom Group"
//         icon="group"
//         onSelect={groupAndArrange}
//       />
//     </DefaultActionsMenu>
//   );
// }

import React from "react";
import {
  DefaultActionsMenu,
  DefaultActionsMenuContent,
  TldrawUiMenuItem,
  useEditor,
} from "tldraw";

export default function CustomActionsMenu() {
  const editor = useEditor();

  const groupAndExtend = () => {
    const selectedShapes = editor.selectedShapeIds;

    if (selectedShapes.length < 2) {
      window.alert("Please select at least two shapes to group!");
      return;
    }

    // Group shapes
    const groupId = editor.groupShapes(selectedShapes);
    console.log("Shapes grouped with ID:", groupId);

    // Find group bounds
    const groupBounds = editor.getBounds(groupId);
    const centerX = (groupBounds.minX + groupBounds.maxX) / 2;
    const centerY = (groupBounds.minY + groupBounds.maxY) / 2;

    // Add a circular group name shape
    const circleId = editor.createShape({
      id: editor.createShapeId(),
      type: "geo",
      x: centerX,
      y: centerY + 150, // Position below the group
      props: {
        geo: "circle",
        width: 50,
        height: 50,
        fill: "blue",
        label: "Group Name", // Optional label for the circle
      },
    });
    console.log("Circle added with ID:", circleId);

    // Arrange shapes around the circle
    const radius = 100;
    const angleStep = (2 * Math.PI) / selectedShapes.length;
    selectedShapes.forEach((shapeId, index) => {
      const angle = index * angleStep;
      const newX = centerX + radius * Math.cos(angle);
      const newY = centerY + radius * Math.sin(angle);

      editor.updateShape(shapeId, { x: newX, y: newY });
    });
    console.log("Shapes arranged around the circle.");

    // Add arrows connecting shapes to the circle
    selectedShapes.forEach((shapeId) => {
      const shapeBounds = editor.getBounds(shapeId);
      editor.createShape({
        id: editor.createShapeId(),
        type: "arrow",
        props: {
          start: {
            bound: shapeId,
            point: { x: shapeBounds.midX, y: shapeBounds.midY },
          },
          end: { bound: circleId, point: { x: centerX, y: centerY + 150 } },
        },
      });
    });
    console.log("Arrows added connecting shapes to the circle.");
  };

  return (
    <DefaultActionsMenu>
      <DefaultActionsMenuContent />
      <TldrawUiMenuItem
        id="custom-group"
        label="Custom Group"
        icon="group"
        onSelect={groupAndExtend}
      />
    </DefaultActionsMenu>
  );
}
