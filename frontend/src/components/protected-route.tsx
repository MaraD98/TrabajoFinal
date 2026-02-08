import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/auth-context";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: number[]; // 👈 Opcional ahora
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loadingAuth } = useAuth();

  // 🔥 PASO 1: Mientras carga, mostramos spinner
  if (loadingAuth) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#0d0d0d',
        color: '#ccff00',
        fontSize: '1.5rem',
        fontWeight: 'bold'
      }}>
        <div>
          <div className="login-spinner" style={{ marginBottom: '20px' }}></div>
          VERIFICANDO SESIÓN...
        </div>
      </div>
    );
  }

  // 🔥 PASO 2: Si no hay usuario, redirigimos al login
  if (!user) {
    return <Navigate to="/login" state={{ reason: "auth" }} replace />;
  }

  // 🔥 PASO 3: Si hay roles permitidos, verificamos
  if (allowedRoles && !allowedRoles.includes(user.id_rol)) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#0d0d0d',
        color: '#fff',
        textAlign: 'center',
        padding: '20px'
      }}>
        <h2 style={{ color: '#ff4444', marginBottom: '20px' }}>
          🚫 Acceso Denegado
        </h2>
        <p style={{ color: '#888', marginBottom: '30px' }}>
          No tienes permisos para acceder a esta página.
        </p>
        <a 
          href="/" 
          style={{
            padding: '12px 24px',
            background: '#ccff00',
            color: '#000',
            textDecoration: 'none',
            borderRadius: '6px',
            fontWeight: 'bold'
          }}
        >
          ← Volver al Inicio
        </a>
      </div>
    );
  }

  // 🔥 PASO 4: Todo OK, mostramos el contenido
  return <>{children}</>;
}