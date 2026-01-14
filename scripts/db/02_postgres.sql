-- Tabla de roles
CREATE TABLE Rol (
    id_rol SERIAL PRIMARY KEY,                     -- autoincremental
    nombre_rol VARCHAR(100) NOT NULL UNIQUE        -- Ej: 'Administrador', 'Supervisor', 'Operario', 'Cliente'
);

-- Tabla de usuarios
CREATE TABLE Usuario (
    id_usuario SERIAL PRIMARY KEY,                 -- autoincremental
    nombre_y_apellido VARCHAR(255) NOT NULL,                  -- nombre visible
    email VARCHAR(255) NOT NULL UNIQUE,            -- login principal
    contrasenia VARCHAR(200) NOT NULL,             -- credencial
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- automático
    id_rol INT NOT NULL,                           -- FK al rol
    FOREIGN KEY (id_rol) REFERENCES Rol(id_rol)
);

-- Tabla de contactos
CREATE TABLE Contacto (
    id_contacto SERIAL PRIMARY KEY,                -- autoincremental
    id_usuario INT NOT NULL,                       -- FK al usuario
    telefono VARCHAR(50),                          -- opcional
    direccion VARCHAR(255),                        -- opcional
    enlace_redes VARCHAR(255),                     -- ej: Instagram, LinkedIn
    otro_contacto VARCHAR(255),                    -- ej: WhatsApp alternativo
    FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario)
);

-- Carga inicial de roles
INSERT INTO Rol (nombre_rol) VALUES 
('Administrador'),
('Supervisor'),
('Operario'),
('Cliente');

-----------------------------------------------------------------------------------------------------------------------------------------------------------------
CREATE TABLE TipoEvento (
    id_tipo SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE
);

-- Datos iniciales
INSERT INTO TipoEvento (nombre) VALUES
('Carrera'),
('Paseo'),
('Entrenamiento'),
('Cicloturismo');

---------------------------------

CREATE TABLE NivelDificultad (
    id_dificultad SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE
);

-- Datos iniciales
INSERT INTO NivelDificultad (nombre) VALUES
('Básico'),
('Intermedio'),
('Avanzado');

--------------------------------

CREATE TABLE EstadoEvento (
    id_estado SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE
);

-- Datos iniciales
INSERT INTO EstadoEvento (nombre) VALUES
('Borrador'),
('Pendiente'),
('Publicado'),
('Finalizado'),
('Cancelado');

-----------------------------------------------------------------------------------------------------------------------------------
-- TABLA EVENTO

CREATE TABLE Evento (
    id_evento SERIAL PRIMARY KEY, 
    id_usuario INT NOT NULL,
    nombre_evento VARCHAR(255) NOT NULL,
    fecha_evento DATE NOT NULL,
    ubicacion VARCHAR(255) NOT NULL,
    id_tipo INT NOT NULL,       
    id_dificultad INT NOT NULL,     
    descripcion TEXT,
    costo_participacion DECIMAL(10,2) NOT NULL,     
    id_estado INT NOT NULL DEFAULT 1, 
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lat DECIMAL(9,6),
    lng DECIMAL(9,6),

    CONSTRAINT FK_Evento_Usuario FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario),
    CONSTRAINT FK_Evento_Tipo FOREIGN KEY (id_tipo) REFERENCES TipoEvento(id_tipo),
    CONSTRAINT FK_Evento_Dificultad FOREIGN KEY (id_dificultad) REFERENCES NivelDificultad(id_dificultad),
    CONSTRAINT FK_Evento_Estado FOREIGN KEY (id_estado) REFERENCES EstadoEvento(id_estado)
);

-----------------------------------------------------------------------------------------------------------------------------------
-- TABLA SOLICITUD DE PUBLICACION
CREATE TABLE EstadoSolicitud (
    id_estado_solicitud SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE
);

-- Datos iniciales
INSERT INTO EstadoSolicitud (nombre) VALUES
('Borrador'),
('Pendiente'),
('Aprobada'),
('Rechazada');


CREATE TABLE Solicitud_Publicacion (
    id_solicitud SERIAL PRIMARY KEY,
    nombre_evento VARCHAR(100) NOT NULL,
    fecha_evento DATE NOT NULL,
    ubicacion VARCHAR(150) NOT NULL, -- Ajustado a 150 según tu HU 1.2
    id_tipo INT NOT NULL,       
    id_dificultad INT NOT NULL,     
    descripcion TEXT,
    costo_participacion DECIMAL(10,2) NOT NULL,    
    id_estado INT NOT NULL DEFAULT 1,
    fecha_solicitud DATE NOT NULL DEFAULT CURRENT_DATE,
    observaciones_admin TEXT,
    id_estado_solicitud INT,
    id_usuario INT NOT NULL,
    lat DECIMAL(9,6),
    lng DECIMAL(9,6),

    CONSTRAINT FK_Solicitud_Tipo FOREIGN KEY (id_tipo) REFERENCES TipoEvento(id_tipo),
    CONSTRAINT FK_Solicitud_Dificultad FOREIGN KEY (id_dificultad) REFERENCES NivelDificultad(id_dificultad),
    CONSTRAINT FK_Solicitud_Estado FOREIGN KEY (id_estado) REFERENCES EstadoEvento(id_estado),
    CONSTRAINT FK_Solicitud_Estado_Solicitud FOREIGN KEY (id_estado_solicitud) REFERENCES EstadoSolicitud (id_estado_solicitud),
    CONSTRAINT fk_solicitud_usuario FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
);

CREATE TABLE Evento_Multimedia (
    id_multimedia SERIAL PRIMARY KEY,
    id_evento INT,
    id_solicitud INT,
    url_archivo TEXT NOT NULL,
    tipo_archivo VARCHAR(50), 
    fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_evento) REFERENCES Evento(id_evento),
    FOREIGN KEY (id_solicitud) REFERENCES Solicitud_Publicacion(id_solicitud)
);

CREATE TABLE Notificacion (
    id_notificacion SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL,                          
    id_estado_solicitud INT,                  
    mensaje TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    leida BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_notificacion_usuario FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario),
    CONSTRAINT fk_notificacion_estado FOREIGN KEY (id_estado_solicitud) REFERENCES EstadoSolicitud(id_estado_solicitud)
);

----------------------------------------------------------------------------------------------------------------------------------
-- TABLA RESERVA DE EVENTO

CREATE TABLE EstadoReserva(
	id_estado_reserva SERIAL PRIMARY KEY,
	nombre VARCHAR(255) NOT NULL UNIQUE
);

-- Datos iniciales
INSERT INTO EstadoReserva (nombre) VALUES
('Pendiente'),
('Confirmada'),
('Cancelada'),
('Expirada');


CREATE TABLE Reserva_Evento (
    id_reserva SERIAL PRIMARY KEY,
    id_evento INT NOT NULL,
    id_usuario INT NOT NULL, 
    fecha_reserva TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion TIMESTAMP GENERATED ALWAYS AS (fecha_reserva + INTERVAL '3 days') STORED, 
    id_estado_reserva INT NOT NULL DEFAULT 1,
    categoria_participante VARCHAR(255),
    CONSTRAINT FK_Reserva_Evento FOREIGN KEY (id_evento) 
        REFERENCES Evento(id_evento) ON DELETE CASCADE,
    CONSTRAINT FK_Reserva_Usuario FOREIGN KEY (id_usuario) 
        REFERENCES Usuario(id_usuario) ON DELETE CASCADE,
    CONSTRAINT FK_Reserva_EstadoReserva FOREIGN KEY (id_estado_reserva) 
        REFERENCES EstadoReserva(id_estado_reserva)
);


-----------------------------------------------------------------------------------------------------------------------------------


CREATE TABLE EstadoSuscripcion (
    id_estado_suscripcion SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE
);

INSERT INTO EstadoSuscripcion (nombre) VALUES
('Activa'),
('Pendiente'),
('Cancelada');

CREATE TABLE Suscripcion_Novedades (
    id_suscripcion SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_evento INT NOT NULL,
    fecha_suscripcion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    preferencias VARCHAR(255),
    id_estado_suscripcion INT NOT NULL,
    
    CONSTRAINT FK_Suscripcion_Usuario 
        FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario),

    CONSTRAINT FK_Suscripcion_Evento 
        FOREIGN KEY (id_evento) REFERENCES Evento(id_evento),

    CONSTRAINT FK_Suscripcion_EstadoSuscripcion 
        FOREIGN KEY (id_estado_suscripcion) REFERENCES EstadoSuscripcion(id_estado_suscripcion),

    CONSTRAINT UQ_Suscripcion UNIQUE (id_usuario, id_evento) -- evita duplicados
);


-----------------------------------------------------------------------------------------------------------------------------------
-- TABLAS DE HISTORIAL DE CAMBIOS Y EDICIONES DE EVENTOS

CREATE TABLE Historial_Edicion_Evento(
	id_historial_edicion SERIAL PRIMARY KEY,
	id_evento INT NOT NULL,
	fecha_edicion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, 
	id_usuario INT NOT NULL,
	CONSTRAINT FK_Edicion_Evento FOREIGN KEY (id_evento) REFERENCES Evento(id_evento),
	CONSTRAINT FK_Edicion_Usuario FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario)
	
);

CREATE TABLE Detalle_Cambio_Evento(
	id_detalle_cambio SERIAL PRIMARY KEY,
	id_historial_edicion INT NOT NULL, 
	campo_modificado VARCHAR(200) NOT NULL,
	valor_anterior TEXT NOT NULL,
	valor_nuevo TEXT NOT NULL,
	CONSTRAINT FK_Cambio FOREIGN KEY (id_historial_edicion) REFERENCES Historial_Edicion_Evento(id_historial_edicion)

);

-----------------------------------------------------------------------------------------------------------------------------------
-- TABLA ELIMINACION DE EVENTOS

CREATE TABLE Eliminacion_Evento (
    id_eliminacion SERIAL PRIMARY KEY,
    id_evento INT NOT NULL,
    motivo_eliminacion TEXT NOT NULL,
    fecha_eliminacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_usuario INT NOT NULL, -- admin/supervisor que elimina
    notificacion_enviada BOOLEAN NOT NULL DEFAULT FALSE,
    
    CONSTRAINT FK_Eliminacion_Evento FOREIGN KEY (id_evento) REFERENCES Evento(id_evento) ON DELETE CASCADE,
    CONSTRAINT FK_Eliminacion_Usuario FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario)
);
