from sqlalchemy.orm import Session
from app.models.auth_models import Usuario, Contacto
from app.schemas.perfil_schema import PerfilUpdate

def get_full_profile(db: Session, id_usuario: int):
    """
    Busca al usuario y sus datos de contacto.
    Retorna una tupla o estructura que el Service pueda unificar.
    """
    # Traemos al usuario
    usuario = db.query(Usuario).filter(Usuario.id_usuario == id_usuario).first()
    
    # Traemos su contacto (puede ser None si nunca cargó datos extra)
    contacto = db.query(Contacto).filter(Contacto.id_usuario == id_usuario).first()
    
    if not usuario:
        return None # Caso borde raro, pero seguro
        
    return usuario, contacto

def update_profile(db: Session, id_usuario: int, datos: PerfilUpdate):
    """
    Actualiza datos en tabla Usuario y/o tabla Contacto.
    Si el contacto no existe, lo crea (Upsert lógico).
    """
    # 1. Recuperamos las entidades
    usuario = db.query(Usuario).filter(Usuario.id_usuario == id_usuario).first()
    contacto = db.query(Contacto).filter(Contacto.id_usuario == id_usuario).first()

    if not usuario:
        return None

    # 2. Actualizamos campos de la tabla USUARIO (si vinieron en el request)
    if datos.nombre_y_apellido is not None:
        usuario.nombre_y_apellido = datos.nombre_y_apellido
    if datos.email is not None:
        usuario.email = datos.email
    # Nota: El email único se suele validar en el Service antes de llamar acá para lanzar error 400.

    # 3. Actualizamos campos de la tabla CONTACTO
    # Verificamos si hay algún dato de contacto para actualizar
    tiene_datos_contacto = any([
        datos.telefono is not None,
        datos.direccion is not None,
        datos.enlace_redes is not None,
        datos.otro_contacto is not None
    ])

    if tiene_datos_contacto:
        if not contacto:
            # MAGIA: Si no existe fila en contacto, la creamos ahora
            contacto = Contacto(id_usuario=id_usuario)
            db.add(contacto)
        
        # Asignamos valores (solo si no son None)
        if datos.telefono is not None:
            contacto.telefono = datos.telefono
        if datos.direccion is not None:
            contacto.direccion = datos.direccion
        if datos.enlace_redes is not None:
            contacto.enlace_redes = datos.enlace_redes
        if datos.otro_contacto is not None:
            contacto.otro_contacto = datos.otro_contacto

    # 4. Guardamos todo junto
    db.commit()
    db.refresh(usuario)
    if contacto:
        db.refresh(contacto)
    
    return usuario, contacto

def delete_user_account(db: Session, id_usuario: int):
    """
    Elimina primero el contacto (si existe) y luego al usuario.
    """
    # 1. Borrar contacto asociado
    db.query(Contacto).filter(Contacto.id_usuario == id_usuario).delete()
    
    # 2. Borrar usuario
    filas_borradas = db.query(Usuario).filter(Usuario.id_usuario == id_usuario).delete()
    
    db.commit()
    return filas_borradas > 0