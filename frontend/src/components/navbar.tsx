import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import logoWakeUp from '../assets/wakeup-logo.png';
import '../styles/navbar.css'; 

export const Navbar = () => {
    const { user, logout } = useAuth();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const location = useLocation();

    // No mostrar el botón "Volver" si ya estamos en el inicio
    const showBackButton = location.pathname !== '/';

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

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
                    <div className="user-menu-container" ref={dropdownRef}>
                        <button 
                            className="user-menu-trigger" 
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        >
                            <span className="user-icon">👤</span>
                            <span className="user-name">{user.nombre}</span>
                            <span className="dropdown-arrow">▼</span>
                        </button>

                        {isDropdownOpen && (
                            <div className="user-dropdown">
                                <div className="dropdown-header">MI CUENTA</div>
                                <Link to="/perfil" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>👤 Mi Perfil</Link>
                                <Link to="/reportes" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>📊 Mis Reportes</Link>
                                <div className="dropdown-header">EVENTOS</div>
                                <Link to="/mis-eventos/inscriptos" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>Inscriptos</Link>
                                <Link to="/mis-eventos/creados" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>Creados</Link>
                                <div className="dropdown-divider"></div>
                                <button onClick={logout} className="dropdown-item logout-button">Cerrar Sesión</button>
                            </div>
                        )}
                    </div>
                ) : (
                    <Link to="/login" className="hero-login-btn">INICIAR SESIÓN</Link>
                )}
            </div>
        </nav>
    );
};