from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Any

# Authentication
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserOut(BaseModel):
    id: str
    email: EmailStr
    created_at: int

    class Config:
        from_attributes = True


# Schedules
class ScheduleUpsert(BaseModel):
    id: str
    title: str
    description: Optional[str] = ""
    date: str
    startTime: str = Field(..., alias="startTime")
    endTime: str = Field(..., alias="endTime")
    color: Optional[str] = "#00e676"
    recurrence: Optional[str] = "none"
    recurrenceDays: Optional[List[int]] = Field(default_list=[], alias="recurrenceDays")
    reminders: Optional[List[int]] = Field(default_list=[0, 5, 30])
    timezone: Optional[str] = None
    is_deleted: Optional[bool] = False
    createdAt: int = Field(..., alias="createdAt")
    updatedAt: int = Field(..., alias="updatedAt")

    class Config:
        populate_by_name = True


class ScheduleOut(BaseModel):
    id: str
    title: str
    description: Optional[str] = ""
    date: str
    startTime: str = Field(..., serialization_alias="startTime")
    endTime: str = Field(..., serialization_alias="endTime")
    color: Optional[str] = "#00e676"
    recurrence: Optional[str] = "none"
    recurrenceDays: Optional[List[int]] = Field(default=[], serialization_alias="recurrenceDays")
    reminders: Optional[List[int]] = Field(default=[0, 5, 30])
    timezone: Optional[str] = None
    is_deleted: bool
    createdAt: int = Field(..., serialization_alias="createdAt")
    updatedAt: int = Field(..., serialization_alias="updatedAt")

    class Config:
        from_attributes = True
        populate_by_name = True


# Tasks
class TaskUpsert(BaseModel):
    id: str
    title: str
    description: Optional[str] = ""
    scheduleId: Optional[str] = Field(None, alias="scheduleId")
    dueDate: Optional[str] = Field(None, alias="dueDate")
    dueTime: Optional[str] = Field(None, alias="dueTime")
    status: Optional[str] = "upcoming"
    priority: Optional[str] = "normal"
    originalDueDate: Optional[str] = Field(None, alias="originalDueDate")
    is_deleted: Optional[bool] = False
    createdAt: int = Field(..., alias="createdAt")
    updatedAt: int = Field(..., alias="updatedAt")

    class Config:
        populate_by_name = True


class TaskOut(BaseModel):
    id: str
    title: str
    description: Optional[str] = ""
    scheduleId: Optional[str] = Field(None, serialization_alias="scheduleId")
    dueDate: Optional[str] = Field(None, serialization_alias="dueDate")
    dueTime: Optional[str] = Field(None, serialization_alias="dueTime")
    status: Optional[str] = "upcoming"
    priority: Optional[str] = "normal"
    originalDueDate: Optional[str] = Field(None, serialization_alias="originalDueDate")
    is_deleted: bool
    createdAt: int = Field(..., serialization_alias="createdAt")
    updatedAt: int = Field(..., serialization_alias="updatedAt")

    class Config:
        from_attributes = True
        populate_by_name = True


# Bi-directional Sync
class SyncRequest(BaseModel):
    last_synced_at: int
    schedules: List[ScheduleUpsert]
    tasks: List[TaskUpsert]

class SyncResponse(BaseModel):
    server_time: int
    schedules: List[ScheduleOut]
    tasks: List[TaskOut]
