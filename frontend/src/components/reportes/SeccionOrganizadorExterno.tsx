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
  totalRecaudacionFiltrado,
  detalleRecaudacionFiltrado,
  busquedaEvento,
  setBusquedaEvento,
  filtroEstadoRecaudacion,
  setFiltroEstadoRecaudacion,
  filtroTipoRecaudacion,
  setFiltroTipoRecaudacion,
  TIPOS_EVENTO,
  handleSortFin,
  sif,
  setEventoDetalle,
}: SeccionOrganizadorExternoProps) {

  // Estado local para manejar qué motivo mostrar en el modal
  const [motivoModal, setMotivoModal] = useState<string | null>(null);

  // Si el rol es mayor a 3, no renderizamos nada (solo 1, 2 y 3 lo ven)
  if (usuarioRol > 3) return null;

  return (
    <div>

      {/* ── FILA 2: Tarjeta filtros + tarjeta totales ───────────── */}
      <div className="reportes-graficos" >
        {/* Tarjeta izquierda: resumen + filtros de recaudación */}
        <div className="grafico-card">
          <div className="grafico-card__header">
            <h3>💰 Recaudación Total</h3>
            <p style={{ fontSize: "0.8rem", color: "#888" }}>
              Todos los eventos — gratuitos muestran $0
            </p>
          </div>
          <div className="grafico-card__body" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ fontSize: "3.2rem", fontWeight: "bold", color: "#4ade80" }}>
              ${totalRecaudacionFiltrado.toLocaleString("es-AR")}
            </span>
            <p style={{ color: "#ccc", marginTop: "8px" }}>
              {detalleRecaudacionFiltrado.length} eventos en la vista
            </p>

            {/* Búsqueda */}
            <input
              type="text"
              placeholder="🔍 Buscar evento..."
              value={busquedaEvento}
              onChange={(e) => setBusquedaEvento(e.target.value)}
              style={{
                width: "100%", padding: "10px", marginTop: "16px",
                background: "#0d0d0d", border: "1px solid #4ade80",
                borderRadius: "6px", color: "#fff", fontSize: "0.9rem",
              }}
            />

            {/* Filtro estado */}
            <select
              value={filtroEstadoRecaudacion}
              onChange={(e) => setFiltroEstadoRecaudacion(e.target.value)}
              style={{
                width: "100%", padding: "10px", marginTop: "10px",
                background: "#0d0d0d", border: "1px solid #4ade80",
                borderRadius: "6px", color: "#fff", fontSize: "0.9rem", cursor: "pointer",
              }}
            >
              <option value="todos">📊 Todos los Eventos</option>
              <option value="activos">🟢 Solo Activos (Publicados)</option>
              <option value="pasados">🔵 Solo Finalizados</option>
            </select>

            {/* Filtro tipo */}
            <select
              value={filtroTipoRecaudacion}
              onChange={(e) => setFiltroTipoRecaudacion(e.target.value)}
              style={{
                width: "100%", padding: "10px", marginTop: "10px",
                background: "#0d0d0d", border: "1px solid #4ade80",
                borderRadius: "6px", color: "#fff", fontSize: "0.9rem", cursor: "pointer",
              }}
            >
              <option value="">🚴 Todos los Tipos</option>
              {TIPOS_EVENTO.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {/* Tarjeta derecha: métricas globales */}
        <div className="grafico-card" style={{ display: "flex", flexDirection: "column", gap: "16px", justifyContent: "center" }}>
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
      </div>

      {/* ── TABLA DETALLE RECAUDACIÓN PRO ───────────────────────── */}
      <div className="grafico-card grafico-card--wide" style={{ marginTop: "20px" }}>
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
          {detalleRecaudacionFiltrado.length === 0 ? (
            <p className="no-data">Sin eventos para mostrar con los filtros actuales.</p>
          ) : (
            <div 
              className="table-responsive" 
              style={{ 
                maxHeight: "450px",
                overflowY: "auto", 
                overflowX: "auto" 
              }}
            >
              <table className="tabla-reportes-custom" style={{ width: "100%", borderCollapse: "collapse", position: "relative" }}>
                
                {/* ENCABEZADO FIJO (Sticky) */}
                <thead style={{ 
                  position: "sticky", 
                  top: 0, 
                  zIndex: 10, 
                  backgroundColor: "#1e1e1e",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.2)" 
                }}>
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
                  {detalleRecaudacionFiltrado.map((item: any, idx: number) => (
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
                <tfoot style={{ 
                  position: "sticky", 
                  bottom: 0, 
                  zIndex: 10, 
                  backgroundColor: "#1e1e1e",
                  boxShadow: "0 -2px 4px rgba(0,0,0,0.2)" 
                }}>
                  <tr style={{ borderTop: "2px solid #4ade80" }}>
                    <td colSpan={5} style={{ textAlign: "right", fontWeight: "bold", fontSize: "1.1rem", padding: "12px 8px" }}>
                      TOTAL FILTRADO:
                    </td>
                    <td style={{ textAlign: "right", color: "#4ade80", fontWeight: "bold", fontSize: "1.2rem", padding: "12px 8px" }}>
                      ${totalRecaudacionFiltrado.toLocaleString("es-AR")}
                    </td>
                    <td style={{ padding: "12px 8px" }} />
                  </tr>
                </tfoot>
                
              </table>
            </div>
          )}
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

        // 3. Agrupamos y sumamos los inscriptos (reservas) por cada tipo/categoría
        const agrupadoPorCategoria = eventosParaTorta.reduce((acc: any, evt: any) => {
          const tipo = evt.tipo || "Sin categoría";
          const inscriptos = evt.reservas || 0;
          if (!acc[tipo]) acc[tipo] = 0;
          acc[tipo] += inscriptos;
          return acc;
        }, {});

        // 4. Lo convertimos al formato que necesita tu gráfico y lo ordenamos de mayor a menor
        const datosTortaFiltrados = Object.keys(agrupadoPorCategoria)
          .map(tipo => ({
            tipo,
            cantidad: agrupadoPorCategoria[tipo]
          }))
          .filter(item => item.cantidad > 0) // Ocultamos categorías con 0 inscriptos
          .sort((a, b) => b.cantidad - a.cantidad);

        // 5. Sacamos el dato de la categoría con más inscriptos
        const categoriaGanadora = datosTortaFiltrados.length > 0 ? datosTortaFiltrados[0].tipo : null;

        return (
          <div className="grafico-card grafico-card--wide" style={{ marginTop: "24px" }}>
            <div className="grafico-card__header">
              {/* Cambiamos los títulos según lo que pidió el profe */}
              <h3>📈 Distribución de Inscriptos por Categoría</h3>
              <p style={{ fontSize: "13px", color: "#d7d7d7" }}>
                Cantidad total de inscriptos según el tipo de evento que organizás.
              </p>
              <button
                data-html2canvas-ignore="true"
                onClick={() => handleExportarCSV("rendimiento_categorias")}
                className="btn-export"
              >
                📥 CSV
              </button>
            </div>
            <div className="grafico-card__body">
              {/* Le pasamos la data ya filtrada por fecha y recalculada */}
              {renderGraficoTorta(datosTortaFiltrados, "tipo", "cantidad", "Inscriptos")}
              
              <div className="insight-text" style={{ marginTop: "20px" }}>
                {categoriaGanadora ? (
                  <>
                    💡 Tu categoría con más inscriptos es <strong>{categoriaGanadora}</strong>.
                  </>
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
        <div className="grafico-card grafico-card--wide" id="lista_eventos_detallada">
          <div className="grafico-card__header">
            <h3>📋 Mis Solicitudes de eventos por estado</h3>
          </div>
          <div className="grafico-card__body">
            
            {/* Definimos los grupos, uniendo el 5 y el 6 */}
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
                      padding: "15px", backgroundColor: "#252525",
                      display: "flex", justifyContent: "space-between",
                      alignItems: "center", cursor: "pointer",
                      borderLeft: `4px solid ${bc}`,
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
                              <th style={{ cursor: "pointer" }} onClick={() => handleSort("nombre")}>
                                Evento{si("nombre")}
                              </th>
                              <th style={{ cursor: "pointer" }} onClick={() => handleSort("fecha")}>
                                Fecha{si("fecha")}
                              </th>
                              <th>Tipo</th>
                              <th style={{ textAlign: "center", cursor: "pointer" }} onClick={() => handleSort("reservas")}>
                                Cupo / Reservas{si("reservas")}
                              </th>
                              {/* Columna de Motivo solo para cancelados */}
                              {grupo.idGrupo === 5 && (
                                <th style={{ textAlign: "center" }}>Motivo</th>
                              )}
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
                                      style={{ 
                                        background: "none", border: "none", cursor: "pointer", 
                                        fontSize: "1.2rem", padding: "5px", transition: "transform 0.2s" 
                                      }}
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
            maxWidth: "500px", width: "90%", border: "1px solid #e74c3c", 
            boxShadow: "0 10px 30px rgba(0,0,0,0.8)" 
          }}>
            <h3 style={{ 
              color: "#e74c3c", marginTop: 0, borderBottom: "1px solid #444", 
              paddingBottom: "15px", display: "flex", alignItems: "center", gap: "10px" 
            }}>
              <span>⚠️</span> Detalle del Motivo
            </h3>
            <p style={{ 
              color: "#e0e0e0", lineHeight: "1.6", fontSize: "1rem", 
              whiteSpace: "pre-wrap", marginTop: "15px" 
            }}>
              {motivoModal}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "25px" }}>
              <button 
                onClick={() => setMotivoModal(null)}
                style={{ 
                  padding: "10px 20px", backgroundColor: "#333", color: "#fff", 
                  border: "1px solid #555", borderRadius: "6px", cursor: "pointer", 
                  fontWeight: "bold", transition: "background-color 0.2s" 
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