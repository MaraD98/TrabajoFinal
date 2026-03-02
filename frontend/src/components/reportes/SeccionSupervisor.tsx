import { ModalTermometro } from "../modals/reportesModal/ModalTermometro";
import { ModalPerfilOrganizador } from '../modals/reportesModal/ModalPerfilOrganizador';
import { useState } from "react";
import {
    ResponsiveContainer,
    BarChart,
    XAxis,
    YAxis,
    Tooltip as RechartsTooltip,
    Legend,
    Bar
} from "recharts";
type OrganizadorKey = "organizador" | "total_eventos" | "activos" | "finalizados" | "recaudacion_total" | "rol";

interface SeccionSupervisorProps {
    fechaInicio: string;
    fechaFin: string;
    // Exportación
    handleExportarCSV: (tipo: "dashboard_eventos" | "analisis_organizadores" | "top_ocupacion" | string) => void;
    
    // Gráficos (Eventos del Sistema)
    evtSist: any[];
    handleChartClick: (name: string, tipo?: string) => void;
    

    // --- Tabla: Organizadores ---
    sortConfigOrg: { key: OrganizadorKey | null; direction: 'asc' | 'desc' | null };
    handleSortOrg: (key: OrganizadorKey) => void;
    filtroRolOrg: string;                                
    setFiltroRolOrg: (valor: string) => void;           
    organizadoresFiltrados: any[];                       
    sortedOrganizadores: any[];

    // Tabla: Top Ocupación
    handleSortOcupacion: (key: "nombre_evento" | "inscriptos_pagos" | "reservados_no_pagos" | "cupo_maximo" | "tasa_ocupacion" | "es_pago" | "fecha_evento") => void;
    sortConfigOcupacion: { key: string | null; direction: 'asc' | 'desc' | null };
    filtroOcupacion: 'todos' | 'riesgo' | 'exito';
    setFiltroOcupacion: (valor: 'todos' | 'riesgo' | 'exito') => void;
    ocupacionFiltrada: any[];
}

export function SeccionSupervisor({
    fechaInicio,
    fechaFin,
    handleExportarCSV,
    evtSist,
    handleChartClick,
    handleSortOrg,
    sortConfigOrg,
    filtroRolOrg,               
    setFiltroRolOrg,            
    organizadoresFiltrados,
    handleSortOcupacion,
    sortConfigOcupacion,
    ocupacionFiltrada,
    filtroOcupacion,
    setFiltroOcupacion
}: SeccionSupervisorProps) {
    // 👇 2. APLICAMOS EL FILTRO EXACTO DE TU COMPAÑERA 👇
    let eventosFiltrados = [...(evtSist || [])];

    if (fechaInicio) {
        eventosFiltrados = eventosFiltrados.filter((e: any) => new Date(e.fecha_evento) >= new Date(fechaInicio));
    }
    if (fechaFin) {
        eventosFiltrados = eventosFiltrados.filter((e: any) => new Date(e.fecha_evento) <= new Date(fechaFin));
    }
    const [organizadorModal, setOrganizadorModal] = useState<any | null>(null);
    const [hoveredBar, setHoveredBar] = useState<string | null>(null);
    const [eventoModal, setEventoModal] = useState<any | null>(null); // Para el Modal Termómetro
    // 👇 3. CALCULAMOS LOS DATOS DEL GRÁFICO CON LA DATA YA FILTRADA 👇
    const stats = {
        Activo: { Propios: 0, Externos: 0, Total: 0 },
        Finalizado: { Propios: 0, Externos: 0, Total: 0 },
        Cancelado: { Propios: 0, Externos: 0, Total: 0 }
    };

    eventosFiltrados.forEach((e: any) => {
        if (e.estado && stats[e.estado as keyof typeof stats]) {
            const tipo = e.pertenencia === "Propio" ? "Propios" : "Externos";
            stats[e.estado as keyof typeof stats][tipo] += 1;
            stats[e.estado as keyof typeof stats].Total += 1;
        }
    });

    const barData = [
        { name: 'Activos', Propios: stats.Activo.Propios, Externos: stats.Activo.Externos },
        { name: 'Finalizados', Propios: stats.Finalizado.Propios, Externos: stats.Finalizado.Externos },
        { name: 'Cancelados', Propios: stats.Cancelado.Propios, Externos: stats.Cancelado.Externos },
    ];
    const CustomTooltip = ({ active, payload, label, hoveredKey }: any) => {
        if (active && payload && payload.length) {
            // Filtramos la data: si está tocando un color específico, mostramos solo ese.
            // Si está tocando el fondo del gráfico (sin tocar la barra), mostramos ambos por las dudas.
            const itemsToDisplay = hoveredKey 
                ? payload.filter((p: any) => p.dataKey === hoveredKey) 
                : payload;

            return (
                <div style={{ 
                    backgroundColor: '#1e293b', // Fondo azul oscuro
                    padding: '12px', 
                    border: '1px solid #334155', 
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                }}>
                    <p style={{ color: '#94a3b8', margin: '0 0 8px 0', fontSize: '0.85rem', fontWeight: 'bold', borderBottom: '1px solid #334155', paddingBottom: '4px' }}>
                        ESTADO: {label.toUpperCase()}
                    </p>
                    {itemsToDisplay.map((p: any) => (
                        <p key={p.dataKey} style={{ color: p.fill, margin: '4px 0', fontSize: '0.95rem' }}>
                            {p.name}: <strong style={{ color: '#fff'}}>{p.value}</strong>
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };
    return (
        <div style={{ marginTop: "30px", display: "flex", flexDirection: "column", gap: "24px" }}>
                
            {/* 1. DISTRIBUCIÓN DE EVENTOS POR ESTADO Y ORIGEN */}
            <div className="grafico-card grafico-card--wide">
                <div className="grafico-card__header">
                    {/* TÍTULO ACTUALIZADO */}
                    <h3>📊 Distribución de Eventos por Estado y Origen</h3>
                    <p style={{ fontSize: "14px", color: "#d7d7d7", marginTop: "5px" }}>
                        Muestra el volumen de eventos según su estado operativo y procedencia.
                    </p>
                    <button onClick={() => handleExportarCSV("dashboard_eventos")} className="btn-export">
                        📥 Exportar Todo (CSV)
                    </button>
                </div>

                <div className="grafico-card__body">
                    {/* DEJAMOS UN SOLO GRÁFICO (100% ANCHO) */}
                    <div style={{ width: "100%", height: "400px", marginTop: "20px" }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                                
                                {/* DESCRIPCIÓN EJE X */}
                                <XAxis 
                                    dataKey="name" 
                                    label={{ value: 'Estados del Evento', position: 'bottom', offset: 20, fill: '#94a3b8' }} 
                                    tick={{ fill: '#cbd5e1' }}
                                />
                                {/* DESCRIPCIÓN EJE Y */}
                                <YAxis 
                                    label={{ value: 'Cantidad de Eventos', angle: -90, position: 'insideLeft', offset: 0, fill: '#94a3b8' }} 
                                    tick={{ fill: '#cbd5e1' }}
                                />
                                
                                <RechartsTooltip 
                                    cursor={{fill: 'rgba(255,255,255,0.05)'}} 
                                    content={<CustomTooltip hoveredKey={hoveredBar} />} 
                                />
                                <Legend verticalAlign="top" height={40} />

                                <Bar 
                                    dataKey="Propios" 
                                    stackId="a" 
                                    fill="#8b5cf6" 
                                    isAnimationActive={true} 
                                    animationDuration={1500}
                                    onClick={(data: any) => handleChartClick(data.name, "Propio")} 
                                    // 👇 Le avisamos cuando entra y sale del VIOLETA 👇
                                    onMouseEnter={() => setHoveredBar("Propios")}
                                    onMouseLeave={() => setHoveredBar(null)}
                                    style={{ cursor: 'pointer' }}
                                />
                                <Bar 
                                    dataKey="Externos" 
                                    stackId="a" 
                                    fill="#f59e0b" 
                                    isAnimationActive={true} 
                                    animationDuration={1500}
                                    onClick={(data: any) => handleChartClick(data.name, "Externo")} 
                                    // 👇 Le avisamos cuando entra y sale del NARANJA 👇
                                    onMouseEnter={() => setHoveredBar("Externos")}
                                    onMouseLeave={() => setHoveredBar(null)}
                                    style={{ cursor: 'pointer' }}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* GLOSARIO DE ORIGEN ABAJO */}
                    <div style={{ 
                        marginTop: "20px", 
                        padding: "16px", 
                        backgroundColor: "rgba(15, 23, 42, 0.4)", 
                        borderRadius: "8px", 
                        border: "1px solid #334155" 
                    }}>
                        <p style={{ fontSize: "0.9rem", margin: "0 0 8px 0", color: "#e2e8f0" }}>
                            <strong style={{ color: "#8b5cf6" }}>🟣 Origen Propio:</strong> Eventos creados y gestionados directamente por la administración del sistema.
                        </p>
                        <p style={{ fontSize: "0.9rem", margin: 0, color: "#e2e8f0" }}>
                            <strong style={{ color: "#f59e0b" }}>🟠 Origen Externo:</strong> Eventos publicados por usuarios u organizaciones externas a la plataforma.
                        </p>
                    </div>

                </div>
            </div>

            {/* 2. Análisis Organizadores Top 10 */}
            <div className="grafico-card grafico-card--wide">
            <div className="grafico-card__header">
                <div>
                    {/* EL NUEVO TÍTULO */}
                    <h3>🏆 Ranking de Organizadores por Rendimiento</h3>
                    <p style={{ fontSize: "14px", color: "#d7d7d7" }}>
                        Top 10 usuarios con mayor volumen de recaudación y eventos.
                    </p>
                </div>
            
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>    
                    <select 
                        value={filtroRolOrg}
                        onChange={(e) => setFiltroRolOrg(e.target.value)}
                        style={{ padding: "6px 12px", borderRadius: "6px", background: "#1e293b", color: "#fff", border: "1px solid #334155", fontSize: "0.85rem" }}
                    >
                        <option value="todos">👥 Todos los roles</option>
                        <option value="Organización Externa">🏢 Organización Externa</option>
                        <option value="Administrador">👑 Administrador</option>
                        <option value="Supervisor">🛡️ Supervisor</option>
                    </select>

                    <button onClick={() => handleExportarCSV("analisis_organizadores")} className="btn-export">
                        📥 Exportar CSV
                    </button>
                </div>
            </div>

            <div className="grafico-card__body">
                <div className="table-responsive">
                    <table className="tabla-reportes-custom">
                        <thead>
                            <tr>
                                {/* LOS ENCABEZADOS AHORA SON CLICKEABLES PARA ORDENAR */}
                                <th onClick={() => handleSortOrg('organizador')} style={{ cursor: "pointer", userSelect: "none" }}>
                                    Organizador {sortConfigOrg.key === 'organizador' ? (sortConfigOrg.direction === 'asc' ? '🔼' : '🔽') : '↕️'}
                                </th>
                                <th>Email</th>
                                <th onClick={() => handleSortOrg('rol')} style={{ textAlign: "center", cursor: "pointer", userSelect: "none" }}>
                                    Rol {sortConfigOrg.key === 'rol' ? (sortConfigOrg.direction === 'asc' ? '🔼' : '🔽') : '↕️'}
                                </th>
                                <th onClick={() => handleSortOrg('total_eventos')} style={{ textAlign: "center", cursor: "pointer", userSelect: "none" }}>
                                    Total Eventos {sortConfigOrg.key === 'total_eventos' ? (sortConfigOrg.direction === 'asc' ? '🔼' : '🔽') : '↕️'}
                                </th>
                                <th onClick={() => handleSortOrg('activos')} style={{ textAlign: "center", cursor: "pointer", userSelect: "none" }}>
                                    Activos {sortConfigOrg.key === 'activos' ? (sortConfigOrg.direction === 'asc' ? '🔼' : '🔽') : '↕️'}
                                </th>
                                <th onClick={() => handleSortOrg('finalizados')} style={{ textAlign: "center", cursor: "pointer", userSelect: "none" }}>
                                    Finalizados {sortConfigOrg.key === 'finalizados' ? (sortConfigOrg.direction === 'asc' ? '🔼' : '🔽') : '↕️'}
                                </th>
                                <th onClick={() => handleSortOrg('recaudacion_total')} style={{ textAlign: "right", cursor: "pointer", userSelect: "none" }}>
                                    Recaudación Total {sortConfigOrg.key === 'recaudacion_total' ? (sortConfigOrg.direction === 'asc' ? '🔼' : '🔽') : '↕️'}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* USAMOS LA NUEVA LISTA FILTRADA Y ORDENADA */}
                            {organizadoresFiltrados.map((org: any, idx: number) => (
                                <tr key={idx}>
                                    {/* 1. ORGANIZADOR (Clickeable para el modal) */}
                                    <td 
                                        style={{ fontWeight: "bold", cursor: "pointer", color: "#60a5fa", textDecoration: "underline" }}
                                        onClick={() => setOrganizadorModal(org)}
                                        title="Ver ficha de rendimiento"
                                    >
                                        {org.organizador}
                                    </td>
                                    
                                    {/* 2. EMAIL (La que faltaba) */}
                                    <td style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
                                        {org.email}
                                    </td>
                                    
                                    {/* 3. ROL (La que faltaba) */}
                                    <td style={{ textAlign: "center" }}>
                                        <span className="badge-tipo" style={{ backgroundColor: org.rol === "Organización Externa" ? "#8b5cf6" : "#3b82f6", padding: "4px 8px", borderRadius: "4px", color: "white", fontSize: "0.85rem" }}>
                                            {org.rol}
                                        </span>
                                    </td>

                                    {/* 4. TOTAL EVENTOS */}
                                    <td style={{ textAlign: "center", fontWeight: "bold" }}>{org.total_eventos}</td>
                                    
                                    {/* 5. ACTIVOS */}
                                    <td style={{ textAlign: "center", color: "#4ade80" }}>{org.activos}</td>
                                    
                                    {/* 6. FINALIZADOS */}
                                    <td style={{ textAlign: "center", color: "#94a3b8" }}>{org.finalizados}</td>
                                    
                                    {/* 7. RECAUDACIÓN TOTAL */}
                                    <td style={{ textAlign: "right", fontWeight: "bold", color: "#38bdf8" }}>
                                        ${org.recaudacion_total.toLocaleString("es-AR")}
                                    </td>
                                </tr>
                            ))}
                            {organizadoresFiltrados.length === 0 && (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: "center", padding: "20px", color: "#94a3b8" }}>
                                        No se encontraron organizadores para este filtro.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

            {/* 3. Seguimiento de Cupos y Ocupación por Evento */}
            <div className="grafico-card grafico-card--wide">
                <div className="grafico-card__header">
                    <div>
                        <h3>🔥 Seguimiento de Cupos y Ocupación por Evento</h3>
                        <p style={{ fontSize: "14px", color: "#d7d7d7" }}>
                            Indicadores de ocupación por evento. Selecciona un registro en la tabla para ver el detalle de inscripciones.
                        </p>
                    </div>
                
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    {/* SELECTOR DE FILTRO DE ESTADO */}
                    <select 
                        value={filtroOcupacion}
                        onChange={(e) => setFiltroOcupacion(e.target.value as any)}
                        style={{ 
                            padding: "6px 12px", 
                            borderRadius: "6px", 
                            background: "#1e293b", 
                            color: "#fff", 
                            border: "1px solid #334155",
                            fontSize: "0.85rem"
                        }}
                    >
                        <option value="todos">🔍 Todos los estados</option>
                        <option value="riesgo">🔴 En Riesgo (Bajo 40%)</option>
                        <option value="exito">🟢 Fuera de riesgo (Sobre 40%)</option>
                    </select>

                    <button onClick={() => handleExportarCSV("top_ocupacion")} className="btn-export">
                        📥 Exportar CSV
                    </button>
                </div>
                </div>

                <div className="grafico-card__body">
                    <div className="table-responsive">
                        <table className="tabla-reportes-custom">
                            <thead>
                                <tr>
                                    <th onClick={() => handleSortOcupacion('nombre_evento')} style={{ cursor: "pointer", userSelect: "none" }}>
                                        Evento {sortConfigOcupacion.key === 'nombre_evento' ? (sortConfigOcupacion.direction === 'asc' ? '🔼' : '🔽') : '↕️'}
                                    </th>
                                    {/* AGREGAMOS EL TÍTULO DE FECHA AQUÍ */}
                                    <th onClick={() => handleSortOcupacion('fecha_evento')} style={{ cursor: "pointer", userSelect: "none" }}>
                                        Fecha {sortConfigOcupacion.key === 'fecha_evento' ? (sortConfigOcupacion.direction === 'asc' ? '🔼' : '🔽') : '↕️'}
                                    </th>
                                    <th onClick={() => handleSortOcupacion('es_pago')} style={{ textAlign: "center", cursor: "pointer", userSelect: "none" }}>
                                        Tipo {sortConfigOcupacion.key === 'es_pago' ? (sortConfigOcupacion.direction === 'asc' ? '🔼' : '🔽') : '↕️'}
                                    </th>
                                    <th onClick={() => handleSortOcupacion('inscriptos_pagos')} style={{ textAlign: "center", cursor: "pointer", userSelect: "none" }}>
                                        Inscriptos {sortConfigOcupacion.key === 'inscriptos_pagos' ? (sortConfigOcupacion.direction === 'asc' ? '🔼' : '🔽') : '↕️'}
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
                                {ocupacionFiltrada.map((evt: any, i: number) => {
                                    const colorBarra = evt.tasa_ocupacion < 40 ? "#ef4444" : "#4ade80";
                                    return (
                                        <tr key={i}>
                                            {/* 1. EVENTO */}
                                            <td 
                                                style={{ fontWeight: "bold", cursor: "pointer", color: "#60a5fa", textDecoration: "underline" }}
                                                onClick={() => setEventoModal(evt)}
                                                title="Ver detalle de ocupación">
                                                {evt.nombre_evento}
                                            </td>
                                            {/* 2. FECHA */}
                                            <td>
                                                {evt.fecha_evento 
                                                    ? new Date(evt.fecha_evento).toLocaleDateString("es-AR") 
                                                    : "Sin fecha"}
                                            </td>
                                            {/* 3. TIPO */}
                                            <td style={{ textAlign: "center" }}>
                                                <span className="badge-tipo" style={{ backgroundColor: evt.es_pago ? "#3b82f6" : "#64748b", padding: "4px 8px", borderRadius: "4px", color: "white", fontSize: "0.85rem" }}>
                                                    {evt.es_pago ? "Pago" : "Gratuito"}
                                                </span>
                                            </td>
                                            {/* 4. INSCRIPTOS */}
                                            <td style={{ textAlign: "center", color: colorBarra, fontWeight: "bold" }}>
                                                {evt.inscriptos_pagos}
                                            </td>
                                            {/* 5. CUPO MAX */}
                                            <td style={{ textAlign: "center" }}>{evt.cupo_maximo}</td>
                                            {/* 6. BARRA DE OCUPACIÓN */}
                                            <td style={{ width: "250px" }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                    <div style={{ flex: 1, height: "10px", backgroundColor: "#e2e8f0", borderRadius: "5px", overflow: "hidden" }}>
                                                        <div style={{ 
                                                            width: `${Math.min(evt.tasa_ocupacion, 100)}%`, 
                                                            height: "100%", 
                                                            backgroundColor: colorBarra,
                                                            transition: "width 0.5s ease, background-color 0.5s ease"
                                                        }} />
                                                    </div>
                                                    <span style={{ fontSize: "0.85rem", fontWeight: "bold", color: colorBarra }}>
                                                        {evt.tasa_ocupacion}%
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {ocupacionFiltrada.length === 0 && (
                            <p className="no-data" style={{ padding: "20px", textAlign: "center", color: "#94a3b8" }}>
                                No hay eventos que coincidan con este filtro.
                            </p>
                        )}
                </div>
            </div>
        </div>
        {/* ════════ MODAL: TERMÓMETRO DE CONVOCATORIA ════════ */}
            <ModalTermometro 
                evento={eventoModal} 
                onClose={() => setEventoModal(null)} 
            />
        {/* Modal de Ficha del Organizador */}
            <ModalPerfilOrganizador 
                organizador={organizadorModal} 
                onClose={() => setOrganizadorModal(null)} 
            />
    </div> 

    );
}