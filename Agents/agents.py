"""
AI Features Backend for tldraw + Firestore
Implements 5 core AI agent roles: Catalyst, Provocateur, Communicator, Converter, Mediator
"""

import os
import time
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from collections import defaultdict, Counter

import firebase_admin
from firebase_admin.firestore import SERVER_TIMESTAMP
from firebase_admin import credentials, firestore
from google.cloud.firestore import DocumentSnapshot
import schedule
from flask import Flask, request, jsonify

# Configure logging
# logging.basicConfig(level=logging.INFO)
logging.basicConfig(
    level=logging.INFO,
    # filename="backend.log",
    filename=os.path.join(os.getcwd(), "backend.log"),
    filemode="a",
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Initialize Firebase
if not firebase_admin._apps:
    # Use service account key or default credentials in Cloud Run
    # cred = credentials.ApplicationDefault()  # For Cloud Run
    cred = credentials.Certificate("firebase-key.json")
    # For local development, use: cred = credentials.Certificate('path/to/serviceAccountKey.json')
    firebase_admin.initialize_app(cred)

db = firestore.client()

@dataclass
class Nudge:
    """Represents an AI nudge/suggestion for the UI"""
    id: str
    type: str  # catalyst, provocateur, communicator, converter, mediator
    message: str
    chips: List[str]  # Action buttons/suggestions
    targets: List[str]  # Shape IDs or bin IDs this nudge applies to
    canvas_id: str
    created_at: datetime
    expires_at: datetime
    dismissed: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to Firestore-compatible dict"""
        data = asdict(self)
        data['created_at'] = self.created_at.isoformat()
        # data['created_at'] = SERVER_TIMESTAMP
        data['expires_at'] = self.expires_at.isoformat()
        # data['expires_at'] = SERVER_TIMESTAMP
        return data

@dataclass
class Shape:
    """Represents a tldraw shape from Firestore"""
    id: str
    type: str  # sticky, rectangle, text, etc.
    x: float
    y: float
    width: float
    height: float
    content: str
    canvas_id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

class AnalyticsEngine:
    """Core analytics engine that processes shapes and generates insights"""
    
    def __init__(self):
        self.cooldown_tracker = {}  # Track per-canvas cooldowns
        self.COOLDOWN_MINUTES = 1  # Minimum time between nudges per canvas
    
    def is_on_cooldown(self, canvas_id: str, nudge_type: str) -> bool:
        """Check if a specific nudge type is on cooldown for a canvas"""
        key = f"{canvas_id}_{nudge_type}"
        if key in self.cooldown_tracker:
            return datetime.now() < self.cooldown_tracker[key]
        return False
    
    def set_cooldown(self, canvas_id: str, nudge_type: str):
        """Set cooldown for a nudge type on a canvas"""
        key = f"{canvas_id}_{nudge_type}"
        self.cooldown_tracker[key] = datetime.now() + timedelta(minutes=self.COOLDOWN_MINUTES)
    
    def get_canvas_shapes(self, canvas_id: str) -> List[Shape]:
        """Fetch all shapes for a canvas from Firestore"""
        shapes = []

        try:
            class_name, project_name, team_name = canvas_id.split('_')
            
            shapes_ref = db.collection('classrooms').document(class_name).collection('Projects').document(project_name).collection('teams').document(team_name).collection('shapes')
            # shapes_ref = db.collection('shapes').where('canvas_id', '==', canvas_id)
            
            for doc in shapes_ref.stream():
                data = doc.to_dict()
                shape = Shape(
                    id=doc.id,
                    type=data.get('type', ''),
                    x=data.get('x', 0),
                    y=data.get('y', 0),
                    width=data.get('width', 0),
                    height=data.get('height', 0),
                    content=data.get('content', ''),
                    canvas_id=data.get('canvas_id', ''),
                    user_id=data.get('user_id', ''),
                    created_at=data.get('created_at', datetime.now()),
                    updated_at=data.get('updated_at', datetime.now())
                )
                shapes.append(shape)
        
        except Exception as e:
            logger.error(f"Error fetching shapes for canvas {canvas_id}: {e}")
            return []
        
        return shapes
    
    def detect_clusters(self, shapes: List[Shape], proximity_threshold: float = 100) -> List[List[Shape]]:
        """Group shapes into spatial clusters"""
        if not shapes:
            return []
        
        clusters = []
        unassigned = shapes.copy()
        
        while unassigned:
            cluster = [unassigned.pop(0)]
            
            # Find nearby shapes and add to cluster
            i = 0
            while i < len(unassigned):
                shape = unassigned[i]
                
                # Check if shape is close to any shape in current cluster
                is_close = False
                for cluster_shape in cluster:
                    distance = ((shape.x - cluster_shape.x) ** 2 + 
                              (shape.y - cluster_shape.y) ** 2) ** 0.5
                    
                    if distance <= proximity_threshold:
                        is_close = True
                        break
                
                if is_close:
                    cluster.append(unassigned.pop(i))
                else:
                    i += 1
            
            clusters.append(cluster)
        
        return clusters
    
    def calculate_canvas_metrics(self, shapes: List[Shape]) -> Dict[str, Any]:
        """Calculate various metrics about the canvas state"""
        if not shapes:
            return {
                'total_shapes': 0,
                'blank_canvas': True,
                'clusters': [],
                'edge_shapes': [],
                'text_heavy_ratio': 0,
                'user_participation': {}
            }
        
        clusters = self.detect_clusters(shapes)
        
        # Find edge shapes (isolated or in small clusters)
        edge_shapes = []
        for cluster in clusters:
            if len(cluster) <= 2:  # Small clusters are considered "edge"
                edge_shapes.extend(cluster)
        
        # Calculate text-heavy ratio
        text_shapes = [s for s in shapes if s.type in ['text', 'note'] and len(s.content) > 50]
        text_heavy_ratio = len(text_shapes) / len(shapes) if shapes else 0
        
        # User participation tracking
        user_participation = Counter(shape.user_id for shape in shapes)
        
        return {
            'total_shapes': len(shapes),
            'blank_canvas': len(shapes) == 0,
            'clusters': clusters,
            'edge_shapes': edge_shapes,
            'text_heavy_ratio': text_heavy_ratio,
            'user_participation': dict(user_participation),
            'last_activity': max((s.updated_at for s in shapes), default=datetime.now())
        }
    
    def create_nudge(self, canvas_id: str, nudge_type: str, message: str, 
                    chips: List[str], targets: List[str] = None) -> Nudge:
        """Create a new nudge"""
        nudge_id = f"{canvas_id}_{nudge_type}_{int(time.time())}"
        
        return Nudge(
            id=nudge_id,
            type=nudge_type,
            message=message,
            chips=chips,
            targets=targets or [],
            canvas_id=canvas_id,
            created_at=datetime.now(),
            expires_at=datetime.now() + timedelta(minutes=30)  # Nudges expire after 30 min
        )

    def save_nudge(self, nudge: Nudge):
        try:
            class_name, project_name, team_name = nudge.canvas_id.split('_')
            logger.info(f"Saving nudge for class: {class_name}, project: {project_name}, team: {team_name}")
            
            # nudge_ref = 
            logger.info(f"Nudge data to write: {nudge.to_dict()}")
            db.collection('classrooms').document(class_name).collection('Projects').document(project_name).collection('teams').document(team_name).collection('nudges').document(nudge.id).set(nudge.to_dict())
            

            # nudge_ref.set(nudge.to_dict())
            self.set_cooldown(nudge.canvas_id, nudge.type)
            logger.info(f"Created nudge: {nudge.type} for canvas {nudge.canvas_id}")
        except Exception as e:
            logger.error(f"Failed to save nudge: {e}")
    

class AIAgents:
    """Collection of AI agent implementations"""
    
    def __init__(self, analytics: AnalyticsEngine):
        self.analytics = analytics
    
    def catalyst_agent(self, canvas_id: str, metrics: Dict[str, Any]):
        """Ideation Catalyst: triggers when blank/stalled"""
        if self.analytics.is_on_cooldown(canvas_id, 'catalyst'):
            return
        
        # Trigger on blank canvas
        if metrics['blank_canvas']:
            nudge = self.analytics.create_nudge(
                canvas_id=canvas_id,
                nudge_type='catalyst',
                message="Ready to brainstorm? Let's get those ideas flowing! 🚀",
                chips=[
                    "Add starter sticky notes",
                    "Try a mind map layout", 
                    "Begin with 'What if...'",
                    "Start with the problem"
                ]
            )
            self.analytics.save_nudge(nudge)
            return
        
        # Trigger on stalled activity (no updates in 5+ minutes)
        time_since_activity = datetime.now() - metrics['last_activity']
        if (time_since_activity > timedelta(minutes=5) and 
            metrics['total_shapes'] < 10):  # Still early in ideation
            
            nudge = self.analytics.create_nudge(
                canvas_id=canvas_id,
                nudge_type='catalyst',
                message="Feeling stuck? Sometimes a fresh perspective helps! 💡",
                chips=[
                    "Try the opposite approach",
                    "Ask 'Why not?'",
                    "Add a random word prompt",
                    "Switch to visual thinking"
                ]
            )
            self.analytics.save_nudge(nudge)
    
    def provocateur_agent(self, canvas_id: str, metrics: Dict[str, Any]):
        """Provocateur: challenges tight clustering, promotes divergent thinking"""
        if self.analytics.is_on_cooldown(canvas_id, 'provocateur'):
            return
        
        clusters = metrics['clusters']
        
        # Trigger when clustering is too tight (many small, similar clusters)
        if len(clusters) > 3 and all(len(cluster) <= 3 for cluster in clusters):
            nudge = self.analytics.create_nudge(
                canvas_id=canvas_id,
                nudge_type='provocateur',
                message="I see lots of similar ideas clustering. What if we pushed the boundaries? 🌟",
                chips=[
                    "Challenge an assumption",
                    "Explore the opposite",
                    "Add a wild card idea",
                    "Connect distant concepts"
                ]
            )
            self.analytics.save_nudge(nudge)
            return
        
        # Trigger when edge ideas are being ignored
        if len(metrics['edge_shapes']) > 0 and len(clusters) > 0:
            edge_targets = [shape.id for shape in metrics['edge_shapes'][:3]]
            nudge = self.analytics.create_nudge(
                canvas_id=canvas_id,
                nudge_type='provocateur',
                message="These ideas on the edge look interesting. What connections might we be missing? 🔗",
                chips=[
                    "Bridge these to main ideas",
                    "Expand on outlier thoughts", 
                    "Find hidden patterns",
                    "Create new combinations"
                ],
                targets=edge_targets
            )
            self.analytics.save_nudge(nudge)
    
    def communicator_agent(self, canvas_id: str, metrics: Dict[str, Any]):
        """Communicator: supports clustering, comparison, synthesis"""
        if self.analytics.is_on_cooldown(canvas_id, 'communicator'):
            return
        
        clusters = metrics['clusters']
        
        # Trigger when there are multiple substantial clusters
        substantial_clusters = [c for c in clusters if len(c) >= 4]
        
        if len(substantial_clusters) >= 2:
            cluster_targets = []
            for cluster in substantial_clusters[:2]:
                cluster_targets.extend([shape.id for shape in cluster[:2]])
            
            nudge = self.analytics.create_nudge(
                canvas_id=canvas_id,
                nudge_type='communicator',
                message="I notice some strong themes emerging. Ready to synthesize? 📋",
                chips=[
                    "Create cluster summaries",
                    "Find common patterns",
                    "Compare themes",
                    "Build connections"
                ],
                targets=cluster_targets
            )
            self.analytics.save_nudge(nudge)
    
    def converter_agent(self, canvas_id: str, metrics: Dict[str, Any]):
        """Modality Converter: suggests alternate views when text-heavy"""
        if self.analytics.is_on_cooldown(canvas_id, 'converter'):
            return
        
        # Trigger when canvas is very text-heavy
        if metrics['text_heavy_ratio'] > 0.7 and metrics['total_shapes'] >= 8:
            nudge = self.analytics.create_nudge(
                canvas_id=canvas_id,
                nudge_type='converter',
                message="Lots of rich content here! A visual perspective might reveal new insights 🎨",
                chips=[
                    "Create a concept map",
                    "Try a visual timeline",
                    "Make a process diagram",
                    "Build an impact matrix"
                ]
            )
            self.analytics.save_nudge(nudge)
    
    def mediator_agent(self, canvas_id: str, metrics: Dict[str, Any]):
        """Mediator/Facilitator: monitors participation balance"""
        if self.analytics.is_on_cooldown(canvas_id, 'mediator'):
            return
        
        participation = metrics['user_participation']
        
        # Only activate in multi-user sessions
        if len(participation) < 2:
            return
        
        # Check for imbalanced participation
        total_contributions = sum(participation.values())
        max_contribution = max(participation.values())
        
        # If one user has >70% of contributions, encourage others
        if max_contribution / total_contributions > 0.7 and total_contributions >= 10:
            nudge = self.analytics.create_nudge(
                canvas_id=canvas_id,
                nudge_type='mediator',
                message="Great momentum! Let's make sure everyone's voice is heard 🤝",
                chips=[
                    "Invite quiet voices",
                    "Ask for different perspectives",
                    "Round-robin contributions",
                    "Anonymous input time"
                ]
            )
            self.analytics.save_nudge(nudge)

class CanvasProcessor:
    """Main processor that coordinates all AI agents"""
    
    def __init__(self):
        self.analytics = AnalyticsEngine()
        self.agents = AIAgents(self.analytics)
    
    def process_canvas(self, canvas_id: str):
        """Process a single canvas through all AI agents"""
        try:
            logger.info(f"Processing canvas: {canvas_id}")
            
            # Get shapes and calculate metrics
            shapes = self.analytics.get_canvas_shapes(canvas_id)
            metrics = self.analytics.calculate_canvas_metrics(shapes)
            
            # Run each agent
            self.agents.catalyst_agent(canvas_id, metrics)
            self.agents.provocateur_agent(canvas_id, metrics)
            self.agents.communicator_agent(canvas_id, metrics)
            self.agents.converter_agent(canvas_id, metrics)
            self.agents.mediator_agent(canvas_id, metrics)
            
            logger.info(f"Completed processing canvas: {canvas_id}")
            
        except Exception as e:
            logger.error(f"Error processing canvas {canvas_id}: {e}")
    
    def process_all_active_canvases(self):
        """Process all active canvases (called by scheduler)"""
        try:
            # Get all unique canvas IDs from shapes collection
            shapes_ref = db.collection('shapes')
            
            # Get canvases with recent activity (last 2 hours)
            recent_threshold = datetime.now() - timedelta(hours=2)
            recent_shapes = shapes_ref.where('updated_at', '>=', recent_threshold).stream()
            
            canvas_ids = set()
            for doc in recent_shapes:
                data = doc.to_dict()
                if 'canvas_id' in data:
                    canvas_ids.add(data['canvas_id'])
            
            logger.info(f"Processing {len(canvas_ids)} active canvases")
            
            for canvas_id in canvas_ids:
                self.process_canvas(canvas_id)
                
        except Exception as e:
            logger.error(f"Error in batch processing: {e}")

# Flask app for Cloud Run deployment
app = Flask(__name__)
processor = CanvasProcessor()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat()})

@app.route('/process', methods=['POST'])
def process_endpoint():
    """Manually trigger processing for specific canvas"""
    data = request.get_json()
    canvas_id = data.get('canvas_id')
    
    if not canvas_id:
        return jsonify({'error': 'canvas_id required'}), 400
    
    try:
        processor.process_canvas(canvas_id)
        return jsonify({'status': 'success', 'canvas_id': canvas_id})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/process-all', methods=['POST'])
def process_all_endpoint():
    """Trigger batch processing of all active canvases"""
    try:
        processor.process_all_active_canvases()
        return jsonify({'status': 'success', 'message': 'Batch processing completed'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def setup_scheduler():
    """Setup scheduled batch processing"""
    schedule.every(1).minutes.do(processor.process_all_active_canvases)
    
    def run_scheduler():
        while True:
            schedule.run_pending()
            time.sleep(30)  # Check every 30 seconds
    
    import threading
    scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
    scheduler_thread.start()

if __name__ == '__main__':
    # Setup periodic processing
    setup_scheduler()
    
    # Run Flask app
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=False)