// audio-shape-migrations.js
import {
  createShapePropsMigrationIds,
  createShapePropsMigrationSequence,
} from "tldraw";

const versions = createShapePropsMigrationIds(
  "audio", // this must match the shape type
  {
    AddAudioProperties: 1,
  }
);

export const audioShapeMigrations = createShapePropsMigrationSequence({
  sequence: [
    {
      id: versions.AddAudioProperties,
      up(props) {
        // Add default properties if they don't exist
        if (!props.playing) props.playing = false;
        if (!props.currentTime) props.currentTime = 0;
        if (!props.volume) props.volume = 1;
        if (!props.duration) props.duration = 0;
        if (!props.name) props.name = "Audio Recording";
      },
      down(props) {
        delete props.playing;
        delete props.currentTime;
        delete props.volume;
        delete props.duration;
        delete props.name;
      },
    },
  ],
});
