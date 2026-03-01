import React, { useState } from "react";

interface SeccionOrganizadorExternoProps {
  usuarioRol: number;
  reporteData: any;
  // Fechas que vienen desde el filtro global en ReportesPage
  fechaInicio: string;
  fechaFin: string;
  // Estados y funciones para "Mis Solicitudes"
  estadoAbierto: number | null;
  setEstadoAbierto: (id: number | null) => void;
  sortedLista: (lista: any[]) => any[];
  getNombreEstado: (id: number) => string;
  handleSort: (key: string) => void;
  si: (key: string) => React.ReactNode;
  // Gráficos y Exportación
  renderGraficoTorta: (data: any[], dataKey: string, nameKey: string, tooltipLabel: string) => React.ReactNode;
  handleExportarCSV: (tipo: string) => void;
  // Filtros de Recaudación
  totalRecaudacionFiltrado: number;
  detalleRecaudacionFiltrado: any[];
  busquedaEvento: string;
  setBusquedaEvento: (val: string) => void;
  filtroEstadoRecaudacion: string;
  setFiltroEstadoRecaudacion: (val: any) => void;
  filtroTipoRecaudacion: string;
  setFiltroTipoRecaudacion: (val: string) => void;
  TIPOS_EVENTO: string[];
  // Tabla de Recaudación
  handleSortFin: (key: "nombre" | "fecha" | "monto" | "cupo" | "unitario") => void;  
  sif: (key: string) => React.ReactNode;
  setEventoDetalle: (item: any) => void;
}

export function SeccionOrganizadorExterno({
  usuarioRol,
  reporteData,
  fechaInicio,
  fechaFin,
  estadoAbierto,
  setEstadoAbierto,
  sortedLista,
  handleSort,
  si,
  renderGraficoTorta,
  handleExportarCSV,
  // Estas props vienen con los filtros de texto/estado aplicados desde el padre
  detalleRecaudacionFiltrado,
  busquedaEvento,
  setBusquedaEvento,
  filtroEstadoRecaudacion,
  setFiltroEstadoRecaudacion,
  filtroTipoRecaudacion,
  setFiltroTipoRecaudacion,
  handleSortFin,
  sif,
  setEventoDetalle,
}: SeccionOrganizadorExternoProps) {

  const [motivoModal, setMotivoModal] = useState<string | null>(null);

  if (usuarioRol > 3) return null;

  // 1. Extraemos los tipos de eventos ÚNICOS que realmente tenés creados para el select
  const eventosTotales = reporteData?.lista_eventos_detallada ?? [];
  const tiposDisponibles = Array.from(new Set(eventosTotales.map((e: any) => e.tipo))).filter(Boolean) as string[];

  // 2. APLICAMOS EL FILTRO DE FECHAS A LA RECAUDACIÓN ACÁ MISMO
  let detalleRecaudacionFinal = detalleRecaudacionFiltrado || [];
  
  if (fechaInicio) {
    detalleRecaudacionFinal = detalleRecaudacionFinal.filter(
      (e: any) => new Date(e.fecha_evento) >= new Date(fechaInicio)
    );
  }
  if (fechaFin) {
    detalleRecaudacionFinal = detalleRecaudacionFinal.filter(
      (e: any) => new Date(e.fecha_evento) <= new Date(fechaFin)
    );
  }

  // 3. Recalculamos el total con la lista final
  const totalRecaudacionFinal = detalleRecaudacionFinal.reduce(
    (acc, item) => acc + (item.monto || 0), 0
  );

  return (
    <div>

      {/* ── MÉTRICAS GLOBALES SUPERIORES ───────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px", marginBottom: "1em", marginTop: "1em" }}>
        {[
          { label: "Recaudación total sistema", value: `$${(reporteData?.recaudacion_total ?? 0).toLocaleString("es-AR")}`, color: "#4ade80" },
          { label: "Total reservas recibidas", value: String(reporteData?.total_reservas_recibidas ?? 0), color: "#60a5fa" },
          { label: "Mis eventos creados", value: String(reporteData?.mis_eventos_total ?? 0), color: "#fbbf24" },
        ].map((card) => (
          <div key={card.label} style={{ background: "#252525", borderRadius: "8px", padding: "20px" }}>
            <p style={{ margin: 0, color: "#888", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {card.label}
            </p>
            <p style={{ margin: "6px 0 0", color: card.color, fontWeight: "bold", fontSize: "2rem" }}>
              {card.value}
            </p>
          </div>
        ))}
      </div>
        
      {/* ── SECCIÓN RECAUDACIÓN (A LO ANCHO) ───────────── */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        
        {/* Tarjeta de Resumen y Filtros */}
        <div className="grafico-card grafico-card--wide">
          <div className="grafico-card__header">
            <h3>💰 Recaudación Total de mis eventos</h3>
            <p style={{ fontSize: "14px", color: "#d7d7d7" }}>
              Ingresos generados por inscripciones pagas (eventos gratuitos no contabilizan)
            </p>
          </div>
          
          <div className="grafico-card__body">
            {/* Usamos el total recalculado acá */}
            <div style={{ textAlign: "center", marginBottom: "25px" }}>
              <span style={{ fontSize: "3.5rem", fontWeight: "bold", color: "#4ade80" }}>
                ${totalRecaudacionFinal.toLocaleString("es-AR")}
              </span>
              <p style={{ color: "#ccc", marginTop: "8px" }}>
                {detalleRecaudacionFinal.length} eventos en la vista
              </p>
            </div>

            {/* Filtros horizontales */}
            <div style={{ 
              display: "flex", gap: "15px", flexWrap: "wrap", justifyContent: "center",
              borderTop: "1px solid #334155", paddingTop: "20px"
            }}>
              <input
                type="text"
                placeholder="🔍 Buscar evento..."
                value={busquedaEvento}
                onChange={(e) => setBusquedaEvento(e.target.value)}
                style={{
                  flex: "1 1 250px", padding: "10px", background: "#0d0d0d", 
                  border: "1px solid #4ade80", borderRadius: "6px", color: "#fff", fontSize: "0.9rem",
                }}
              />
              <select
                value={filtroEstadoRecaudacion}
                onChange={(e) => setFiltroEstadoRecaudacion(e.target.value)}
                style={{
                  flex: "1 1 200px", padding: "10px", background: "#0d0d0d", 
                  border: "1px solid #4ade80", borderRadius: "6px", color: "#fff", fontSize: "0.9rem", cursor: "pointer",
                }}
              >
                <option value="todos">📊 Todos los Eventos</option>
                <option value="activos">🟢 Solo Activos (Publicados)</option>
                <option value="pasados">🔵 Solo Finalizados</option>
              </select>

              <select
                value={filtroTipoRecaudacion}
                onChange={(e) => setFiltroTipoRecaudacion(e.target.value)}
                style={{
                  flex: "1 1 200px", padding: "10px", background: "#0d0d0d", 
                  border: "1px solid #4ade80", borderRadius: "6px", color: "#fff", fontSize: "0.9rem", cursor: "pointer",
                }}
              >
                <option value="">🚴 Todos los Tipos</option>
                {tiposDisponibles.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Tarjeta Tabla Detalle */}
        <div className="grafico-card grafico-card--wide">
          <div className="grafico-card__header">
            <h3>📊 Detalle de Recaudación por Evento</h3>
            <button
              data-html2canvas-ignore="true"
              onClick={() => handleExportarCSV("detalle_recaudacion")}
              className="btn-export"
            >
              📥 Exportar CSV
            </button>
          </div>
          <div className="grafico-card__body">
            {/* Usamos el detalle recalculado acá */}
            {detalleRecaudacionFinal.length === 0 ? (
              <p className="no-data">Sin eventos para mostrar con los filtros actuales.</p>
            ) : (
              <div className="table-responsive" style={{ maxHeight: "450px", overflowY: "auto", overflowX: "auto" }}>
                <table className="tabla-reportes-custom" style={{ width: "100%", borderCollapse: "collapse", position: "relative" }}>
                  <thead style={{ position: "sticky", top: 0, zIndex: 10, backgroundColor: "#1e1e1e", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }}>
                    <tr>
                      <th style={{ cursor: "pointer", padding: "12px 8px" }} onClick={() => handleSortFin("nombre")}>
                        Evento{sif("nombre")}
                      </th>
                      <th style={{ cursor: "pointer", padding: "12px 8px" }} onClick={() => handleSortFin("fecha")}>
                        Fecha{sif("fecha")}
                      </th>
                      <th style={{ padding: "12px 8px" }}>Tipo</th>
                      <th style={{ textAlign: "center", cursor: "pointer", padding: "12px 8px" }} onClick={() => handleSortFin("cupo")}>
                        Cupo{sif("cupo")}
                      </th>
                      <th style={{ textAlign: "right", cursor: "pointer", padding: "12px 8px" }} onClick={() => handleSortFin("unitario")}>
                        Valor Unit.{sif("unitario")}
                      </th>
                      <th style={{ textAlign: "right", cursor: "pointer", padding: "12px 8px" }} onClick={() => handleSortFin("monto")}>
                        Monto Total{sif("monto")}
                      </th>
                      <th style={{ textAlign: "center", padding: "12px 8px" }}>Acción</th>
                    </tr>
                  </thead>
                  
                {/* CUERPO DE LA TABLA */}
                  <tbody>
                    {detalleRecaudacionFinal.map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: "bold" }}>{item.nombre_evento}</td>
                        <td>{new Date(item.fecha_evento).toLocaleDateString("es-AR")}</td>
                        <td><span className="badge-tipo">{item.tipo}</span></td>
                        <td style={{ textAlign: "center" }}>
                          <div className="reservas-indicator">
                            {item.inscriptos_count}
                            {item.cupo_maximo ? ` / ${item.cupo_maximo}` : ""}
                          </div>
                        </td>
                        <td style={{ textAlign: "right", color: "#ccc" }}>
                          {item.monto_unitario === 0
                            ? "Gratis"
                            : `$${item.monto_unitario.toLocaleString("es-AR")}`}
                        </td>
                        <td style={{ textAlign: "right", color: "#4ade80", fontWeight: "bold" }}>
                          ${item.monto.toLocaleString("es-AR")}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            onClick={() => setEventoDetalle(item)}
                            style={{
                              padding: "5px 12px", background: "transparent",
                              border: "1px solid #4ade80", borderRadius: "6px",
                              color: "#4ade80", cursor: "pointer",
                              fontSize: "0.8rem", fontWeight: "bold", whiteSpace: "nowrap",
                            }}
                          >
                            Ver más →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  
                  {/* PIE DE TABLA FIJO */}
                  <tfoot style={{ position: "sticky", bottom: 0, zIndex: 10, backgroundColor: "#1e1e1e", boxShadow: "0 -2px 4px rgba(0,0,0,0.2)" }}>
                    <tr style={{ borderTop: "2px solid #4ade80" }}>
                      <td colSpan={5} style={{ textAlign: "right", fontWeight: "bold", fontSize: "1.1rem", padding: "12px 8px" }}>
                        TOTAL FILTRADO:
                      </td>
                      <td style={{ textAlign: "right", color: "#4ade80", fontWeight: "bold", fontSize: "1.2rem", padding: "12px 8px" }}>
                        ${totalRecaudacionFinal.toLocaleString("es-AR")}
                      </td>
                      <td style={{ padding: "12px 8px" }} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Inscriptos por Categoría ───────────── */}
      {(() => {
        // 1. Agarramos la lista de eventos detallada para poder filtrar por fecha
        let eventosParaTorta = reporteData?.lista_eventos_detallada ?? [];

        // 2. Aplicamos el mismo filtro de fechas global
        if (fechaInicio) {
          eventosParaTorta = eventosParaTorta.filter((e: any) => new Date(e.fecha_evento) >= new Date(fechaInicio));
        }
        if (fechaFin) {
          eventosParaTorta = eventosParaTorta.filter((e: any) => new Date(e.fecha_evento) <= new Date(fechaFin));
        }

        const agrupadoPorCategoria = eventosParaTorta.reduce((acc: any, evt: any) => {
          const tipo = evt.tipo || "Sin categoría";
          const inscriptos = evt.reservas || 0;
          if (!acc[tipo]) acc[tipo] = 0;
          acc[tipo] += inscriptos;
          return acc;
        }, {});

        const datosTortaFiltrados = Object.keys(agrupadoPorCategoria)
          .map(tipo => ({ tipo, cantidad: agrupadoPorCategoria[tipo] }))
          .filter(item => item.cantidad > 0)// Ocultamos categorías con 0 inscriptos
          .sort((a, b) => b.cantidad - a.cantidad);

        const categoriaGanadora = datosTortaFiltrados.length > 0 ? datosTortaFiltrados[0].tipo : null;

        return (
          <div className="grafico-card grafico-card--wide" style={{ marginTop: "24px" }}>
            <div className="grafico-card__header">
              <h3>📈 Distribución de Inscriptos por Categoría</h3>
              <p style={{ fontSize: "13px", color: "#d7d7d7" }}>
                Cantidad total de inscriptos según el tipo de evento que organizás.
              </p>
              <button data-html2canvas-ignore="true" onClick={() => handleExportarCSV("rendimiento_categorias")} className="btn-export">
                📥 CSV
              </button>
            </div>
            <div className="grafico-card__body">
              {renderGraficoTorta(datosTortaFiltrados, "tipo", "cantidad", "Inscriptos")}
              <div className="insight-text" style={{ marginTop: "20px" }}>
                {categoriaGanadora ? (
                  <>💡 Tu categoría con más inscriptos es <strong>{categoriaGanadora}</strong>.</>
                ) : (
                  "💡 No hay inscriptos en este rango de fechas para determinar una tendencia."
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Acordeón: mis solicitudes por estado */}
      {(reporteData?.lista_eventos_detallada ?? []).length > 0 && (
        <div className="grafico-card grafico-card--wide" id="lista_eventos_detallada" style={{ marginTop: "24px" }}>
          <div className="grafico-card__header">
            <h3>📋 Mis Solicitudes de eventos por estado</h3>
          </div>
          <div className="grafico-card__body">
            {[
              { idGrupo: 2, nombre: "PENDIENTES", estados: [2], color: "#fbbf24" },
              { idGrupo: 3, nombre: "PUBLICADOS", estados: [3], color: "#4ade80" },
              { idGrupo: 4, nombre: "FINALIZADOS", estados: [4], color: "#3498db" },
              { idGrupo: 5, nombre: "ELIMINADOS", estados: [5], color: "#e74c3c" }
            ].map((grupo) => {
              
              // 1. Filtramos por estado
              let eventosDelGrupo = (reporteData?.lista_eventos_detallada ?? []).filter((e: any) => 
                grupo.estados.includes(e.estado)
              );

              // 2. Filtramos por las fechas que vienen como props
              if (fechaInicio) {
                eventosDelGrupo = eventosDelGrupo.filter((e: any) => new Date(e.fecha_evento) >= new Date(fechaInicio));
              }
              if (fechaFin) {
                eventosDelGrupo = eventosDelGrupo.filter((e: any) => new Date(e.fecha_evento) <= new Date(fechaFin));
              }

              const items = sortedLista(eventosDelGrupo);
              if (!items.length) return null;
              
              const isOpen = estadoAbierto === grupo.idGrupo;
              const bc = grupo.color;

              return (
                <div key={grupo.idGrupo} style={{ marginBottom: "10px", border: "1px solid #333", borderRadius: "8px", overflow: "hidden" }}>
                  
                  {/* Cabecera del Acordeón */}
                  <div
                    onClick={() => setEstadoAbierto(isOpen ? null : grupo.idGrupo)}
                    style={{
                      padding: "15px", backgroundColor: "#252525", display: "flex", justifyContent: "space-between",
                      alignItems: "center", cursor: "pointer", borderLeft: `4px solid ${bc}`,
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontWeight: "bold", fontSize: "1rem" }}>
                        {grupo.nombre} ({items.length})
                      </span>
                    </div>
                    <span style={{ transition: "transform 0.3s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                      ▼
                    </span>
                  </div>

                  {/* Contenido del Acordeón */}
                  {isOpen && (
                    <div style={{ padding: "10px", backgroundColor: "#1a1a1a" }}>
                      <div className="table-responsive">
                        <table className="tabla-reportes-custom">
                          <thead>
                            <tr>
                              <th style={{ cursor: "pointer" }} onClick={() => handleSort("nombre")}>Evento{si("nombre")}</th>
                              <th style={{ cursor: "pointer" }} onClick={() => handleSort("fecha")}>Fecha{si("fecha")}</th>
                              <th>Tipo</th>
                              <th style={{ textAlign: "center", cursor: "pointer" }} onClick={() => handleSort("reservas")}>Cupo / Reservas{si("reservas")}</th>
                              {/* Columna de Motivo solo para cancelados */}
                              {grupo.idGrupo === 5 && <th style={{ textAlign: "center" }}>Motivo</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((evt: any) => (
                              <tr key={evt.id}>
                                <td style={{ fontWeight: "bold" }}>{evt.nombre}</td>
                                <td>{evt.fecha}</td>
                                <td><span className="badge-tipo">{evt.tipo}</span></td>
                                <td style={{ textAlign: "center" }}>
                                  <div className="reservas-indicator">
                                    {evt.reservas}{evt.cupo_maximo ? ` / ${evt.cupo_maximo}` : ""}
                                  </div>
                                </td>
                                {/* Botón del Ojito para mostrar el motivo */}
                                {grupo.idGrupo === 5 && (
                                  <td style={{ textAlign: "center" }}>
                                    <button 
                                      onClick={() => setMotivoModal(evt.motivo || "No se especificó un motivo para esta acción.")}
                                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem", padding: "5px", transition: "transform 0.2s" }}
                                      title="Ver motivo completo"
                                      onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.2)"}
                                      onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
                                    >
                                      👁️
                                    </button>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- MODAL FLOTANTE PARA EL MOTIVO --- */}
      {motivoModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
          backgroundColor: "rgba(0,0,0,0.75)", display: "flex", justifyContent: "center", 
          alignItems: "center", zIndex: 9999, backdropFilter: "blur(3px)"
        }}>
          <div style={{ 
            backgroundColor: "#252525", padding: "25px", borderRadius: "10px", 
            maxWidth: "500px", width: "90%", border: "1px solid #e74c3c", boxShadow: "0 10px 30px rgba(0,0,0,0.8)" 
          }}>
            <h3 style={{ color: "#e74c3c", marginTop: 0, borderBottom: "1px solid #444", paddingBottom: "15px", display: "flex", alignItems: "center", gap: "10px" }}>
              <span>⚠️</span> Detalle del Motivo
            </h3>
            <p style={{ color: "#e0e0e0", lineHeight: "1.6", fontSize: "1rem", whiteSpace: "pre-wrap", marginTop: "15px" }}>
              {motivoModal}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "25px" }}>
              <button 
                onClick={() => setMotivoModal(null)}
                style={{ 
                  padding: "10px 20px", backgroundColor: "#333", color: "#fff", border: "1px solid #555", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", transition: "background-color 0.2s" 
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#444"}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#333"}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}