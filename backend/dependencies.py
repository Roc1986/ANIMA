"""
Shared dependency helpers for multi-tenant routing.
"""
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth.jwt_handler import get_current_user, require_super_admin  # noqa: re-export
from models.user import User


def require_company_access(company_id: int, current_user: User = Depends(get_current_user)) -> bool:
    """
    Returns True if the current user may access the given company.
    super_admin always passes. Others must belong to that company.
    """
    if current_user.role == "super_admin":
        return True
    if current_user.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tiene acceso a esta empresa",
        )
    return True


def filter_by_company(query, model, current_user: User):
    """
    Adds company filter to a SQLAlchemy query unless the user is super_admin.
    model must have a company_id column.
    """
    if current_user.role == "super_admin":
        return query
    return query.filter(model.company_id == current_user.company_id)
