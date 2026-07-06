"""
Shared Flask extensions – instantiated once, bound to app in factory.
"""

from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

db = SQLAlchemy()
migrate = Migrate()
