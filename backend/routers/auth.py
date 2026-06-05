from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta

from database import get_db
from models.user import User, UserRole
from models.company import Company
from schemas.user import UserCreate, UserLogin, UserOut, Token
from auth.jwt_handler import (
    verify_password, get_password_hash, create_access_token,
    get_current_user, require_admin_only
)
from config import settings

router = APIRouter()


def _make_token(user: User, db: Session) -> str:
    company_name = None
    if user.company_id:
        company = db.query(Company).filter(Company.id == user.company_id).first()
        company_name = company.name if company else None
    return create_access_token(
        {
            "sub": str(user.id),
            "role": user.role,
            "company_id": user.company_id,
            "company_name": company_name,
        },
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )


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

    token = _make_token(user, db)

    user_out = UserOut.model_validate(user)
    # Attach company_name to token payload (available in response via UserOut if extended)
    return Token(access_token=token, user=user_out)


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/users", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), current_user: User = Depends(require_admin_only)):
    if current_user.role == "super_admin":
        return db.query(User).all()
    return db.query(User).filter(User.company_id == current_user.company_id).all()


@router.post("/seed-superadmin")
def seed_superadmin(db: Session = Depends(get_db)):
    """Creates the global super_admin if no super_admin exists."""
    existing = db.query(User).filter(User.role == UserRole.super_admin).first()
    if existing:
        raise HTTPException(status_code=400, detail="Super administrador ya existe")
    admin = User(
        email="admin@animahr.cl",
        hashed_password=get_password_hash("Admin1234!"),
        full_name="Super Administrador ANIMA",
        role=UserRole.super_admin,
        company_id=None,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return {"message": "Super admin creado", "email": "admin@animahr.cl", "password": "Admin1234!"}


@router.post("/seed-admin")
def seed_admin(db: Session = Depends(get_db)):
    """Legacy: Creates default super_admin if no users exist."""
    count = db.query(User).count()
    if count > 0:
        raise HTTPException(status_code=400, detail="Ya existen usuarios")
    admin = User(
        email="admin@animahr.cl",
        hashed_password=get_password_hash("Admin1234!"),
        full_name="Super Administrador ANIMA",
        role=UserRole.super_admin,
        company_id=None,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return {"message": "Super admin creado", "email": "admin@animahr.cl", "password": "Admin1234!"}
