# ⚡ DRC BEACON ELA Simulator & Parent Dashboard

An interactive, standardized test simulator and psychometric diagnostic app built for 5th Grade English Language Arts (ELA) and Reading, aligned with the **Georgia Standards of Excellence (GSE)** and optimized for **Google Cloud Run** deployment.

---

## 🏗️ Architecture & Stack Overview

- **Frontend**: Single-page interactive web application (HTML5, Tailwind CSS via CDN, Vanilla JS) featuring 20 thematic mock test modules, Lexile 950L–1150L passages, Monster Sentence Inspector tool, and Parent Review Dashboard.
- **Backend API**: Python **FastAPI** ASGI web server managing static asset delivery and REST API sync endpoints (`/api/progress`, `/api/reset`).
- **State Persistence (100% Free Tier Eligible)**: **Google Cloud Firestore** (Native Mode).
  - *Cost*: **$0.00 / month** (within GCP Free Tier: up to 1 GiB storage, 50,000 reads/day, 20,000 writes/day).
  - *Fallback*: Automatically falls back to local file storage (`/tmp/lucas_progress.json`) if running locally without GCP credentials.
- **Containerization**: Docker containerized with Uvicorn for serverless execution on **Google Cloud Run**.

---

## 📁 Repository Structure

```
drc-beacon-ela-app/
├── app/
│   ├── main.py              # FastAPI backend with Firestore client & REST endpoints
│   └── static/
│       └── index.html       # ELA Simulator frontend & Parent Dashboard
├── Dockerfile               # Container build configuration for Cloud Run
├── requirements.txt         # Python dependencies
├── .dockerignore
├── .gitignore
└── README.md
```

---

## 🚀 Step 1: Upload Project to GitHub

1. Create a **New Repository** on [GitHub](https://github.com/new) (e.g., named `drc-beacon-ela-app`).
2. Run the following commands in your local terminal inside this project folder (`/usr/local/google/home/ivanramirez/.gemini/jetski/scratch/drc-beacon-ela-app`):

```bash
# Add your GitHub repository as remote
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/drc-beacon-ela-app.git

# Rename branch to main if needed
git branch -M main

# Push initial commit to GitHub
git push -u origin main
```

---

## ☁️ Step 2: Enable Google Cloud Firestore (Free State Persistence)

To persist test results and module completions across devices:

1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Select or create your GCP Project.
3. In the left navigation, search for **Firestore** and click **Create Database**.
4. Choose **Firestore in Native Mode** and select your preferred multi-region or region (e.g., `us-east1` or `us-central1`).
5. Click **Create Database** (Database ID: `(default)`).

> 💡 **Cost Note**: Firestore provides **1 GiB storage, 50,000 reads/day, and 20,000 writes/day completely FREE every month**. For family and student use, your monthly cost will be **$0.00**.

---

## 📦 Step 3: Deploy to Google Cloud Run

### Option A: Deploy using `gcloud` CLI (Fastest & Simplest)

Open your terminal or Cloud Shell inside the project directory and run:

```bash
# Set your GCP Project ID
gcloud config set project YOUR_GCP_PROJECT_ID

# Enable required Cloud APIs
gcloud services enable run.googleapis.com cloudbuild.googleapis.com firestore.googleapis.com

# Deploy directly from source to Cloud Run
gcloud run deploy drc-beacon-ela-app \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 2
```

When deployment finishes, `gcloud` will provide a public URL (e.g., `https://drc-beacon-ela-app-xyz-uc.a.run.app`)!

---

### Option B: Deploy via Docker / Artifact Registry

```bash
# Build Docker image
docker build -t gcr.io/YOUR_GCP_PROJECT_ID/drc-beacon-ela-app .

# Push image to Google Container Registry
docker push gcr.io/YOUR_GCP_PROJECT_ID/drc-beacon-ela-app

# Deploy container to Cloud Run
gcloud run deploy drc-beacon-ela-app \
  --image gcr.io/YOUR_GCP_PROJECT_ID/drc-beacon-ela-app \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

---

## 💻 Local Development & Testing

To run and test the application locally on your machine:

```bash
# Create Python virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start local server
uvicorn app.main:app --reload --port 8080
```

Open your browser at `http://localhost:8080` to interact with the app.

---

## 📊 Parent Review & Diagnostic Features

- **Pillar 1**: Syntactic Deconstruction ("Monster Sentences") & Passive Voice Decoding
- **Pillar 2**: Tier 2 Contextual Academic Vocabulary
- **Pillar 3**: Evidence-Based Extraction ("The Text is the Law")
- **Submission Archives**: Question-by-question historical review with error profiling and explanations.
- **Progress Reset**: Reset buttons available in header and archive views.
