import uuid
from sqlalchemy import Column, String, Boolean, BigInt, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(BigInt, nullable=False)

    schedules = relationship("Schedule", back_populates="user", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="user", cascade="all, delete-orphan")


class Schedule(Base):
    __tablename__ = "schedules"

    id = Column(String, primary_key=True)  # client-side generated UUID
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, default="")
    date = Column(String, nullable=False) # YYYY-MM-DD
    start_time = Column(String, nullable=False) # HH:MM
    end_time = Column(String, nullable=False) # HH:MM
    color = Column(String, default="#00e676")
    recurrence = Column(String, default="none")
    recurrence_days = Column(JSON, default=list) # e.g. [1, 2, 3]
    reminders = Column(JSON, default=list) # e.g. [0, 5, 30]
    timezone = Column(String, nullable=True)
    is_deleted = Column(Boolean, default=False, nullable=False)
    created_at = Column(BigInt, nullable=False)
    updated_at = Column(BigInt, nullable=False)

    user = relationship("User", back_populates="schedules")
    tasks = relationship("Task", back_populates="schedule", cascade="all, delete-orphan")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(String, primary_key=True) # client-side generated UUID
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, default="")
    schedule_id = Column(String, ForeignKey("schedules.id", ondelete="SET NULL"), nullable=True)
    due_date = Column(String, nullable=True) # YYYY-MM-DD
    due_time = Column(String, nullable=True) # HH:MM
    status = Column(String, default="upcoming") # upcoming, completed, rescheduled, pending
    priority = Column(String, default="normal") # low, normal, high
    original_due_date = Column(String, nullable=True)
    is_deleted = Column(Boolean, default=False, nullable=False)
    created_at = Column(BigInt, nullable=False)
    updated_at = Column(BigInt, nullable=False)

    user = relationship("User", back_populates="tasks")
    schedule = relationship("Schedule", back_populates="tasks")
