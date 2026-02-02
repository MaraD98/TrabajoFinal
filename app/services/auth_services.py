from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from datetime import timedelta

# ✅ ESTA ES LA RUTA CORRECTA SEGÚN TU ERROR DE VISUAL STUDIO
from app.models.auth_models import Usuario, Contacto

from app.db.crud.auth_crud import UsuarioCRUD
from app.core.security import verify_password, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES, decode_access_token
from app.schemas.auth_schema import UsuarioCreate, LoginRequest
from app.db.crud.notificacion_crud import NotificacionCRUD

class AuthService:
    @staticmethod
    def register_usuario(db: Session, usuario_data: UsuarioCreate):
        existing_email = UsuarioCRUD.get_usuario_by_email(db, usuario_data.email)
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El email ya está registrado"
            )
        
        new_usuario = UsuarioCRUD.create_usuario(
            db=db,
            nombre_y_apellido=usuario_data.nombre_y_apellido,
            email=usuario_data.email,
            contrasenia=usuario_data.contrasenia
        )
        
        # regla de negocio: al crear usuario, crear notificación de bienvenida
        NotificacionCRUD.create_notificacion(
            db=db,
            id_usuario=new_usuario.id_usuario,
            id_estado_solicitud=None,
            mensaje="Bienvenido a WakeUp Bikes! 🎉 Tu cuenta fue creada con éxito."
        )

        return new_usuario
    
    @staticmethod
    def authenticate_usuario(db: Session, login_data: LoginRequest):
        usuario = UsuarioCRUD.get_usuario_by_email(db, login_data.email)
        
        if not usuario or not verify_password(login_data.contrasenia, usuario.contrasenia):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email o contraseña incorrectos",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": usuario.email},
            expires_delta=access_token_expires
        )
        
        return {"access_token": access_token, "token_type": "bearer"}
    
    @staticmethod
    def get_current_usuario_from_token(db: Session, token: str):
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No se pudo validar las credenciales",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
        payload = decode_access_token(token)
        if payload is None:
            raise credentials_exception
        
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        
        usuario = UsuarioCRUD.get_usuario_by_email(db, email)
        if usuario is None:
            raise credentials_exception
        
        # Cargar datos de contacto
        contacto = db.query(Contacto).filter(Contacto.id_usuario == usuario.id_usuario).first()
        if contacto:
            usuario.telefono = contacto.telefono
            usuario.direccion = contacto.direccion
            usuario.enlace_redes = contacto.enlace_redes
        
        return usuario

    @staticmethod
    def update_usuario(db: Session, current_user, usuario_update):
        update_data = usuario_update.dict(exclude_unset=True)
        campos_usuario = ["nombre_y_apellido", "email"]
        campos_contacto = ["telefono", "direccion", "enlace_redes"]

        # --- A. USUARIO ---
        if "email" in update_data:
            nuevo_email = update_data["email"]
            usuario_existente = UsuarioCRUD.get_usuario_by_email(db, nuevo_email)
            if usuario_existente and usuario_existente.id_usuario != current_user.id_usuario:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Este email ya está registrado por otro usuario."
                )

        for key, value in update_data.items():
            if key in campos_usuario:
                setattr(current_user, key, value)
        
        # --- B. CONTACTO ---
        datos_contacto = {k: v for k, v in update_data.items() if k in campos_contacto}

        if datos_contacto:
            contacto_record = db.query(Contacto).filter(Contacto.id_usuario == current_user.id_usuario).first()
            if contacto_record:
                for key, value in datos_contacto.items():
                    setattr(contacto_record, key, value)
            else:
                new_contacto = Contacto(id_usuario=current_user.id_usuario, **datos_contacto)
                db.add(new_contacto)

        db.add(current_user)
        db.commit()
        db.refresh(current_user)

        contacto_actualizado = db.query(Contacto).filter(Contacto.id_usuario == current_user.id_usuario).first()
        if contacto_actualizado:
            current_user.telefono = contacto_actualizado.telefono
            current_user.direccion = contacto_actualizado.direccion
            current_user.enlace_redes = contacto_actualizado.enlace_redes

        return current_user
