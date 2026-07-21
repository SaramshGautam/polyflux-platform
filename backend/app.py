import firebase_admin
from firebase_admin import credentials, firestore, storage
from firebase_admin import auth as fb_auth
from flask import Flask, request, jsonify, session
import os
from datetime import datetime, timezone
import pandas as pd
from flask_cors import CORS, cross_origin
from flask import jsonify, request, redirect, url_for, flash
from werkzeug.utils import secure_filename
from google.cloud.firestore import SERVER_TIMESTAMP
import json
from dotenv import load_dotenv
import base64
import secrets
import string
import uuid
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from python_http_client.exceptions import HTTPError
import requests


# ── Flask init ────────────────────────────────────────────────────────────────
app = Flask(__name__)
app.secret_key = 'secret_key'
load_dotenv()

# ── Firebase init ─────────────────────────────────────────────────────────────
firebase_key_base64 = os.getenv("FIREBASE_KEY_BASE64")
if firebase_key_base64:
    firebase_key_json = base64.b64decode(firebase_key_base64).decode('utf-8')
    firebase_key      = json.loads(firebase_key_json)
    cred              = credentials.Certificate(firebase_key)

    # storageBucket must match your Firebase project's default bucket name
    # e.g. "your-project-id.appspot.com"
    firebase_admin.initialize_app(cred, {
        'storageBucket': os.getenv("FIREBASE_STORAGE_BUCKET")  
    })

MAIL_FROM       = os.getenv("MAIL_FROM", "lsu.ntotaro2@gmail.com")
APP_SIGNIN_URL  = os.getenv("APP_SIGNIN_URL", "https://polyflux-platform.vercel.app/")
# Free, self-hosted RAG chatbot service (FastAPI + local HuggingFace models,
# see ai-backend/). No paid API keys involved.
AI_BACKEND_URL  = os.getenv("AI_BACKEND_URL", "http://127.0.0.1:8080")

CORS(app, supports_credentials=True, resources={
    r"/api/*": {"origins": ["http://localhost:3000", "https://polyflux-platform.vercel.app"]},
    r"/*":     {"origins": ["http://localhost:3000", "https://polyflux-platform.vercel.app"]},
})

db = firestore.client()

UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "/tmp/uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
ALLOWED_EXTENSIONS = {'csv', 'xls', 'xlsx'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config.update(
    SESSION_COOKIE_SAMESITE='None',
    SESSION_COOKIE_SECURE=True,
)


# ── CORS headers ──────────────────────────────────────────────────────────────
@app.after_request
def after_request(response):
    allowed_origins = ["http://localhost:3000", "https://polyflux-platform.vercel.app"]
    origin = request.headers.get("Origin")
    if origin in allowed_origins:
        response.headers.add('Access-Control-Allow-Origin', origin)
        response.headers.add('Vary', 'Origin')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        response.headers.add('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    return response


# ── Helpers ───────────────────────────────────────────────────────────────────
def is_authenticated():
    return 'user' in session and 'role' in session

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def gen_password(length=12):
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return "".join(secrets.choice(alphabet) for _ in range(length))

def send_email(to_email: str, subject: str, html: str):
    api_key = os.getenv("SENDGRID_API_KEY")
    if not api_key:
        print("WARN: SENDGRID_API_KEY not set; skipping email to", to_email)
        return False
    message = Mail(from_email=MAIL_FROM, to_emails=to_email,
                   subject=subject, html_content=html)
    try:
        sg   = SendGridAPIClient(api_key)
        resp = sg.send(message)
        print("SendGrid OK:", resp.status_code)
        return 200 <= resp.status_code < 300
    except HTTPError as e:
        print("SendGrid HTTPError:", getattr(e, 'status_code', '?'),
              getattr(e, 'body', repr(e)))
        return False
    except Exception as e:
        print(f"Email send failed to {to_email}: {e}")
        return False


# ── Cloud Storage PDF helpers ─────────────────────────────────────────────────
def upload_pdf(file_obj, destination_path: str) -> dict:
    """
    Upload a PDF file-object to Firebase Cloud Storage.
    Returns a metadata dict ready to store in Firestore:
      { name, url, size, uploadedAt }
    """
    bucket = storage.bucket()
    blob   = bucket.blob(destination_path)
    file_obj.seek(0)
    blob.upload_from_file(file_obj, content_type="application/pdf")
    blob.make_public()          # remove this line if your bucket is private;
                                # use signed URLs instead (see note below)
    return {
        "name":       file_obj.filename,
        "url":        blob.public_url,
        "size":       blob.size,
        "uploadedAt": datetime.now(timezone.utc).isoformat(),
    }


def delete_pdf(url: str):
    """
    Delete a PDF from Cloud Storage given its public URL.
    Safe to call — logs a warning if deletion fails.
    """
    try:
        bucket    = storage.bucket()
        # Extract blob path from URL:
        # https://storage.googleapis.com/<bucket>/<path>  OR
        # https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<encoded-path>
        if "firebasestorage.googleapis.com" in url:
            import urllib.parse
            blob_name = urllib.parse.unquote(url.split("/o/")[1].split("?")[0])
        else:
            blob_name = url.split(f"{bucket.name}/")[1].split("?")[0]
        bucket.blob(blob_name).delete()
    except Exception as e:
        print(f"Warning: could not delete PDF at {url}: {e}")


# ── Study assistant ingestion ─────────────────────────────────────────────────
def project_course_id(class_name: str, project_name: str) -> str:
    """Shared key so the frontend's chat widget and this ingest call always
    point at the same ai-backend collection for a given project."""
    return f"{class_name}__{project_name}"


def ingest_course_materials(course_id: str, documents: list):
    """
    Best-effort call to the ai-backend RAG service so newly uploaded PDFs
    become searchable by the study assistant widget. Never raises — a
    failure here (e.g. ai-backend not running locally) must not block
    project creation/editing.
    """
    documents = [d for d in documents if d.get("url") and d.get("name")]
    if not documents:
        return
    try:
        resp = requests.post(
            f"{AI_BACKEND_URL}/api/chatbot/ingest",
            json={"course_id": course_id, "documents": documents},
            timeout=15,
        )
        if resp.status_code >= 300:
            print(f"WARN: ai-backend ingest failed ({resp.status_code}): {resp.text}")
    except Exception as e:
        print(f"WARN: could not reach ai-backend for ingest: {e}")


# ═══════════════════════════════════════════════════════════════════════════════

@app.route('/test_cors', methods=['GET'])
def test_cors():
    return jsonify({"message": "CORS is working!"}), 200

@app.route('/')
def home():
    return "Welcome to the home page!"

@app.route('/login', methods=['POST'])
def login():
    role       = request.form.get('role')
    user_email = request.form.get('userEmail')
    if user_email and role:
        session['user'] = user_email
        session['role'] = role
        return jsonify({'message': 'Logged in successfully'}), 200
    return jsonify({'error': 'Invalid credentials'}), 401


# ── Add classroom ─────────────────────────────────────────────────
@app.route('/addclassroom', methods=['POST'])
def addclassroom():
    role       = request.form.get('role')
    user_email = request.form.get('userEmail')

    if not role or not user_email:
        return jsonify({"error": "Role or user email not provided."}), 400
    if role != 'teacher':
        return jsonify({"error": "Access forbidden: User is not a teacher"}), 403

    class_name = request.form.get('class_name')
    course_id  = request.form.get('course_id')
    semester   = request.form.get('semester')
    file       = request.files.get('student_file')

    if not class_name.strip():
        return jsonify({"error": "Class name cannot be empty."}), 400
    if not course_id.strip():
        return jsonify({"error": "Course ID cannot be empty."}), 400
    if not semester.strip():
        return jsonify({"error": "Semester cannot be empty."}), 400
    if file.filename == '':
        return jsonify({"error": "No selected file."}), 400

    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ['.csv', '.xlsx']:
        return jsonify({"error": "Invalid file format. Please upload a CSV or Excel file."}), 400

    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(file_path)

    try:
        df = pd.read_csv(file_path) if file_ext == '.csv' else pd.read_excel(file_path)

        if not {'firstname', 'lastname', 'email'}.issubset(df.columns):
            os.remove(file_path)
            return jsonify({"error": "File must have columns: firstname, lastname, email"}), 400

        classroom_ref = db.collection('classrooms').document(course_id)
        if classroom_ref.get().exists:
            os.remove(file_path)
            return jsonify({"error": f"Classroom ID '{course_id}' already exists."}), 400

        existing = db.collection('classrooms')\
                     .where('teacherEmail', '==', user_email)\
                     .where('class_name', '==', class_name).get()
        if len(existing) > 0:
            os.remove(file_path)
            return jsonify({"error": f"Classroom '{class_name}' already exists."}), 400

        classroom_ref.set({
            'classID': course_id, 'courseID': course_id,
            'semester': semester, 'class_name': class_name,
            'teacherEmail': user_email,
        })

        for _, row in df.iterrows():
            student_email = row['email']
            classroom_ref.collection('students').document(student_email).set({
                'firstName': row['firstname'], 'lastName': row['lastname'],
                'email': student_email, 'assignedAt': firestore.SERVER_TIMESTAMP,
            })
            user_doc = db.collection('users').document(student_email)
            if not user_doc.get().exists:
                user_doc.set({
                    'email': student_email, 'role': 'student',
                    'name': f"{row['lastname']}, {row['firstname']}",
                    'createdAt': firestore.SERVER_TIMESTAMP,
                })

        os.remove(file_path)
        return jsonify({"message": f'Classroom "{class_name}" created successfully!'}), 200

    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        return jsonify({"error": f"Error processing file: {e}"}), 500


# ── Add project ───────────────────────────────────────────────────────────────
@app.route('/api/add_project/<class_name>', methods=['POST'])
def add_project(class_name):
    try:
        project_name = request.form.get('project_name')
        description  = request.form.get('description')
        due_date_str = request.form.get('due_date')   # optional ISO string
        team_file    = request.files.get('team_file') # optional CSV/Excel

        if not project_name or not description:
            return jsonify({"message": "Project name and description are required."}), 400

        project_ref = (
            db.collection('classrooms')
              .document(class_name)
              .collection('Projects')
              .document(project_name)
        )

        # ── Build core payload ────────────────────────────────────────────────
        payload = {
            'projectName': project_name,
            'description': description,
            'createdAt':   firestore.SERVER_TIMESTAMP,
        }
        if due_date_str:
            try:
                payload['dueDate'] = datetime.fromisoformat(due_date_str)
            except ValueError:
                payload['dueDate'] = due_date_str  # store as-is if parsing fails

        # ── Description PDF ───────────────────────────────────────────────────
        desc_pdf_file = request.files.get('description_pdf')
        if desc_pdf_file and desc_pdf_file.filename:
            dest = f"projects/{class_name}/{project_name}/description_pdf/{uuid.uuid4().hex}.pdf"
            payload['description_pdf'] = upload_pdf(desc_pdf_file, dest)

        # ── Note PDFs ─────────────────────────────────────────────────────────
        note_files = request.files.getlist('note_files')
        note_metas = []
        for nf in note_files:
            if nf and nf.filename:
                dest = (f"projects/{class_name}/{project_name}/notes/"
                        f"{uuid.uuid4().hex}_{secure_filename(nf.filename)}")
                note_metas.append(upload_pdf(nf, dest))
        if note_metas:
            payload['notes'] = note_metas

        project_ref.set(payload)

        # ── Make uploaded PDFs searchable by the study assistant ──────────────
        ingest_docs = []
        if payload.get('description_pdf'):
            ingest_docs.append({
                "name": payload['description_pdf']['name'],
                "url":  payload['description_pdf']['url'],
            })
        for note in note_metas:
            ingest_docs.append({"name": note['name'], "url": note['url']})
        ingest_course_materials(project_course_id(class_name, project_name), ingest_docs)

        # ── Optional team CSV ─────────────────────────────────────────────────
        teams_created = False
        if team_file and allowed_file(team_file.filename):
            filename  = secure_filename(team_file.filename)
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            team_file.save(file_path)
            try:
                data = pd.read_csv(file_path) if filename.endswith('.csv') else pd.read_excel(file_path)
                data.columns = data.columns.str.strip().str.lower()
                required = ['firstname', 'lastname', 'email']
                missing  = [c for c in required if c not in data.columns]
                if missing:
                    return jsonify({"message": f"File missing columns: {', '.join(missing)}"}), 400
                # (team assignment logic here if needed)
                teams_created = True
            except Exception as e:
                return jsonify({"message": f"Error processing team file: {str(e)}"}), 500
            finally:
                if os.path.exists(file_path):
                    os.remove(file_path)

        return jsonify({
            "message":      "Project added successfully.",
            "teamsCreated": teams_created,
        }), 200

    except Exception as e:
        return jsonify({"message": f"An unexpected error occurred: {str(e)}"}), 500


# ── Edit project ──────────────────────────────────────────────────────────────
@app.route('/api/classroom/<class_name>/project/<project_name>/edit', methods=['POST'])
def edit_project(class_name, project_name):
    try:
        project_ref = (
            db.collection('classrooms')
              .document(class_name)
              .collection('Projects')
              .document(project_name)
        )

        if not project_ref.get().exists:
            return jsonify({'error': 'Project not found'}), 404

        update_data = {}

        # ── Text fields ───────────────────────────────────────────────────────
        new_name    = request.form.get('project_name')
        description = request.form.get('description')
        due_date_str= request.form.get('due_date')

        if new_name:
            update_data['projectName'] = new_name
        if description:
            update_data['description'] = description
        if due_date_str:
            try:
                update_data['dueDate'] = datetime.fromisoformat(due_date_str)
            except ValueError:
                update_data['dueDate'] = due_date_str

        # ── Remove description PDF ────────────────────────────────────────────
        if request.form.get('remove_description_pdf') == 'true':
            snap = project_ref.get().to_dict() or {}
            old  = snap.get('description_pdf')
            if old and old.get('url'):
                delete_pdf(old['url'])
            update_data['description_pdf'] = firestore.DELETE_FIELD

        # ── New / replacement description PDF ─────────────────────────────────
        desc_pdf_file = request.files.get('description_pdf')
        if desc_pdf_file and desc_pdf_file.filename:
            # Delete old one first if it exists
            snap = project_ref.get().to_dict() or {}
            old  = snap.get('description_pdf')
            if old and old.get('url'):
                delete_pdf(old['url'])
            dest = (f"projects/{class_name}/{project_name}/description_pdf/"
                    f"{uuid.uuid4().hex}.pdf")
            update_data['description_pdf'] = upload_pdf(desc_pdf_file, dest)

        # ── Remove specific notes by URL ──────────────────────────────────────
        urls_to_remove = request.form.getlist('remove_note_urls')
        current_notes  = (project_ref.get().to_dict() or {}).get('notes', [])
        if urls_to_remove:
            for url in urls_to_remove:
                delete_pdf(url)
            current_notes = [n for n in current_notes if n.get('url') not in urls_to_remove]
            update_data['notes'] = current_notes

        # ── Append new note PDFs ──────────────────────────────────────────────
        new_note_files = request.files.getlist('note_files')
        new_note_metas = []
        for nf in new_note_files:
            if nf and nf.filename:
                dest = (f"projects/{class_name}/{project_name}/notes/"
                        f"{uuid.uuid4().hex}_{secure_filename(nf.filename)}")
                new_note_metas.append(upload_pdf(nf, dest))

        if new_note_metas:
            # If we already rebuilt current_notes above, use that; otherwise fetch fresh
            base = update_data.get('notes', current_notes)
            update_data['notes'] = base + new_note_metas

        # ── Optional team file ────────────────────────────────────────────────
        team_file = request.files.get('team_file')
        if team_file and allowed_file(team_file.filename):
            filename  = secure_filename(team_file.filename)
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            team_file.save(file_path)
            try:
                data = pd.read_csv(file_path) if filename.endswith('.csv') else pd.read_excel(file_path)
                data.columns = data.columns.str.strip().str.lower()
                # (team update logic here if needed)
            except Exception as e:
                return jsonify({"error": f"Error processing team file: {str(e)}"}), 500
            finally:
                if os.path.exists(file_path):
                    os.remove(file_path)

        project_ref.update(update_data)

        # ── Make newly uploaded PDFs searchable by the study assistant ────────
        ingest_docs = []
        new_desc = update_data.get('description_pdf')
        if new_desc and new_desc != firestore.DELETE_FIELD:
            ingest_docs.append({"name": new_desc['name'], "url": new_desc['url']})
        for note in new_note_metas:
            ingest_docs.append({"name": note['name'], "url": note['url']})
        if ingest_docs:
            ingest_course_materials(project_course_id(class_name, project_name), ingest_docs)

        return jsonify({"message": "Project updated successfully."}), 200

    except Exception as e:
        return jsonify({"error": f"Error updating project: {str(e)}"}), 500


# ── Delete project ────────────────────────────────────────────────────────────
@app.route('/api/classroom/<class_name>/project/<project_name>/delete', methods=['DELETE'])
def delete_project(class_name, project_name):
    try:
        project_ref = (
            db.collection('classrooms')
              .document(class_name)
              .collection('Projects')
              .document(project_name)
        )
        snap = project_ref.get()
        if not snap.exists:
            return jsonify({'error': 'Project not found'}), 404

        # ── Clean up PDFs from Cloud Storage before deleting the doc ─────────
        project_data = snap.to_dict() or {}
        desc_pdf = project_data.get('description_pdf')
        if desc_pdf and desc_pdf.get('url'):
            delete_pdf(desc_pdf['url'])
        for note in project_data.get('notes', []):
            if note.get('url'):
                delete_pdf(note['url'])

        project_ref.delete()
        return jsonify({'message': 'Project deleted successfully'}), 200

    except Exception as e:
        return jsonify({'error': f'Error deleting project: {str(e)}'}), 500


@app.route('/classroom/<class_id>', methods=['GET'])
def classroom_view(class_id):
    if not is_authenticated():
        return jsonify({"error": "Unauthorized access. Please log in."}), 401
    classroom_ref = db.collection('classrooms').document(class_id).get()
    if not classroom_ref.exists:
        return jsonify({"error": "Classroom not found."}), 404
    classroom     = classroom_ref.to_dict()
    teacher_email = classroom['teacherEmail']
    student_emails = [s.id for s in db.collection('classrooms').document(class_id).collection('students').stream()]
    user_email = session.get('user')
    if not user_email:
        return jsonify({"error": "User email not found in session."}), 403
    role = 'teacher' if user_email == teacher_email else 'student' if user_email in student_emails else None
    if role is None:
        return jsonify({"error": "Access denied."}), 403
    projects = [{"id": p.id, **p.to_dict()} for p in
                db.collection('classrooms').document(class_id).collection('Projects').stream()]
    return jsonify({"class_id": class_id, "class_name": classroom['class_name'],
                    "semester": classroom['semester'], "projects": projects, "role": role})


@app.route('/api/classroom/<classID>/manage_students', methods=['GET'])
def manage_students(classID):
    try:
        students = []
        for doc in db.collection('classrooms').document(classID).collection('students').stream():
            d  = doc.to_dict()
            ts = d.get('assignedAt')
            assigned_at = None
            if ts is not None:
                if isinstance(ts, datetime):
                    assigned_at = ts.isoformat()
                else:
                    to_dt = getattr(ts, "to_datetime", None)
                    assigned_at = to_dt().isoformat() if callable(to_dt) else str(ts)
            students.append({
                'firstName': d.get('firstName'), 'lastName': d.get('lastName'),
                'lsuId': d.get('lsuID'), 'assignedAt': assigned_at, 'email': doc.id,
            })
        return jsonify({'students': students}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/classroom/<class_name>/add_student', methods=['POST'])
def add_student(class_name):
    try:
        data       = request.get_json()
        first_name = data.get('first_name')
        last_name  = data.get('last_name')
        email      = data.get('email')
        classroom_ref = db.collection('classrooms').document(class_name)
        classroom_ref.collection('students').document(email).set({
            'firstName': first_name, 'lastName': last_name,
            'email': email, 'assignedAt': firestore.SERVER_TIMESTAMP,
        })
        user_doc = db.collection('users').document(email)
        if not user_doc.get().exists:
            user_doc.set({'email': email, 'role': 'student',
                          'name': f"{last_name}, {first_name}",
                          'createdAt': firestore.SERVER_TIMESTAMP})
        return jsonify({'message': f'{first_name} {last_name} has been added.'}), 200
    except Exception as e:
        return jsonify({'error': f'Error adding student: {str(e)}'}), 500


@app.route('/api/classroom/<class_name>/notify_students', methods=['POST'])
def notify_students(class_name):
    try:
        body       = request.get_json(silent=True) or {}
        user_email = request.form.get('userEmail') or body.get('userEmail')
        if not user_email:
            return jsonify({"error": "Only the classroom teacher can notify students."}), 403
        classroom_doc = db.collection('classrooms').document(class_name).get()
        if not classroom_doc.exists:
            return jsonify({"error": "Classroom not found."}), 404
        results = []
        for s in db.collection('classrooms').document(class_name).collection('students').stream():
            sd            = s.to_dict()
            student_email = sd.get('email')
            first, last   = sd.get('firstName', ''), sd.get('lastName', '')
            if not student_email:
                continue
            try:
                fb_auth.get_user_by_email(student_email)
            except fb_auth.UserNotFoundError:
                temp_pw  = gen_password()
                user_rec = fb_auth.create_user(email=student_email, email_verified=False,
                                               password=temp_pw,
                                               display_name=f"{first} {last}".strip() or None)
                try:
                    fb_auth.set_custom_user_claims(user_rec.uid, {"role": "student"})
                except Exception as e:
                    print("Claims error:", e)
            try:
                reset_link = fb_auth.generate_password_reset_link(student_email)
            except Exception as e:
                results.append({"email": student_email, "sent": False, "reason": "reset_link_failed"})
                continue
            subject = f"[{class_name}] Your PolyFlux account"
            html    = f"""
                <p>Hi {first} {last},</p>
                <p>Your account is ready for <strong>{class_name}</strong>.</p>
                <p><strong>Sign-in email:</strong> {student_email}</p>
                <p><a href="{reset_link}">Set your password</a></p>
                <p>Then sign in: <a href="{APP_SIGNIN_URL}">{APP_SIGNIN_URL}</a></p>
                <p>— PolyFlux</p>
            """
            results.append({"email": student_email, "sent": send_email(student_email, subject, html)})
        return jsonify({"message": "Notifications processed.", "results": results}), 200
    except Exception as e:
        return jsonify({"error": f"Failed to notify students: {e}"}), 500


@app.route('/api/classroom/<class_name>/edit_student/<student_email>', methods=['GET', 'PUT'])
def edit_student(class_name, student_email):
    try:
        ref = db.collection('classrooms').document(class_name).collection('students').document(student_email)
        if request.method == 'GET':
            doc = ref.get()
            if not doc.exists:
                return jsonify({'error': 'Student not found.'}), 404
            d = doc.to_dict()
            return jsonify({'student': {'firstName': d.get('firstName',''), 'lastName': d.get('lastName',''),
                                        'email': d.get('email', student_email), 'lsuId': d.get('lsuID','')}}), 200
        data = request.get_json()
        ref.update({'firstName': data.get('firstName'), 'lastName': data.get('lastName')})
        db.collection('users').document(student_email).update(
            {'name': f"{data.get('lastName')}, {data.get('firstName')}"})
        return jsonify({'message': 'Student updated.'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/classroom/<class_name>/delete_student/<lsu_id>', methods=['POST'])
def delete_student(class_name, lsu_id):
    try:
        students_ref = db.collection('classrooms').document(class_name).collection('students')
        student_doc  = next(iter(students_ref.where("lsuID", "==", lsu_id).stream()), None)
        if not student_doc:
            return jsonify({'error': 'Student not found'}), 404
        student_email = student_doc.id
        student_name  = f"{student_doc.to_dict().get('firstName','')} {student_doc.to_dict().get('lastName','')}".strip()
        students_ref.document(student_email).delete()
        for project in db.collection('classrooms').document(class_name).collection('Projects').stream():
            for team in project.reference.collection('teams').stream():
                td = team.to_dict()
                if lsu_id in td:
                    td.pop(lsu_id)
                    if td:
                        team.reference.set(td)
                    else:
                        team.reference.delete()
        return jsonify({'message': f'{student_name} removed.'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/classroom/<class_name>/project/<project_name>/manage_team', methods=['GET', 'POST'])
def manage_team(class_name, project_name):
    if not is_authenticated():
        return jsonify({"error": "Not authenticated"}), 401
    classroom_ref = db.collection('classrooms').document(class_name).get()
    if not classroom_ref.exists or classroom_ref.to_dict()['teacherEmail'] != session['user']:
        return jsonify({"error": "Permission denied."}), 403
    if request.method == 'POST':
        data = request.get_json()
        team_name = data.get('teamName')
        selected  = data.get('students')
        if not team_name or not selected:
            return jsonify({"error": "Team name and students required."}), 400
        team_data = {}
        for email in selected:
            sr = db.collection('classrooms').document(class_name).collection('students').document(email).get()
            if sr.exists:
                sd = sr.to_dict()
                team_data[email] = f"{sd['lastName']}, {sd['firstName']}"
            else:
                return jsonify({"error": f"Student {email} not found."}), 404
        db.collection('classrooms').document(class_name).collection('Projects')\
          .document(project_name).collection('teams').document(team_name).set(team_data)
        return jsonify({"message": f'Team "{team_name}" updated.'}), 200
    all_students = [{'email': s.id, **s.to_dict()} for s in
                    db.collection('classrooms').document(class_name).collection('students').stream()]
    teams_snap   = db.collection('classrooms').document(class_name).collection('Projects')\
                     .document(project_name).collection('teams').stream()
    assigned = set()
    teams    = []
    for team in teams_snap:
        td = team.to_dict()
        teams.append({'teamName': team.id, 'students': [{'email': e, 'name': td[e]} for e in td]})
        assigned.update(td.keys())
    available = [s for s in all_students if s['email'] not in assigned]
    return jsonify({"class_name": class_name, "project_name": project_name,
                    "students": available, "teams": teams})


@app.route('/save-teams', methods=['POST'])
def save_teams():
    try:
        data         = request.get_json()
        if not data:
            return jsonify({"error": "No data received."}), 400
        teams        = data.get("teams", [])
        class_name   = data.get('class_name')
        project_name = data.get('project_name')
        teams_ref    = db.collection('classrooms').document(class_name)\
                         .collection('Projects').document(project_name).collection('teams')
        existing     = {t.id: t.to_dict() for t in teams_ref.stream()}
        processed    = set()
        for team in teams:
            team_name = team.get("teamName")
            students  = team.get("students", []) or []
            if not team_name:
                return jsonify({"error": "Team name missing."}), 400
            team_data = {}
            for email in students:
                if email in processed:
                    continue
                processed.add(email)
                sr = db.collection('classrooms').document(class_name)\
                       .collection('students').document(email).get()
                if not sr.exists:
                    return jsonify({"error": f"Student {email} not found."}), 404
                si = sr.to_dict()
                team_data[email] = f"{si['lastName']}, {si['firstName']}"
                for old_name, old_data in existing.items():
                    if email in old_data:
                        del old_data[email]
                        if not old_data:
                            teams_ref.document(old_name).delete()
                        else:
                            teams_ref.document(old_name).set(old_data)
            teams_ref.document(team_name).set(team_data)
        return jsonify({"message": "Teams saved successfully!"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/student/<email>/project/<class_name>/<project_name>', methods=['GET'])
def get_student_team(email, class_name, project_name):
    try:
        for team in db.collection('classrooms').document(class_name)\
                      .collection('Projects').document(project_name)\
                      .collection('teams').stream():
            if email in team.to_dict():
                return jsonify({"teamName": team.id}), 200
        return jsonify({"message": "Student not assigned to any team"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/student/<email>/projects', methods=['GET'])
def get_student_projects(email):
    try:
        results = []
        for classroom in db.collection('classrooms').stream():
            for project in classroom.reference.collection('Projects').stream():
                for team in project.reference.collection('teams').stream():
                    if email in team.to_dict():
                        results.append({"class_id": classroom.id,
                                        "project_name": project.id,
                                        "team_name": team.id})
        if not results:
            return jsonify({"message": "No teams found for this student."}), 404
        return jsonify({"projects": results}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/add_shape', methods=['POST'])
@cross_origin()
def add_shape():
    shape_id = request.form.get('shapeId')
    team_id  = request.form.get('teamId')
    if not shape_id:
        return jsonify({"error": "Missing shape id"}), 400
    if not team_id:
        return jsonify({"error": "Missing team id"}), 400
    try:
        return jsonify({"message": f"Shape {shape_id} received."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__' and os.getenv("FLASK_ENV") != "production":
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port, debug=False)