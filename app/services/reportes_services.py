from collections import Counter
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from app.models.auth_models import Usuario
from app.models.evento_solicitud_models import EstadoSolicitud, SolicitudPublicacion
from app.models.registro_models import Evento, TipoEvento, NivelDificultad
from app.models.inscripcion_models import EstadoReserva, ReservaEvento


class ReporteService:

    @staticmethod
    def _get_mis_estadisticas(db: Session, id_usuario: int):
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
    def _extraer_provincia(ubicacion_completa: str) -> str:
        if not ubicacion_completa:
            return "Sin Provincia"
        partes = [p.strip() for p in ubicacion_completa.split(',')]
        for parte in partes:
            if "Provincia de" in parte:
                return parte.replace("Provincia de", "").strip().title()
            if "Province of" in parte:
                return parte.replace("Province of", "").strip().title()
        if len(partes) >= 3:
            candidata = partes[-3].strip()
            if not candidata.isdigit() and candidata.lower() != "argentina":
                return candidata.title()
        if len(partes) >= 2:
            return partes[-2].strip().title()
        return "Sin Provincia"

    @staticmethod
    def _extraer_localidad(ubicacion_completa: str) -> str:
        if not ubicacion_completa:
            return "Sin Localidad"
        partes = [p.strip() for p in ubicacion_completa.split(',')]
        for parte in partes:
            if "Municipio de" in parte:
                return parte.replace("Municipio de", "").strip().title()
        for parte in partes:
            if "Departamento" in parte:
                return parte.strip().title()
        if len(partes) >= 3:
            return partes[-3].strip().title()
        return partes[0].strip().title()

    @staticmethod
    def reportes_admin(db: Session, anio: int = None, mes: int = None):
        filtros = []
        if anio:
            filtros.append(func.extract("year", Evento.fecha_evento) == anio)
        if mes:
            filtros.append(func.extract("month", Evento.fecha_evento) == mes)

        total_eventos = db.query(func.count(Evento.id_evento)).filter(*filtros).scalar()

        resultados_estado = db.query(Evento.id_estado, func.count(Evento.id_evento))\
            .filter(*filtros).group_by(Evento.id_estado).all()
        eventos_por_estado = [{"estado": e, "cantidad": c} for e, c in resultados_estado]

        resultados_usuario = db.query(Evento.id_usuario, func.count(Evento.id_evento))\
            .filter(*filtros).group_by(Evento.id_usuario).all()
        eventos_por_usuario = [{"usuario": u, "cantidad": c} for u, c in resultados_usuario]

        resultados_mes = db.query(
            func.extract("year", Evento.fecha_evento).label("anio"),
            func.extract("month", Evento.fecha_evento).label("mes"),
            func.count(Evento.id_evento)
        ).filter(*filtros).group_by("anio", "mes").all()
        eventos_por_mes = [{"anio": int(a), "mes": int(m), "cantidad": c} for a, m, c in resultados_mes]

        resultados_tipo = (
            db.query(TipoEvento.nombre, func.count(Evento.id_evento))
            .join(TipoEvento, Evento.id_tipo == TipoEvento.id_tipo)
            .filter(*filtros).group_by(TipoEvento.nombre).all()
        )
        eventos_por_tipo = [{"tipo": n, "cantidad": c} for n, c in resultados_tipo]

        resultados_dificultad = (
            db.query(NivelDificultad.nombre, func.count(Evento.id_evento))
            .join(NivelDificultad, Evento.id_dificultad == NivelDificultad.id_dificultad)
            .filter(*filtros).group_by(NivelDificultad.nombre).all()
        )
        eventos_por_dificultad = [{"dificultad": n, "cantidad": c} for n, c in resultados_dificultad]

        usuarios_total = db.query(func.count(Usuario.id_usuario)).scalar()
        resultados_roles = db.query(Usuario.id_rol, func.count(Usuario.id_usuario))\
            .group_by(Usuario.id_rol).all()
        usuarios_por_rol = [{"rol": r, "cantidad": c} for r, c in resultados_roles]

        ubicaciones_crudas = db.query(Evento.ubicacion).filter(*filtros).all()
        lista_lugares = [ReporteService._extraer_localidad(u[0]) for u in ubicaciones_crudas if u[0]]
        conteo = Counter(lista_lugares)
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
            .filter(*filtros).group_by(TipoEvento.nombre).all()
        )
        eventos_por_tipo = [{"tipo": n, "cantidad": c} for n, c in resultados_tipo]

        resultados_dificultad = (
            db.query(NivelDificultad.nombre, func.count(Evento.id_evento))
            .join(NivelDificultad, Evento.id_dificultad == NivelDificultad.id_dificultad)
            .filter(*filtros).group_by(NivelDificultad.nombre).all()
        )
        eventos_por_dificultad = [{"dificultad": n, "cantidad": c} for n, c in resultados_dificultad]

        resultados_estado = db.query(Evento.id_estado, func.count(Evento.id_evento))\
            .filter(*filtros).group_by(Evento.id_estado).all()
        eventos_por_estado = [{"estado": e, "cantidad": c} for e, c in resultados_estado]

        resultados_mes = db.query(
            func.extract("year", Evento.fecha_evento).label("anio"),
            func.extract("month", Evento.fecha_evento).label("mes"),
            func.count(Evento.id_evento)
        ).filter(*filtros).group_by("anio", "mes").all()
        evolucion_mensual = [{"anio": int(a), "mes": int(m), "cantidad": c} for a, m, c in resultados_mes]

        resultados_solicitudes = (
            db.query(EstadoSolicitud.nombre, func.count(SolicitudPublicacion.id_solicitud))
            .join(SolicitudPublicacion,
                  EstadoSolicitud.id_estado_solicitud == SolicitudPublicacion.id_estado_solicitud)
            .group_by(EstadoSolicitud.nombre).all()
        )
        solicitudes_externas = [{"estado": n, "cantidad": c} for n, c in resultados_solicitudes]

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

        # ── Lista detallada de todos mis eventos ──────────────────────────────
        eventos_query = (
            db.query(
                Evento.id_evento,
                Evento.nombre_evento,
                Evento.fecha_evento,
                Evento.fecha_creacion,
                Evento.id_estado,
                Evento.costo_participacion,
                Evento.cupo_maximo,
                Evento.distancia_km,
                Evento.descripcion,
                Evento.ubicacion,
                TipoEvento.nombre.label("tipo_nombre"),
                func.count(ReservaEvento.id_reserva).label("total_reservas"),
            )
            .join(TipoEvento, Evento.id_tipo == TipoEvento.id_tipo)
            .outerjoin(ReservaEvento, Evento.id_evento == ReservaEvento.id_evento)
            .filter(Evento.id_usuario == id_usuario)
            .group_by(Evento.id_evento, TipoEvento.nombre)
            .order_by(Evento.fecha_evento.desc())
            .all()
        )

        lista_eventos = [
            {
                "id": e.id_evento,
                "nombre": e.nombre_evento,
                "fecha": e.fecha_evento.strftime('%d/%m/%Y') if e.fecha_evento else "Sin fecha",
                "fecha_solicitud": e.fecha_creacion.strftime('%d/%m/%Y') if e.fecha_creacion else "Sin fecha",
                "fecha_creacion": e.fecha_creacion.strftime('%d/%m/%Y') if e.fecha_creacion else "Sin fecha",
                "fecha_evento": e.fecha_evento.strftime('%Y-%m-%d') if e.fecha_evento else "Sin fecha",
                "estado": e.id_estado,
                "estado_evento": e.id_estado,
                "tipo": e.tipo_nombre,
                "reservas": e.total_reservas,
                "cupo_maximo": e.cupo_maximo,
                "costo_participacion": float(e.costo_participacion or 0),
                "distancia_km": float(e.distancia_km or 0),
                "descripcion": e.descripcion or "",
                "ubicacion_completa": e.ubicacion or "",
            }
            for e in eventos_query
        ]

        # ── Popularidad por tipo (total inscriptos por categoría) ─────────────
        resultados_tipo = (
            db.query(TipoEvento.nombre, func.count(ReservaEvento.id_reserva))
            .join(Evento, Evento.id_tipo == TipoEvento.id_tipo)
            .outerjoin(ReservaEvento, Evento.id_evento == ReservaEvento.id_evento)
            .filter(Evento.id_usuario == id_usuario)
            .group_by(TipoEvento.nombre)
            .all()
        )
        rendimiento_tipo = [{"tipo": n, "cantidad": c} for n, c in resultados_tipo if c > 0]

        # ── Reservas confirmadas por evento (sub-query separada, sin CAST) ────
        #    Usamos case() de SQLAlchemy, que es compatible con todos los dialectos.
        confirmadas_subq = (
            db.query(
                ReservaEvento.id_evento,
                func.sum(
                    case((ReservaEvento.id_estado_reserva == 2, 1), else_=0)
                ).label("confirmadas"),
                func.count(ReservaEvento.id_reserva).label("total")
            )
            .join(Evento, ReservaEvento.id_evento == Evento.id_evento)
            .filter(Evento.id_usuario == id_usuario)
            .group_by(ReservaEvento.id_evento)
            .all()
        )
        confirmadas_map: dict = {row.id_evento: {"confirmadas": int(row.confirmadas or 0), "total": int(row.total or 0)} for row in confirmadas_subq}

        # ── Detalle de recaudación: TODOS los eventos (incluye gratuitos) ─────
        detalle_recaudacion = []
        total_recaudado = 0.0

        for e in eventos_query:
            costo = float(e.costo_participacion or 0)
            stats = confirmadas_map.get(e.id_evento, {"confirmadas": 0, "total": int(e.total_reservas or 0)})
            inscriptos_confirmados = stats["confirmadas"]
            inscriptos_count = stats["total"]
            monto_evento = costo * inscriptos_confirmados
            total_recaudado += monto_evento

            detalle_recaudacion.append({
                "id_evento": e.id_evento,
                "nombre_evento": e.nombre_evento,
                "fecha_evento": e.fecha_evento.strftime('%Y-%m-%d') if e.fecha_evento else "Sin fecha",
                "monto": round(monto_evento, 2),
                "monto_unitario": costo,
                "inscriptos_count": inscriptos_count,
                "inscriptos_confirmados": inscriptos_confirmados,
                "cupo_maximo": e.cupo_maximo,
                "estado_evento": e.id_estado,
                "tipo": e.tipo_nombre,
                "descripcion": e.descripcion or "",
                "ubicacion_completa": e.ubicacion or "",
                "distancia_km": float(e.distancia_km or 0),
            })

        # ── Tendencias globales por ubicación ─────────────────────────────────
        eventos_globales = (
            db.query(
                Evento.nombre_evento,
                Evento.ubicacion,
                Evento.fecha_evento,
                Evento.id_estado,
                Evento.distancia_km,
                TipoEvento.nombre.label("tipo_nombre"),
            )
            .join(TipoEvento, Evento.id_tipo == TipoEvento.id_tipo)
            .filter(Evento.id_estado.in_([3, 4]))
            .all()
        )

        tendencias_dict: dict = {}
        for evento in eventos_globales:
            # .strip().title() garantiza agrupación case-insensitive
            provincia = ReporteService._extraer_provincia(evento.ubicacion).strip().title()
            localidad = ReporteService._extraer_localidad(evento.ubicacion).strip().title()

            if provincia not in tendencias_dict:
                tendencias_dict[provincia] = {"provincia": provincia, "total_eventos": 0, "localidades": {}}

            if localidad not in tendencias_dict[provincia]["localidades"]:
                tendencias_dict[provincia]["localidades"][localidad] = {
                    "localidad": localidad, "cantidad": 0, "eventos": []
                }

            tendencias_dict[provincia]["localidades"][localidad]["eventos"].append({
                "nombre": evento.nombre_evento,
                "tipo": evento.tipo_nombre,
                "distancia_km": float(evento.distancia_km or 0),
                "fecha_evento": evento.fecha_evento.strftime('%Y-%m-%d') if evento.fecha_evento else "Sin fecha",
                "estado": evento.id_estado,
            })
            tendencias_dict[provincia]["localidades"][localidad]["cantidad"] += 1
            tendencias_dict[provincia]["total_eventos"] += 1

        tendencias_ubicacion = []
        for prov_data in tendencias_dict.values():
            prov_data["localidades"] = list(prov_data["localidades"].values())
            tendencias_ubicacion.append(prov_data)
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
            "tendencias_ubicacion": tendencias_ubicacion,
        }

    @staticmethod
    def reportes_cliente(db: Session, id_usuario: int):
        """
        REPORTES CLIENTE - Mis inscripciones y actividad
        """
        # Obtener todas las reservas del cliente
        reservas = db.query(
            ReservaEvento.id_reserva,
            ReservaEvento.id_estado_reserva,
            ReservaEvento.fecha_reserva,
            Evento.id_evento,
            Evento.nombre_evento,
            Evento.fecha_evento,
            Evento.costo_participacion,
            Evento.ubicacion,
            TipoEvento.nombre.label("tipo"),
            EstadoReserva.nombre.label("estado_reserva")
        ).join(Evento, ReservaEvento.id_evento == Evento.id_evento)\
         .join(TipoEvento, Evento.id_tipo == TipoEvento.id_tipo)\
         .join(EstadoReserva, ReservaEvento.id_estado_reserva == EstadoReserva.id_estado_reserva)\
         .filter(ReservaEvento.id_usuario == id_usuario)\
         .order_by(ReservaEvento.fecha_reserva.desc()).all()
        
        mis_inscripciones = [{
            "reserva_id": r.id_reserva,
            "evento_id": r.id_evento,
            "evento_nombre": r.nombre_evento,
            "fecha_evento": r.fecha_evento.strftime('%Y-%m-%d') if r.fecha_evento else None,
            "fecha_reserva": r.fecha_reserva.strftime('%Y-%m-%d') if r.fecha_reserva else None,
            "costo": float(r.costo_participacion or 0),
            "ubicacion": r.ubicacion,
            "tipo": r.tipo,
            "estado": r.estado_reserva,
            "estado_id": r.id_estado_reserva
        } for r in reservas]
        
        # Estadísticas
        total_inscripciones = len(mis_inscripciones)
        confirmadas = sum(1 for i in mis_inscripciones if i["estado_id"] == 2)
        pendientes = sum(1 for i in mis_inscripciones if i["estado_id"] == 1)
        canceladas = sum(1 for i in mis_inscripciones if i["estado_id"] == 3)
        
        total_gastado = sum(i["costo"] for i in mis_inscripciones if i["estado_id"] == 2)
        
        return {
            "mis_inscripciones": mis_inscripciones,
            "total_inscripciones": total_inscripciones,
            "confirmadas": confirmadas,
            "pendientes": pendientes,
            "canceladas": canceladas,
            "total_gastado": round(total_gastado, 2)
        }