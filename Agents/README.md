# 🧠 AI-Nudge Backend for Collaborative Canvas

This project powers an AI-augmented collaborative whiteboard application built using [Tldraw](https://www.tldraw.com/) and Firebase Firestore. It uses AI agents to observe canvas activity, analyze shape behavior, and generate **context-sensitive nudges** that encourage creativity, communication, and inclusion during ideation and planning sessions.

---

## 📌 Features

- 🔍 Analyze canvas contents (shapes, clusters, participation)
- 🤖 Trigger AI-based nudges using five agent roles:
  - **Catalyst** – Helps kick off ideation
  - **Provocateur** – Encourages divergent, outlier thinking
  - **Communicator** – Synthesizes and organizes dense clusters
  - **Converter** – Suggests visual re-structuring of heavy text
  - **Mediator** – Balances uneven participation
- 🧠 Built-in analytics for clustering, edge detection, user activity
- 🧾 Nudges saved to Firestore and rendered on the frontend
- ⚙️ Scheduler runs every minute to update active canvases

---

## 🗂️ Project Structure

```
.
├── main.py                    # Entrypoint for Flask + scheduler
├── models.py                  # Shape and Nudge dataclasses
├── analytics_engine.py        # Canvas shape processing logic
├── ai_agents.py               # Five AI agents and logic
├── canvas_processor.py        # Canvas orchestration logic
├── firebase-key.json          # Firebase credentials (add this locally)
├── requirements.txt           # Python dependencies
└── README.md                  # You're reading this
```

---

## ⚙️ Installation & Setup

### 1. 📥 Clone the repository

```bash
git clone https://github.com/yourusername/ai-nudge-canvas-backend.git
cd ai-nudge-canvas-backend
```

### 2. 🐍 Create virtual environment (optional but recommended)

```bash
python3 -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
```

### 3. 📦 Install dependencies

```bash
pip install -r requirements.txt
```

### 4. 🔑 Set up Firebase

Place your Firebase service account JSON key as:

```
firebase-key.json
```

This is required to read/write from Firestore.

---

## 🚀 Running the Server

### 🧪 Local server with scheduled job

```bash
python main.py
```

- Starts a Flask server at `http://localhost:8080`
- Runs scheduled background job every minute to process active canvases

---

## 🧠 AI Agents Explained

Each AI role observes a canvas and nudges users in real-time based on detected behaviors:

| Agent          | Trigger Condition                                  | Sample Nudge                                                     |
| -------------- | -------------------------------------------------- | ---------------------------------------------------------------- |
| `Catalyst`     | Blank or stalled canvas                            | "Ready to brainstorm? Try starting with sticky notes!"           |
| `Provocateur`  | Cluster saturation or edge clusters left untouched | "Explore outlier ideas – what stands apart may spark new paths." |
| `Communicator` | High-density clusters                              | "Can you connect these ideas? Try summarizing or grouping."      |
| `Converter`    | Text-heavy layout, messy organization              | "Try switching to a mind map or grid layout for clarity."        |
| `Mediator`     | Uneven user participation                          | "Looks like one person is contributing more. Invite others in?"  |

Each agent is modular and can be extended individually.

---

## 🛠 API Endpoints

### ✅ Health check

```http
GET /health
```

### 🔄 Manually trigger nudge generation for a canvas

```http
POST /process
Content-Type: application/json

{
  "canvas_id": "CSC4444_Image Classifier_Team B"
}
```

### ⚙️ Trigger batch processing of all recently active canvases

```http
POST /process-all
```

---

## 🔄 Firestore Structure

Your Firestore should follow this hierarchy:

```
classrooms/{class}/Projects/{project}/teams/{team}/shapes/
                                              /nudges/
```

- **Shapes**: Sticky notes, text blocks, etc.
- **Nudges**: AI-generated prompts saved with fields like:
  - `id`, `type`, `message`, `chips`, `canvas_id`, `created_at`, `expires_at`, `dismissed`

Example nudge document:

```json
{
  "id": "CSC4444_Image Classifier_Team B_catalyst_1755490953",
  "type": "catalyst",
  "message": "Ready to brainstorm? Let's get those ideas flowing!",
  "chips": ["Add starter sticky notes", "Try a mind map layout"],
  "targets": [],
  "canvas_id": "CSC4444_Image Classifier_Team B",
  "created_at": "2025-08-17T23:22:33.385Z",
  "expires_at": "2025-08-17T23:52:33.385Z",
  "dismissed": false
}
```

---

## 🔁 Scheduled Processing

A background scheduler checks active canvases (updated within the last 2 hours) and generates nudges automatically every 1 minute.

No cron needed — this is handled in Python using the `schedule` library.

---

## 💡 Next Steps

- [ ] Integrate nudge display in the Tldraw frontend
- [ ] Implement dismiss functionality
- [ ] Add analytics dashboard for agent performance
- [ ] Extend AI agents with embeddings or LLM support

---

## 🙌 Acknowledgements

This system draws inspiration from collaborative ideation research, AI-in-the-loop facilitation models, and creative support systems in HCI.

---

## 📄 License

MIT License. See [LICENSE](./LICENSE) for details.
