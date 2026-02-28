import {
    ResponsiveContainer,
    BarChart,
    XAxis,
    YAxis,
    Tooltip as RechartsTooltip, // Asumo que lo tenías importado así en tu page
    Legend,
    Bar,
    PieChart,
    Pie,
    Cell
} from "recharts";

interface SeccionSupervisorProps {
    // Exportación
    handleExportarCSV: (tipo: "dashboard_eventos" | "analisis_organizadores" | "top_ocupacion" | string) => void;
    
    // Gráficos (Dashboard Eventos del Sistema)
    barData: any[];
    pieData: any[];
    handleChartClick: (name: string, tipo?: string) => void;
    evtSist: any[];

    // Tabla: Análisis Organizadores
    handleSortOrg: (key: "organizador" | "total_eventos" | "activos" | "finalizados" | "recaudacion_total") => void;
    sortConfigOrg: { key: string | null; direction: 'asc' | 'desc' | null };
    sortedOrganizadores: any[];

    // Tabla: Top Ocupación
    handleSortOcupacion: (key: "nombre_evento" | "inscriptos_pagos" | "reservados_no_pagos" | "cupo_maximo" | "tasa_ocupacion") => void;
    sortConfigOcupacion: { key: string | null; direction: 'asc' | 'desc' | null };
    sortedOcupacion: any[];
    
    // Data general
    reporteData: any;
}

export function SeccionSupervisor({
    handleExportarCSV,
    barData,
    pieData,
    handleChartClick,
    evtSist,
    handleSortOrg,
    sortConfigOrg,
    sortedOrganizadores,
    handleSortOcupacion,
    sortConfigOcupacion,
    sortedOcupacion,
    reporteData
}: SeccionSupervisorProps) {
    return (
        <div style={{ marginTop: "30px", display: "flex", flexDirection: "column", gap: "24px" }}>
                
            {/* 1. DASHBOARD EVENTOS DEL SISTEMA */}
            <div className="grafico-card grafico-card--wide">
                <div className="grafico-card__header">
                    <h3>📊 Dashboard de Eventos del Sistema</h3>
                    <p style={{ fontSize: "0.8rem", color: "#888" }}>Clickeá en las barras o la torta para ver los detalles.</p>
                    <button onClick={() => handleExportarCSV("dashboard_eventos")} className="btn-export">
                        📥 Exportar Todo (CSV)
                    </button>
                </div>
                <div className="grafico-card__body" style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
                    
                    {/* Gráfico de Barras Apiladas */}
                    <div style={{ flex: "1 1 400px", height: "300px" }}>
                        <h4 style={{ textAlign: "center", marginBottom: "10px" }}>Propios vs Externos por Estado</h4>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                <XAxis dataKey="name" />
                                <YAxis />
                                <RechartsTooltip cursor={{fill: 'transparent'}}/>
                                <Legend />
                                <Bar dataKey="Propios" stackId="a" fill="#8b5cf6" onClick={(data: any) => handleChartClick(data.name, "Propio")} style={{ cursor: 'pointer' }}/>
                                <Bar dataKey="Externos" stackId="a" fill="#f59e0b" onClick={(data: any) => handleChartClick(data.name, "Externo")} style={{ cursor: 'pointer' }}/>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Gráfico de Torta */}
                    <div style={{ flex: "1 1 300px", height: "300px" }}>
                        <h4 style={{ textAlign: "center", marginBottom: "10px" }}>Proporción Total</h4>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" onClick={(data) => handleChartClick(data.name)} style={{ cursor: 'pointer' }}>
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <RechartsTooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Tabla Resumen */}
                    <div style={{ flex: "1 1 100%", marginTop: "40px" }}>
                        <table className="tabla-reportes-custom">
                            <thead>
                                <tr>
                                    <th>Estado</th>
                                    <th style={{ textAlign: "center" }}>Propios</th>
                                    <th style={{ textAlign: "center" }}>Externos</th>
                                    <th style={{ textAlign: "right" }}>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {barData.map(row => (
                                    <tr key={row.name}>
                                        <td style={{ fontWeight: "bold" }}>{row.name}</td>
                                        <td style={{ textAlign: "center" }}>{row.Propios}</td>
                                        <td style={{ textAlign: "center" }}>{row.Externos}</td>
                                        <td style={{ textAlign: "right", fontWeight: "bold" }}>{row.Propios + row.Externos}</td>
                                    </tr>
                                ))}
                                <tr style={{ backgroundColor: "#cbd5e1", borderTop: "3px solid #475569" }}>
                                    <td style={{ fontWeight: "900", color: "#0f172a", fontSize: "1.05rem" }}>TOTAL SISTEMA</td>
                                    <td style={{ textAlign: "center", fontWeight: "900", color: "#0f172a", fontSize: "1.05rem" }}>
                                        {barData.reduce((acc, curr) => acc + curr.Propios, 0)}
                                    </td>
                                    <td style={{ textAlign: "center", fontWeight: "900", color: "#0f172a", fontSize: "1.05rem" }}>
                                        {barData.reduce((acc, curr) => acc + curr.Externos, 0)}
                                    </td>
                                    <td style={{ textAlign: "right", fontWeight: "900", color: "#0f172a", fontSize: "1.2rem" }}>
                                        {evtSist.length}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* 2. Análisis Organizadores Top 10 */}
            <div className="grafico-card grafico-card--wide">
                <div className="grafico-card__header">
                    <h3>🏆 Análisis Organizadores Top 10</h3>
                    <p style={{ fontSize: "0.8rem", color: "#888" }}>Por recaudación, eventos y estado. Tocá los encabezados para ordenar.</p>
                    <button onClick={() => handleExportarCSV("analisis_organizadores")} className="btn-export">
                        📥 Exportar CSV
                    </button>
                </div>
                <div className="grafico-card__body">
                    <div className="table-responsive">
                        <table className="tabla-reportes-custom tabla-sortable">
                            <thead>
                                <tr>
                                    <th onClick={() => handleSortOrg('organizador')} style={{ cursor: 'pointer' }}>
                                        Organizador {sortConfigOrg.key === 'organizador' ? (sortConfigOrg.direction === 'asc' ? '↑' : '↓') : ''}
                                    </th>
                                    <th>Email</th>
                                    <th>Rol</th>
                                    <th onClick={() => handleSortOrg('total_eventos')} style={{ cursor: 'pointer', textAlign: "center" }}>
                                        Total Eventos {sortConfigOrg.key === 'total_eventos' ? (sortConfigOrg.direction === 'asc' ? '↑' : '↓') : ''}
                                    </th>
                                    <th onClick={() => handleSortOrg('activos')} style={{ cursor: 'pointer', textAlign: "center" }}>
                                        Activos {sortConfigOrg.key === 'activos' ? (sortConfigOrg.direction === 'asc' ? '↑' : '↓') : ''}
                                    </th>
                                    <th onClick={() => handleSortOrg('finalizados')} style={{ cursor: 'pointer', textAlign: "center" }}>
                                        Finalizados {sortConfigOrg.key === 'finalizados' ? (sortConfigOrg.direction === 'asc' ? '↑' : '↓') : ''}
                                    </th>
                                    <th onClick={() => handleSortOrg('recaudacion_total')} style={{ cursor: 'pointer', textAlign: "right" }}>
                                        Recaudación Total {sortConfigOrg.key === 'recaudacion_total' ? (sortConfigOrg.direction === 'asc' ? '↑' : '↓') : ''}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedOrganizadores.map((org: any, i: number) => (
                                    <tr key={i}>
                                        <td style={{ fontWeight: "bold" }}>{org.organizador}</td>
                                        <td style={{ fontSize: "0.85rem", color: "#555" }}>{org.email}</td>
                                        <td><span className="badge-tipo">{org.rol}</span></td>
                                        <td style={{ textAlign: "center", fontWeight: "bold" }}>{org.total_eventos}</td>
                                        <td style={{ textAlign: "center", color: "#4ade80" }}>{org.activos}</td>
                                        <td style={{ textAlign: "center", color: "#3b82f6" }}>{org.finalizados}</td>
                                        <td style={{ textAlign: "right", color: "#16a34a", fontWeight: "bold" }}>
                                            ${org.recaudacion_total.toLocaleString("es-AR")}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {sortedOrganizadores.length === 0 && <p className="no-data">Sin datos disponibles.</p>}
                    </div>
                </div>
            </div>

            {/* 3. Top Eventos por Ocupación */}
            <div className="grafico-card grafico-card--wide">
                <div className="grafico-card__header">
                    <h3>🔥 Top 10 Eventos por Tasa de Ocupación</h3>
                    <p style={{ fontSize: "0.8rem", color: "#888" }}>Inscriptos confirmados (Pagos) vs Reservados pendientes (No pagos)</p>
                    <button onClick={() => handleExportarCSV("top_ocupacion")} className="btn-export">
                        📥 Exportar CSV
                    </button>
                </div>
                <div className="grafico-card__body">
                    <div className="table-responsive">
                        <table className="tabla-reportes-custom">
                            <thead>
                                <tr>
                                    <th onClick={() => handleSortOcupacion('nombre_evento')} style={{ cursor: "pointer", userSelect: "none" }}>
                                        Evento {sortConfigOcupacion.key === 'nombre_evento' ? (sortConfigOcupacion.direction === 'asc' ? '🔼' : '🔽') : '↕️'}
                                    </th>
                                    <th style={{ textAlign: "center" }}>Tipo</th>
                                    <th onClick={() => handleSortOcupacion('inscriptos_pagos')} style={{ textAlign: "center", cursor: "pointer", userSelect: "none" }}>
                                        Inscriptos {sortConfigOcupacion.key === 'inscriptos_pagos' ? (sortConfigOcupacion.direction === 'asc' ? '🔼' : '🔽') : '↕️'}
                                    </th>
                                    <th onClick={() => handleSortOcupacion('reservados_no_pagos')} style={{ textAlign: "center", cursor: "pointer", userSelect: "none" }}>
                                        Reservas {sortConfigOcupacion.key === 'reservados_no_pagos' ? (sortConfigOcupacion.direction === 'asc' ? '🔼' : '🔽') : '↕️'}
                                    </th>
                                    <th onClick={() => handleSortOcupacion('cupo_maximo')} style={{ textAlign: "center", cursor: "pointer", userSelect: "none" }}>
                                        Cupo Max {sortConfigOcupacion.key === 'cupo_maximo' ? (sortConfigOcupacion.direction === 'asc' ? '🔼' : '🔽') : '↕️'}
                                    </th>
                                    <th onClick={() => handleSortOcupacion('tasa_ocupacion')} style={{ cursor: "pointer", userSelect: "none" }}>
                                        Ocupación {sortConfigOcupacion.key === 'tasa_ocupacion' ? (sortConfigOcupacion.direction === 'asc' ? '🔼' : '🔽') : '↕️'}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedOcupacion.map((evt: any, i: number) => (
                                    <tr key={i}>
                                        <td style={{ fontWeight: "bold" }}>{evt.nombre_evento}</td>
                                        <td style={{ textAlign: "center" }}>
                                            <span className="badge-tipo" style={{ backgroundColor: evt.es_pago ? "#3b82f6" : "#64748b" }}>
                                                {evt.es_pago ? "Pago" : "Gratuito"}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: "center", color: "#4ade80", fontWeight: "bold" }}>{evt.inscriptos_pagos}</td>
                                        <td style={{ textAlign: "center", color: "#fbbf24", fontWeight: "bold" }}>{evt.reservados_no_pagos}</td>
                                        <td style={{ textAlign: "center" }}>{evt.cupo_maximo}</td>
                                        <td style={{ width: "250px" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                <div style={{ flex: 1, height: "10px", backgroundColor: "#e2e8f0", borderRadius: "5px", overflow: "hidden", display: "flex" }}>
                                                    <div style={{ width: `${(evt.inscriptos_pagos / evt.cupo_maximo) * 100}%`, height: "100%", backgroundColor: "#4ade80" }} />
                                                    <div style={{ width: `${(evt.reservados_no_pagos / evt.cupo_maximo) * 100}%`, height: "100%", backgroundColor: "#fbbf24" }} />
                                                </div>
                                                <span style={{ fontSize: "0.85rem", fontWeight: "bold" }}>{evt.tasa_ocupacion}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {!(reporteData?.top_ocupacion?.length) && <p className="no-data">Sin datos disponibles.</p>}
                    </div>
                </div>
            </div>

        </div>
    );
}