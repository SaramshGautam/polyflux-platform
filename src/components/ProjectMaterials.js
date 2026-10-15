import React, { useEffect, useRef, useState } from "react";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  deleteDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  orderBy,
  query,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { storage } from "../firebaseConfig";
import CollapsibleSection from "./CollapsibleSection";
import "./ProjectMaterials.css";

const MAX_MATERIAL_SIZE_MB = 15; // PDFs/slides/docs
const MAX_VIDEO_SIZE_MB = 200; // uploaded video files

// Extension -> accepted MIME types + short label shown on the item's icon chip.
const DOC_EXTENSIONS = {
  pdf: { mime: ["application/pdf"], label: "PDF" },
  pptx: {
    mime: [
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ],
    label: "SLIDES",
  },
  ppt: { mime: ["application/vnd.ms-powerpoint"], label: "SLIDES" },
  docx: {
    mime: [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    label: "DOC",
  },
  doc: { mime: ["application/msword"], label: "DOC" },
};

const VIDEO_FILE_EXTENSIONS = {
  mp4: { mime: ["video/mp4"], label: "MP4" },
  mov: { mime: ["video/quicktime"], label: "MOV" },
  webm: { mime: ["video/webm"], label: "WEBM" },
  m4v: { mime: ["video/x-m4v", "video/mp4"], label: "M4V" },
};

function extOf(filename = "") {
  const m = /\.([a-zA-Z0-9]+)$/.exec(filename);
  return m ? m[1].toLowerCase() : "";
}

// Recognize YouTube/Vimeo links and turn them into a safe, known embed URL.
// Anything else is just shown as a plain "watch" link — we never render an
// iframe pointed at an arbitrary, unrecognized URL.
function parseVideoUrl(raw) {
  const url = (raw || "").trim();

  const yt = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (yt) {
    return { provider: "youtube", embedUrl: `https://www.youtube.com/embed/${yt[1]}` };
  }

  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) {
    return { provider: "vimeo", embedUrl: `https://player.vimeo.com/video/${vimeo[1]}` };
  }

  return { provider: null, embedUrl: null };
}

function formatSize(bytes) {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// Which grid group a material belongs to, and the groups' display order.
// Only groups that end up with at least one item are rendered.
function categoryOf(material) {
  if (material.type === "video") return "video_link";
  if (material.type === "video_file") return "video_file";
  if (material.type === "document") {
    const ext = extOf(material.fileName || "");
    if (ext === "pdf") return "pdf";
    if (ext === "ppt" || ext === "pptx") return "slides";
    if (ext === "doc" || ext === "docx") return "doc";
  }
  return "other";
}

const GROUPS = [
  { key: "video_link", label: "Video links" },
  { key: "video_file", label: "Uploaded videos" },
  { key: "pdf", label: "PDFs" },
  { key: "slides", label: "Slides" },
  { key: "doc", label: "Documents" },
  { key: "other", label: "Other" },
];

export default function ProjectMaterials({ className, projectName, role }) {
  const isTeacher = role === "teacher";

  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("document"); // "document" | "video_link" | "video_file"
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null); // 0-100 while a resumable upload runs
  const [videoUrlInput, setVideoUrlInput] = useState("");
  const [videoTitleInput, setVideoTitleInput] = useState("");
  const [downloadingId, setDownloadingId] = useState(null);
  const fileInputRef = useRef(null);
  const videoFileInputRef = useRef(null);

  const materialsCollection = () =>
    collection(
      getFirestore(),
      "classrooms",
      className,
      "Projects",
      projectName,
      "materials"
    );

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(materialsCollection(), orderBy("createdAt", "desc")));
      setMaterials(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error("Error loading materials:", e);
      setError("Couldn't load materials. Please refresh.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!className || !projectName) return;
    fetchMaterials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [className, projectName]);

  // ─── Upload a document (PDF/PPTX/DOCX) ───────────────────────────────────
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;

    const ext = extOf(file.name);
    const known = DOC_EXTENSIONS[ext];
    if (!known || !known.mime.includes(file.type)) {
      setError("Please upload a PDF, PPT/PPTX, or DOC/DOCX file.");
      return;
    }
    if (file.size > MAX_MATERIAL_SIZE_MB * 1024 * 1024) {
      setError(`That file is larger than the ${MAX_MATERIAL_SIZE_MB} MB limit.`);
      return;
    }

    setError("");
    setUploading(true);
    try {
      const newDocRef = doc(materialsCollection());
      const storagePath = `materials/${className}/${projectName}/${newDocRef.id}.${ext}`;
      const fileRef = ref(storage, storagePath);

      await uploadBytes(fileRef, file, { contentType: file.type });
      const url = await getDownloadURL(fileRef);

      await setDoc(newDocRef, {
        type: "document",
        title: file.name,
        fileName: file.name,
        mimeType: file.type,
        storagePath,
        url,
        size: file.size,
        visibleToStudents: true,
        uploadedBy: localStorage.getItem("userEmail") || "",
        createdAt: serverTimestamp(),
      });

      await fetchMaterials();
    } catch (e) {
      console.error("Error uploading material:", e);
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // ─── Upload a video file (MP4/MOV/WEBM) ──────────────────────────────────
  // Uses a resumable upload (with progress) since video files run much
  // larger than the PDF/slide uploads above.
  const handleVideoFileChange = (e) => {
    const file = e.target.files[0];
    if (videoFileInputRef.current) videoFileInputRef.current.value = "";
    if (!file) return;

    const ext = extOf(file.name);
    const known = VIDEO_FILE_EXTENSIONS[ext];
    if (!known || !known.mime.includes(file.type)) {
      setError("Please upload an MP4, MOV, or WEBM video file.");
      return;
    }
    if (file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
      setError(`That video is larger than the ${MAX_VIDEO_SIZE_MB} MB limit.`);
      return;
    }

    setError("");
    setUploading(true);
    setUploadProgress(0);

    const newDocRef = doc(materialsCollection());
    const storagePath = `materials/${className}/${projectName}/${newDocRef.id}.${ext}`;
    const fileRef = ref(storage, storagePath);
    const task = uploadBytesResumable(fileRef, file, { contentType: file.type });

    task.on(
      "state_changed",
      (snapshot) => {
        setUploadProgress(
          Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
        );
      },
      (err) => {
        console.error("Error uploading video:", err);
        setError("Video upload failed. Please try again.");
        setUploading(false);
        setUploadProgress(null);
      },
      async () => {
        try {
          const url = await getDownloadURL(fileRef);
          await setDoc(newDocRef, {
            type: "video_file",
            title: file.name,
            fileName: file.name,
            mimeType: file.type,
            storagePath,
            url,
            size: file.size,
            visibleToStudents: true,
            uploadedBy: localStorage.getItem("userEmail") || "",
            createdAt: serverTimestamp(),
          });
          await fetchMaterials();
        } catch (e) {
          console.error("Error finalizing video upload:", e);
          setError("Video uploaded, but saving its details failed. Please refresh.");
        } finally {
          setUploading(false);
          setUploadProgress(null);
        }
      }
    );
  };

  // ─── Add a video link ─────────────────────────────────────────────────────
  const handleAddVideo = async (e) => {
    e.preventDefault();
    const trimmed = videoUrlInput.trim();
    if (!trimmed) return;

    let parsed;
    try {
      parsed = new URL(trimmed);
    } catch {
      setError("That doesn't look like a valid URL.");
      return;
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      setError("Video links must start with http:// or https://.");
      return;
    }

    const { provider, embedUrl } = parseVideoUrl(trimmed);

    setError("");
    setUploading(true);
    try {
      await setDoc(doc(materialsCollection()), {
        type: "video",
        title: videoTitleInput.trim() || trimmed,
        fileName: null,
        mimeType: null,
        storagePath: null,
        url: trimmed,
        videoProvider: provider,
        embedUrl,
        visibleToStudents: true,
        uploadedBy: localStorage.getItem("userEmail") || "",
        createdAt: serverTimestamp(),
      });

      setVideoUrlInput("");
      setVideoTitleInput("");
      await fetchMaterials();
    } catch (e) {
      console.error("Error adding video link:", e);
      setError("Couldn't add that video link. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // ─── Download a document or uploaded video file ──────────────────────────
  // A plain <a download> is silently ignored by browsers for cross-origin
  // URLs (which Firebase Storage URLs are), so it would just open the file
  // instead of saving it. Fetching the bytes ourselves and handing the
  // browser a same-origin blob: URL is what actually forces a save dialog.
  const handleDownload = async (material) => {
    setDownloadingId(material.id);
    try {
      const resp = await fetch(material.url);
      if (!resp.ok) throw new Error(`fetch failed: ${resp.status}`);
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = material.fileName || material.title || "download";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.warn("Direct download failed, opening the file instead:", e);
      window.open(material.url, "_blank", "noopener,noreferrer");
    } finally {
      setDownloadingId(null);
    }
  };

  // ─── Toggle visibility ──────────────────────────────────────────────────
  const toggleVisibility = async (material) => {
    try {
      await updateDoc(
        doc(
          getFirestore(),
          "classrooms",
          className,
          "Projects",
          projectName,
          "materials",
          material.id
        ),
        { visibleToStudents: !material.visibleToStudents }
      );
      setMaterials((prev) =>
        prev.map((m) =>
          m.id === material.id ? { ...m, visibleToStudents: !m.visibleToStudents } : m
        )
      );
    } catch (e) {
      console.error("Error toggling visibility:", e);
      setError("Couldn't update visibility. Please try again.");
    }
  };

  // ─── Remove a material ──────────────────────────────────────────────────
  const removeMaterial = async (material) => {
    try {
      if (material.storagePath) {
        try {
          await deleteObject(ref(storage, material.storagePath));
        } catch (e) {
          console.warn("Storage file already gone or couldn't be deleted:", e);
        }
      }
      await deleteDoc(
        doc(
          getFirestore(),
          "classrooms",
          className,
          "Projects",
          projectName,
          "materials",
          material.id
        )
      );
      setMaterials((prev) => prev.filter((m) => m.id !== material.id));
    } catch (e) {
      console.error("Error removing material:", e);
      setError("Couldn't remove that item. Please try again.");
    }
  };

  const visibleMaterials = isTeacher ? materials : materials.filter((m) => m.visibleToStudents);

  const iconFor = (material) => DOC_EXTENSIONS[extOf(material.fileName || "")]?.label || "FILE";

  // ─── One grid card ────────────────────────────────────────────────────────
  const renderCard = (material) => (
    <div className="pm-card" key={material.id}>
      <div className="pm-card-thumb">
        {material.type === "video" ? (
          material.embedUrl ? (
            <iframe
              src={material.embedUrl}
              title={material.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <a
              href={material.url}
              target="_blank"
              rel="noopener noreferrer"
              className="pm-card-watch-link"
            >
              ▶ Watch video
            </a>
          )
        ) : material.type === "video_file" ? (
          <video controls src={material.url} />
        ) : (
          <div className="pm-card-icon">{iconFor(material)}</div>
        )}
      </div>

      <div className="pm-card-body">
        <div className="pm-item-title-row">
          <span className="pm-item-title">{material.title}</span>
          {isTeacher && !material.visibleToStudents && (
            <span className="pm-badge pm-badge--private">Private</span>
          )}
        </div>

        {(material.type === "document" || material.type === "video_file") && (
          <div className="pm-item-link-row">
            <a
              href={material.url}
              target="_blank"
              rel="noopener noreferrer"
              className="pm-item-link"
            >
              Open{material.size ? ` · ${formatSize(material.size)}` : ""}
            </a>
            <button
              type="button"
              className="pm-download-link"
              onClick={() => handleDownload(material)}
              disabled={downloadingId === material.id}
            >
              {downloadingId === material.id ? "Downloading…" : "Download"}
            </button>
          </div>
        )}

        {material.type === "video" && material.embedUrl && (
          <a
            href={material.url}
            target="_blank"
            rel="noopener noreferrer"
            className="pm-item-link"
          >
            Watch on {material.videoProvider === "vimeo" ? "Vimeo" : "YouTube"} ↗
          </a>
        )}
      </div>

      {isTeacher && (
        <div className="pm-card-actions">
          <button
            type="button"
            className="pm-visibility-toggle"
            onClick={() => toggleVisibility(material)}
            title={
              material.visibleToStudents
                ? "Visible to students — click to hide"
                : "Hidden from students — click to show"
            }
          >
            {material.visibleToStudents ? "Visible" : "Hidden"}
          </button>
          <button
            type="button"
            className="pm-remove-btn"
            onClick={() => removeMaterial(material)}
            aria-label="Remove material"
            title="Remove"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );

  return (
    <CollapsibleSection
      className="pm-section"
      title="Materials"
      count={visibleMaterials.length}
      storageKey={`pf-collapsed:materials:${className}:${projectName}`}
      rightContent={
        !isTeacher && (
          <span className="pm-hint">Shared by your instructor for this project.</span>
        )
      }
    >
      {error && <p className="pm-error">{error}</p>}

      {isTeacher && (
        <div className="pm-add">
          <div className="pm-add-tabs">
            <button
              type="button"
              className={`pm-add-tab ${mode === "document" ? "pm-add-tab--active" : ""}`}
              onClick={() => setMode("document")}
            >
              Upload file
            </button>
            <button
              type="button"
              className={`pm-add-tab ${mode === "video_link" ? "pm-add-tab--active" : ""}`}
              onClick={() => setMode("video_link")}
            >
              Add video link
            </button>
            <button
              type="button"
              className={`pm-add-tab ${mode === "video_file" ? "pm-add-tab--active" : ""}`}
              onClick={() => setMode("video_file")}
            >
              Upload video
            </button>
          </div>

          {mode === "document" && (
            <label className="pm-file-label">
              <span>{uploading ? "Uploading…" : "Choose PDF, PPTX, or DOCX"}</span>
              <input
                type="file"
                accept=".pdf,.ppt,.pptx,.doc,.docx"
                ref={fileInputRef}
                onChange={handleFileChange}
                disabled={uploading}
                className="pm-file-input"
              />
            </label>
          )}

          {mode === "video_link" && (
            <form className="pm-video-form" onSubmit={handleAddVideo}>
              <input
                type="text"
                placeholder="Paste a YouTube or Vimeo link"
                value={videoUrlInput}
                onChange={(e) => setVideoUrlInput(e.target.value)}
                className="pm-video-input"
              />
              <input
                type="text"
                placeholder="Title (optional)"
                value={videoTitleInput}
                onChange={(e) => setVideoTitleInput(e.target.value)}
                className="pm-video-input pm-video-input--title"
              />
              <button type="submit" className="btn action-btn" disabled={uploading}>
                {uploading ? "Adding…" : "Add"}
              </button>
            </form>
          )}

          {mode === "video_file" && (
            <>
              <label className="pm-file-label">
                <span>
                  {uploading
                    ? `Uploading… ${uploadProgress ?? 0}%`
                    : "Choose MP4, MOV, or WEBM"}
                </span>
                <input
                  type="file"
                  accept=".mp4,.mov,.webm,.m4v"
                  ref={videoFileInputRef}
                  onChange={handleVideoFileChange}
                  disabled={uploading}
                  className="pm-file-input"
                />
              </label>
              {uploading && uploadProgress !== null && (
                <div className="pm-progress-track">
                  <div className="pm-progress-fill" style={{ width: `${uploadProgress}%` }} />
                </div>
              )}
            </>
          )}

          <p className="pm-size-hint">
            {mode === "video_file"
              ? `Max ${MAX_VIDEO_SIZE_MB} MB per video.`
              : mode === "document"
              ? `Max ${MAX_MATERIAL_SIZE_MB} MB per file.`
              : "YouTube and Vimeo links embed automatically."}
          </p>
        </div>
      )}

      {loading ? (
        <p className="text-muted">Loading materials…</p>
      ) : visibleMaterials.length === 0 ? (
        <p className="text-muted">
          {isTeacher
            ? "No materials yet — upload a file or add a video link above."
            : "Your instructor hasn't shared any materials yet."}
        </p>
      ) : (
        GROUPS.map((group) => {
          const items = visibleMaterials.filter((m) => categoryOf(m) === group.key);
          if (items.length === 0) return null;
          return (
            <div className="pm-group" key={group.key}>
              <h3 className="pm-group-heading">{group.label}</h3>
              <div className="pm-grid">{items.map(renderCard)}</div>
            </div>
          );
        })
      )}
    </CollapsibleSection>
  );
}
