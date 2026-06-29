import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  deleteDoc,
} from "firebase/firestore";
import "./ManageTeam.css";

const ncmp = (a, b) =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
const sortTeams = (arr) =>
  [...arr].sort((a, b) => ncmp(a.teamName, b.teamName));

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const nextTeamName = (names) => {
  const set = new Set(names);
  let n = 1;
  while (set.has(`Team ${n}`)) n++;
  return `Team ${n}`;
};

const ManageTeams = () => {
  const { className, projectName } = useParams();
  const navigate = useNavigate();

  const [teamName, setTeamName] = useState("");
  const [students, setStudents] = useState([]);
  const [teams, setTeams] = useState([]);
  const [teamSize, setTeamSize] = useState(3);
  const [reassignAll, setReassignAll] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // teamName to confirm
  const [dragOver, setDragOver] = useState(null); // teamName being dragged over

  // ── Toast helpers ──────────────────────────────────────────────────────────
  const showToast = (type, msg) => {
    const id = Date.now() + Math.random();
    setToasts((p) => [...p, { id, type, msg }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4500);
  };
  const toastIcon = (t) => (t === "success" ? "✓" : t === "danger" ? "✕" : "⚠");

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetch_ = async () => {
      try {
        const db = getFirestore();
        const studSnap = await getDocs(
          collection(db, "classrooms", className, "students")
        );
        const allStudents = studSnap.docs.map((d) => ({
          email: d.id,
          name:
            `${d.data()?.firstName || ""} ${d.data()?.lastName || ""}`.trim() ||
            d.id,
        }));

        const teamsSnap = await getDocs(
          collection(
            db,
            "classrooms",
            className,
            "Projects",
            projectName,
            "teams"
          )
        );
        const teamsList = teamsSnap.docs.map((d) => ({
          teamName: d.id,
          students: Object.keys(d.data()).map((email) => {
            const s = allStudents.find((s) => s.email === email);
            return { email, name: s ? s.name : email };
          }),
        }));

        const assignedEmails = new Set(
          teamsList.flatMap((t) => t.students.map((s) => s.email))
        );
        const unassigned = allStudents
          .filter((s) => !assignedEmails.has(s.email))
          .sort((a, b) => a.name.localeCompare(b.name));

        setStudents(unassigned);
        setTeams(sortTeams(teamsList));
      } catch (err) {
        console.error(err);
        showToast("danger", "Failed to load teams and students.");
      }
    };
    fetch_();
  }, [className, projectName]);

  // ── Create team ────────────────────────────────────────────────────────────
  const handleCreateTeam = () => {
    const name = teamName.trim();
    if (!name) return;
    if (teams.some((t) => t.teamName === name)) {
      showToast("warning", `Team "${name}" already exists.`);
      return;
    }
    setTeams((p) => sortTeams([...p, { teamName: name, students: [] }]));
    setTeamName("");
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(
        "https://flask-app-l7rilyhu2a-uc.a.run.app/save-teams",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teams: teams.map((t) => ({
              teamName: t.teamName,
              students: t.students.map((s) => s.email),
            })),
            class_name: className,
            project_name: projectName,
          }),
        }
      );
      const data = await res.json();
      if (data.error) showToast("danger", data.error);
      else showToast("success", data.message || "Teams saved.");
    } catch {
      showToast("danger", "An error occurred while saving teams.");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Delete team ────────────────────────────────────────────────────────────
  const confirmDelete = (name) => setDeleteConfirm(name);

  const handleDeleteTeam = async () => {
    const name = deleteConfirm;
    setDeleteConfirm(null);
    const team = teams.find((t) => t.teamName === name);
    setTeams((p) => sortTeams(p.filter((t) => t.teamName !== name)));
    if (team) setStudents((p) => [...p, ...team.students]);
    try {
      await deleteDoc(
        doc(
          getFirestore(),
          "classrooms",
          className,
          "Projects",
          projectName,
          "teams",
          name
        )
      );
      showToast("success", `Team "${name}" deleted.`);
    } catch {
      showToast("danger", `Failed to delete "${name}" from database.`);
    }
  };

  // ── Remove student from team ───────────────────────────────────────────────
  const handleRemoveStudent = (email, teamName) => {
    const student = teams
      .flatMap((t) => t.students)
      .find((s) => s.email === email);
    setTeams((p) =>
      sortTeams(
        p.map((t) =>
          t.teamName === teamName
            ? { ...t, students: t.students.filter((s) => s.email !== email) }
            : t
        )
      )
    );
    if (student)
      setStudents((p) =>
        p.some((s) => s.email === email) ? p : [...p, student]
      );
  };

  // ── Drag & drop ────────────────────────────────────────────────────────────
  const handleDragStart = (e, student) => {
    e.dataTransfer.setData("email", student.email);
    e.dataTransfer.setData("name", student.name);
  };

  const handleDrop = (e, teamName) => {
    e.preventDefault();
    setDragOver(null);
    const email = e.dataTransfer.getData("email");
    const name = e.dataTransfer.getData("name");
    if (!email || !name) return;
    setTeams((p) =>
      sortTeams(
        p.map((t) =>
          t.teamName === teamName && !t.students.some((s) => s.email === email)
            ? { ...t, students: [...t.students, { email, name }] }
            : t
        )
      )
    );
    setStudents((p) => p.filter((s) => s.email !== email));
  };

  // ── Randomize ──────────────────────────────────────────────────────────────
  const randomizeIntoTeams = () => {
    const size = Math.max(1, Number(teamSize) || 1);
    if (reassignAll) {
      const pool = shuffle([...students, ...teams.flatMap((t) => t.students)]);
      if (!pool.length) return;
      const numTeams = Math.max(1, Math.ceil(pool.length / size));
      let names = [...teams.map((t) => t.teamName)];
      while (names.length < numTeams) names.push(nextTeamName(names));
      names = names.slice(0, numTeams);
      const buckets = names.map((n) => ({ teamName: n, students: [] }));
      pool.forEach((s, i) => buckets[i % numTeams].students.push(s));
      setTeams(sortTeams(buckets));
      setStudents([]);
    } else {
      if (!students.length) return;
      const shuffled = shuffle(students);
      const current = teams.length
        ? teams.map((t) => ({ ...t, students: [...t.students] }))
        : [{ teamName: "Team 1", students: [] }];
      shuffled.forEach((s) => {
        let idx = current.findIndex((t) => t.students.length < size);
        if (idx === -1) {
          current.push({
            teamName: nextTeamName(current.map((t) => t.teamName)),
            students: [],
          });
          idx = current.length - 1;
        }
        current[idx].students.push(s);
      });
      setTeams(sortTeams(current));
      setStudents([]);
    }
  };

  const totalStudents =
    students.length + teams.reduce((n, t) => n + t.students.length, 0);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="mt-page">
      {/* ── Toasts ── */}
      <div className="lsu-toast-container" aria-live="polite">
        {toasts.map(({ id, type, msg }) => (
          <div key={id} className={`lsu-toast lsu-toast--${type}`} role="alert">
            <span className="lsu-toast-icon" aria-hidden="true">
              {toastIcon(type)}
            </span>
            <span className="lsu-toast-msg">{msg}</span>
            <button
              className="lsu-toast-close"
              onClick={() => setToasts((p) => p.filter((t) => t.id !== id))}
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* ── Delete confirm modal ── */}
      {deleteConfirm && (
        <div className="mt-overlay" role="dialog" aria-modal="true">
          <div className="mt-confirm">
            <div className="mt-confirm-icon" aria-hidden="true">
              ⚠
            </div>
            <h3>Delete "{deleteConfirm}"?</h3>
            <p>
              Students in this team will be moved back to unassigned. This also
              removes the team from the database.
            </p>
            <div className="mt-confirm-actions">
              <button className="mt-btn-danger" onClick={handleDeleteTeam}>
                Delete team
              </button>
              <button
                className="mt-btn-ghost"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="mt-header">
        <button
          className="mt-back-btn"
          onClick={() =>
            navigate(`/classroom/${className}/project/${projectName}`)
          }
        >
          ← Back to project
        </button>
        <h1 className="mt-title">Manage teams</h1>
        <p className="mt-subtitle">
          {projectName} · {totalStudents} student
          {totalStudents !== 1 ? "s" : ""} total
        </p>
      </div>

      {/* ── Toolbar ── */}
      <div className="mt-toolbar">
        {/* Create team */}
        <div className="mt-toolbar-group">
          <input
            className="mt-input"
            type="text"
            placeholder="New team name"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateTeam()}
          />
          <button className="mt-btn-primary" onClick={handleCreateTeam}>
            + Create team
          </button>
        </div>

        {/* Randomizer */}
        <div className="mt-toolbar-group mt-randomizer">
          <label className="mt-label-inline">
            Team size
            <input
              className="mt-input mt-input--sm"
              type="number"
              min="1"
              value={teamSize}
              onChange={(e) => setTeamSize(e.target.value)}
            />
          </label>
          <label className="mt-checkbox-label">
            <input
              type="checkbox"
              checked={reassignAll}
              onChange={(e) => setReassignAll(e.target.checked)}
            />
            Reassign all
          </label>
          <button className="mt-btn-secondary" onClick={randomizeIntoTeams}>
            ⇄ Randomize
          </button>
        </div>
      </div>

      {/* ── Main board ── */}
      <div className="mt-board">
        {/* Unassigned column */}
        <div className="mt-column mt-column--unassigned">
          <div className="mt-column-header">
            <span className="mt-column-title">Unassigned</span>
            <span className="mt-badge">{students.length}</span>
          </div>
          <ul className="mt-student-list">
            {students.length === 0 ? (
              <li className="mt-empty">All students assigned ✓</li>
            ) : (
              students.map((s) => (
                <li
                  key={s.email}
                  className="mt-student-chip"
                  draggable
                  onDragStart={(e) => handleDragStart(e, s)}
                  title={s.email}
                >
                  <span className="mt-student-avatar">
                    {s.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="mt-student-name">{s.name}</span>
                  <span className="mt-drag-handle" aria-hidden="true">
                    ⠿
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Team columns */}
        <div className="mt-teams-grid">
          {teams.length === 0 ? (
            <div className="mt-no-teams">
              No teams yet — create one above or use Randomize.
            </div>
          ) : (
            teams.map((team) => (
              <div
                key={team.teamName}
                className={`mt-column mt-column--team${
                  dragOver === team.teamName ? " mt-column--dragover" : ""
                }`}
                onDrop={(e) => handleDrop(e, team.teamName)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(team.teamName);
                }}
                onDragLeave={() => setDragOver(null)}
              >
                <div className="mt-column-header">
                  <span className="mt-column-title">{team.teamName}</span>
                  <div className="mt-column-header-right">
                    <span className="mt-badge">{team.students.length}</span>
                    <button
                      className="mt-delete-btn"
                      onClick={() => confirmDelete(team.teamName)}
                      aria-label={`Delete ${team.teamName}`}
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <ul className="mt-student-list">
                  {team.students.length === 0 ? (
                    <li className="mt-empty mt-empty--drop">
                      Drop students here
                    </li>
                  ) : (
                    team.students.map((s) => (
                      <li
                        key={s.email}
                        className="mt-student-chip mt-student-chip--assigned"
                        title={s.email}
                      >
                        <span className="mt-student-avatar">
                          {s.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="mt-student-name">{s.name}</span>
                        <button
                          className="mt-remove-btn"
                          onClick={() =>
                            handleRemoveStudent(s.email, team.teamName)
                          }
                          aria-label={`Remove ${s.name}`}
                        >
                          ✕
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Footer actions ── */}
      <div className="mt-footer">
        <button
          className="mt-btn-primary mt-btn-save"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <span className="mt-spinner" aria-hidden="true" /> Saving…
            </>
          ) : (
            "Save changes"
          )}
        </button>
        <button
          className="mt-btn-ghost"
          onClick={() =>
            navigate(`/classroom/${className}/project/${projectName}`)
          }
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default ManageTeams;
