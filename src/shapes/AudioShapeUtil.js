import {
  HTMLContainer,
  Rectangle2d,
  ShapeUtil,
  getDefaultColorTheme,
  resizeBox,
} from "tldraw";

export class AudioShapeUtil extends ShapeUtil {
  static type = "audio";

  // Define props
  static props = {
    w: { type: "number", defaultValue: 300 },
    h: { type: "number", defaultValue: 80 },
    color: { type: "string", defaultValue: "black" },
    audioUrl: { type: "string", defaultValue: "" },
  };

  getDefaultProps() {
    return {
      w: 300,
      h: 80,
      color: "black",
      audioUrl: "",
    };
  }

  getGeometry(shape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    });
  }

  component(shape) {
    const theme = getDefaultColorTheme({
      isDarkMode: this.editor.user.getIsDarkMode(),
    });

    return (
      <HTMLContainer
        id={shape.id}
        style={{
          border: "1px solid gray",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "all",
          backgroundColor: theme[shape.props.color]?.semi || "white",
          width: shape.props.w,
          height: shape.props.h,
        }}
      >
        <audio controls src={shape.props.audioUrl} style={{ width: "90%" }} />
      </HTMLContainer>
    );
  }

  indicator(shape) {
    return <rect width={shape.props.w} height={shape.props.h} />;
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

// import { useState, useRef, useEffect } from "react";
// import {
//   HTMLContainer,
//   Rectangle2d,
//   ShapeUtil,
//   getDefaultColorTheme,
//   resizeBox,
// } from "tldraw";
// import { audioShapeMigrations } from "./AudioShapeMigration";
// import { audioShapeProps } from "./AudioShapeProps";

// export class AudioShapeUtil extends ShapeUtil {
//   static type = "audio";
//   static props = audioShapeProps;
//   static migrations = audioShapeMigrations;

//   isAspectRatioLocked(_shape) {
//     return false;
//   }

//   canResize(_shape) {
//     return true;
//   }

//   getDefaultProps() {
//     return {
//       w: 300,
//       h: 120,
//       color: "black",
//       audioUrl: "",
//       playing: false,
//       currentTime: 0,
//       volume: 1,
//       duration: 0,
//       name: "Audio Recording",
//     };
//   }

//   getGeometry(shape) {
//     return new Rectangle2d({
//       width: shape.props.w,
//       height: shape.props.h,
//       isFilled: true,
//     });
//   }

//   component(shape) {
//     const theme = getDefaultColorTheme({
//       isDarkMode: this.editor.user.getIsDarkMode(),
//     });

//     // eslint-disable-next-line react-hooks/rules-of-hooks
//     const audioRef = useRef(null);
//     // eslint-disable-next-line react-hooks/rules-of-hooks
//     const [isPlaying, setIsPlaying] = useState(shape.props.playing || false);
//     // eslint-disable-next-line react-hooks/rules-of-hooks
//     const [currentTime, setCurrentTime] = useState(
//       shape.props.currentTime || 0
//     );
//     // eslint-disable-next-line react-hooks/rules-of-hooks
//     const [duration, setDuration] = useState(shape.props.duration || 0);

//     // eslint-disable-next-line react-hooks/rules-of-hooks
//     useEffect(() => {
//       const audio = audioRef.current;
//       if (!audio) return;

//       const handleLoadedMetadata = () => {
//         setDuration(audio.duration);
//         // Update shape props with duration
//         this.editor.updateShape({
//           id: shape.id,
//           type: "audio",
//           props: {
//             ...shape.props,
//             duration: audio.duration,
//           },
//         });
//       };

//       const handleTimeUpdate = () => {
//         setCurrentTime(audio.currentTime);
//       };

//       const handleEnded = () => {
//         setIsPlaying(false);
//         this.editor.updateShape({
//           id: shape.id,
//           type: "audio",
//           props: {
//             ...shape.props,
//             playing: false,
//           },
//         });
//       };

//       const handlePlay = () => {
//         setIsPlaying(true);
//       };

//       const handlePause = () => {
//         setIsPlaying(false);
//       };

//       audio.addEventListener("loadedmetadata", handleLoadedMetadata);
//       audio.addEventListener("timeupdate", handleTimeUpdate);
//       audio.addEventListener("ended", handleEnded);
//       audio.addEventListener("play", handlePlay);
//       audio.addEventListener("pause", handlePause);

//       return () => {
//         audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
//         audio.removeEventListener("timeupdate", handleTimeUpdate);
//         audio.removeEventListener("ended", handleEnded);
//         audio.removeEventListener("play", handlePlay);
//         audio.removeEventListener("pause", handlePause);
//       };
//     }, [shape.id, shape.props]);

//     const togglePlay = () => {
//       const audio = audioRef.current;
//       if (!audio) return;

//       if (isPlaying) {
//         audio.pause();
//       } else {
//         audio.play();
//       }
//     };

//     const handleSeek = (e) => {
//       e.stopPropagation();
//       const audio = audioRef.current;
//       if (!audio || !duration) return;

//       const rect = e.currentTarget.getBoundingClientRect();
//       const x = e.clientX - rect.left;
//       const percentage = x / rect.width;
//       const newTime = percentage * duration;

//       audio.currentTime = newTime;
//       setCurrentTime(newTime);
//     };

//     const formatTime = (time) => {
//       const minutes = Math.floor(time / 60);
//       const seconds = Math.floor(time % 60);
//       return `${minutes}:${seconds.toString().padStart(2, "0")}`;
//     };

//     return (
//       <HTMLContainer
//         id={shape.id}
//         style={{
//           border: `2px solid ${theme[shape.props.color].solid}`,
//           borderRadius: "8px",
//           display: "flex",
//           flexDirection: "column",
//           padding: "12px",
//           pointerEvents: "all",
//           backgroundColor: theme[shape.props.color].semi,
//           color: theme[shape.props.color].solid,
//         }}
//       >
//         <audio
//           ref={audioRef}
//           src={shape.props.audioUrl}
//           preload="metadata"
//           style={{ display: "none" }}
//         />

//         {/* Audio Info */}
//         <div
//           style={{
//             fontSize: "12px",
//             marginBottom: "8px",
//             fontWeight: "bold",
//             overflow: "hidden",
//             textOverflow: "ellipsis",
//             whiteSpace: "nowrap",
//           }}
//         >
//           🎵 {shape.props.name}
//         </div>

//         {/* Progress Bar */}
//         <div
//           style={{
//             width: "100%",
//             height: "6px",
//             backgroundColor: "rgba(0,0,0,0.1)",
//             borderRadius: "3px",
//             cursor: "pointer",
//             marginBottom: "12px",
//             position: "relative",
//           }}
//           onClick={handleSeek}
//           onPointerDown={(e) => e.stopPropagation()}
//         >
//           <div
//             style={{
//               width: `${duration ? (currentTime / duration) * 100 : 0}%`,
//               height: "100%",
//               backgroundColor: theme[shape.props.color].solid,
//               borderRadius: "3px",
//               transition: "width 0.1s ease",
//             }}
//           />
//         </div>

//         {/* Controls */}
//         <div
//           style={{
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "space-between",
//             gap: "8px",
//           }}
//         >
//           <button
//             onClick={togglePlay}
//             onPointerDown={(e) => e.stopPropagation()}
//             style={{
//               border: "none",
//               backgroundColor: theme[shape.props.color].solid,
//               color: theme[shape.props.color].semi,
//               borderRadius: "50%",
//               width: "36px",
//               height: "36px",
//               cursor: "pointer",
//               display: "flex",
//               alignItems: "center",
//               justifyContent: "center",
//               fontSize: "14px",
//               fontWeight: "bold",
//             }}
//           >
//             {isPlaying ? "⏸️" : "▶️"}
//           </button>

//           <div
//             style={{
//               fontSize: "11px",
//               fontFamily: "monospace",
//               minWidth: "80px",
//               textAlign: "right",
//             }}
//           >
//             {formatTime(currentTime)} / {formatTime(duration)}
//           </div>
//         </div>
//       </HTMLContainer>
//     );
//   }

//   indicator(shape) {
//     return <rect width={shape.props.w} height={shape.props.h} />;
//   }

//   onResize(shape, info) {
//     return resizeBox(shape, info);
//   }

//   // Handle double-click to toggle play/pause
//   onDoubleClick(shape) {
//     this.editor.updateShape({
//       id: shape.id,
//       type: "audio",
//       props: {
//         ...shape.props,
//         playing: !shape.props.playing,
//       },
//     });
//   }
// }
