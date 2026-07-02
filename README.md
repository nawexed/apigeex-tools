# Apigee Organization Viewer

This project is a modular Python + React web application.

## Features

- Top title bar
- Left navigation bar
- Content page with controls
- Auth button to save GCP access token in browser storage
- Button to get token from backend using `gcloud auth print-access-token`
- Token persisted by backend in `data/access_token.txt`
- Dropdown list of Apigee organizations
- Organizations loaded from `data/config.json` via backend API
- Fetch organization details from Apigee API
- Pretty printed JSON response view

## Project Structure

- `backend/`: Flask API proxy
- `frontend/`: React (Vite) UI

## Backend Setup (Flask)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Backend runs on `http://localhost:5001`.

## Frontend Setup (React)

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

## Docker Setup

The container uses an arm64-safe Python base image and installs `gcloud` inside the image via the official Google Cloud SDK installer so it can build on Apple Silicon and similar arm64 hosts.

Build the single-container image:

```bash
docker build -t apigeex-tools .
```

Run the container:

```bash
docker run --rm -p 5000:5000 \
	-v ~/.config/gcloud:/root/.config/gcloud \
	apigeex-tools
```

The `gcloud` config mount is required if you want the `Get Token (gcloud)` button to work inside the container.

Open `http://localhost:5000` to use the app. The frontend and backend are served from the same container and the frontend uses `/api` for backend calls.

## How To Use

1. Open the frontend in browser.
2. Paste a valid GCP access token in the top bar input.
3. Click `Auth: Save Token`.
4. Optional: click `Get Token (gcloud)` to fetch and save token from backend.
5. Click `Load Organizations` to load org list from `data/config.json`.
6. Choose an org from dropdown.
7. Click `Load Selected Organization`.
8. View formatted JSON response on the right panel.

You can edit `data/config.json` to manage the dropdown values.

Example:

```json
{
	"organizations": [
		"apigeex-shared-dev"
	]
}
```

## API Flow

Frontend calls Flask backend:

- `POST /api/token/refresh` -> runs `gcloud auth print-access-token` and saves token to `data/access_token.txt`
- `GET /api/token` -> returns saved token from `data/access_token.txt`
- `GET /api/config/orgs` -> returns org list from `data/config.json`
- `GET /api/orgs/<org_name>` -> proxies to `https://apigee.googleapis.com/v1/organizations/<org_name>`

The bearer token is accepted from `Authorization: Bearer <token>` or loaded from `data/access_token.txt`.
