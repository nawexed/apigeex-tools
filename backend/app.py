import os
import logging
from pathlib import Path

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS

PROJECT_ROOT = Path(__file__).resolve().parent.parent
FRONTEND_DIST = PROJECT_ROOT / "frontend" / "dist"

from routes.apigee_routes import apigee_bp

# logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s - %(message)s")


def create_app() -> Flask:
    app = Flask(__name__, static_folder=str(FRONTEND_DIST), static_url_path="")
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    app.register_blueprint(apigee_bp)

    @app.get("/health")
    def health():
        return jsonify({"status": "ok"})

    @app.get("/")
    def index():
        if FRONTEND_DIST.exists():
            return send_from_directory(FRONTEND_DIST, "index.html")
        return jsonify({"status": "frontend not built"}), 404

    @app.get("/<path:path>")
    def serve_frontend(path: str):
        if path.startswith("api/"):
            return jsonify({"error": "Not found"}), 404

        if FRONTEND_DIST.exists() and (FRONTEND_DIST / path).exists():
            return send_from_directory(FRONTEND_DIST, path)

        if FRONTEND_DIST.exists():
            return send_from_directory(FRONTEND_DIST, "index.html")

        return jsonify({"error": "frontend not built"}), 404

    return app


if __name__ == "__main__":
    flask_app = create_app()
    flask_app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", "5001")),
        debug=os.environ.get("FLASK_DEBUG", "1") == "1",
    )
