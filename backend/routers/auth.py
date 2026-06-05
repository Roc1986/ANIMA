from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta

from database import get_db
from models.user import User
from schemas.user import UserCreate, UserLogin, UserOut, Token
from auth.jwt_handler import (
    verify_password, get_password_hash, create_access_token,
    get_current_user, require_admin_only
)
from config import settings

router = APIRouter()


@router.post("/register", response_model=UserOut, status_code=201)
def register(data: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email ya registrado")
    user = User(
        email=data.email,
        hashed_password=get_password_hash(data.password),
        full_name=data.full_name,
        role=data.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Usuario inactivo")
    token = create_access_token(
        {"sub": str(user.id), "role": user.role},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return Token(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/users", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), current_user: User = Depends(require_admin_only)):
    return db.query(User).all()


@router.post("/seed-admin")
def seed_admin(db: Session = Depends(get_db)):
    """Creates default admin if no users exist."""
    count = db.query(User).count()
    if count > 0:
        raise HTTPException(status_code=400, detail="Ya existen usuarios")
    admin = User(
        email="admin@animahr.cl",
        hashed_password=get_password_hash("Admin1234!"),
        full_name="Administrador Sistema",
        role="admin",
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return {"message": "Admin creado", "email": "admin@animahr.cl", "password": "Admin1234!"}
