// TeamCard.jsx
import { Link } from "react-router-dom";
import defaultTeamPreview from "../utils/teamA.png";

export default function TeamCard({
  className,
  projectName,
  team,
  previewUrl,
  onWhiteboardClick,
}) {
  const safePreview = previewUrl || defaultTeamPreview;

  return (
    <div className="card team-card">
      <div className="whiteboard-preview">
        <img
          src={safePreview}
          alt={`${team.name}-preview`}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = defaultTeamPreview;
          }}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            borderRadius: "10px 10px 0 0",
          }}
        />
      </div>

      <div className="card-body">
        <h5 className="card-title">
          <i className="bi bi-people-fill me-2" /> {team.name}
        </h5>
      </div>

      <div className="card-footer d-flex gap-2 justify-content-center">
        <Link
          to={`/classroom/${className}/project/${projectName}/team/${team.name}`}
          className="btn btn-whiteboard"
        >
          View Team
        </Link>
        <button
          className="btn btn-whiteboard"
          onClick={() => onWhiteboardClick(team.name)}
        >
          <i className="bi bi-tv" /> Whiteboard
        </button>
      </div>
    </div>
  );
}
