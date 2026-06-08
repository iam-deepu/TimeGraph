import time
from typing import List
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database import engine, Base, get_db
from .models import User, Schedule, Task
from .schemas import UserCreate, UserLogin, Token, UserOut, SyncRequest, SyncResponse
from .auth import get_password_hash, verify_password, create_access_token, get_current_user

# Create tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(title="TimeGraph Backend API")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In development, allow all. In production, restrict to frontend domain.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/auth/register", response_model=Token)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user_data.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    hashed_pwd = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        password_hash=hashed_pwd,
        created_at=int(time.time() * 1000)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    token = create_access_token(data={"sub": new_user.email})
    return {"access_token": token, "token_type": "bearer"}


@app.post("/api/auth/login", response_model=Token)
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_data.email).first()
    if not user or not verify_password(user_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = create_access_token(data={"sub": user.email})
    return {"access_token": token, "token_type": "bearer"}


@app.get("/api/auth/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "created_at": current_user.created_at
    }


@app.post("/api/sync", response_model=SyncResponse)
def sync_data(sync_data: SyncRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    server_sync_time = int(time.time() * 1000)

    # 1. Sync Client Schedules to DB
    for client_s in sync_data.schedules:
        db_s = db.query(Schedule).filter(Schedule.id == client_s.id, Schedule.user_id == current_user.id).first()
        if not db_s:
            # Insert new schedule
            new_s = Schedule(
                id=client_s.id,
                user_id=current_user.id,
                title=client_s.title,
                description=client_s.description,
                date=client_s.date,
                start_time=client_s.startTime,
                end_time=client_s.endTime,
                color=client_s.color,
                recurrence=client_s.recurrence,
                recurrence_days=client_s.recurrenceDays,
                reminders=client_s.reminders,
                timezone=client_s.timezone,
                is_deleted=client_s.is_deleted,
                created_at=client_s.createdAt,
                updated_at=client_s.updatedAt
            )
            db.add(new_s)
        else:
            # Conflict resolution: Last-Write-Wins based on updatedAt timestamp
            if client_s.updatedAt >= db_s.updated_at:
                db_s.title = client_s.title
                db_s.description = client_s.description
                db_s.date = client_s.date
                db_s.start_time = client_s.startTime
                db_s.end_time = client_s.endTime
                db_s.color = client_s.color
                db_s.recurrence = client_s.recurrence
                db_s.recurrence_days = client_s.recurrenceDays
                db_s.reminders = client_s.reminders
                db_s.timezone = client_s.timezone
                db_s.is_deleted = client_s.is_deleted
                db_s.updated_at = client_s.updatedAt

    db.commit()

    # 2. Sync Client Tasks to DB
    for client_t in sync_data.tasks:
        db_t = db.query(Task).filter(Task.id == client_t.id, Task.user_id == current_user.id).first()
        if not db_t:
            # Insert new task
            new_t = Task(
                id=client_t.id,
                user_id=current_user.id,
                title=client_t.title,
                description=client_t.description,
                schedule_id=client_t.scheduleId,
                due_date=client_t.dueDate,
                due_time=client_t.dueTime,
                status=client_t.status,
                priority=client_t.priority,
                original_due_date=client_t.originalDueDate,
                is_deleted=client_t.is_deleted,
                created_at=client_t.createdAt,
                updated_at=client_t.updatedAt
            )
            db.add(new_t)
        else:
            # Conflict resolution: Last-Write-Wins
            if client_t.updatedAt >= db_t.updated_at:
                db_t.title = client_t.title
                db_t.description = client_t.description
                db_t.schedule_id = client_t.scheduleId
                db_t.due_date = client_t.dueDate
                db_t.due_time = client_t.dueTime
                db_t.status = client_t.status
                db_t.priority = client_t.priority
                db_t.original_due_date = client_t.originalDueDate
                db_t.is_deleted = client_t.is_deleted
                db_t.updated_at = client_t.updatedAt

    db.commit()

    # 3. Query DB updates since last_synced_at to return to client
    # If client has last_synced_at == 0 (fresh login/sync), return all active non-deleted items.
    if sync_data.last_synced_at == 0:
        server_schedules = db.query(Schedule).filter(
            Schedule.user_id == current_user.id,
            Schedule.is_deleted == False
        ).all()
        server_tasks = db.query(Task).filter(
            Task.user_id == current_user.id,
            Task.is_deleted == False
        ).all()
    else:
        server_schedules = db.query(Schedule).filter(
            Schedule.user_id == current_user.id,
            Schedule.updated_at > sync_data.last_synced_at
        ).all()
        server_tasks = db.query(Task).filter(
            Task.user_id == current_user.id,
            Task.updated_at > sync_data.last_synced_at
        ).all()

    # Format output lists matching camelCase naming for frontend
    out_schedules = []
    for s in server_schedules:
        out_schedules.append({
            "id": s.id,
            "title": s.title,
            "description": s.description,
            "date": s.date,
            "startTime": s.start_time,
            "endTime": s.end_time,
            "color": s.color,
            "recurrence": s.recurrence,
            "recurrenceDays": s.recurrence_days,
            "reminders": s.reminders,
            "timezone": s.timezone,
            "is_deleted": s.is_deleted,
            "createdAt": s.created_at,
            "updatedAt": s.updated_at
        })

    out_tasks = []
    for t in server_tasks:
        out_tasks.append({
            "id": t.id,
            "title": t.title,
            "description": t.description,
            "scheduleId": t.schedule_id,
            "dueDate": t.due_date,
            "dueTime": t.due_time,
            "status": t.status,
            "priority": t.priority,
            "originalDueDate": t.original_due_date,
            "is_deleted": t.is_deleted,
            "createdAt": t.created_at,
            "updatedAt": t.updated_at
        })

    return {
        "server_time": server_sync_time,
        "schedules": out_schedules,
        "tasks": out_tasks
    }
