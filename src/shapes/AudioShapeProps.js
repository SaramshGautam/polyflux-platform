import { DefaultColorStyle, T } from "tldraw";

// Validation for our custom audio shape's props
export const audioShapeProps = {
  w: T.number,
  h: T.number,
  color: DefaultColorStyle,
  audioUrl: T.string,
  duration: T.optional(T.number),
  name: T.optional(T.string),
  playing: T.optional(T.boolean),
  currentTime: T.optional(T.number),
  volume: T.optional(T.number),
};
