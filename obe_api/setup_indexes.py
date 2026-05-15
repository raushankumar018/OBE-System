"""
setup_indexes.py
─────────────────
Run once to create MongoDB indexes for optimal query performance.
Usage:
    python setup_indexes.py
"""

import asyncio
import motor.motor_asyncio
from app.config import get_settings

settings = get_settings()


async def create_indexes():
    client = motor.motor_asyncio.AsyncIOMotorClient(settings.mongodb_url)
    db     = client[settings.mongodb_db]

    print(f"Creating indexes on: {settings.mongodb_db}")

    # co_sessions
    await db.co_sessions.create_index("session_id",   unique=True)
    await db.co_sessions.create_index("course_code")
    await db.co_sessions.create_index("status")
    await db.co_sessions.create_index("created_at")
    print("  co_sessions: done")

    # mappings
    await db.mappings.create_index("session_id", unique=True)
    await db.mappings.create_index("course_code")
    print("  mappings: done")

    # attainments
    await db.attainments.create_index(
        [("course_code", 1), ("academic_year", 1)], unique=True
    )
    await db.attainments.create_index("created_at")
    print("  attainments: done")

    # student_marks
    await db.student_marks.create_index([("course_code", 1), ("academic_year", 1)])
    await db.student_marks.create_index("Roll_No")
    await db.student_marks.create_index("Question_ID")
    print("  student_marks: done")

    print("\nAll indexes created successfully.")
    client.close()


if __name__ == "__main__":
    asyncio.run(create_indexes())
