from typing import Counter
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from app.models.auth_models import Usuario
from app.models.evento_solicitud_models import EstadoSolicitud, SolicitudPublicacion
from app.models.registro_models import Evento, TipoEvento, NivelDificultad 
from app.models.inscripcion_models import ReservaEvento, EstadoReserva

class ReporteService:

    @staticmethod
    def _get_mis_estadisticas(db: Session, id_usuario: int):
        """Calcula estadísticas personales para cualquier rol"""
        total = db.query(func.count(Evento.id_evento))\
                  .filter(Evento.id_usuario == id_usuario).scalar()
        
        res_estados = db.query(Evento.id_estado, func.count(Evento.id_evento))\
                        .filter(Evento.id_usuario == id_usuario)\
                        .group_by(Evento.id_estado).all()
        por_estado = [{"estado": e, "cantidad": c} for e, c in res_estados]

        return {
            "mis_eventos_total": total,
            "mis_eventos_por_estado": por_estado
        }

    @staticmethod
    def _limpiar_ubicacion(ubicacion_completa: str) -> str:
        if not ubicacion_completa:
            return "Sin definir"
        
        partes = [p.strip() for p in ubicacion_completa.split(',')]
        
        for parte in partes:
            if "Municipio de" in parte:
                return parte.replace("Municipio de", "").strip()
        
        for parte in partes:
            if "Departamento" in parte:
                return parte.strip()

        if len(partes) >= 3:
            return partes[-3] 
            
        return partes[0]

    @staticmethod
    def _extraer_provincia(ubicacion_completa: str) -> str:
        if not ubicacion_completa:
            return "Sin Provincia"
        
        partes = [p.strip() for p in ubicacion_completa.split(',')]
        
        for parte in partes:
            if "Provincia de" in parte:
                return parte.replace("Provincia de", "").strip()
            if "Province of" in parte:
                return parte.replace("Province of", "").strip()
        
        if len(partes) >= 3:
            provincia_candidata = partes[-3]
            if not provincia_candidata.isdigit() and provincia_candidata.lower() != "argentina":
                return provincia_candidata
        
        if len(partes) >= 2:
            return partes[-2]
        
        return "Sin Provincia"

    @staticmethod
    def _extraer_localidad(ubicacion_completa: str) -> str:
        return ReporteService._limpiar_ubicacion(ubicacion_completa)

    @staticmethod
    def reportes_admin(db: Session, anio: int = None, mes: int = None):
        filtros = []
        if anio:
            filtros.append(func.extract("year", Evento.fecha_evento) == anio)
        if mes:
            filtros.append(func.extract("month", Evento.fecha_evento) == mes)

        total_eventos = db.query(func.count(Evento.id_evento)).filter(*filtros).scalar()

        resultados_estado = db.query(Evento.id_estado, func.count(Evento.id_evento)).filter(*filtros).group_by(Evento.id_estado).all()
        eventos_por_estado = [{"estado": estado, "cantidad": cantidad} for estado, cantidad in resultados_estado]

        resultados_usuario = db.query(Evento.id_usuario, func.count(Evento.id_evento)).filter(*filtros).group_by(Evento.id_usuario).all()
        eventos_por_usuario = [{"usuario": usuario, "cantidad": cantidad} for usuario, cantidad in resultados_usuario]

        resultados_mes = db.query(
            func.extract("year", Evento.fecha_evento).label("anio"),
            func.extract("month", Evento.fecha_evento).label("mes"),
            func.count(Evento.id_evento)
        ).group_by("anio", "mes").all()
        eventos_por_mes = [{"anio": int(anio), "mes": int(mes), "cantidad": cantidad} for anio, mes, cantidad in resultados_mes]

        resultados_tipo = (
            db.query(TipoEvento.nombre, func.count(Evento.id_evento))
            .join(TipoEvento, Evento.id_tipo == TipoEvento.id_tipo)
            .filter(*filtros)
            .group_by(TipoEvento.nombre).all()
        )
        eventos_por_tipo = [{"tipo": nombre, "cantidad": cantidad} for nombre, cantidad in resultados_tipo]

        resultados_dificultad = (
            db.query(NivelDificultad.nombre, func.count(Evento.id_evento))
            .join(NivelDificultad, Evento.id_dificultad == NivelDificultad.id_dificultad)
            .filter(*filtros)
            .group_by(NivelDificultad.nombre).all()
        )
        eventos_por_dificultad = [{"dificultad": nombre, "cantidad": cantidad} for nombre, cantidad in resultados_dificultad]

        usuarios_total = db.query(func.count(Usuario.id_usuario)).scalar()
        resultados_roles = db.query(Usuario.id_rol, func.count(Usuario.id_usuario)).group_by(Usuario.id_rol).all()
        usuarios_por_rol = [{"rol": rol, "cantidad": cantidad} for rol, cantidad in resultados_roles]

        ubicaciones_crudas = db.query(Evento.ubicacion).filter(*filtros).all()
        
        lista_lugares_limpios = [
            ReporteService._limpiar_ubicacion(u[0]) for u in ubicaciones_crudas if u[0]
        ]

        conteo = Counter(lista_lugares_limpios)

        eventos_por_ubicacion = [
            {"ubicacion": lugar, "cantidad": cantidad}
            for lugar, cantidad in conteo.most_common(10)
        ]

        return {
            "total_eventos": total_eventos,
            "eventos_por_tipo": eventos_por_tipo,
            "eventos_por_dificultad": eventos_por_dificultad,
            "eventos_por_estado": eventos_por_estado,
            "eventos_por_usuario": eventos_por_usuario,
            "eventos_por_mes": eventos_por_mes,
            "usuarios_total": usuarios_total,
            "usuarios_por_rol": usuarios_por_rol,
            "eventos_por_ubicacion": eventos_por_ubicacion
        }

    @staticmethod
    def reportes_supervisor(db: Session, id_usuario: int, anio: int = None, mes: int = None):
        filtros = []
        if anio:
            filtros.append(func.extract("year", Evento.fecha_evento) == anio)
        if mes:
            filtros.append(func.extract("month", Evento.fecha_evento) == mes)

        resultados_tipo = (
            db.query(TipoEvento.nombre, func.count(Evento.id_evento))
            .join(TipoEvento, Evento.id_tipo == TipoEvento.id_tipo)
            .filter(*filtros)
            .group_by(TipoEvento.nombre).all()
        )
        eventos_por_tipo = [{"tipo": nombre, "cantidad": cantidad} for nombre, cantidad in resultados_tipo]

        resultados_dificultad = (
            db.query(NivelDificultad.nombre, func.count(Evento.id_evento))
            .join(NivelDificultad, Evento.id_dificultad == NivelDificultad.id_dificultad)
            .filter(*filtros)
            .group_by(NivelDificultad.nombre).all()
        )
        eventos_por_dificultad = [{"dificultad": nombre, "cantidad": cantidad} for nombre, cantidad in resultados_dificultad]

        resultados_estado = db.query(Evento.id_estado, func.count(Evento.id_evento)).filter(*filtros).group_by(Evento.id_estado).all()
        eventos_por_estado = [{"estado": estado, "cantidad": cantidad} for estado, cantidad in resultados_estado]

        resultados_mes = db.query(
            func.extract("year", Evento.fecha_evento).label("anio"),
            func.extract("month", Evento.fecha_evento).label("mes"),
            func.count(Evento.id_evento)
        ).group_by("anio", "mes").all()
        evolucion_mensual = [{"anio": int(anio), "mes": int(mes), "cantidad": cantidad} for anio, mes, cantidad in resultados_mes]

        resultados_solicitudes = (
            db.query(EstadoSolicitud.nombre, func.count(SolicitudPublicacion.id_solicitud))
            .join(SolicitudPublicacion, EstadoSolicitud.id_estado_solicitud == SolicitudPublicacion.id_estado_solicitud)
            .group_by(EstadoSolicitud.nombre).all()
        )
        solicitudes_externas = [{"estado": nombre, "cantidad": cantidad} for nombre, cantidad in resultados_solicitudes]

        return {
            "eventos_por_tipo": eventos_por_tipo,
            "eventos_por_dificultad": eventos_por_dificultad,
            "eventos_por_estado": eventos_por_estado,
            "evolucion_mensual": evolucion_mensual,
            "solicitudes_externas": solicitudes_externas
        }

    @staticmethod
    def reportes_organizacion_externa(db: Session, id_usuario: int):
        stats_base = ReporteService._get_mis_estadisticas(db, id_usuario)

        eventos_query = db.query(
            Evento.id_evento,
            Evento.nombre_evento,
            Evento.fecha_evento,
            Evento.fecha_creacion,
            Evento.id_estado,
            TipoEvento.nombre.label("tipo_nombre"),
            func.count(ReservaEvento.id_reserva).label("total_reservas")
        ).join(TipoEvento, Evento.id_tipo == TipoEvento.id_tipo)\
         .outerjoin(ReservaEvento, Evento.id_evento == ReservaEvento.id_evento)\
         .filter(Evento.id_usuario == id_usuario)\
         .group_by(Evento.id_evento, TipoEvento.nombre)\
         .order_by(Evento.fecha_evento.desc()).all()

        lista_eventos = [
            {
                "id": e.id_evento,
                "nombre": e.nombre_evento,
                "fecha": e.fecha_evento.strftime('%d/%m/%Y') if e.fecha_evento else "Sin fecha",
                "fecha_solicitud": e.fecha_creacion.strftime('%d/%m/%Y') if e.fecha_creacion else "Sin fecha",
                "fecha_creacion": e.fecha_creacion.strftime('%d/%m/%Y') if e.fecha_creacion else "Sin fecha",
                "fecha_evento": e.fecha_evento.strftime('%Y-%m-%d') if e.fecha_evento else "Sin fecha",
                "estado": e.id_estado,
                "tipo": e.tipo_nombre,
                "reservas": e.total_reservas
            } for e in eventos_query
        ]

        resultados_tipo = (
            db.query(
                TipoEvento.nombre, 
                func.count(ReservaEvento.id_reserva) 
            )
            .join(Evento, Evento.id_tipo == TipoEvento.id_tipo)
            .outerjoin(ReservaEvento, Evento.id_evento == ReservaEvento.id_evento)
            .filter(Evento.id_usuario == id_usuario)
            .group_by(TipoEvento.nombre).all()
        )

        rendimiento_tipo = [{"tipo": n, "cantidad": c} for n, c in resultados_tipo if c > 0]
        
        recaudacion_query = db.query(
            Evento.nombre_evento,
            Evento.fecha_evento,
            Evento.costo_participacion,
            func.count(ReservaEvento.id_reserva).label("cantidad_pagadas")
        ).join(ReservaEvento, Evento.id_evento == ReservaEvento.id_evento)\
         .filter(
             Evento.id_usuario == id_usuario,
             ReservaEvento.id_estado_reserva == 2
         )\
         .group_by(Evento.id_evento)\
         .all()

        detalle_recaudacion = []
        total_recaudado = 0
        
        for rec in recaudacion_query:
            monto_evento = float(rec.costo_participacion or 0) * rec.cantidad_pagadas
            total_recaudado += monto_evento
            
            detalle_recaudacion.append({
                "nombre_evento": rec.nombre_evento,
                "fecha_evento": rec.fecha_evento.strftime('%Y-%m-%d') if rec.fecha_evento else "Sin fecha",
                "monto": monto_evento
            })

        eventos_globales = db.query(
            Evento.id_evento,
            Evento.nombre_evento,
            Evento.ubicacion,
            Evento.fecha_evento,
            Evento.distancia_km,
            TipoEvento.nombre.label("tipo_nombre")
        ).join(TipoEvento, Evento.id_tipo == TipoEvento.id_tipo)\
         .filter(Evento.id_estado.in_([3, 4]))\
         .all()

        tendencias_dict = {}
        
        for evento in eventos_globales:
            provincia = ReporteService._extraer_provincia(evento.ubicacion)
            localidad = ReporteService._extraer_localidad(evento.ubicacion)
            
            if provincia not in tendencias_dict:
                tendencias_dict[provincia] = {
                    "provincia": provincia,
                    "total_eventos": 0,
                    "localidades": {}
                }
            
            if localidad not in tendencias_dict[provincia]["localidades"]:
                tendencias_dict[provincia]["localidades"][localidad] = {
                    "localidad": localidad,
                    "cantidad": 0,
                    "eventos": []
                }
            
            tendencias_dict[provincia]["localidades"][localidad]["eventos"].append({
                "nombre": evento.nombre_evento,
                "tipo": evento.tipo_nombre,
                "distancia_km": float(evento.distancia_km or 0),
                "fecha_evento": evento.fecha_evento.strftime('%Y-%m-%d') if evento.fecha_evento else "Sin fecha"
            })
            
            tendencias_dict[provincia]["localidades"][localidad]["cantidad"] += 1
            tendencias_dict[provincia]["total_eventos"] += 1
        
        tendencias_ubicacion = []
        for provincia_data in tendencias_dict.values():
            provincia_data["localidades"] = list(provincia_data["localidades"].values())
            tendencias_ubicacion.append(provincia_data)
        
        tendencias_ubicacion.sort(key=lambda x: x["total_eventos"], reverse=True)
        tendencias_ubicacion = tendencias_ubicacion[:10]
        
        return {
            "mis_eventos_total": stats_base["mis_eventos_total"],
            "mis_eventos_por_estado": stats_base["mis_eventos_por_estado"],
            "lista_eventos_detallada": lista_eventos,
            "rendimiento_por_tipo": rendimiento_tipo,
            "total_reservas_recibidas": sum(e["reservas"] for e in lista_eventos),
            "recaudacion_total": round(total_recaudado, 2),
            "detalle_recaudacion": detalle_recaudacion,
            "tendencias_ubicacion": tendencias_ubicacion
        }

    @staticmethod
    def reportes_cliente(db: Session, id_usuario: int):
        return {
            "mis_inscripciones": "Aquí iría la lógica de inscripciones del cliente",
            "mis_notificaciones": "Aquí iría la lógica de notificaciones del cliente"
        }