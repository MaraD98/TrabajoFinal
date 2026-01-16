import { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom"; // Comentado por ahora como pediste
import { getEventos, getCurrentUser } from "../services/eventos";
import CancelEventModal from "../components/CancelEventModal";
import "../styles/eventos-page.css"; 

const MAPA_CATEGORIAS: { [key: number]: string } = {
    1: "Carrera",
    2: "Paseo",
    3: "Entrenamiento",
    4: "Cicloturismo"
};

export default function EventosPage() {
  const [eventos, setEventos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // --- ESTADOS PARA FILTROS Y VISTA ---
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState("");
  const [fechaFiltro, setFechaFiltro] = useState("");
  const [vista, setVista] = useState<'grid' | 'list'>('grid'); // 'grid' o 'list'

  // --- LÓGICA MODAL ---
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(0);
  const [accionTipo, setAccionTipo] = useState<'PROPIO' | 'SOLICITUD' | 'ADMIN' | null>(null);

  // const navigate = useNavigate();

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const user = await getCurrentUser(token);
          setCurrentUser(user);
        } catch (e) { console.error(e); }
      }

      const data = await getEventos();
      const listaEventos = Array.isArray(data) ? data : (data.eventos || []);
      setEventos(listaEventos);
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleOpenModal = (id: number, tipo: 'PROPIO' | 'SOLICITUD' | 'ADMIN') => {
    setSelectedId(id);
    setAccionTipo(tipo);
    setModalOpen(true);
  };

  // --- LOGICA DE FILTRADO EN TIEMPO REAL (VERSIÓN BLINDADA) ---
  const eventosFiltrados = eventos.filter((evento) => {
    
    // 1. DICCIONARIO: TRADUCTOR DE NÚMEROS A PALABRAS
    // Esto conecta los IDs de tu base de datos con los nombres del Select
    const mapaCategorias: { [key: number]: string } = {
    1: "Carrera",
    2: "Paseo",
    3: "Entrenamiento",
    4: "Cicloturismo"
};

    // 2. DETECTIVE DE DATOS
    // Buscamos el ID en las variables más comunes que suelen usar los backends
    const idEncontrado = evento.id_tipo_evento || evento.id_tipo || evento.tipo_evento_id;
    
    // 3. TRADUCCIÓN FINAL
    // Si encontramos un ID numérico, usamos el mapa. Si ya venía texto (raro), usamos el texto.
    let categoriaReal = "Desconocida";
    
    if (idEncontrado && mapaCategorias[idEncontrado]) {
        categoriaReal = mapaCategorias[idEncontrado];
    } else if (typeof evento.tipo_evento === 'string') {
        categoriaReal = evento.tipo_evento;
    }

    // --- APLICACIÓN DE FILTROS ---

    // A. Filtro Texto
    const textoMatch = 
      evento.nombre_evento?.toLowerCase().includes(busqueda.toLowerCase()) ||
      evento.ubicacion?.toLowerCase().includes(busqueda.toLowerCase());

    // B. Filtro Categoría (Usando la traducción que acabamos de hacer)
    // Comparamos peras con peras (Texto con Texto)
    const catMatch = categoria === "" 
        ? true 
        : categoriaReal.toLowerCase() === categoria.toLowerCase();

    // C. Filtro Fecha
    let fechaMatch = true;
    if (fechaFiltro) {
        if (evento.fecha_evento) {
            const fechaEvento = new Date(evento.fecha_evento).toISOString().split('T')[0];
            fechaMatch = fechaEvento === fechaFiltro;
        } else {
            fechaMatch = false; 
        }
    }

    return textoMatch && catMatch && fechaMatch;
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Proximos Eventos</h1>
        <p style={{color: '#666'}}>Encuentra tu próxima competencia</p>
      </div>

      {/* --- BARRA DE FILTROS Y VISTAS --- */}
      <div className="filters-container">
        <div className="filter-group">
          {/* Buscador */}
          <input 
            type="text" 
            placeholder="🔍 Buscar evento..." 
            className="filter-input"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />

          {/* Selector de Categoría */}
          <select 
            className="filter-select"
            value={categoria} 
            onChange={(e) => setCategoria(e.target.value)} // ¡Importante para conectar con el cerebro!
          >
            <option value="">Todas las categorías</option>
            <option value="Carrera">Carrera</option>
            <option value="Paseo">Paseo</option>
            <option value="Entrenamiento">Entrenamiento</option>
            <option value="Cicloturismo">Cicloturismo</option>
          </select>

          {/* Selector de Fecha */}
          <input 
            type="date" 
            className="filter-input"
            value={fechaFiltro}
            onChange={(e) => setFechaFiltro(e.target.value)}
          />
        </div>

        {/* Botones Grid / List */}
        <div className="view-controls">
          <button 
            className={`btn-view ${vista === 'grid' ? 'active' : ''}`}
            onClick={() => setVista('grid')}
            title="Vista de Cuadros"
          >
            ⬜
          </button>
          <button 
            className={`btn-view ${vista === 'list' ? 'active' : ''}`}
            onClick={() => setVista('list')}
            title="Vista de Lista"
          >
            ☰
          </button>
        </div>
      </div>

      {/* --- LISTADO DE EVENTOS --- */}
      {loading ? (
        <p style={{textAlign:'center'}}>Cargando eventos...</p>
      ) : eventosFiltrados.length === 0 ? (
        <div className="empty-state">
          <h2>No se encontraron eventos con estos filtros.</h2>
          <button 
            className="btn-action btn-solicitar-baja" 
            onClick={() => {setBusqueda(''); setCategoria(''); setFechaFiltro('')}}
            style={{marginTop: '10px'}}
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        // Aquí aplicamos la clase 'view-list' si el estado es lista
        <div className={`eventos-container ${vista === 'list' ? 'view-list' : ''}`}>
          {eventosFiltrados.map((evento) => {
            const idUserLogueado = Number(currentUser?.id_usuario || currentUser?.id);
            const idDuenioEvento = Number(evento.id_usuario);
            const esMio = idUserLogueado === idDuenioEvento;
            const soyAdmin = currentUser?.id_rol === 1 || currentUser?.id_rol === 2; 

            let estadoTexto = evento.estado || "Desconocido";
            if (evento.id_estado === 3) estadoTexto = "Publicado";
            if (evento.id_estado === 4) estadoTexto = "CANCELADO";

            return (
              <div key={evento.id} className="card-evento">
                {/* Imagen (Fondo o Placeholder) */}
                <div className="card-image-header">
                    <span className="badge-estado">{estadoTexto}</span>
                </div>

                <div className="card-body">
                  <h3 className="card-title">{evento.nombre_evento}</h3>
                  
                  <div className="card-meta">
                    <span>📅 {new Date(evento.fecha_evento).toLocaleDateString()}</span>
                  </div>
                  <div className="card-meta">
                    <span>📍 {evento.ubicacion}</span>
                  </div>
                  <div className="card-meta">
                    <span>🏆 {MAPA_CATEGORIAS[evento.id_tipo_evento] || MAPA_CATEGORIAS[evento.id_tipo] || MAPA_CATEGORIAS[evento.tipo_evento_id] || evento.tipo_evento || "Sin Categoría"}</span>
                  </div>

                  {/* Botones de Acción (Solo si no está cancelado) */}
                  {estadoTexto !== "CANCELADO" && (
                    <div className="card-footer">
                      {esMio && (
                        <button 
                          className="btn-action btn-cancelar-propio"
                          onClick={() => handleOpenModal(evento.id, 'PROPIO')}
                        >
                          Cancelar mi Evento
                        </button>
                      )}

                      {!esMio && currentUser && !soyAdmin && (
                         <button 
                           className="btn-action btn-solicitar-baja"
                           onClick={() => handleOpenModal(evento.id, 'SOLICITUD')}
                         >
                           Reportar / Baja
                         </button>
                      )}

                      {soyAdmin && (
                         <button 
                           className="btn-action btn-admin-delete"
                           onClick={() => handleOpenModal(evento.id, 'ADMIN')}
                         >
                           🗑️ Eliminar
                         </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CancelEventModal 
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        idEvento={selectedId}
        tipoAccion={accionTipo}
        onSuccess={cargarDatos} 
      />
    </div>
  );
}