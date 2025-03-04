import React from "react";
import { TldrawUiMenuSubmenu, TldrawUiMenuItem, TldrawUiIcon } from "tldraw";

export default function ReactionsMenu({ onReactionSelect }) {
  const reactions = [
    {
      id: "submenu-like",
      label: "Like",
      // icon: "check-circle",
      icon: <TldrawUiIcon icon="check-circle" />,
    },
    {
      id: "submenu-dislike",
      label: "Dislike",
      icon: "cross-circle",
      // icon: <TldrawUiIcon icon="cross-circle" />,
    },
    {
      id: "submenu-surprised",
      label: "Surprised",
      // icon: "question-mark-circle",
      icon: <TldrawUiIcon icon="question-mark-circle" />,
    },
    {
      id: "submenu-confused",
      label: "Confused",
      // icon: "warning-triangle",
      icon: <TldrawUiIcon icon="warning-triangle" />,
    },
  ];

  return (
    <TldrawUiMenuSubmenu
      id="react"
      label="React 🙂"
      description="React to the shapes"
    >
      {reactions.map((reaction) => (
        <TldrawUiMenuItem
          key={reaction.id}
          id={reaction.id}
          label={reaction.label}
          icon={reaction.icon}
          //   onSelect={() => console.log(`${reaction.label} selected`)}
          onSelect={() => onReactionSelect(reaction.label)}
        />
      ))}
    </TldrawUiMenuSubmenu>
  );
}
