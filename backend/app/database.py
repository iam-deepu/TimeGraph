import os
import socket
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./timegraph.db")

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
elif "supabase.co" in DATABASE_URL:
    # Supabase direct hosts (db.*.supabase.co) are IPv6-only.
    # Render/HF are IPv4-only, so we route through the pooler's IPv4 address.
    # psycopg2's "hostaddr" tells libpq which IP to connect to,
    # while "host" is still used for TLS SNI (tenant identification).
    try:
        pooler_host = os.getenv("SUPABASE_POOLER_HOST", "aws-0-ap-northeast-1.pooler.supabase.com")
        pooler_ip = socket.gethostbyname(pooler_host)
        connect_args = {"hostaddr": pooler_ip, "sslmode": "require"}
        print(f"[Supabase IPv4 Bridge] Using pooler IPv4 {pooler_ip} via hostaddr")
    except Exception as e:
        print(f"[Supabase IPv4 Bridge] Warning: Could not resolve pooler IP: {e}")

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
