"""
CalcPro Backend – Flask REST API
"""

import os
from flask import Flask
from flask_cors import CORS
from .extensions import db, migrate
from .config import config_map
from .routes import api_bp


def create_app(env: str | None = None) -> Flask:
    """Application factory pattern."""
    env = env or os.getenv("FLASK_ENV", "development")
    app = Flask(__name__)

    # Load config
    app.config.from_object(config_map[env])

    # Extensions
    CORS(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}})
    db.init_app(app)
    migrate.init_app(app, db)

    # Blueprints
    app.register_blueprint(api_bp, url_prefix="/api")

    # Create tables if they don't exist (dev convenience)
    with app.app_context():
        db.create_all()

    return app
