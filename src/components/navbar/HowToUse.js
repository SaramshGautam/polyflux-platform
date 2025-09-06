import React, { useMemo } from "react";
import "./HowToUse.css";

const studentsCSV = `firstName,lastName,email,lsu_id
Avery,Stone,avery.stone@lsu.edu,89-123-4567
Jordan,Li,jordan.li@lsu.edu,89-987-6543
Priya,Shah,priya.shah@lsu.edu,89-246-8101
`;

const teamsCSV = `firstName,lastName,email,lsu_id,teamName
Avery,Stone,avery.stone@lsu.edu,89-123-4567,Team Alpha
Jordan,Li,jordan.li@lsu.edu,89-987-6543,Team Alpha
Priya,Shah,priya.shah@lsu.edu,89-246-8101,Team Beta
`;

function downloadCSV(filename, content) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function HowToUse() {
  const today = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    []
  );

  // Images served from /public/howto/*
  const img = (name) => `${process.env.PUBLIC_URL}/howto/${name}.png`;

  return (
    <div className="howto-wrap">
      <header className="howto-header">
        <div className="howto-meta">Guide • Updated {today}</div>
        <h1>PolyFlux — Teacher Guide</h1>
        <p className="howto-meta">
          A step-by-step walkthrough for setting up classes, projects, and teams
          in PolyFlux.
        </p>
        <div className="howto-btns">
          <a
            href="https://polyflux-platform.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="howto-btn"
          >
            Open PolyFlux
          </a>
          <button
            className="howto-btn"
            onClick={() => downloadCSV("sample_students.csv", studentsCSV)}
          >
            Download sample_students.csv
          </button>
          <button
            className="howto-btn"
            onClick={() => downloadCSV("sample_teams.csv", teamsCSV)}
          >
            Download sample_teams.csv
          </button>
        </div>
      </header>

      <section className="howto-card">
        <h2 id="toc">Table of Contents</h2>
        <ol>
          <li>
            <a href="#access">Access & Sign-in</a>
          </li>
          <li>
            <a href="#dashboard">Teacher Dashboard</a>
          </li>
          <li>
            <a href="#add-classroom">Create a Classroom</a>
          </li>
          <li>
            <a href="#manage-classroom">Manage Students & Edit Classroom</a>
          </li>
          <li>
            <a href="#add-project">Create a Project</a>
          </li>
          <li>
            <a href="#teams">Manage Teams (Manual & Randomize)</a>
          </li>
          <li>
            <a href="#project-view">Project View & Whiteboards</a>
          </li>
          <li>
            <a href="#csv">CSV Format Reference</a>
          </li>
          <li>
            <a href="#troubleshoot">Troubleshooting & Tips</a>
          </li>
        </ol>
      </section>

      <h2 id="access">1. Access & Sign-in</h2>
      <p>
        Visit{" "}
        <a
          href="https://polyflux-platform.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
        >
          polyflux-platform.vercel.app
        </a>{" "}
        and click <strong>Login with Google</strong>. Choose your account and
        you’ll be redirected to the <strong>Teacher Dashboard</strong>.
      </p>
      <figure className="howto-shot">
        <img src={img("login")} alt="Login screen" />
        <figcaption>Login screen</figcaption>
      </figure>
      <div className="howto-callout">
        <strong>Note:</strong> If required by your institution, you can also use
        the LSU email link-based sign-in.
      </div>

      <h2 id="dashboard">2. Teacher Dashboard</h2>
      <p>
        Create new classrooms or open existing ones. First time? Click{" "}
        <strong>Add Classroom</strong>.
      </p>

      <h2 id="add-classroom">3. Create a Classroom</h2>
      <p>Fill the form and upload a CSV (or Excel) with your roster.</p>
      <figure className="howto-shot">
        <img src={img("add_classroom")} alt="Add Classroom form" />
        <figcaption>Add Classroom form</figcaption>
      </figure>
      <ol>
        <li>
          <strong>Class Name</strong>
        </li>
        <li>
          <strong>Course ID</strong>
        </li>
        <li>
          <strong>Semester</strong>
        </li>
        <li>
          <strong>Student File</strong>: CSV/XLSX (format below)
        </li>
      </ol>
      <p>
        Click <strong>Upload</strong> to create the class.
      </p>

      <h2 id="manage-classroom">4. Manage Students & Edit Classroom</h2>
      <p>Inside a classroom you’ll find:</p>
      <ul>
        <li>
          <strong>Add Project</strong>
        </li>
        <li>
          <strong>Manage Students</strong> — view, edit, delete, or add students
        </li>
        <li>
          <strong>Edit Classroom</strong> — change details or delete the class
        </li>
      </ul>
      <figure className="howto-shot">
        <img src={img("edit_classroom")} alt="Edit Classroom form" />
        <figcaption>Edit Classroom form</figcaption>
      </figure>

      <h2 id="add-project">5. Create a Project</h2>
      <p>
        Click <strong>Add Project</strong> and complete the form. Teams CSV is
        optional now or can be added later.
      </p>
      <figure className="howto-shot">
        <img src={img("add_project")} alt="Add Project form" />
        <figcaption>Add Project form</figcaption>
      </figure>
      <ol>
        <li>
          <strong>Project Name</strong> &amp; <strong>Description</strong>
        </li>
        <li>
          <strong>Due Date</strong>
        </li>
        <li>
          <strong>Team CSV (optional)</strong> — include a <code>teamName</code>{" "}
          column
        </li>
      </ol>

      <h2 id="teams">6. Manage Teams (Manual & Randomize)</h2>
      <h3>Manual</h3>
      <ol>
        <li>
          Create a team name, click <em>Create Team</em>.
        </li>
        <li>Drag students to a team.</li>
        <li>
          Click <em>Save Changes</em>.
        </li>
      </ol>
      <h3>Randomize</h3>
      <ol>
        <li>
          Choose <strong>team size limit</strong> (default 3).
        </li>
        <li>
          Toggle <strong>reassign all students</strong> if you want a fresh
          shuffle.
        </li>
        <li>
          Click <em>Randomize</em> → <em>Save</em>.
        </li>
      </ol>

      <h2 id="project-view">7. Project View & Whiteboards</h2>
      <p>
        Back on the project page, each team appears as a card. Open a card to
        access the shared <strong>whiteboard</strong>.
      </p>
      <figure className="howto-shot">
        <img src={img("edit_project")} alt="Edit Project form" />
        <figcaption>Edit Project form</figcaption>
      </figure>

      <h2 id="csv">8. CSV Format Reference</h2>
      <h3>Student Roster</h3>
      <p>
        Columns: <code>firstName</code>, <code>lastName</code>,{" "}
        <code>email</code>, <code>lsu_id</code>
      </p>
      <pre>{studentsCSV.trim()}</pre>
      <button
        className="howto-btn"
        onClick={() => downloadCSV("sample_students.csv", studentsCSV)}
      >
        Download sample_students.csv
      </button>

      <h3>Teams (optional)</h3>
      <p>
        Columns: <code>firstName</code>, <code>lastName</code>,{" "}
        <code>email</code>, <code>lsu_id</code>, <code>teamName</code>
      </p>
      <pre>{teamsCSV.trim()}</pre>
      <button
        className="howto-btn"
        onClick={() => downloadCSV("sample_teams.csv", teamsCSV)}
      >
        Download sample_teams.csv
      </button>

      <h2 id="troubleshoot">9. Troubleshooting & Tips</h2>
      <ul>
        <li>
          <strong>Google sign-in popup blocked:</strong> enable popups or try
          another browser.
        </li>
        <li>
          <strong>CSV issues:</strong> header names must match exactly; save as
          CSV/Excel.
        </li>
        <li>
          <strong>Missing students:</strong> check for extra header rows or
          blank lines.
        </li>
        <li>
          <strong>Randomize tips:</strong> set team size first; use “reassign
          all” to reshuffle everyone.
        </li>
        <li>
          <strong>FERPA:</strong> upload only necessary data and manage it
          securely.
        </li>
      </ul>

      <footer className="howto-footer">PolyFlux Teacher Guide • {today}</footer>
    </div>
  );
}
