"""
Copy this file to: apps/assessment_exercise/assessment_exercise/api.py (package lives under backend/assessment_exercise/)

Re-exports all whitelisted methods so the frontend can call
assessment_exercise.api.* paths.
"""

from assessment_exercise.assessment.api import *  # noqa: F403
