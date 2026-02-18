"""
Servicio de Eliminación de Eventos - ACTUALIZADO
Archivo: app/services/eliminacion_services.py
Mantiene estados actuales: 5 (Cancelado), 6 (Depurado)
"""
from sqlalchemy.orm import Session
from fastapi import HTTPException
from datetime import date

from app.db.crud import eliminacion_crud
from app.models.auth_models import Usuario
from app.models.registro_models import Evento, ReservaEvento
from app.models.eliminacion_models import EliminacionEvento  # ✅ IMPORTAR AQUÍ

# ============================================================================
# CONSTANTES
# ============================================================================
ID_ROL_ADMINISTRADOR = 1
ID_ROL_SUPERVISOR = 2
ID_ESTADO_PUBLICADO = 3
ID_ESTADO_FINALIZADO = 4
ID_ESTADO_CANCELADO = 5
ID_ESTADO_DEPURADO = 6  # ✅ ANTES ERA 7, AHORA ES 6

class EliminacionService:
    """
    Servicio para gestionar todas las operaciones de eliminación de eventos.
    """
    
    # ========================================================================
    # CANCELAR EVENTO PROPIO
    # ========================================================================
    
    @staticmethod
    def cancelar_evento_propio(
        db: Session,
        evento_id: int,
        motivo: str,
        usuario_actual: Usuario
    ) -> dict:
        """
        Permite al organizador cancelar su propio evento.
        Crea solicitud de baja. Evento permanece en estado 3.
        """
        # 1. Validar que el evento existe
        evento = db.query(Evento).filter(Evento.id_evento == evento_id).first()
        if not evento:
            raise HTTPException(status_code=404, detail="Evento no encontrado")
        
        # 2. Validar que es el dueño
        if evento.id_usuario != usuario_actual.id_usuario:
            raise HTTPException(
                status_code=403, 
                detail="No tienes permiso. No eres el creador de este evento."
            )
        
        # 3. Validar que no esté finalizado
        if evento.fecha_evento < date.today():
            raise HTTPException(
                status_code=400, 
                detail="No se puede cancelar un evento que ya finalizó."
            )
        
        if evento.id_estado == ID_ESTADO_CANCELADO:
            raise HTTPException(
                status_code=400, 
                detail="El evento ya está cancelado."
            )
        
        # 4. Verificar si ya existe una solicitud pendiente
        solicitud_existente = eliminacion_crud.obtener_registro_eliminacion(db, evento_id)
        if solicitud_existente:
            raise HTTPException(
                status_code=400,
                detail="Ya existe una solicitud de baja pendiente para este evento."
            )
        
        # 5. Crear SOLO el registro de auditoría (NO cambia estado del evento)
        eliminacion = eliminacion_crud.crear_registro_eliminacion(
            db=db,
            id_evento=evento_id,
            motivo=motivo,
            id_usuario=usuario_actual.id_usuario,
            prefijo="[SOLICITUD - USUARIO]"
        )
        
        db.commit()
        
        return {
            "mensaje": "Solicitud de baja enviada. El evento permanecerá visible hasta que el administrador revise tu solicitud.",
            "id_evento": evento_id,
            "estado_actual": "Publicado (con solicitud pendiente)",
            "id_eliminacion": eliminacion.id_eliminacion
        }
    
    # ========================================================================
    # SOLICITAR BAJA (ORGANIZADOR EXTERNO)
    # ========================================================================
    
    @staticmethod
    def solicitar_baja_evento(
        db: Session,
        evento_id: int,
        motivo: str,
        usuario_actual: Usuario
    ) -> dict:
        """
        Organizador externo solicita la baja de su evento.
        El evento PERMANECE en estado 3 hasta que admin apruebe.
        """
        evento = db.query(Evento).filter(Evento.id_evento == evento_id).first()
        if not evento:
            raise HTTPException(status_code=404, detail="Evento no encontrado")
        
        # Validar dueño
        if evento.id_usuario != usuario_actual.id_usuario:
            raise HTTPException(
                status_code=403, 
                detail="No tienes permiso para solicitar la baja de este evento."
            )
        
        # Solo eventos publicados
        if evento.id_estado != ID_ESTADO_PUBLICADO:
            raise HTTPException(
                status_code=400,
                detail="Solo se puede solicitar baja de eventos publicados."
            )
        
        # Verificar solicitud duplicada
        solicitud_existente = eliminacion_crud.obtener_registro_eliminacion(db, evento_id)
        if solicitud_existente:
            raise HTTPException(
                status_code=400,
                detail="Ya existe una solicitud de baja pendiente para este evento."
            )
        
        # Crear solicitud SIN cambiar estado del evento
        eliminacion = eliminacion_crud.crear_registro_eliminacion(
            db=db,
            id_evento=evento_id,
            motivo=motivo,
            id_usuario=usuario_actual.id_usuario,
            prefijo="[SOLICITUD]"
        )
        
        db.commit()
        
        return {
            "mensaje": "Solicitud de baja enviada correctamente. Pendiente de revisión por el administrador.",
            "id_evento": evento_id,
            "estado_actual": "Publicado (con solicitud pendiente)",
            "id_eliminacion": eliminacion.id_eliminacion
        }
    
    # ========================================================================
    # ELIMINAR COMO ADMIN (Directo - Soft Delete)
    # ========================================================================
    
    @staticmethod
    def eliminar_evento_admin(
        db: Session,
        evento_id: int,
        motivo: str,
        usuario_actual: Usuario
    ) -> dict:
        """
        Admin elimina un evento directamente (Soft Delete - Estado 5).
        """
        # Validar permisos
        if usuario_actual.id_rol not in [ID_ROL_ADMINISTRADOR, ID_ROL_SUPERVISOR]:
            raise HTTPException(
                status_code=403, 
                detail="Requiere permisos de administrador o supervisor."
            )
        
        evento = db.query(Evento).filter(Evento.id_evento == evento_id).first()
        if not evento:
            raise HTTPException(status_code=404, detail="Evento no encontrado")
        
        # Crear registro
        eliminacion = eliminacion_crud.crear_registro_eliminacion(
            db=db,
            id_evento=evento_id,
            motivo=motivo,
            id_usuario=usuario_actual.id_usuario,
            prefijo="[ADMIN - ELIMINACIÓN DIRECTA]"
        )
        
        # Cancelar evento (estado → 5)
        eliminacion_crud.cancelar_evento(db, evento_id)
        
        # Notificar inscritos
        EliminacionService._notificar_inscritos(
            db=db, 
            evento=evento, 
            motivo=f"[ADMIN] {motivo}", 
            id_eliminacion=eliminacion.id_eliminacion
        )
        
        db.commit()
        
        return {
            "mensaje": "Evento eliminado por administrador.",
            "id_evento": evento_id,
            "estado_nuevo": "Cancelado",
            "id_eliminacion": eliminacion.id_eliminacion
        }
    
    # ========================================================================
    # ADMIN: APROBAR SOLICITUD DE BAJA
    # ========================================================================
    
    @staticmethod
    def aprobar_baja(db: Session, id_evento: int, id_admin: int) -> dict:
        """
        Admin aprueba una solicitud de baja.
        Evento pasa de estado 3 → 5.
        """
        evento = db.query(Evento).filter(Evento.id_evento == id_evento).first()
        if not evento:
            raise HTTPException(status_code=404, detail="Evento no encontrado")
        
        # Buscar la solicitud
        eliminacion = eliminacion_crud.obtener_registro_eliminacion(db, id_evento)
        if not eliminacion:
            raise HTTPException(
                status_code=404,
                detail="No existe solicitud de baja para este evento."
            )
        
        # Actualizar motivo
        eliminacion.motivo_eliminacion += " | [✅ APROBADO POR ADMIN]"
        eliminacion.estado_solicitud = 'aprobada'
        
        # Cancelar evento (estado → 5)
        eliminacion_crud.cancelar_evento(db, id_evento)
        eliminacion.estado_solicitud = 'aprobada'
        
        # Notificar inscritos
        EliminacionService._notificar_inscritos(
            db=db, 
            evento=evento, 
            motivo="Solicitud de baja aprobada por el administrador", 
            id_eliminacion=eliminacion.id_eliminacion
        )
        
        db.commit()
        
        return {
            "mensaje": "Solicitud de baja aprobada. Evento cancelado y participantes notificados.",
            "id_evento": id_evento,
            "estado_nuevo": "Cancelado"
        }
    
    # ========================================================================
    # ADMIN: RECHAZAR SOLICITUD DE BAJA
    # ========================================================================
    
    @staticmethod
    def rechazar_baja(db: Session, id_evento: int) -> dict:
        """
        Admin rechaza una solicitud de baja.
        Elimina el registro de eliminacion_evento.
        El evento permanece en estado 3.
        """
        evento = db.query(Evento).filter(Evento.id_evento == id_evento).first()
        if not evento:
            raise HTTPException(status_code=404, detail="Evento no encontrado")
        
        # Buscar solicitud
        eliminacion = eliminacion_crud.obtener_registro_eliminacion(db, id_evento)
        if not eliminacion:
            raise HTTPException(
                status_code=404,
                detail="No existe solicitud de baja para este evento."
            )
        
        # Eliminar registro de solicitud
        eliminacion_crud.rechazar_registro_eliminacion(db, id_evento)
        
        db.commit()
        
        return {
            "mensaje": "Solicitud de baja rechazada. El evento continúa publicado.",
            "id_evento": id_evento,
            "estado_actual": "Publicado"
        }
    
    # ========================================================================
    # ✅ OBTENER EVENTOS FINALIZADOS
    # ========================================================================
    
    @staticmethod
    def obtener_eventos_finalizados(db: Session) -> list:
        """
        Obtiene eventos cuya fecha ya pasó (estado 4 o fecha pasada).
        """
        hoy = date.today()
        
        eventos = db.query(Evento).filter(
            Evento.fecha_evento < hoy,
            Evento.id_estado.in_([ID_ESTADO_PUBLICADO, ID_ESTADO_FINALIZADO])
        ).all()
        
        return eventos
    
    # ========================================================================
    # ✅ RESTAURAR EVENTO CANCELADO
    # ========================================================================
    
    @staticmethod
    def restaurar_evento_cancelado(db: Session, id_evento: int, id_admin: int) -> dict:
        """
        Restaura un evento cancelado (estado 5 → 3).
        Elimina el registro de eliminacion_evento.
        """
        evento = db.query(Evento).filter(Evento.id_evento == id_evento).first()
        if not evento:
            raise HTTPException(status_code=404, detail="Evento no encontrado")
        
        if evento.id_estado != ID_ESTADO_CANCELADO:
            raise HTTPException(
                status_code=400,
                detail="Solo se pueden restaurar eventos cancelados (estado 5)."
            )
        
        # Restaurar estado
        evento.id_estado = ID_ESTADO_PUBLICADO
        
        # Eliminar registro de eliminación si existe
        eliminacion_crud.eliminar_registro_eliminacion(db, id_evento)
        
        db.commit()
        
        return {
            "mensaje": "Evento restaurado correctamente.",
            "id_evento": id_evento,
            "estado_nuevo": "Publicado"
        }
    
    # ========================================================================
    # DEPURACIÓN (HARD DELETE LÓGICO - Estado 6)
    # ========================================================================
    
    @staticmethod
    def depurar_evento(
        db: Session, 
        evento_id: int, 
        motivo: str, 
        id_admin: int
    ) -> dict:
        """
        Depura un evento (Hard Delete Lógico - Estado 6).
        Puede depurar eventos finalizados (estado 4) o cancelados (estado 5).
        """
        evento = db.query(Evento).filter(Evento.id_evento == evento_id).first()
        if not evento:
            raise HTTPException(status_code=404, detail="Evento no encontrado")
        
        # Solo se pueden depurar eventos finalizados o cancelados
        if evento.id_estado not in [ID_ESTADO_FINALIZADO, ID_ESTADO_CANCELADO]:
            raise HTTPException(
                status_code=400,
                detail="Solo se pueden depurar eventos finalizados (estado 4) o cancelados (estado 5)."
            )
        
        # Crear o actualizar registro de eliminación
        eliminacion_existente = eliminacion_crud.obtener_registro_eliminacion(db, evento_id)
        
        if eliminacion_existente:
            eliminacion_existente.motivo_eliminacion += f" | [DEPURADO: {motivo}]"
            eliminacion = eliminacion_existente
        else:
            eliminacion = eliminacion_crud.crear_registro_eliminacion(
                db=db,
                id_evento=evento_id,
                motivo=motivo,
                id_usuario=id_admin,
                prefijo="[DEPURACIÓN ADMIN]"
            )
        
        # Cambiar a estado 6 (Depurado)
        eliminacion_crud.depurar_evento(db, evento_id)
        
        db.commit()
        
        return {
            "mensaje": "Evento depurado (Hard Delete Lógico).",
            "id_evento": evento_id,
            "estado_nuevo": "Depurado"
        }
    
    # ========================================================================
    # NOTIFICAR INSCRITOS
    # ========================================================================
    
    @staticmethod
    def _notificar_inscritos(
        db: Session,
        evento: Evento,
        motivo: str,
        id_eliminacion: int
    ) -> None:
        """
        Notifica a todos los inscritos que el evento fue cancelado.
        """
        reservas = db.query(ReservaEvento).filter(
            ReservaEvento.id_evento == evento.id_evento
        ).all()
        
        if not reservas:
            print(f"[INFO] Evento '{evento.nombre_evento}' no tiene inscripciones.")
            eliminacion_crud.marcar_notificacion_enviada(db, id_eliminacion)
            return
        
        print(f"\n{'='*70}")
        print(f"[NOTIFICACIONES] Enviando a {len(reservas)} participantes...")
        print(f"{'='*70}")
        
        organizador = db.query(Usuario).filter(
            Usuario.id_usuario == evento.id_usuario
        ).first()
        
        contacto = organizador.email if organizador else "soporte@wakeupbikes.com"
        
        count = 0
        for reserva in reservas:
            participante = db.query(Usuario).filter(
                Usuario.id_usuario == reserva.id_usuario
            ).first()
            
            if participante and participante.email:
                print(f"  ✉️  → {participante.email}")
                print(f"     📧 Asunto: EVENTO CANCELADO - {evento.nombre_evento}")
                print(f"     📝 Motivo: {motivo}")
                print(f"     📞 Contacto: {contacto}")
                print(f"     {'-'*60}")
                count += 1
        
        eliminacion_crud.marcar_notificacion_enviada(db, id_eliminacion)
        
        print(f"{'='*70}")
        print(f"[✅ OK] {count} notificaciones enviadas")
        print(f"{'='*70}\n")
    
    # ========================================================================
    # CONSULTAS
    # ========================================================================
    
    @staticmethod
    def obtener_bajas_pendientes(db: Session) -> list:
        """
        Obtiene todas las solicitudes de baja pendientes.
        Busca eventos en estado 3 que tienen registro en eliminacion_evento.
        """
        return eliminacion_crud.obtener_bajas_pendientes(db)
    
    @staticmethod
    def obtener_historial(db: Session) -> list:
        """
        Obtiene el historial completo de eliminaciones (estados 5 y 6).
        """
        return eliminacion_crud.obtener_historial_eliminaciones(db)
    
    # ========================================================================
    # ✅ CORREGIDO: OBTENER MIS SOLICITUDES DE ELIMINACIÓN
    # ========================================================================
    
    @staticmethod
    def obtener_mis_solicitudes_eliminacion(db: Session, id_usuario: int):
        """
        Obtiene las solicitudes de eliminación pendientes del usuario.
        Retorna eventos que:
        - Pertenecen al usuario
        - Están en estado 3 (Publicado)
        - Tienen una solicitud de eliminación pendiente
        """
        # Buscar solicitudes de eliminación pendientes del usuario
        solicitudes = db.query(
            EliminacionEvento.id_eliminacion,
            EliminacionEvento.id_evento,
            EliminacionEvento.motivo_eliminacion,
            EliminacionEvento.fecha_eliminacion,
            EliminacionEvento.estado_solicitud,
            Evento.nombre_evento,
            Evento.fecha_evento,
            Evento.ubicacion,
            Evento.id_tipo,
            Evento.cupo_maximo
        ).join(
            Evento, EliminacionEvento.id_evento == Evento.id_evento
        ).filter(
            Evento.id_usuario == id_usuario,
            Evento.id_estado == ID_ESTADO_PUBLICADO,  # Solo eventos activos
            EliminacionEvento.estado_solicitud == 'pendiente'
        ).all()
        
        # Formatear respuesta
        resultado = []
        for sol in solicitudes:
            resultado.append({
                "id_eliminacion": sol.id_eliminacion,
                "id_evento": sol.id_evento,
                "nombre_evento": sol.nombre_evento,
                "fecha_evento": sol.fecha_evento.isoformat() if sol.fecha_evento else None,
                "ubicacion": sol.ubicacion,
                "id_tipo": sol.id_tipo,
                "cupo_maximo": sol.cupo_maximo,
                "motivo": sol.motivo_eliminacion,
                "fecha_solicitud": sol.fecha_eliminacion.isoformat() if sol.fecha_eliminacion else None,
                "estado_solicitud": sol.estado_solicitud
            })
        
        return resultado