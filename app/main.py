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
DOC_ID = "lucas"

DEFAULT_PROGRESS = {
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
        "fictionCorrect": 0
    }
}

class ProgressModel(BaseModel):
    xp: Optional[int] = 450
    level: Optional[str] = "Rising 5th (Advanced)"
    completedMissions: Optional[List[str]] = []
    missionSubmissions: Optional[Dict[str, Any]] = {}
    analytics: Optional[Dict[str, Any]] = {}


def read_local_fallback() -> dict:
    if os.path.exists(LOCAL_STORAGE_FILE):
        try:
            with open(LOCAL_STORAGE_FILE, "r") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error reading local storage file: {e}")
    return DEFAULT_PROGRESS


def write_local_fallback(data: dict):
    try:
        with open(LOCAL_STORAGE_FILE, "w") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        logger.error(f"Error writing to local storage file: {e}")


@app.get("/api/progress")
def get_progress():
    """Retrieve student progress from Firestore or fallback storage."""
    if db:
        try:
            doc_ref = db.collection(COLLECTION_NAME).document(DOC_ID)
            doc = doc_ref.get()
            if doc.exists:
                return doc.to_dict()
            else:
                # Document doesn't exist yet, save and return default
                doc_ref.set(DEFAULT_PROGRESS)
                return DEFAULT_PROGRESS
        except Exception as e:
            logger.error(f"Firestore read error: {e}. Falling back to local storage.")
            return read_local_fallback()
    else:
        return read_local_fallback()


@app.post("/api/progress")
def save_progress(progress: ProgressModel):
    """Save updated student progress to Firestore or fallback storage."""
    data = progress.model_dump()
    if db:
        try:
            doc_ref = db.collection(COLLECTION_NAME).document(DOC_ID)
            doc_ref.set(data, merge=True)
            logger.info("Progress saved to Firestore.")
        except Exception as e:
            logger.error(f"Firestore write error: {e}. Saving locally.")
            write_local_fallback(data)
    else:
        write_local_fallback(data)
    return {"status": "success", "data": data}


@app.post("/api/reset")
def reset_progress():
    """Reset progress back to default baseline."""
    if db:
        try:
            doc_ref = db.collection(COLLECTION_NAME).document(DOC_ID)
            doc_ref.set(DEFAULT_PROGRESS)
            logger.info("Firestore progress reset.")
        except Exception as e:
            logger.error(f"Firestore reset error: {e}")
    write_local_fallback(DEFAULT_PROGRESS)
    return {"status": "reset", "data": DEFAULT_PROGRESS}


# Mount static files
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
def read_root():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))
