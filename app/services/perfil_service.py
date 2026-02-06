from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.db.crud import perfil_crud
from app.models.auth_models import Usuario
from app.schemas.perfil_schema import PerfilUpdate, CambioPassword, PerfilResponse
from app.core.security import verify_password, get_password_hash

class PerfilService:

    def obtener_perfil(self, db: Session, id_usuario: int) -> PerfilResponse:
        usuario, contacto = perfil_crud.get_full_profile(db, id_usuario)
        
        if not usuario:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
            
        return self._formatear_respuesta(usuario, contacto)

    def actualizar_datos(self, db: Session, id_usuario: int, datos: PerfilUpdate) -> PerfilResponse:
        # Validación de Email Único
        if datos.email:
            # Nota: Podrías mover esta consulta al CRUD si quisieras ser estricto, 
            # pero una consulta simple de lectura aquí es aceptable.
            usuario_existente = db.query(Usuario).filter(Usuario.email == datos.email).first()
            if usuario_existente and usuario_existente.id_usuario != id_usuario:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, 
                    detail="El email ya está registrado por otro usuario."
                )

        usuario_actualizado, contacto_actualizado = perfil_crud.update_profile(db, id_usuario, datos)
        return self._formatear_respuesta(usuario_actualizado, contacto_actualizado)

    def cambiar_password(self, db: Session, id_usuario: int, datos: CambioPassword):
        usuario = db.query(Usuario).filter(Usuario.id_usuario == id_usuario).first()
        
        if not usuario:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        if not verify_password(datos.password_actual, usuario.contrasenia):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="La contraseña actual es incorrecta."
            )
        
        usuario.contrasenia = get_password_hash(datos.password_nueva)
        db.add(usuario)
        db.commit()
        
        return {"message": "Contraseña actualizada correctamente"}

    def eliminar_cuenta(self, db: Session, id_usuario: int):
        exito = perfil_crud.delete_user_account(db, id_usuario)
        if not exito:
            raise HTTPException(status_code=400, detail="No se pudo eliminar la cuenta")
        return {"message": "Cuenta eliminada exitosamente"}

    # ------------------------------------------------------------------
    # MÉTODO LIMPIO: Llama al CRUD y formatea datos
    # ------------------------------------------------------------------
    def obtener_mis_inscripciones(self, db: Session, id_usuario: int):
        # 1. Llamamos al CRUD (Base de Datos)
        resultados_crud = perfil_crud.get_mis_inscripciones_db(db, id_usuario)
        
        lista_inscripciones = []
        
        # 2. Procesamos la lógica de presentación (Mapeo)
        for reserva, evento in resultados_crud:
            
            # Lógica de negocio: Traducción de estados
            estado_texto = "Desconocido"
            if reserva.id_estado_reserva == 1: estado_texto = "Pendiente de Pago"
            elif reserva.id_estado_reserva == 2: estado_texto = "Confirmado"
            elif reserva.id_estado_reserva == 3: estado_texto = "Rechazado"
            elif reserva.id_estado_reserva == 5: estado_texto = "Cancelado"

            item = {
                "id_reserva": reserva.id_reserva,
                "fecha_reserva": reserva.fecha_reserva,
                "estado_reserva": estado_texto,
                
                "id_evento": evento.id_evento,
                "nombre_evento": evento.nombre_evento,
                "ubicacion": evento.ubicacion,
                "fecha_evento": evento.fecha_evento,
                # Verifica si el objeto evento tiene hora, si no, null
                "hora_evento": str(evento.hora_evento) if hasattr(evento, 'hora_evento') and evento.hora_evento else None,
                "costo": evento.costo_participacion
            }
            lista_inscripciones.append(item)
            
        return lista_inscripciones

    def _formatear_respuesta(self, usuario, contacto) -> dict:
        return {
            "id_usuario": usuario.id_usuario,
            "nombre_y_apellido": usuario.nombre_y_apellido,
            "email": usuario.email,
            "id_rol": usuario.id_rol,
            "telefono": contacto.telefono if contacto else None,
            "direccion": contacto.direccion if contacto else None,
            "enlace_redes": contacto.enlace_redes if contacto else None,
            "otro_contacto": contacto.otro_contacto if contacto else None,
        }