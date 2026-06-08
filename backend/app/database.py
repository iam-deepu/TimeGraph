import os
import socket
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./timegraph.db")

# Supabase IPv6 to IPv4 SNI Bridge
if "supabase.co" in DATABASE_URL:
    try:
        # Parse connection URL to extract direct database host
        # Format: postgresql+driver://user:pass@host:port/dbname
        url_parts = DATABASE_URL.split("@")
        if len(url_parts) > 1:
            host_port_db = url_parts[1].split("/")[0]
            direct_host = host_port_db.split(":")[0]
            
            pooler_host = os.getenv("SUPABASE_POOLER_HOST", "aws-0-ap-northeast-1.pooler.supabase.com")
            print(f"[Supabase IPv4 Bridge] Resolving pooler IP for {pooler_host}...")
            pooler_ip = socket.gethostbyname(pooler_host)
            print(f"[Supabase IPv4 Bridge] Pooler IPv4 is {pooler_ip}")
            
            # Monkey-patch socket.getaddrinfo to redirect direct_host to pooler_ip
            original_getaddrinfo = socket.getaddrinfo
            def custom_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
                if host == direct_host:
                    # Force IPv4 connection to the pooler
                    return original_getaddrinfo(pooler_ip, port, socket.AF_INET, type, proto, flags)
                return original_getaddrinfo(host, port, family, type, proto, flags)
            
            socket.getaddrinfo = custom_getaddrinfo
            print(f"[Supabase IPv4 Bridge] DNS Redirect active: {direct_host} -> {pooler_ip}")
    except Exception as e:
        print(f"[Supabase IPv4 Bridge] Warning: Failed to set up IPv4 bridge: {e}")

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
