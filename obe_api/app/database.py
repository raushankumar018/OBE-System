from motor.motor_asyncio import AsyncIOMotorClient
from app.config import get_settings

settings = get_settings()

client: AsyncIOMotorClient = None


async def connect_db():
    global client
    client = AsyncIOMotorClient(settings.mongodb_url)
    print(f"Connected to MongoDB: {settings.mongodb_url}")


async def close_db():
    global client
    if client:
        client.close()


def get_db():
    return client[settings.mongodb_db]


# ── Collection helpers ───────────────────────────────────────────────────────
def courses_col():
    return get_db()["courses"]


def co_sessions_col():
    """Stores CO generation sessions (iterative refinement state)."""
    return get_db()["co_sessions"]


def mappings_col():
    """Stores CO-PO-PSO mapping results."""
    return get_db()["mappings"]


def attainment_col():
    """Stores final attainment results per course per academic year."""
    return get_db()["attainments"]


def students_col():
    """Stores student mark records."""
    return get_db()["student_marks"]
