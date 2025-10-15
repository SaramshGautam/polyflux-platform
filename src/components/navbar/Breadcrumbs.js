// src/components/navbar/Breadcrumbs.js
import React from "react";
import { Link, useLocation } from "react-router-dom";

const decodeSafe = (v) => {
  if (!v) return "";
  try { return decodeURIComponent(v); } catch { return v; }
};

export default function Breadcrumbs() {
  const { pathname } = useLocation();
  const role = localStorage.getItem("role");

  const homeRoute =
    role === "teacher" ? "/teachers-home" :
    role === "student" ? "/students-home" :
    "/";

  const path = pathname !== "/" ? pathname.replace(/\/+$/, "") : "/";

  const renderCrumbs = (crumbs) => (
    <nav className="breadcrumbs" aria-label="breadcrumbs">
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1;
        return (
          <span className="crumb" key={`${c.path}-${i}`}>
            {last || c.noLink ? <span>{c.label}</span> : <Link to={c.path}>{c.label}</Link>}
            {!last && <span className="crumb-sep"> &gt; </span>}
          </span>
        );
      })}
    </nav>
  );

  if (path === homeRoute) {
    return renderCrumbs([{ label: "Home", path: homeRoute }]);
  }
  if (path.startsWith("/whiteboard")) {
    const seg = path.split("/").filter(Boolean);
    const [, className, projectName, teamName] = seg;

    const crumbs = [
      { label: "Home", path: homeRoute },
      { label: decodeSafe(className), path: `/classroom/${className}` },
      { label: decodeSafe(projectName), path: `/classroom/${className}/project/${projectName}` },
      { label: decodeSafe(teamName), path: `/classroom/${className}/project/${projectName}/team/${teamName}` },
      { label: "Whiteboard", path, noLink: true }, // final crumb not clickable
    ];
    return renderCrumbs(crumbs);
  }

  if (path.startsWith("/classroom")) {
    const seg = path.split("/").filter(Boolean);
    const className = seg[1];
    const base = [
      { label: "Home", path: homeRoute },
      { label: decodeSafe(className), path: `/classroom/${className}` },
    ];
    const isTeacher = role === "teacher";

    if (seg.length === 2) return renderCrumbs(base);

    const next = seg[2];

    if (isTeacher) {
      if (next === "add-project") {
        return renderCrumbs([...base, { label: "Add Project", path: `/classroom/${className}/add-project` }]);
      }

      if (next === "edit") {
        return renderCrumbs([...base, { label: "Edit Classroom", path: `/classroom/${className}/edit` }]);
      }

      if (next === "manage-students") {
        const crumbs = [...base, { label: "Manage Students", path: `/classroom/${className}/manage-students` }];
        if (seg.length >= 4) {
          const sub = seg[3];
          if (sub === "add-student") {
            crumbs.push({ label: "Add Student", path: `/classroom/${className}/manage-students/add-student` });
          } else if (seg.length >= 5 && seg[4] === "edit") {
            crumbs.push({ label: "Edit Student", path: `/classroom/${className}/manage-students/${sub}/edit` });
          }
        }
        return renderCrumbs(crumbs);
      }

      if (next === "project" && seg.length >= 4) {
        const projectName = seg[3];
        const crumbs = [
          ...base,
          { label: decodeSafe(projectName), path: `/classroom/${className}/project/${projectName}` },
        ];

        if (seg.length === 4) return renderCrumbs(crumbs);

        const sub = seg[4];

        if (sub === "edit") {
          crumbs.push({ label: "Edit Project", path: `/classroom/${className}/project/${projectName}/edit` });
          return renderCrumbs(crumbs);
        }

        if (sub === "manage-teams") {
          crumbs.push({ label: "Manage Teams", path: `/classroom/${className}/project/${projectName}/manage-teams` });
          return renderCrumbs(crumbs);
        }

        if (sub === "team" && seg.length >= 6) {
          const teamName = seg[5];
          crumbs.push({
            label: decodeSafe(teamName),
            path: `/classroom/${className}/project/${projectName}/team/${teamName}`,
          });
          return renderCrumbs(crumbs);
        }

        return renderCrumbs(crumbs);
      }

      let cumulative = "";
      const generic = [{ label: "Home", path: homeRoute }];
      seg.forEach((s) => {
        cumulative += `/${s}`;
        if (!["classroom", "project", "team"].includes(s.toLowerCase())) {
          generic.push({ label: decodeSafe(s), path: cumulative });
        }
      });
      return renderCrumbs(generic);
    }

    const exclude = ["classroom", "project", "team"];
    const crumbs = [...base];
    for (let i = 2; i < seg.length; i++) {
      const s = seg[i];
      if (!exclude.includes(s.toLowerCase())) {
        const cumulative = `/${seg.slice(0, i + 1).join("/")}`;
        crumbs.push({ label: decodeSafe(s), path: cumulative });
      }
    }
    return renderCrumbs(crumbs);
  }

  const seg = path.split("/").filter(Boolean);
  let cumulative = "";
  const generic = [{ label: "Home", path: homeRoute }];
  seg.forEach((s) => {
    cumulative += `/${s}`;
    generic.push({ label: decodeSafe(s), path: cumulative });
  });
  return renderCrumbs(generic);
}
