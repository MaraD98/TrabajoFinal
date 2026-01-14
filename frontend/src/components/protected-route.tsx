import React from "react";
import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode; // 👈 más flexible que JSX.Element
  allowedRoles: number[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const token = localStorage.getItem("token");
  const rol = localStorage.getItem("rol");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!rol || !allowedRoles.includes(Number(rol))) {
    return (
      <div className="protected-message">
        <h2>🚫 No tienes permisos para acceder a esta página</h2>
        <p>Contacta a un administrador si crees que es un error.</p>
        <a href="/">Volver al inicio</a>
      </div>
    );
  }

  return <>{children}</>;
}
