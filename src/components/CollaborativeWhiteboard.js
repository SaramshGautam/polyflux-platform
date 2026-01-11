import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Tldraw,
  DefaultToolbar,
  useTools,
  useIsToolSelected,
  DefaultToolbarContent,
  defaultTools,
  defaultShapeUtils,
  defaultBindingUtils,
  useEditor,
  useValue,
} from "tldraw";
import { useSync } from "@tldraw/sync";
import "tldraw/tldraw.css";
import { useParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMicrophone, faCircleStop } from "@fortawesome/free-solid-svg-icons";

import {
  collection,
  doc,
  getDoc,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { app, db, auth, storage } from "../firebaseConfig";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

import Navbar from "./navbar/Navbar";
import CustomContextMenu from "./CustomContextMenu";
import ContextToolbarComponent from "./ContextToolbarComponent";
import { AudioShapeUtil } from "../shapes/AudioShapeUtil";
import { MicrophoneTool } from "../tools/MicrophoneTool";
import CustomActionsMenu from "./CustomActionsMenu";
import { createToggleRecorder } from "../utils/audioRecorder";
import { useCanvasActionHistory } from "./useCanvasActionHistory";

const CUSTOM_TOOLS = [MicrophoneTool];
const SHAPE_UTILS = [...defaultShapeUtils, AudioShapeUtil];
const BINDING_UTILS = [...defaultBindingUtils];

/**
 * Presence writer: stores camera / cursor for this user in
 * classrooms/{className}/Projects/{projectName}/teams/{teamName}/presence/{uid}
 */
function useCameraPresence(
  editorRef,
  { className, projectName, teamName, enabled = true }
) {
  const lastWrite = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    const editor = editorRef.current;
    const user = auth.currentUser;
    if (!editor || !user) return;

    const presRef = doc(
      db,
      "classrooms",
      className,
      "Projects",
      projectName,
      "teams",
      teamName,
      "presence",
      user.uid
    );

    let prev = "";
    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      if (document.hidden) return;

      const now = performance.now();
      if (now - lastWrite.current < 120) return; // ~8fps
      lastWrite.current = now;

      const cam = editor.getCamera();
      const pageId = editor.getCurrentPageId?.();

      const cp = editor.inputs?.currentPagePoint;
      const cursor = cp ? { x: Number(cp.x) || 0, y: Number(cp.y) || 0 } : null;

      const vsb = editor.getViewportScreenBounds?.();
      const viewport = vsb
        ? {
            w: Math.max(0, Math.round(vsb.width)),
            h: Math.max(0, Math.round(vsb.height)),
          }
        : null;

      const payloadObj = {
        camera: {
          x: Number(cam.x) || 0,
          y: Number(cam.y) || 0,
          z: Number(cam.z) || 1,
        },
        pageId: pageId || null,
        cursor,
        viewport,
        displayName: user.displayName || user.email || "anon",
        email: user.email || null,
        photoURL: user.photoURL || null,
      };

      const payload = JSON.stringify(payloadObj);
      if (payload === prev) return;
      prev = payload;

      setDoc(
        presRef,
        { ...payloadObj, lastActive: serverTimestamp() },
        { merge: true }
      ).catch((e) => {
        console.warn("presence write failed", e);
      });
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [enabled, editorRef, className, projectName, teamName]);
}

const CollaborativeWhiteboard = () => {
  const { className, projectName, teamName } = useParams();

  const [shapeReactions, setShapeReactions] = useState({});
  const [selectedShape, setSelectedShape] = useState(null);

  const [commentCounts, setCommentCounts] = useState({});
  const [comments, setComments] = useState({});
  const [userRole, setUserRole] = useState(null);
  const [editorReady, setEditorReady] = useState(false);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(true);

  const editorInstance = useRef(null);

  // audio recording state
  const recorderRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStartAt, setRecordingStartAt] = useState(null);
  const [elapsed, setElapsed] = useState("0:00");

  // canvas action history (non-AI)
  const { actionHistory, setActionHistory, fetchActionHistory } =
    useCanvasActionHistory({ className, projectName, teamName });

  // Write camera / cursor presence
  useCameraPresence(editorInstance, {
    className,
    projectName,
    teamName,
    enabled: editorReady,
  });

  // Load user role from Firestore (non-AI, just permissions)
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    // NOTE: this assumes your user docs are keyed by uid
    const userRef = doc(db, "users", currentUser.uid);
    getDoc(userRef).then((docSnap) => {
      if (docSnap.exists()) {
        setUserRole(docSnap.data().role);
      }
    });
  }, []);

  // Save canvas preview to storage + Firestore when leaving
  const saveCanvasPreview = useCallback(async () => {
    const editor = editorInstance.current;
    if (!editor || !className || !projectName || !teamName) return;

    const shapeIds = editor.getCurrentPageShapeIds();
    if (!shapeIds || shapeIds.size === 0) return;

    try {
      const { blob } = await editor.toImage([...shapeIds], {
        format: "png",
        padding: 20,
        background: "white",
      });

      const path = `previews/${className}/${projectName}/${teamName}.png`;
      const imgRef = ref(storage, path);

      await uploadBytes(imgRef, blob, { contentType: "image/png" });
      const downloadURL = await getDownloadURL(imgRef);

      const teamRef = doc(
        db,
        "classrooms",
        className,
        "Projects",
        projectName,
        "teams",
        teamName
      );

      await setDoc(teamRef, { previewUrl: downloadURL }, { merge: true });

      console.log("✅ Canvas preview saved:", path);
    } catch (error) {
      console.error("Error saving canvas preview:", error);
    }
  }, [className, projectName, teamName]);

  function MicButton({ startRecording, stopRecording }) {
    // force rerender on a timer while recording so elapsed text updates
    const [, bump] = useState(0);

    useEffect(() => {
      const id = setInterval(() => bump((x) => x + 1), 200);
      return () => clearInterval(id);
    }, []);

    const isRec = isRecordingRef.current;
    const el = elapsedRef.current;

    return (
      <button
        type="button"
        className="tlui-button tlui-button--icon"
        title={
          isRec
            ? `Stop recording • ${el} / 0:30 (auto-stops at 0:30)`
            : `Record (auto-stops at 0:30)`
        }
        style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
        onClick={async () => {
          const editor = editorInstance.current;
          if (!editor) return;
          if (!isRec) await startRecording(editor);
          else await stopRecording(editor);
        }}
      >
        {isRec ? (
          <>
            <FontAwesomeIcon
              icon={faCircleStop}
              style={{ color: "red", fontSize: 14 }}
            />
            <span
              style={{
                fontFamily: "monospace",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {el}/0:30
            </span>
          </>
        ) : (
          <FontAwesomeIcon icon={faMicrophone} style={{ fontSize: 16 }} />
        )}
      </button>
    );
  }

  // Save preview on unload / unmount
  useEffect(() => {
    if (!editorReady) return;
    if (!className || !projectName || !teamName) return;

    const handleBeforeUnload = () => {
      saveCanvasPreview();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      saveCanvasPreview();
    };
  }, [editorReady, className, projectName, teamName, saveCanvasPreview]);

  // elapsed recording timer
  useEffect(() => {
    if (!isRecording || !recordingStartAt) {
      setElapsed("0:00");
      return;
    }

    const id = setInterval(() => {
      const ms = Date.now() - recordingStartAt;
      const total = Math.floor(ms / 1000);
      const mm = Math.floor(total / 60);
      const ss = total % 60;
      setElapsed(`${mm}:${ss.toString().padStart(2, "0")}`);
    }, 200);

    return () => clearInterval(id);
  }, [isRecording, recordingStartAt]);

  const formatMs = (ms) => {
    const total = Math.floor(ms / 1000);
    const mm = Math.floor(total / 60);
    const ss = (total % 60).toString().padStart(2, "0");
    return `${mm}:${ss}`;
  };

  const togglePanelStable = useCallback(() => {
    setIsPanelCollapsed((prev) => !prev);
  }, []);

  const addCommentStable = useCallback((shapeId, commentData) => {
    const commentDataWithTime = {
      ...commentData,
      timestamp: new Date().toLocaleString(),
    };

    setComments((prev) => ({
      ...prev,
      [shapeId]: [...(prev[shapeId] || []), commentDataWithTime],
    }));

    setCommentCounts((prev) => ({
      ...prev,
      [shapeId]: (prev[shapeId] || 0) + 1,
    }));
  }, []);

  // ---- keep latest values in refs (so tldrawComponents can be stable) ----
  const shapeReactionsRef = useRef(shapeReactions);
  const selectedShapeRef = useRef(selectedShape);
  const commentCountsRef = useRef(commentCounts);
  const commentsRef = useRef(comments);
  const actionHistoryRef = useRef(actionHistory);
  const userRoleRef = useRef(userRole);
  const isPanelCollapsedRef = useRef(isPanelCollapsed);

  // recording refs (you already have some)
  // const isRecordingRef = useRef(isRecording);
  const elapsedRef = useRef(elapsed);

  useEffect(
    () => void (shapeReactionsRef.current = shapeReactions),
    [shapeReactions]
  );
  useEffect(
    () => void (selectedShapeRef.current = selectedShape),
    [selectedShape]
  );
  useEffect(
    () => void (commentCountsRef.current = commentCounts),
    [commentCounts]
  );
  useEffect(() => void (commentsRef.current = comments), [comments]);
  useEffect(
    () => void (actionHistoryRef.current = actionHistory),
    [actionHistory]
  );
  useEffect(() => void (userRoleRef.current = userRole), [userRole]);
  useEffect(
    () => void (isPanelCollapsedRef.current = isPanelCollapsed),
    [isPanelCollapsed]
  );

  useEffect(() => void (isRecordingRef.current = isRecording), [isRecording]);
  useEffect(() => void (elapsedRef.current = elapsed), [elapsed]);

  const uploadToFirebase = useCallback(async (blob) => {
    try {
      const currentUser = auth.currentUser;
      const timestamp = Date.now();
      const uid = currentUser?.uid || "anon";
      const filename = `audio/${uid}/${timestamp}.webm`;

      const audioRef = ref(storage, filename);
      const metadata = {
        contentType: "audio/webm",
        customMetadata: {
          uploadedBy: currentUser ? currentUser.uid : "anonymous",
          uploadedAt: new Date(timestamp).toISOString(),
        },
      };

      console.log("Uploading audio to Firebase:", filename);
      const snapshot = await uploadBytes(audioRef, blob, metadata);
      console.log("Upload successful:", snapshot);

      const url = await getDownloadURL(audioRef);
      console.log("Audio URL:", url);
      return url;
    } catch (error) {
      console.error("Error uploading to Firebase:", error);
      if (
        error.code === "storage/unauthorized" ||
        error.code === "storage/cors-error"
      ) {
        console.warn("Using local blob URL as fallback");
        return URL.createObjectURL(blob);
      }
      throw error;
    }
  }, []);

  const startRecording = useCallback(async () => {
    recorderRef.current = await createToggleRecorder({
      maxDurationMs: 30000,
      onElapsed: (ms) => {
        const total = Math.floor(ms / 1000);
        const mm = Math.floor(total / 60);
        const ss = (total % 60).toString().padStart(2, "0");
        setElapsed(`${mm}:${ss}`);
      },
    });
    setIsRecording(true);
    setRecordingStartAt(Date.now());
    await recorderRef.current.start();
  }, []);

  const stopRecording = useCallback(
    async (editor) => {
      try {
        const blob = await recorderRef.current.stop();
        setIsRecording(false);
        setRecordingStartAt(null);
        setElapsed("0:00");

        const url = await uploadToFirebase(blob);

        const bounds = editor.getViewportPageBounds();
        const x = (bounds.minX + bounds.maxX) / 2;
        const y = (bounds.minY + bounds.maxY) / 2;

        editor.createShape({
          type: "audio",
          x,
          y,
          props: {
            w: 420,
            h: 39,
            src: url,
            title: "",
            isPlaying: false,
            currentTime: 0,
            duration: 0,
          },
        });
      } catch (e) {
        setIsRecording(false);
        setRecordingStartAt(null);
        setElapsed("0:00");
        alert("Recording failed: " + (e?.message || e));
      } finally {
        recorderRef.current = null;
      }
    },
    [uploadToFirebase]
  );

  // refs so toolbar override can access latest callbacks
  const startRecordingRef = useRef(startRecording);
  const stopRecordingRef = useRef(stopRecording);
  const isRecordingRef = useRef(isRecording);

  useEffect(() => {
    startRecordingRef.current = startRecording;
  }, [startRecording]);

  useEffect(() => {
    stopRecordingRef.current = stopRecording;
  }, [stopRecording]);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  const uiOverrides = useMemo(
    () => ({
      tools(editor, tools) {
        tools.microphone = {
          id: "microphone",
          label: "Record",
          kbd: "r",
          readonlyOk: false,
          onSelect: async () => {
            if (!isRecordingRef.current) {
              await startRecordingRef.current?.();
            } else {
              await stopRecordingRef.current?.(editor);
            }
          },
        };
        return tools;
      },
    }),
    []
  );

  const addComment = useCallback((shapeId, commentData) => {
    const commentDataWithTime = {
      ...commentData,
      timestamp: new Date().toLocaleString(),
    };

    setComments((prevComments) => {
      const updatedComments = {
        ...prevComments,
        [shapeId]: [...(prevComments[shapeId] || []), commentDataWithTime],
      };
      return updatedComments;
    });

    setCommentCounts((prevCounts) => {
      const updatedCounts = {
        ...prevCounts,
        [shapeId]: (prevCounts[shapeId] || 0) + 1,
      };
      return updatedCounts;
    });
  }, []);

  // const togglePanel = () => {
  //   setIsPanelCollapsed((prev) => !prev);
  // };

  const roomId = useMemo(
    () =>
      className && projectName && teamName
        ? `collaBoard-${className}-${projectName}-${teamName}`
        : null,
    [className, projectName, teamName]
  );

  const store = useSync({
    uri: roomId
      ? `https://tldraw-sync-server.saramshgautam.workers.dev/connect/${roomId}`
      : "",
    roomId: roomId || "",
    shapeUtils: SHAPE_UTILS,
    bindingUtils: BINDING_UTILS,
  });

  const toolsMemo = useMemo(() => [...defaultTools, ...CUSTOM_TOOLS], []);

  // Tldraw components: context menu, toolbar, etc. (no AI)
  const tldrawComponents = useMemo(
    () => ({
      ContextMenu: (props) => {
        const editor = useEditor();
        const selection = useValue(
          "simple selection summary",
          () => {
            const ids = editor.getSelectedShapeIds();
            return { ids };
          },
          [editor]
        );

        return (
          <CustomContextMenu
            {...props}
            selection={selection}
            shapeReactions={shapeReactionsRef.current}
            setShapeReactions={setShapeReactions}
            selectedShape={selectedShapeRef.current}
            setSelectedShape={setSelectedShape}
            commentCounts={commentCountsRef.current}
            setCommentCounts={setCommentCounts}
            comments={commentsRef.current}
            setComments={setComments}
            actionHistory={actionHistoryRef.current}
            setActionHistory={setActionHistory}
            isPanelCollapsed={isPanelCollapsedRef.current}
            togglePanel={togglePanelStable}
          />
        );
      },

      InFrontOfTheCanvas: (props) => (
        <>
          <ContextToolbarComponent
            {...props}
            userRole={userRoleRef.current}
            selectedShape={selectedShapeRef.current}
            setShapeReactions={setShapeReactions}
            shapeReactions={shapeReactionsRef.current}
            commentCounts={commentCountsRef.current}
            addComment={addCommentStable}
            setActionHistory={setActionHistory}
            fetchActionHistory={fetchActionHistory}
          />
        </>
      ),

      Toolbar: (props) => {
        const editor = useEditor();
        const tools = useTools();
        const isMicSelected = useIsToolSelected(tools["microphone"]);

        return (
          <DefaultToolbar {...props}>
            {/* <button
              type="button"
              className="tlui-button tlui-button--icon"
              aria-pressed={isMicSelected}
              title={
                isRecording
                  ? `Stop recording • ${elapsed} / ${formatMs(
                      30000
                    )} (auto-stops at ${formatMs(30000)})`
                  : `Record (auto-stops at ${formatMs(30000)})`
              }
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
              onClick={async () => {
                if (!isRecording) {
                  await startRecording(editor);
                } else {
                  await stopRecording(editor);
                }
              }}
            >
              {isRecording ? (
                <>
                  <FontAwesomeIcon
                    icon={faCircleStop}
                    style={{ color: "red", fontSize: 14 }}
                  />
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {elapsed}/{formatMs(30000)}
                  </span>
                </>
              ) : (
                <>
                  <FontAwesomeIcon
                    icon={faMicrophone}
                    style={{ fontSize: 16 }}
                  />
                </>
              )}
            </button> */}

            {/* <MicButton
              startRecording={startRecordingRef.current}
              stopRecording={stopRecordingRef.current}
            /> */}

            <DefaultToolbarContent />
          </DefaultToolbar>
        );
      },

      ActionsMenu: (props) => <CustomActionsMenu {...props} />,
    }),
    [
      // shapeReactions,
      // selectedShape,
      // commentCounts,
      // comments,
      // actionHistory,
      // userRole,
      // addComment,
      // setActionHistory,
      // fetchActionHistory,
      // isRecording,
      // elapsed,
      // isPanelCollapsed,
    ]
  );

  if (!roomId) return null;

  return (
    <>
      <Navbar />
      <div className="main-container" style={{ position: "fixed", inset: 0 }}>
        <Tldraw
          onMount={(editor) => {
            editorInstance.current = editor;
            setEditorReady(true);
            if (editorInstance) {
              saveCanvasPreview();
            }
          }}
          store={store}
          tools={toolsMemo}
          shapeUtils={SHAPE_UTILS}
          overrides={uiOverrides}
          components={tldrawComponents}
        />
      </div>
    </>
  );
};

export default CollaborativeWhiteboard;
