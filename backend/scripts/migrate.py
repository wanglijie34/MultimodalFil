import asyncio
from sqlalchemy import text
from app.db.session import engine

async def migrate():
    async with engine.begin() as conn:
        print("Adding coverage_report to agentrun...")
        try:
            await conn.execute(text("ALTER TABLE agentrun ADD COLUMN coverage_report JSONB;"))
        except Exception as e:
            print(f"Skipped agentrun: {e}")
            
        print("Adding aspect to citation...")
        try:
            await conn.execute(text("ALTER TABLE citation ADD COLUMN aspect VARCHAR;"))
        except Exception as e:
            print(f"Skipped citation: {e}")

    print("Migration done.")

if __name__ == "__main__":
    asyncio.run(migrate())
