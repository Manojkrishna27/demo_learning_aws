"""
WSGI entry point – used by Gunicorn in production.

  Gunicorn (EB / Docker):  gunicorn backend.wsgi:app
  Flask dev server:         flask --app backend.wsgi:app run
  Direct run:               python backend/wsgi.py
"""

import os
import sys
from pathlib import Path

# Ensure the repo root is on sys.path so both
# "python backend/wsgi.py" and "gunicorn backend.wsgi:app" work.
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.app import create_app  # noqa: E402

app = create_app(os.getenv("FLASK_ENV", "production"))

if __name__ == "__main__":
    app.run(
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", 5000)),
        debug=app.config["DEBUG"],
    )
