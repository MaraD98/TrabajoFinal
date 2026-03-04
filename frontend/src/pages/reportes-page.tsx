import { useState, useEffect, useRef } from "react";
import "../styles/reportes.css";
import { Navbar } from "../components/navbar";
import { Footer } from "../components/footer";
import { useAuth } from "../context/auth-context";
import { getReporteGeneral, exportReporteCSV } from "../services/eventos";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
// Componentes para sección Admin
import type { DetalleRecaudacion } from "../components/modals/reportesModal/EventoDetalleModal";
import { EventoDetalleModal } from "../components/modals/reportesModal/EventoDetalleModal";
import SeccionAdministrador from "../components/reportes/SeccionAdministrador";
// Componentes para Supervisor y admin
import { ModalFinanciero } from "../components/modals/reportesModal/ModalFinanciero";
import { ModalEventosGlobal } from "../components/modals/reportesModal/ModalEventosGlobal";
import { ModalParticipantes } from "../components/modals/reportesModal/ModalParticipantes";
import { ModalFiltroTorta } from "../components/modals/reportesModal/ModalFiltroTorta";
import { ModalAdminEvento } from "../components/modals/reportesModal/ModalAdminEvento";
import { ModalSupervisor } from "../components/modals/reportesModal/ModalSupervisor";
import { SeccionSupervisor } from "../components/reportes/SeccionSupervisor";
import { ModalListaEventos } from "../components/modals/reportesModal/ModalListaEventos";
// Componentes para sección Organizador Externo
import { SeccionOrganizadorExterno } from "../components/reportes/SeccionOrganizadorExterno";
// Componentes para sección Cliente
import { SeccionCliente } from "../components/reportes/SeccionCliente";
import {
    ResponsiveContainer,    
    Legend,
    PieChart,
    Pie,
    Cell,
    Tooltip
} from "recharts";
import { useMemo } from 'react'; 

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ReporteData {
  total_eventos?: number;
  eventos_por_estado?: { estado: number; cantidad: number }[];
  eventos_por_usuario?: { usuario: number; cantidad: number }[];
  eventos_por_mes?: { anio: number; mes: number; cantidad: number }[];
  usuarios_total?: number;
  usuarios_por_rol?: { rol: number; cantidad: number }[];
  eventos_por_tipo?: { tipo: string; cantidad: number }[];
  eventos_por_dificultad?: { dificultad: string; cantidad: number }[];
  solicitudes_externas?: { estado: string; cantidad: number }[];
  mis_eventos_total?: number;
  mis_eventos_por_estado?: { estado: number; cantidad: number }[];
  mis_inscripciones?: any[];
  mis_notificaciones?: any[];
  eventos_por_ubicacion?: { ubicacion: string; cantidad: number }[];
  lista_eventos_detallada?: any[];
  rendimiento_por_tipo?: { tipo: string; cantidad: number }[];
  total_reservas_recibidas?: number;
  recaudacion_total?: number;
  detalle_recaudacion?: DetalleRecaudacion[];
  tendencias_ubicacion?: any[];
  tendencias_ubicacion_completa?: any[];
  top_10_recaudacion?: any[];
  usuarios_nuevos?: any[];
  analisis_organizadores?: { id_usuario: number; organizador: string; email: string; rol: string; total_eventos: number; activos: number; finalizados: number; recaudacion_total: number; }[];
  top_ocupacion?: { id_evento: number; nombre_evento: string; cupo_maximo: number; inscriptos_pagos: number; reservados_no_pagos: number; total_ocupado: number; tasa_ocupacion: number; es_pago: boolean; }[];
  dashboard_eventos?: { id_evento: number; nombre_evento: string; fecha_evento: string; responsable: string; estado: string; pertenencia: string; }[];
}


// ─── Componente principal ─────────────────────────────────────────────────────

export default function ReportesPage() {

  // ── Estado ──────────────────────────────────────────────────────────────
  const [reporteData, setReporteData] = useState<ReporteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportando, setExportando] = useState<string | null>(null);
  const [estadoAbierto, setEstadoAbierto] = useState<number | null>(null);
  const [eventoDetalle, setEventoDetalle] = useState<DetalleRecaudacion | null>(null);
  const [listaEventosFiltro, setListaEventosFiltro] = useState<'Propio' | 'Externo' | null>(null);

  // Sort tabla de solicitudes
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  // Tendencias
  const [filtroTipoTendencias, setFiltroTipoTendencias] = useState<string>("");

  // Recaudación
  const [busquedaEvento, setBusquedaEvento] = useState<string>("");
  const [filtroEstadoRecaudacion, setFiltroEstadoRecaudacion] = useState<"todos" | "activos" | "pasados">("todos");
  const [filtroTipoRecaudacion, setFiltroTipoRecaudacion] = useState<string>("");
  const [sortFinanzas, setSortFinanzas] = useState<{
    key: "nombre" | "fecha" | "monto" | "cupo" | "unitario";
    direction: "asc" | "desc";
  }>({ key: "fecha", direction: "desc" });
  const rolLabel: Record<number, string> = {
    1: "ADMINISTRADOR",
    2: "SUPERVISOR",
    3: "ORGANIZADOR EXTERNO",
    4: "CLIENTE"
  };

  // Estados exclusivos para Supervisor
  type OrganizadorKey = "organizador" | "total_eventos" | "activos" | "finalizados" | "recaudacion_total" | "rol";

  const [sortConfigOrg, setSortConfigOrg] = useState<{ key: OrganizadorKey | null, direction: 'asc' | 'desc' | null }>({ key: 'recaudacion_total', direction: 'desc' });
  const [filtroRolOrg] = useState<string>('todos'); // <-- NUEVO ESTADO PARA EL FILTRO

  // Mantenemos tu modalDashboard intacto:
  const [modalDashboard, setModalDashboard] = useState<{ isOpen: boolean, title: string, data: any[] }>({ isOpen: false, title: "", data: [] });

  // Función para ordenar la tabla de Organizadores Externos
  const handleSortOrg = (key: OrganizadorKey) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfigOrg.key === key && sortConfigOrg.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfigOrg({ key, direction });
  };

  // 1. Primero filtramos por rol
  let organizadoresFiltrados = reporteData?.analisis_organizadores || [];
  if (filtroRolOrg !== 'todos') {
    organizadoresFiltrados = organizadoresFiltrados.filter((org: any) => org.rol === filtroRolOrg);
  }

  // 2. Luego ordenamos la lista que ya filtramos
  const sortedOrganizadores = [...organizadoresFiltrados].sort((a: any, b: any) => {
    if (!sortConfigOrg.key) return 0;
    if (a[sortConfigOrg.key] < b[sortConfigOrg.key]) return sortConfigOrg.direction === 'asc' ? -1 : 1;
    if (a[sortConfigOrg.key] > b[sortConfigOrg.key]) return sortConfigOrg.direction === 'asc' ? 1 : -1;
    return 0;
  });

  // Estados para el Filtro Global de Fechas
  const [fechaInicio, setFechaInicio] = useState<string>("");
  const [fechaFin, setFechaFin] = useState<string>("");
  const [filtroPertenencia, setFiltroPertenencia] = useState("todos");


  // ── Label helpers ─────────────────────────────────────────────────────────
  const getNombreEstado = (id: number) =>
    (({ 1: "Borrador", 2: "Pendiente", 3: "Publicado", 4: "Finalizado", 5: "Cancelado" } as Record<number, string>)[id] || `Estado ${id}`);

  // --- Ordenamiento para la tabla de Ocupación ---
  const [sortConfigOcupacion, setSortConfigOcupacion] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'tasa_ocupacion', direction: 'desc' });
  const [filtroOcupacion, setFiltroOcupacion] = useState<'todos' | 'riesgo' | 'exito'>('todos');
  
  const handleSortOcupacion = (key: string) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfigOcupacion.key === key && sortConfigOcupacion.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfigOcupacion({ key, direction });
  };

  const sortedOcupacion = [...(reporteData?.top_ocupacion || [])].sort((a: any, b: any) => {
    if (a[sortConfigOcupacion.key] < b[sortConfigOcupacion.key]) return sortConfigOcupacion.direction === 'asc' ? -1 : 1;
    if (a[sortConfigOcupacion.key] > b[sortConfigOcupacion.key]) return sortConfigOcupacion.direction === 'asc' ? 1 : -1;
    return 0;
  });
  const ocupacionFiltrada = sortedOcupacion.filter(evt => {
    if (filtroOcupacion === 'riesgo') return evt.tasa_ocupacion < 40;
    if (filtroOcupacion === 'exito') return evt.tasa_ocupacion >= 40;
    return true;
});

  // Funciones para procesar el Dashboard
  const evtSist = reporteData?.dashboard_eventos || [];
  const statsSist = {
    Activo: { Propios: 0, Externos: 0, Total: 0 },
    Finalizado: { Propios: 0, Externos: 0, Total: 0 },
    Cancelado: { Propios: 0, Externos: 0, Total: 0 }
  };

  evtSist.forEach(e => {
    // Verificamos que el estado exista en nuestro diccionario (Activo, Finalizado o Cancelado)
    if (e.estado && statsSist[e.estado as keyof typeof statsSist]) {
      const tipo = e.pertenencia === "Propio" ? "Propios" : "Externos";
      statsSist[e.estado as keyof typeof statsSist][tipo] += 1;
      statsSist[e.estado as keyof typeof statsSist].Total += 1;
    }
  });

  const handleChartClick = (estadoFiltroPlural: string, tipoFiltro: string | null = null) => {
    // Reconvertimos el plural visual al singular del backend para poder filtrar la tabla del modal
    const estadoSingular = estadoFiltroPlural === 'Activos' ? 'Activo' : estadoFiltroPlural === 'Finalizados' ? 'Finalizado' : 'Cancelado';
    
    const filtrados = evtSist.filter(e => 
      e.estado === estadoSingular && (!tipoFiltro || e.pertenencia === tipoFiltro)
    );
    const title = tipoFiltro ? `Eventos ${estadoFiltroPlural} (${tipoFiltro}s)` : `Todos los Eventos ${estadoFiltroPlural}`;
    setModalDashboard({ isOpen: true, title, data: filtrados });
  };

  const reporteRef = useRef<HTMLDivElement>(null);
  const { user, getToken, loadingAuth } = useAuth();
  const usuarioRol = user?.id_rol || 0;

  // Estado para el Modal de Detalles de Gráficos de Torta
  const [modalFiltroTorta, setModalFiltroTorta] = useState<{ titulo: string; filtroKey: string; valor: string; dataFiltrada?: any[] } | null>(null);
  const [modalAdminEvento, setModalAdminEvento] = useState<any | null>(null);
  // Estado para el Modal de Análisis Financiero
  const [modalFinanciero, setModalFinanciero] = useState<boolean>(false);
  // Estados para los Modales de Eventos y Participantes
  const [modalEventosGlobal, setModalEventosGlobal] = useState<boolean>(false);
  const [modalParticipantes, setModalParticipantes] = useState<boolean>(false);
  

// 1. Agrupar usuarios nuevos por Mes (MM/YYYY) y por Día (CON FILTROS APLICADOS)
  const usuariosPorMes = useMemo(() => {
    // A. Filtramos la lista original primero
    const usuariosFiltrados = (reporteData?.usuarios_nuevos || []).filter((user: any) => {
      // -- Filtro de Fechas --
      if (fechaInicio || fechaFin) {
        const fc = user.fecha_creacion || "";
        const partes = fc.split('/');
        if (partes.length === 3) {
          // Convertimos DD/MM/YYYY a un objeto Date real para comparar
          const fechaUser = new Date(`${partes[2]}-${partes[1]}-${partes[0]}T12:00:00`); 
          
          if (fechaInicio) {
            const inicio = new Date(`${fechaInicio}T00:00:00`);
            if (fechaUser < inicio) return false;
          }
          if (fechaFin) {
            const fin = new Date(`${fechaFin}T23:59:59`);
            if (fechaUser > fin) return false;
          }
        }
      }

      // -- Filtro de Pertenencia --
      const rolUser = user.rol || "";
      // Definimos exactamente qué rol es qué cosa
      const esPropio = rolUser === "Administrador" || rolUser === "Supervisor";
      const esExterno = rolUser === "Organización Externa" || rolUser === "Cliente";

      if (filtroPertenencia === "propios" && !esPropio) return false;
      if (filtroPertenencia === "externos" && !esExterno) return false;

      // Si pasa los filtros, se queda
      return true;
    });

    // B. Ahora sí, hacemos el reduce sobre la lista ya filtrada
    return usuariosFiltrados.reduce((acc: any, user: any) => {
      const fc = user.fecha_creacion || ""; // "DD/MM/YYYY"
      const partes = fc.split('/');
      let mesAnio = "Sin Fecha";
      let dia = "";
      
      if (partes.length === 3) {
        mesAnio = `${partes[1]}/${partes[2]}`; // "MM/YYYY"
        dia = partes[0]; // "DD"
      }

      if (!acc[mesAnio]) {
        acc[mesAnio] = { total: 0, usuarios: [], dias: {} };
      }
      
      acc[mesAnio].total += 1;
      acc[mesAnio].usuarios.push(user);
      
      if (dia) {
        if (!acc[mesAnio].dias[dia]) {
          acc[mesAnio].dias[dia] = { clientes: 0, organizaciones: 0, administradores: 0, supervisores: 0 };
        }
        
        // Sumamos exactamente al rol que corresponde
        const rol = user.rol || "";
        if (rol === 'Cliente') {
          acc[mesAnio].dias[dia].clientes += 1;
        } else if (rol === 'Organización Externa') {
          acc[mesAnio].dias[dia].organizaciones += 1;
        } else if (rol === 'Administrador') {
          acc[mesAnio].dias[dia].administradores += 1;
        } else if (rol === 'Supervisor') {
          acc[mesAnio].dias[dia].supervisores += 1;
        }
      }
      
      return acc;
    }, {});
  }, [reporteData?.usuarios_nuevos, fechaInicio, fechaFin, filtroPertenencia]); // <- Se actualiza si tocás los filtros

  // Ordenar los meses de más reciente a más viejo
  const mesesOrdenados = useMemo(() => {
    return Object.keys(usuariosPorMes).sort((a, b) => {
        if (a === "Sin Fecha") return 1;
        if (b === "Sin Fecha") return -1;
        const [mesA, anioA] = a.split('/');
        const [mesB, anioB] = b.split('/');
        if (anioA !== anioB) return parseInt(anioB) - parseInt(anioA);
        return parseInt(mesB) - parseInt(mesA);
    });
  }, [usuariosPorMes]);


  // 3. Calcular el máximo de eventos en una provincia para dibujar la barra de calor
  const maxEventosProvincia = Math.max(...(reporteData?.tendencias_ubicacion_completa?.map((p: any) => p.total_eventos) || [1]));

  const TIPOS_EVENTO = [
    "Ciclismo de Ruta",
    "Mountain Bike (MTB)",
    "Rural Bike",
    "Gravel",
    "Cicloturismo",
    "Entrenamiento / Social",
  ];

  // ── Effects ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loadingAuth) {
      const token = getToken();
      if (token) cargarReportes(token);
      else setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingAuth]);

  // ── Acciones ──────────────────────────────────────────────────────────────
  const cargarReportes = async (tokenParam?: string) => {
    try {
      setLoading(true); setError(null);
      const token = tokenParam || getToken();
      if (!token) { setError("No se encontró una sesión activa."); return; }
      const data = await getReporteGeneral(token, undefined, undefined);
      setReporteData(data);
    } catch (err: any) {
      setError(err?.response?.status === 401 ? "Sesión expirada. Iniciá sesión nuevamente." : "Error al cargar reportes.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportarCSV = async (tipo: string) => {
    try {
      const token = getToken();
      if (!token) return alert("Sesión no válida");
      setExportando(tipo);
      await exportReporteCSV(tipo, token);
    } catch {
      alert("Error al exportar el reporte CSV");
    } finally {
      setExportando(null);
    }
  };

  const handleDescargarPDF = async () => {
    if (!reporteRef.current) return;
    try {
      setExportando("pdf");
      const canvas = await html2canvas(reporteRef.current, { scale: 2, backgroundColor: "#080808" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const w = pdf.internal.pageSize.getWidth();
      const imgProps = pdf.getImageProperties(imgData);
      pdf.addImage(imgData, "PNG", 0, 0, w, (imgProps.height * w) / imgProps.width);
      pdf.save(`reporte-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      alert("No se pudo generar el PDF");
    } finally {
      setExportando(null);
    }
  };

  // ── Sort helpers ──────────────────────────────────────────────────────────
  const handleSort = (key: string) => {
    setSortConfig((prev) =>
      !prev || prev.key !== key
        ? { key, direction: "asc" }
        : { key, direction: prev.direction === "asc" ? "desc" : "asc" }
    );
  };

  const si = (key: string) =>
    sortConfig?.key === key ? (sortConfig.direction === "asc" ? " ↑" : " ↓") : "";

  const handleSortFin = (key: "nombre" | "fecha" | "monto" | "cupo" | "unitario") => {
    setSortFinanzas((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const sif = (key: string) =>
    sortFinanzas.key === key ? (sortFinanzas.direction === "asc" ? " ↑" : " ↓") : "";

  const sortedLista = (lista: any[]) => {
    if (!sortConfig) return lista;
    return [...lista].sort((a: any, b: any) => {
      let cmp = 0;
      if (sortConfig.key === "nombre") cmp = String(a.nombre || "").localeCompare(String(b.nombre || ""));
      else if (sortConfig.key === "fecha") cmp = new Date(a.fecha_evento).getTime() - new Date(b.fecha_evento).getTime();
      else if (sortConfig.key === "reservas") cmp = (a.reservas ?? 0) - (b.reservas ?? 0);
      return sortConfig.direction === "asc" ? cmp : -cmp;
    });
  };

// ── Gráficos ──────────────────────────────────────────────────────────────
  const renderGraficoTorta = (datos: any[], keyName: string, valName: string, tituloModal: string, listaEventos?: any[]) => {
    if (!datos || datos.length === 0) return <p className="no-data">No hay datos suficientes para mostrar.</p>;
  
    const datosOrdenados = [...datos].sort((a, b) => Number(b[valName]) - Number(a[valName]));
    const total = datosOrdenados.reduce((sum, item) => sum + Number(item[valName]), 0);
    const colores = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];
  
    return (
      <div style={{ width: "100%", height: "250px", display: "flex", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: "550px", height: "100%" }}>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={datosOrdenados}
                cx="40%" 
                cy="50%"
                innerRadius={0} 
                outerRadius={90}
                dataKey={valName}
                nameKey={keyName}
                onClick={(data) => {
                  const valorClickeado = data?.payload ? data.payload[keyName] : data[keyName];
                  if (valorClickeado) {
                    setModalFiltroTorta({ 
                      titulo: tituloModal, 
                      filtroKey: keyName, 
                      valor: valorClickeado, 
                      // 🔥 ACÁ ESTÁ LA MAGIA: Si nos pasaron la lista de eventos, la filtramos por la categoría clickeada
                      dataFiltrada: listaEventos 
                        ? listaEventos.filter(e => String(e[keyName]) === String(valorClickeado))
                        : [] 
                    });
                  }
                }}
                style={{ cursor: 'pointer', outline: "none" }}
                animationBegin={0}
                animationDuration={800}
              >
                {datosOrdenados.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={colores[index % colores.length]} style={{ outline: "none" }} />
                ))}
              </Pie>
              
              <Tooltip 
                formatter={(value: any, name: any) => {
                  const numValue = Number(value);
                  const porcentaje = total > 0 ? ((numValue / total) * 100).toFixed(1) : 0;
                  return [`${numValue} inscriptos (${porcentaje}%)`, name];
                }}
                contentStyle={{ backgroundColor: "#1e1e1e", borderColor: "#444", borderRadius: "8px", color: "#fff" }}
                itemStyle={{ color: "#fff", fontWeight: "bold" }}
              />
              
              <Legend 
                layout="vertical"
                verticalAlign="middle"
                align="right"
                iconType="circle"
                wrapperStyle={{ fontSize: "0.9rem" }}
                formatter={(value: any, entry: any) => {
                  const itemValor = entry.payload[valName];
                  const porcentaje = total > 0 ? ((Number(itemValor) / total) * 100).toFixed(1) : 0;
                  return (
                    <span style={{ color: "#f8fafc", fontWeight: "bold" }}>
                      {value} <span style={{ color: "#94a3b8", fontWeight: "normal" }}>({itemValor} - {porcentaje}%)</span>
                    </span>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  // ── Datos derivados ───────────────────────────────────────────────────────

  const detalleRecaudacionFiltrado: DetalleRecaudacion[] = (reporteData?.detalle_recaudacion ?? [])
    .filter((item: DetalleRecaudacion) => {
      const mb = item.nombre_evento.toLowerCase().includes(busquedaEvento.toLowerCase());
      const mt = filtroTipoRecaudacion === "" || item.tipo === filtroTipoRecaudacion;
      if (filtroEstadoRecaudacion === "activos") return mb && mt && item.estado_evento === 3;
      if (filtroEstadoRecaudacion === "pasados") return mb && mt && item.estado_evento === 4;
      return mb && mt;
    })
    .sort((a: DetalleRecaudacion, b: DetalleRecaudacion) => {
      const { key, direction } = sortFinanzas;
      let cmp = 0;
      if (key === "nombre") cmp = a.nombre_evento.localeCompare(b.nombre_evento);
      else if (key === "fecha") cmp = new Date(a.fecha_evento).getTime() - new Date(b.fecha_evento).getTime();
      else if (key === "monto") cmp = a.monto - b.monto;
      else if (key === "unitario") cmp = a.monto_unitario - b.monto_unitario;
      else if (key === "cupo") cmp = (a.inscriptos_count ?? 0) - (b.inscriptos_count ?? 0);
      return direction === "asc" ? cmp : -cmp;
    });

  const totalRecaudacionFiltrado = detalleRecaudacionFiltrado.reduce(
    (s: number, item: DetalleRecaudacion) => s + item.monto, 0
  );



  // ── Guards de render ──────────────────────────────────────────────────────
  if (loadingAuth || loading) {
    return (
      <div className="reportes-page">
        <div className="reportes-loading">
          <div className="spinner-large" />
          <p>Cargando panel...</p>
        </div>
      </div>
    );
  }

  if (!getToken()) {
    return (
      <div className="reportes-page">
        <div className="reportes-alert reportes-alert--error">
          <span className="reportes-alert__icon">🔒</span>
          <span className="reportes-alert__message">Debes iniciar sesión para acceder.</span>
          <button
            onClick={() => (window.location.href = "/login")}
            className="reportes-alert__retry"
          >
            Ir al Login
          </button>
        </div>
      </div>
    );
  }
  // 💰 CÁLCULOS FINANCIEROS GLOBALES (Ingresos Netos)
  const eventosDetalle = reporteData?.lista_eventos_detallada || [];
  console.log("Primer evento:", eventosDetalle[0]);
  // Función para limpiar montos (por si viene "$16.000")
  const limpiarMonto = (valor: any): number => {
    if (typeof valor === 'number') return valor;
    if (!valor) return 0;
    const limpio = valor.toString().replace(/\./g, '').replace('$', '').replace(',', '.').trim();
    return parseFloat(limpio) || 0;
  };

  let recaudadoPropios = 0;
  let recaudadoExternos = 0;

  eventosDetalle.forEach((ev: any) => {
    const costo = limpiarMonto(ev.costo_participacion);
    // Usamos los pagantes reales
   const pagantes = Number(ev.reservas) || 0;
    const recaudacionDelEvento = costo * pagantes;

    if (ev.pertenencia === "Propio") {
      recaudadoPropios += recaudacionDelEvento; // Plataforma se queda con el 100%
    } else if (ev.pertenencia === "Externo") {
      recaudadoExternos += (recaudacionDelEvento * 0.10); // Plataforma se queda con el 10% (Comisión)
    }
  });

  // El total real que entra a la plataforma
  const totalRecaudadoGlobal = recaudadoPropios + recaudadoExternos;

  const cantidadGratuitos = eventosDetalle.filter((ev: any) => limpiarMonto(ev.costo_participacion) === 0).length;
  const cantidadPagos = eventosDetalle.length - cantidadGratuitos;
  // 👥 CÁLCULOS: PARTICIPANTES Y AUDIENCIA
  const ocupacionData = reporteData?.top_ocupacion || [];
  const totalConfirmadas = ocupacionData.reduce((acc: number, ev: any) => acc + (Number(ev.inscriptos_pagos) || 0), 0);
  const totalPendientes = ocupacionData.reduce((acc: number, ev: any) => acc + (Number(ev.reservados_no_pagos) || 0), 0);
  const cupoTotalSistema = ocupacionData.reduce((acc: number, ev: any) => acc + (Number(ev.cupo_maximo) || 0), 0);
  const promedioParticipantes = ocupacionData.length > 0 ? Math.round(totalConfirmadas / ocupacionData.length) : 0;
  const ocupacionGlobal = cupoTotalSistema > 0 ? ((totalConfirmadas / cupoTotalSistema) * 100).toFixed(1) : "0";
  // 📅 CÁLCULOS: EVENTOS GLOBALES
  const totalEventosGlobal = eventosDetalle.length;
  const hoyStr = new Date().toISOString().split('T')[0];
  const eventosFuturos = eventosDetalle.filter((ev: any) => ev.fecha_evento >= hoyStr && ev.fecha_evento !== "Sin fecha").length;
  const eventosPasados = totalEventosGlobal - eventosFuturos;
  const eventosPropiosCount = eventosDetalle.filter((ev: any) => ev.pertenencia === "Propio").length;
  const eventosExternosCount = eventosDetalle.filter((ev: any) => ev.pertenencia === "Externo").length;

    // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div className="reportes-page">
      <Navbar />

      {eventoDetalle && (
        <EventoDetalleModal evento={eventoDetalle} onClose={() => setEventoDetalle(null)} />
      )}


        {/* Errores */}
        {error && (
          <div style={{ 
            background: "#1a0a0a", border: "1px solid #7f1d1d", borderRadius: "8px", 
            padding: "14px 20px", marginBottom: "24px", color: "#fca5a5", 
            display: "flex", gap: "10px", alignItems: "center"
          }}>
            <span>⚠️</span> {error}
            <button 
              onClick={() => cargarReportes()} 
              style={{ 
                marginLeft: "auto", padding: "6px 14px", background: "transparent", 
                border: "1px solid #7f1d1d", borderRadius: "6px", color: "#fca5a5", cursor: "pointer" 
              }}
            >
              Reintentar
            </button>
          </div>
        )}

        {/* ─── CONTENIDO PRINCIPAL (reporteRef) ─── */}
      <div ref={reporteRef} style={{ maxWidth: "1400px", margin: "0 auto", padding: "32px 24px" }}>

        {/* Header */}
        <div className="reportes-header">
          <div>
            <h1 className="reportes-header__title">Módulo de Reportes</h1>
            <p className="reportes-header__subtitle">
              Sección de datos y reportes centralizados para el perfil de
            </p>
            <span style={{ 
            padding: "2px 10px", background: "#161616", border: "1px solid #2a2a2a", 
            borderRadius: "20px", fontSize: "0.72rem", color: "#d7d7d7" 
          }}>
            {rolLabel[usuarioRol] ?? `Rol ${usuarioRol}`}
          </span>
          {user?.nombre_y_apellido && (
            <span style={{ fontSize: "0.78rem", color: "#d7d7d7" }}>: {user.nombre_y_apellido}</span>
          )}
            <p style={{ margin: "6px 0 0", color: "#d7d7d7", fontSize: "0.88rem" }}>
            Última actualización: {new Date().toLocaleString("es-AR", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: false 
            })}
         </p>
          </div>
          <div style={{ display: "flex", gap: "10px", justifyContent: "right"}}>
          <button
            onClick={() => cargarReportes()}
            style={{ 
              padding: "8px 18px",border: "1px solid #d7d7d7", 
              borderRadius: "7px", color: "#d7d7d7", fontSize: "0.82rem", cursor: "pointer"
            }}
          >
            ↻ Actualizar
          </button>
          <button
            onClick={handleDescargarPDF}
            disabled={exportando === "pdf"}
            style={{ 
              padding: "10px 20px", background: "#e74c3c", border: "none",
              borderRadius: "8px", color: "#fff", fontWeight: "bold",
              cursor: exportando === "pdf" ? "not-allowed" : "pointer",
              opacity: exportando === "pdf" ? 0.6 : 1
            }}
          >
            {exportando === "pdf" ? "Generando PDF..." : "⬇ Guardar PDF"}
          </button>
        </div>
        </div>

      {/* --- FILTRO GLOBAL DE FECHAS Y PERTENENCIA --- */}
      <div className="grafico-card grafico-card--wide" style={{ 
        marginBottom: "20px",
        position: "sticky", 
        top: "80px", 
        zIndex: 90, 
        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.6)"
      }}>
        
        <div className="grafico-card__header">
          <h3>🎛️ Filtros Generales de Reportes</h3>
          
          {(fechaInicio || fechaFin || (usuarioRol < 3 && filtroPertenencia !== "todos")) && (
            <button 
              onClick={() => { 
                setFechaInicio(""); 
                setFechaFin(""); 
                if (usuarioRol < 3) setFiltroPertenencia("todos"); 
              }}
              className="btn-export"
              style={{ backgroundColor: "#e63946", color: "white", borderColor: "#e63946" }}
            >
              ✖ Limpiar Filtros
            </button>
          )}
        </div>

        <div className="grafico-card__body" style={{ display: "flex", gap: "20px", flexWrap: "wrap", alignItems: "flex-end" }}>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <label className="stat-card__label">Fecha Desde</label>
            <input 
              type="date" 
              value={fechaInicio} 
              onChange={(e) => setFechaInicio(e.target.value)}
              // Mantuve los estilos del input por si no tenés una clase "filter-input" todavía
              style={{ padding: "8px", borderRadius: "5px", border: "1px solid #444", backgroundColor: "#2a2a2a", color: "#fff", outline: "none" }}
            />
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <label className="stat-card__label">Fecha Hasta</label>
            <input 
              type="date" 
              value={fechaFin} 
              onChange={(e) => setFechaFin(e.target.value)}
              style={{ padding: "8px", borderRadius: "5px", border: "1px solid #444", backgroundColor: "#2a2a2a", color: "#fff", outline: "none" }}
            />
          </div>

          {/* 👁️ Filtro de Pertenencia SOLO para roles 1 y 2 */}
          {usuarioRol < 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              <label className="stat-card__label">Origen del Evento</label>
              <select
                value={filtroPertenencia}
                onChange={(e) => setFiltroPertenencia(e.target.value)}
                className="filter-select"
              >
                <option value="todos">Todos los eventos</option>
                <option value="propios">Propios (Empresa)</option>
                <option value="externos">Externos (Organizadores)</option>
              </select>
            </div>
          )}
          
        </div>
      </div>

        {/* ─── Renderizado por Rol ─── */}

       {/* ── SECCIÓN ADMINISTRADOR ────────────────────────────────── */}
        <SeccionAdministrador
          // 1. Datos Generales
          usuarioRol={usuarioRol}
          reporteData={reporteData}
          usuariosPorMes={usuariosPorMes}
          mesesOrdenados={mesesOrdenados}
          maxEventosProvincia={maxEventosProvincia}
          fechaInicio={fechaInicio}
          fechaFin={fechaFin}
          filtroPertenencia={filtroPertenencia}

          // 2. Métricas - Eventos
          totalEventosGlobal={totalEventosGlobal}
          eventosFuturos={eventosFuturos}
          eventosPasados={eventosPasados}
          eventosPropiosCount={eventosPropiosCount}
          eventosExternosCount={eventosExternosCount}
          onVerPropios={() => setListaEventosFiltro('Propio')}
          onVerExternos={() => setListaEventosFiltro('Externo')}

          // 3. Métricas - Participantes
          totalConfirmadas={totalConfirmadas}
          totalPendientes={totalPendientes}
          promedioParticipantes={promedioParticipantes}
          ocupacionGlobal={ocupacionGlobal}

          // 4. Métricas - Financiero
          totalRecaudadoGlobal={totalRecaudadoGlobal}
          recaudadoPropios={recaudadoPropios}
          recaudadoExternos={recaudadoExternos}
          cantidadGratuitos={cantidadGratuitos}
          cantidadPagos={cantidadPagos}

          // 5. Funciones para abrir Modales (estados que viven en ReportesPage)
          setModalEventosGlobal={setModalEventosGlobal}
          setModalParticipantes={setModalParticipantes}
          setModalFinanciero={setModalFinanciero}
          setModalAdminEvento={setModalAdminEvento}

          // --- NUEVOS PROPS (Gráficos y Tendencias) ---
          setModalFiltroTorta={setModalFiltroTorta}
          exportando={exportando}
          handleExportarCSV={handleExportarCSV}
          renderGraficoTorta={renderGraficoTorta}
          filtroTipoTendencias={filtroTipoTendencias}
          setFiltroTipoTendencias={setFiltroTipoTendencias}
          TIPOS_EVENTO={TIPOS_EVENTO}
        />

        
      {/* ════════════════════════════════════════════════════════════════
            MODAL DETALLE EVENTO ADMIN (BOTÓN VER MÁS)
        ════════════════════════════════════════════════════════════════ */}
        <ModalAdminEvento 
          evento={modalAdminEvento} 
          onClose={() => setModalAdminEvento(null)} 
        />
        {/* ════════════════════════════════════════════════════════════════
            MODAL DETALLE DE GRÁFICOS (POR TIPO Y DIFICULTAD)
        ════════════════════════════════════════════════════════════════ */}
        <ModalFiltroTorta 
          filtro={modalFiltroTorta} 
          onClose={() => setModalFiltroTorta(null)} 
          
          // 👇 Prioriza dataFiltrada, si no existe usa la lista detallada
          eventos={modalFiltroTorta?.dataFiltrada || reporteData?.lista_eventos_detallada || []} 
          usuarioRol={usuarioRol}
        />
        {/* ════════════════════════════════════════════════════════════════
            MODAL DETALLE FINANCIERO (TODOS LOS EVENTOS)
        ════════════════════════════════════════════════════════════════ */}
        <ModalFinanciero 
          isOpen={modalFinanciero} 
          onClose={() => setModalFinanciero(false)} 
          eventos={eventosDetalle} 
        />
        {/* ════════════════════════════════════════════════════════════════
            MODAL 1: DIRECTORIO GLOBAL DE EVENTOS
        ════════════════════════════════════════════════════════════════ */}
        <ModalEventosGlobal 
          isOpen={modalEventosGlobal} // (O el nombre de tu estado que lo abre)
          onClose={() => setModalEventosGlobal(false)} 
          totalEventosGlobal={totalEventosGlobal}
          eventosFuturos={eventosFuturos}
          eventosPasados={eventosPasados}
          eventosPropiosCount={eventosPropiosCount}
          eventosExternosCount={eventosExternosCount}
        />
        {/* ════════════════════════════════════════════════════════════════
            MODAL VIEJO RESCATADO (La tabla al tocar la lupa 🔍)
        ════════════════════════════════════════════════════════════════ */}
        <ModalListaEventos 
          isOpen={listaEventosFiltro !== null}
          onClose={() => setListaEventosFiltro(null)}
          // Filtramos automáticamente según el botón que tocó:
          eventos={eventosDetalle.filter((e: any) => e.pertenencia === listaEventosFiltro)}
          titulo={`Listado de Eventos ${listaEventosFiltro === 'Propio' ? 'Propios' : 'Externos'}`}
        />

        {/* ════════════════════════════════════════════════════════════════
            MODAL 2: DETALLE DE OCUPACIÓN Y PARTICIPANTES
        ════════════════════════════════════════════════════════════════ */}
        <ModalParticipantes 
        isOpen={modalParticipantes} 
        onClose={() => setModalParticipantes(false)} 
        eventos={reporteData?.top_ocupacion || []} 
      />

        {/* ════════════════════════════════════════════════════════════════
               ROL 2 — SUPERVISOR (Panel Exclusivo)
            ═══════════════════════════════════════════════════════════════ */}
          {/* MODAL DEL DASHBOARD SUPERVISOR */}
          <ModalSupervisor 
            modal={modalDashboard} 
            onClose={() => setModalDashboard({ isOpen: false, title: "", data: [] })} 
          />
        {usuarioRol <= 2 && (
            <SeccionSupervisor 
                handleExportarCSV={handleExportarCSV}
                handleChartClick={handleChartClick}
                fechaInicio={fechaInicio} 
                fechaFin={fechaFin}
                evtSist={evtSist}
                handleSortOrg={handleSortOrg}
                sortConfigOrg={sortConfigOrg}
                sortedOrganizadores={sortedOrganizadores}
                handleSortOcupacion={handleSortOcupacion}
                sortConfigOcupacion={sortConfigOcupacion}
                ocupacionFiltrada={ocupacionFiltrada}
                filtroOcupacion={filtroOcupacion}
                setFiltroOcupacion={setFiltroOcupacion}         
                organizadoresFiltrados={sortedOrganizadores} 
                
            />
        )}

        {/* ════════════════════════════════════════════════════════════════
             ROL 3 — ORGANIZADOR EXTERNO (Panel Exclusivo)
        ════════════════════════════════════════════════════════════════ */}
        
        <SeccionOrganizadorExterno
          usuarioRol={usuarioRol}
          reporteData={reporteData}
          estadoAbierto={estadoAbierto}
          setEstadoAbierto={setEstadoAbierto}
          sortedLista={sortedLista}
          getNombreEstado={getNombreEstado}
          handleSort={handleSort}
          si={si}
          renderGraficoTorta={renderGraficoTorta}
          handleExportarCSV={handleExportarCSV}
          totalRecaudacionFiltrado={totalRecaudacionFiltrado}
          detalleRecaudacionFiltrado={detalleRecaudacionFiltrado}
          busquedaEvento={busquedaEvento}
          setBusquedaEvento={setBusquedaEvento}
          filtroEstadoRecaudacion={filtroEstadoRecaudacion}
          setFiltroEstadoRecaudacion={setFiltroEstadoRecaudacion}
          filtroTipoRecaudacion={filtroTipoRecaudacion}
          setFiltroTipoRecaudacion={setFiltroTipoRecaudacion}
          TIPOS_EVENTO={TIPOS_EVENTO}
          handleSortFin={handleSortFin}
          sif={sif}
          setEventoDetalle={setEventoDetalle}
          // 👇 AGREGÁ ESTAS DOS LÍNEAS 👇
          fechaInicio={fechaInicio}
          fechaFin={fechaFin}
          // 👆 ---------------------- 👆
        />
              {/* MODAL FLOTANTE AL HACER CLIC EN LA TORTA */}
          <ModalFiltroTorta 
            filtro={modalFiltroTorta} 
            onClose={() => setModalFiltroTorta(null)} 
            eventos={eventosDetalle} 
            usuarioRol={usuarioRol}
          />


        {/* ════════════════════════════════════════════════════════════════
             ROL 4 — CLIENTE
        ════════════════════════════════════════════════════════════════ */}
        {usuarioRol === 4 && reporteData && (
          <SeccionCliente 
            reporteData={reporteData} 
            onExportarCSV={handleExportarCSV} 
            exportando={exportando}
          />
        )}

      </div>
      <Footer />
    </div>
  );
}