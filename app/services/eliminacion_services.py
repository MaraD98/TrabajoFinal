from sqlalchemy.orm import Session
from fastapi import HTTPException
from datetime import date

from app.db.crud import eliminacion_crud
from app.models.auth_models import Usuario
from app.models.registro_models import Evento, ReservaEvento
from app.models.eliminacion_models import EliminacionEvento  # ✅ IMPORTAR AQUÍ
from app.email import enviar_correo_cancelacion_evento

# ============================================================================
# CONSTANTES
# ============================================================================
ID_ROL_ADMINISTRADOR = 1
ID_ROL_SUPERVISOR = 2
ID_ESTADO_PUBLICADO = 3
ID_ESTADO_FINALIZADO = 4
ID_ESTADO_CANCELADO = 5
ID_ESTADO_DEPURADO = 6


class EliminacionService:

    # ========================================================================
    # CANCELAR EVENTO PROPIO (usuario dueño del evento)
    # ========================================================================
    @staticmethod
    def cancelar_evento_propio(db: Session, evento_id: int, motivo: str, usuario_actual: Usuario) -> dict:
        evento = db.query(Evento).filter(Evento.id_evento == evento_id).first()
        if not evento:
            raise HTTPException(status_code=404, detail="Evento no encontrado")

        if evento.id_usuario != usuario_actual.id_usuario:
            raise HTTPException(status_code=403, detail="No tienes permiso. No eres el creador de este evento.")

        if evento.fecha_evento < date.today():
            raise HTTPException(status_code=400, detail="No se puede cancelar un evento que ya finalizó.")

        if evento.id_estado == ID_ESTADO_CANCELADO:
            raise HTTPException(status_code=400, detail="El evento ya está cancelado.")

        solicitud_existente = eliminacion_crud.obtener_registro_eliminacion(db, evento_id)
        if solicitud_existente:
            raise HTTPException(status_code=400, detail="Ya existe una solicitud de baja pendiente para este evento.")

        eliminacion = eliminacion_crud.crear_registro_eliminacion(
            db=db,
            id_evento=evento_id,
            motivo=motivo,
            id_usuario=usuario_actual.id_usuario,
            prefijo="[SOLICITUD - USUARIO]"
        )

        es_admin = usuario_actual.id_rol in [ID_ROL_ADMINISTRADOR, ID_ROL_SUPERVISOR]

        if es_admin:
            eliminacion.estado_solicitud = 'aprobada'
            eliminacion.motivo_eliminacion += " | [✅ AUTO-APROBADO]"
            eliminacion_crud.cancelar_evento(db, evento_id)
            EliminacionService._notificar_inscritos(db=db, evento=evento, motivo=motivo, id_eliminacion=eliminacion.id_eliminacion)
            db.commit()
            return {
                "mensaje": "[AUTO-APROBADO] Evento cancelado directamente por Admin/Supervisor",
                "id_evento": evento_id,
                "estado_nuevo": "Cancelado",
                "id_eliminacion": eliminacion.id_eliminacion,
                "trazabilidad": "Solicitud creada y auto-aprobada para mantener historial"
            }

        db.commit()
        return {
            "mensaje": "Solicitud de baja enviada. El evento permanecerá visible hasta que el administrador revise tu solicitud.",
            "id_evento": evento_id,
            "estado_actual": "Publicado (con solicitud pendiente)",
            "id_eliminacion": eliminacion.id_eliminacion
        }

    # ========================================================================
    # SOLICITAR BAJA (organizador solicita baja de su evento)
    # ========================================================================
    @staticmethod
    def solicitar_baja_evento(db: Session, evento_id: int, motivo: str, usuario_actual: Usuario) -> dict:
        evento = db.query(Evento).filter(Evento.id_evento == evento_id).first()
        if not evento:
            raise HTTPException(status_code=404, detail="Evento no encontrado")

        if evento.id_usuario != usuario_actual.id_usuario:
            raise HTTPException(status_code=403, detail="No tienes permiso para solicitar la baja de este evento.")

        if evento.id_estado != ID_ESTADO_PUBLICADO:
            raise HTTPException(status_code=400, detail="Solo se puede solicitar baja de eventos publicados.")

        solicitud_existente = eliminacion_crud.obtener_registro_eliminacion(db, evento_id)
        if solicitud_existente:
            raise HTTPException(status_code=400, detail="Ya existe una solicitud de baja pendiente para este evento.")

        eliminacion = eliminacion_crud.crear_registro_eliminacion(
            db=db,
            id_evento=evento_id,
            motivo=motivo,
            id_usuario=usuario_actual.id_usuario,
            prefijo="[SOLICITUD]"
        )

        es_admin = usuario_actual.id_rol in [ID_ROL_ADMINISTRADOR, ID_ROL_SUPERVISOR]

        if es_admin:
            eliminacion.estado_solicitud = 'aprobada'
            eliminacion.motivo_eliminacion += " | [✅ AUTO-APROBADO]"
            eliminacion_crud.cancelar_evento(db, evento_id)
            EliminacionService._notificar_inscritos(db, evento, motivo, eliminacion.id_eliminacion)
            db.commit()
            return {
                "mensaje": "[AUTO-APROBADO] Evento cancelado directamente por Admin/Supervisor",
                "id_evento": evento_id,
                "estado_nuevo": "Cancelado",
                "id_eliminacion": eliminacion.id_eliminacion,
                "trazabilidad": "Solicitud creada y auto-aprobada"
            }

        db.commit()
        return {
            "mensaje": "Solicitud de baja enviada correctamente. Pendiente de revisión por el administrador.",
            "id_evento": evento_id,
            "estado_actual": "Publicado (con solicitud pendiente)",
            "id_eliminacion": eliminacion.id_eliminacion
        }

    # ========================================================================
    # ✅ MODIFICADO: ADMIN ELIMINA CON TRAZABILIDAD (antes era directo)
    # Ahora crea solicitud + auto-aprueba, igual que crear/editar
    # No chequea id_usuario == dueño porque el admin puede cancelar cualquier evento
    # ========================================================================
    @staticmethod
    def eliminar_evento_admin(db: Session, evento_id: int, motivo: str, usuario_actual: Usuario) -> dict:
        """
        ✅ MODIFICADO: Admin cancela cualquier evento con trazabilidad completa.
        Crea solicitud + auto-aprueba → queda en historial igual que crear/editar.
        Si ya existe una solicitud pendiente del organizador, la aprueba directamente.
        """
        if usuario_actual.id_rol not in [ID_ROL_ADMINISTRADOR, ID_ROL_SUPERVISOR]:
            raise HTTPException(status_code=403, detail="Requiere permisos de administrador o supervisor.")

        evento = db.query(Evento).filter(Evento.id_evento == evento_id).first()
        if not evento:
            raise HTTPException(status_code=404, detail="Evento no encontrado")

        if evento.id_estado == ID_ESTADO_CANCELADO:
            raise HTTPException(status_code=400, detail="El evento ya está cancelado.")

        if evento.id_estado == ID_ESTADO_DEPURADO:
            raise HTTPException(status_code=400, detail="El evento ya fue depurado.")

        # Si el organizador ya tenía una solicitud pendiente, aprobarla directamente
        # (evita duplicados en la tabla de eliminaciones)
        solicitud_existente = eliminacion_crud.obtener_registro_eliminacion(db, evento_id)
        if solicitud_existente and solicitud_existente.estado_solicitud == 'pendiente':
            solicitud_existente.estado_solicitud = 'aprobada'
            solicitud_existente.motivo_eliminacion += f" | [✅ APROBADO Y CANCELADO POR ADMIN - {motivo}]"
            eliminacion_crud.cancelar_evento(db, evento_id)
            EliminacionService._notificar_inscritos(db, evento, motivo, solicitud_existente.id_eliminacion)
            db.commit()
            return {
                "mensaje": "Solicitud de baja existente aprobada y evento cancelado.",
                "id_evento": evento_id,
                "estado_nuevo": "Cancelado",
                "id_eliminacion": solicitud_existente.id_eliminacion,
                "trazabilidad": "Solicitud previa del organizador aprobada por admin"
            }

        # Sin solicitud previa: crear una nueva como admin y auto-aprobar
        eliminacion = eliminacion_crud.crear_registro_eliminacion(
            db=db,
            id_evento=evento_id,
            motivo=motivo,
            id_usuario=usuario_actual.id_usuario,
            prefijo="[ADMIN - CON SOLICITUD]"
        )

        eliminacion.estado_solicitud = 'aprobada'
        eliminacion.motivo_eliminacion += " | [✅ AUTO-APROBADO POR ADMIN]"

        eliminacion_crud.cancelar_evento(db, evento_id)
        EliminacionService._notificar_inscritos(db, evento, motivo, eliminacion.id_eliminacion)

        db.commit()

        return {
            "mensaje": "Evento cancelado por administrador con trazabilidad completa.",
            "id_evento": evento_id,
            "estado_nuevo": "Cancelado",
            "id_eliminacion": eliminacion.id_eliminacion,
            "trazabilidad": "Solicitud creada y auto-aprobada"
        }

    # ========================================================================
    # ADMIN: APROBAR SOLICITUD DE BAJA
    # ========================================================================
    @staticmethod
    def aprobar_baja(db: Session, id_evento: int, id_admin: int) -> dict:
        evento = db.query(Evento).filter(Evento.id_evento == id_evento).first()
        if not evento:
            raise HTTPException(status_code=404, detail="Evento no encontrado")

        eliminacion = eliminacion_crud.obtener_registro_eliminacion(db, id_evento)
        if not eliminacion:
            raise HTTPException(status_code=404, detail="No existe solicitud de baja para este evento.")

        eliminacion.motivo_eliminacion += " | [✅ APROBADO POR ADMIN]"
        eliminacion.estado_solicitud = 'aprobada'
        eliminacion_crud.cancelar_evento(db, id_evento)
        EliminacionService._notificar_inscritos(
            db=db, evento=evento,
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
        evento = db.query(Evento).filter(Evento.id_evento == id_evento).first()
        if not evento:
            raise HTTPException(status_code=404, detail="Evento no encontrado")

        eliminacion = eliminacion_crud.obtener_registro_eliminacion(db, id_evento)
        if not eliminacion:
            raise HTTPException(status_code=404, detail="No existe solicitud de baja para este evento.")

        eliminacion_crud.rechazar_registro_eliminacion(db, id_evento)
        db.commit()

        return {
            "mensaje": "Solicitud de baja rechazada. El evento continúa publicado.",
            "id_evento": id_evento,
            "estado_actual": "Publicado"
        }

    # ========================================================================
    # OBTENER EVENTOS FINALIZADOS
    # ========================================================================
    @staticmethod
    def obtener_eventos_finalizados(db: Session) -> list:
        hoy = date.today()
        return db.query(Evento).filter(
            Evento.fecha_evento < hoy,
            Evento.id_estado.in_([ID_ESTADO_PUBLICADO, ID_ESTADO_FINALIZADO])
        ).all()

    # ========================================================================
    # RESTAURAR EVENTO CANCELADO
    # ========================================================================
    @staticmethod
    def restaurar_evento_cancelado(db: Session, id_evento: int, id_admin: int) -> dict:
        evento = db.query(Evento).filter(Evento.id_evento == id_evento).first()
        if not evento:
            raise HTTPException(status_code=404, detail="Evento no encontrado")

        if evento.id_estado != ID_ESTADO_CANCELADO:
            raise HTTPException(status_code=400, detail="Solo se pueden restaurar eventos cancelados (estado 5).")

        evento.id_estado = ID_ESTADO_PUBLICADO
        eliminacion_crud.eliminar_registro_eliminacion(db, id_evento)
        db.commit()

        return {
            "mensaje": "Evento restaurado correctamente.",
            "id_evento": id_evento,
            "estado_nuevo": "Publicado"
        }

    # ========================================================================
    # DEPURACIÓN (Hard Delete Lógico - Estado 6)
    # ========================================================================
    @staticmethod
    def depurar_evento(db: Session, evento_id: int, motivo: str, id_admin: int) -> dict:
        evento = db.query(Evento).filter(Evento.id_evento == evento_id).first()
        if not evento:
            raise HTTPException(status_code=404, detail="Evento no encontrado")

        if evento.id_estado not in [ID_ESTADO_FINALIZADO, ID_ESTADO_CANCELADO]:
            raise HTTPException(
                status_code=400,
                detail="Solo se pueden depurar eventos finalizados (estado 4) o cancelados (estado 5)."
            )

        eliminacion_existente = eliminacion_crud.obtener_registro_eliminacion(db, evento_id)
        if eliminacion_existente:
            eliminacion_existente.motivo_eliminacion += f" | [DEPURADO: {motivo}]"
        else:
            eliminacion_crud.crear_registro_eliminacion(
                db=db, id_evento=evento_id, motivo=motivo,
                id_usuario=id_admin, prefijo="[DEPURACIÓN ADMIN]"
            )

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
        Notifica a todos los inscritos que el evento fue cancelado (Consola + Email).
        """
        # 1. Buscamos las reservas
        reservas = db.query(ReservaEvento).filter(
            ReservaEvento.id_evento == evento.id_evento
        ).all()
        
        if not reservas:
            print(f"[INFO] Evento '{evento.nombre_evento}' no tiene inscripciones.")
            eliminacion_crud.marcar_notificacion_enviada(db, id_eliminacion)
            return
        
        # 2. Encabezado en consola
        print(f"\n{'='*70}")
        print(f"[NOTIFICACIONES] Enviando a {len(reservas)} participantes...")
        print(f"{'='*70}")
        
        # 3. Datos del organizador para el log
        organizador = db.query(Usuario).filter(
            Usuario.id_usuario == evento.id_usuario
        ).first()
        
        contacto = organizador.email if organizador else "soporte@wakeupbikes.com"

        count = 0
        for reserva in reservas:
            # Buscamos al participante
            participante = db.query(Usuario).filter(
                Usuario.id_usuario == reserva.id_usuario
            ).first()
            
            if participante and participante.email:
                # --- AQUÍ MANDAMOS EL MAIL REAL ---
                enviado = enviar_correo_cancelacion_evento(
                    email_destino=participante.email,
                    nombre_evento=evento.nombre_evento,
                    motivo=motivo
                )
                
                # --- MANTENEMOS TUS PRINTS DE LOG ---
                if enviado:
                    print(f"  ✉️  → {participante.email} [ENVIADO]")
                    count += 1
                else:
                    print(f"  ❌  → {participante.email} [ERROR EN ENVÍO]")
                
                print(f"     📧 Asunto: EVENTO CANCELADO - {evento.nombre_evento}")
                print(f"     📝 Motivo: {motivo}")
                print(f"     📞 Contacto: {contacto}")
                print(f"     {'-'*60}")

                count += 1
        
        # 4. Finalizamos proceso
        eliminacion_crud.marcar_notificacion_enviada(db, id_eliminacion)
        print(f"{'='*70}")
        print(f"[✅ OK] {count} notificaciones enviadas por email")
        print(f"{'='*70}\n")
    # ========================================================================
    # CONSULTAS
    # ========================================================================
    @staticmethod
    def obtener_bajas_pendientes(db: Session) -> list:
        return eliminacion_crud.obtener_bajas_pendientes(db)

    @staticmethod
    def obtener_historial(db: Session) -> list:
        return eliminacion_crud.obtener_historial_eliminaciones(db)

    @staticmethod
    def obtener_mis_solicitudes_eliminacion(db: Session, id_usuario: int):
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
            Evento.id_estado == ID_ESTADO_PUBLICADO,
            EliminacionEvento.estado_solicitud == 'pendiente'
        ).all()

        return [
            {
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
            }
            for sol in solicitudes
        ]