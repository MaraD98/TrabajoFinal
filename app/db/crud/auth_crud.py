from sqlalchemy.orm import Session
from app.models.auth_models import Usuario
from app.core.security import get_password_hash
from typing import Optional

class UsuarioCRUD:
    @staticmethod
    def get_usuario_by_email(db: Session, email: str) -> Optional[Usuario]:
        return db.query(Usuario).filter(Usuario.email == email).first()

    @staticmethod
    def create_usuario(db: Session, nombre_y_apellido: str, email: str, contrasenia: str) -> Usuario:
        hashed_password = get_password_hash(contrasenia)
        db_usuario = Usuario(
            nombre_y_apellido=nombre_y_apellido,
            email=email,
            contrasenia=hashed_password,
            id_rol= 4 # Rol por defecto: Cliente
        )
        db.add(db_usuario)
        db.commit()
        db.refresh(db_usuario)
        return db_usuario

    @staticmethod
    def get_usuario_by_id(db: Session, id_usuario: int) -> Optional[Usuario]:
        return db.query(Usuario).filter(Usuario.id_usuario == id_usuario).first()


