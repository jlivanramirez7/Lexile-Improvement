import os
import json
import logging
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Dict, List, Any, Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("beacon-simulator")

app = FastAPI(title="DRC BEACON ELA Simulator API")

# Path setup
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
LOCAL_STORAGE_FILE = "/tmp/lucas_progress.json"

# Initialize Firestore Client (Google Cloud Native)
db = None
DATABASE_NAME = os.getenv("FIRESTORE_DATABASE", "lexile-growth-db")
try:
    from google.cloud import firestore
    project_id = os.getenv("GOOGLE_CLOUD_PROJECT") or os.getenv("GCP_PROJECT")
    kwargs = {}
    if project_id:
        kwargs["project"] = project_id
    if DATABASE_NAME:
        kwargs["database"] = DATABASE_NAME
    db = firestore.Client(**kwargs)
    logger.info(f"Connected to Firestore database '{DATABASE_NAME}' in project context.")
except Exception as e:
    logger.warning(f"Firestore initialization fallback: {e}. Local fallback file will be used.")
    db = None

COLLECTION_NAME = "student_progress"

DEFAULT_PROGRESS = {
    "studentId": "lucas",
    "studentName": "Lucas Ramirez",
    "xp": 450,
    "level": "Rising 5th (Advanced)",
    "completedMissions": [],
    "missionSubmissions": {},
    "analytics": {
        "totalAttempted": 0,
        "totalCorrect": 0,
        "p1Attempted": 0,
        "p1Correct": 0,
        "p2Attempted": 0,
        "p2Correct": 0,
        "p3Attempted": 0,
        "p3Correct": 0,
        "distractorsCount": {
            "passive_subject_confusion": 0,
            "outside_knowledge": 0,
            "vocabulary_misinterpretation": 0,
            "unsupported_inference": 0
        },
        "informationalAttempted": 0,
        "informationalCorrect": 0,
        "fictionAttempted": 0,
        "fictionCorrect": 0,
        "dokBreakdown": {
            "dok1Attempted": 0,
            "dok1Correct": 0,
            "dok2Attempted": 0,
            "dok2Correct": 0,
            "dok3Attempted": 0,
            "dok3Correct": 0
        },
        "ebsrMetrics": {
            "pairedBothCorrect": 0,
            "partAOnlyCorrect": 0,
            "partBOnlyCorrect": 0,
            "bothWrong": 0
        },
        "syntacticMetrics": {
            "attempted": 0,
            "correct": 0
        },
        "semanticMetrics": {
            "attempted": 0,
            "correct": 0
        },
        "pacingMetrics": {
            "totalSecondsSpent": 0,
            "impulsiveCount": 0,
            "hesitationCount": 0
        }
    }
}

class ProgressModel(BaseModel):
    studentId: Optional[str] = "lucas"
    studentName: Optional[str] = "Lucas Ramirez"
    xp: Optional[int] = 450
    level: Optional[str] = "Rising 5th (Advanced)"
    completedMissions: Optional[List[str]] = []
    missionSubmissions: Optional[Dict[str, Any]] = {}
    analytics: Optional[Dict[str, Any]] = {}


def get_local_filename(student_id: str) -> str:
    clean_id = student_id.lower().replace(" ", "_")
    return f"/tmp/{clean_id}_progress.json"


def read_local_fallback(student_id: str) -> dict:
    file_path = get_local_filename(student_id)
    if os.path.exists(file_path):
        try:
            with open(file_path, "r") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error reading local storage file: {e}")
    
    # Custom defaults for Evelyn vs Lucas
    prog = json.loads(json.dumps(DEFAULT_PROGRESS))
    prog["studentId"] = student_id
    prog["studentName"] = "Evelyn Mietling" if "evelyn" in student_id.lower() else "Lucas Ramirez"
    return prog


def write_local_fallback(student_id: str, data: dict):
    file_path = get_local_filename(student_id)
    try:
        with open(file_path, "w") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        logger.error(f"Error writing to local storage file: {e}")


@app.get("/api/progress")
def get_progress(student_id: str = "lucas"):
    """Retrieve student progress for a specific student from Firestore or fallback storage."""
    clean_id = student_id.lower().replace(" ", "_")
    if db:
        try:
            doc_ref = db.collection(COLLECTION_NAME).document(clean_id)
            doc = doc_ref.get()
            if doc.exists:
                return doc.to_dict()
            else:
                default_data = json.loads(json.dumps(DEFAULT_PROGRESS))
                default_data["studentId"] = clean_id
                default_data["studentName"] = "Evelyn Mietling" if "evelyn" in clean_id else "Lucas Ramirez"
                doc_ref.set(default_data)
                return default_data
        except Exception as e:
            logger.error(f"Firestore read error: {e}. Falling back to local storage.")
            return read_local_fallback(clean_id)
    else:
        return read_local_fallback(clean_id)


@app.post("/api/progress")
def save_progress(progress: ProgressModel):
    """Save updated student progress to Firestore or fallback storage."""
    data = progress.model_dump()
    clean_id = (progress.studentId or "lucas").lower().replace(" ", "_")
    data["studentId"] = clean_id
    
    if db:
        try:
            doc_ref = db.collection(COLLECTION_NAME).document(clean_id)
            doc_ref.set(data, merge=True)
            logger.info(f"Progress saved to Firestore for student: {clean_id}")
        except Exception as e:
            logger.error(f"Firestore write error: {e}. Saving locally.")
            write_local_fallback(clean_id, data)
    else:
        write_local_fallback(clean_id, data)
    return {"status": "success", "data": data}


@app.post("/api/reset")
def reset_progress(student_id: str = "lucas"):
    """Reset progress back to default baseline for a given student."""
    clean_id = student_id.lower().replace(" ", "_")
    default_data = json.loads(json.dumps(DEFAULT_PROGRESS))
    default_data["studentId"] = clean_id
    default_data["studentName"] = "Evelyn Mietling" if "evelyn" in clean_id else "Lucas Ramirez"

    if db:
        try:
            doc_ref = db.collection(COLLECTION_NAME).document(clean_id)
            doc_ref.set(default_data)
            logger.info(f"Firestore progress reset for student: {clean_id}")
        except Exception as e:
            logger.error(f"Firestore reset error: {e}")
    write_local_fallback(clean_id, default_data)
    return {"status": "reset", "data": default_data}


# Mount static files
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
def read_root():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))
