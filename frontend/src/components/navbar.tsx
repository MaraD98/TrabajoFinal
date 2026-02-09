import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import logoWakeUp from '../assets/wakeup-logo.png';
import '../styles/navbar.css'; 
import axios from 'axios';
import { NotificacionesBadge } from '../components/notificaciones-badge';

export const Navbar = () => {
    const { user, logout } = useAuth();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const location = useLocation();
    
    // Inicializamos como "Usuario" por defecto
    const [localUserName, setLocalUserName] = useState<string>("Usuario");  

    const showBackButton = location.pathname !== '/';

    // 1. Efecto para cerrar menú al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // 2. Efecto para obtener el nombre correcto (Localstorage o API)
    useEffect(() => {
        // Intento 1: Leer del usuario guardado en localStorage
        const storedUser = localStorage.getItem('user') || localStorage.getItem('usuario');
        if (storedUser) {
            try {
                const parsed = JSON.parse(storedUser);
                // Buscamos nombre_y_apellido o nombre
                const nombreReal = parsed.nombre_y_apellido || parsed.nombre;
                
                if (nombreReal && nombreReal !== "Usuario") {
                    setLocalUserName(nombreReal);
                }
            } catch (e) {
                console.error("Error leyendo datos locales", e);
            }
        }

        // Intento 2: Refrescar desde el servidor para asegurar que esté actualizado
        const token = localStorage.getItem('token');
        if (token) {
            axios.get(`${import.meta.env.VITE_API_URL}/me`, {
                headers: { Authorization: `Bearer ${token}` }
            }).then(res => {
                const nombreDelServer = res.data.nombre_y_apellido || res.data.nombre;
                if (nombreDelServer) {
                    setLocalUserName(nombreDelServer);
                }
            }).catch(err => console.log("No se pudo refrescar el nombre desde el servidor", err));
        }
    }, [user]); // Se ejecuta cuando cambia el usuario del contexto

    // ============================================================================
    // ✅ FUNCIÓN PARA DETERMINAR RUTA DE CREACIÓN DE EVENTO SEGÚN ROL
    // ============================================================================
    const obtenerRutaCrearEvento = () => {
        if (!user) return "/login";
        
        // Roles 1 y 2 (Admin/Organizador) → /registro-evento
        if (user.id_rol === 1 || user.id_rol === 2) {
            return "/registro-evento";
        }
        
        // Roles 3 y 4 (Usuario Externo/Otro) → /publicar-evento
        if (user.id_rol === 3 || user.id_rol === 4) {
            return "/publicar-evento";
        }
        
        // Por defecto
        return "/publicar-evento";
    };

    // ============================================================================
    // ✅ FUNCIÓN PARA DETERMINAR SI MOSTRAR BOTÓN DE PANEL DE ADMIN
    // ============================================================================
    const mostrarBotonPanelAdmin = () => {
        return user && (user.id_rol === 1 || user.id_rol === 2);
    };

    return (
        <nav className="main-navbar">
            <div className="nav-left">
                {showBackButton && (
                    <button className="btn-back-nav" onClick={() => navigate('/')}>
                        ← <span className="hide-mobile">Inicio</span>
                    </button>
                )}
            </div>

            <div className="nav-center">
                <Link to="/">
                    <img src={logoWakeUp} alt="Wake Up Bikes" className="nav-logo" />
                </Link>
            </div>

            <div className="nav-right">
                {user ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <NotificacionesBadge />

                    <div className="user-menu-container" ref={dropdownRef}>
                        <button 
                            className="user-menu-trigger" 
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        >
                            <span className="user-icon">👤</span>
                            <span className="user-name">{localUserName}</span>
                            <span className="dropdown-arrow">▼</span>
                        </button>

                        {isDropdownOpen && (
                            <div className="user-dropdown">
                                <div className="dropdown-header">MI CUENTA</div>
                                <Link to="/perfil" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>👤 Mi Perfil</Link>
                                <Link to="/reportes" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>📊 Mis Reportes</Link>
                                <div className="dropdown-header">MIS EVENTOS</div>
                                {/* Usamos ?tab=inscripciones para que PerfilPage sepa qué mostrar */}
                                <Link to="/perfil?tab=inscripciones" className="dropdown-item">
                                     Inscriptos
                                </Link>
                                <Link to="/mis-eventos" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                                    Mis Eventos
                                </Link>
                                <div className="dropdown-divider"></div>
                                <Link to={obtenerRutaCrearEvento()}  className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                                    Crear Evento
                                </Link>

                                {/* ✅ NUEVO: Botón Panel de Admin (SOLO para Admin y Supervisor) */}
                                {mostrarBotonPanelAdmin() && (
                                    <>
                                        <div className="dropdown-divider"></div>
                                        <Link 
                                            to="/admin" 
                                            className="dropdown-item"
                                            style={{ 
                                                backgroundColor: '#ff6600', 
                                                color: '#fff',
                                                fontWeight: 'bold'
                                            }}
                                            onClick={() => setIsDropdownOpen(false)}
                                        >
                                            ⚙️ Panel de Administrador
                                        </Link>
                                    </>
                                )}
                                
                                <div className="dropdown-divider"></div>

                                <button 
                                    onClick={logout} className="dropdown-item logout-button">Cerrar Sesión
                                </button>
                            </div>
                            )}
                        </div>
                    </div>
                    ) : (
                        <Link to="/login" className="hero-login-btn">INICIAR SESIÓN</Link>
                    )}
                </div>
        </nav>
    );
};