import React from "react";

interface SeccionOrganizadorExternoProps {
  usuarioRol: number;
  reporteData: any;
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
  handleSortFin: (key: "nombre" | "fecha" | "monto" | "cupo" | "unitario") => void;  sif: (key: string) => React.ReactNode;
  setEventoDetalle: (item: any) => void;
}

export function SeccionOrganizadorExterno({
  usuarioRol,
  reporteData,
  estadoAbierto,
  setEstadoAbierto,
  sortedLista,
  getNombreEstado,
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
  setEventoDetalle
}: SeccionOrganizadorExternoProps) {
  
  // Si el rol es mayor a 3, no renderizamos nada (solo 1, 2 y 3 lo ven)
  if (usuarioRol > 3) return null;

  return (
    <div style={{ marginTop: "20px" }}>
      {/* Acordeón: mis solicitudes por estado */}
      {(reporteData?.lista_eventos_detallada ?? []).length > 0 && (
        <div className="grafico-card grafico-card--wide" id="lista_eventos_detallada">
          <div className="grafico-card__header">
            <h3>📋 Mis Solicitudes por Estado</h3>
          </div>
          <div className="grafico-card__body">
            {[2, 3, 4, 5, 6].map((idEstado: number) => {
              const items = sortedLista(
                (reporteData?.lista_eventos_detallada ?? []).filter((e: any) => e.estado === idEstado)
              );
              if (!items.length) return null;
              const isOpen = estadoAbierto === idEstado;
              const bc = idEstado === 3 ? "#4ade80" : idEstado === 2 ? "#fbbf24" : "#e74c3c";

              return (
                <div key={idEstado} style={{ marginBottom: "10px", border: "1px solid #333", borderRadius: "8px", overflow: "hidden" }}>
                  <div
                    onClick={() => setEstadoAbierto(isOpen ? null : idEstado)}
                    style={{
                      padding: "15px", backgroundColor: "#252525",
                      display: "flex", justifyContent: "space-between",
                      alignItems: "center", cursor: "pointer",
                      borderLeft: `4px solid ${bc}`,
                    }}
                  >
                    <span style={{ fontWeight: "bold", fontSize: "1rem" }}>
                      {getNombreEstado(idEstado).toUpperCase()} ({items.length})
                    </span>
                    <span style={{ transition: "transform 0.3s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                      ▼
                    </span>
                  </div>

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

      {/* ── FILA 1 (100%): Popularidad por Categoría ───────────── */}
      <div className="grafico-card grafico-card--wide" style={{ marginTop: "24px" }}>
        <div className="grafico-card__header">
          <h3>📈 Popularidad por Categoría de Mis Eventos</h3>
          <p style={{ fontSize: "0.8rem", color: "#888" }}>
            Distribución de inscritos según el tipo de actividad que organizás.
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
          {renderGraficoTorta(reporteData?.rendimiento_por_tipo ?? [], "tipo", "cantidad", "Detalle")}
          <div className="insight-text" style={{ marginTop: "20px" }}>
            {(reporteData?.rendimiento_por_tipo ?? []).length > 0 ? (
              <>
                💡 Tu categoría más buscada es{" "}
                <strong>
                  {[...(reporteData?.rendimiento_por_tipo ?? [])]
                    .sort((a: any, b: any) => b.cantidad - a.cantidad)[0]?.tipo}
                </strong>
              </>
            ) : (
              "💡 No hay datos suficientes para determinar una tendencia."
            )}
          </div>
        </div>
      </div>

      {/* ── FILA 2: Tarjeta filtros + tarjeta totales ───────────── */}
      <div className="reportes-graficos" style={{ marginTop: "24px" }}>
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
    </div>
  );
}