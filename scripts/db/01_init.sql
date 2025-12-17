CREATE database WakeUp;
Use WakeUp;

CREATE TABLE Usuario_Admin (
    id_admin INT IDENTITY(1,1) PRIMARY KEY,          -- autoincremental
    nombre_admin NVARCHAR(255) NOT NULL,             -- obligatorio
    email_admin NVARCHAR(255) NOT NULL UNIQUE,       -- obligatorio y único
    contrasenia NVARCHAR(200) NOT NULL,              -- obligatorio
    fecha_creacion DATETIME DEFAULT GETDATE()        -- automático al insertar
);

------------------------------

CREATE TABLE TipoEvento (
    id_tipo INT IDENTITY(1,1) PRIMARY KEY,
    nombre NVARCHAR(100) NOT NULL UNIQUE
);

-- Datos iniciales
INSERT INTO TipoEvento (nombre) VALUES
('Carrera'),
('Paseo'),
('Entrenamiento'),
('Cicloturismo');

---------------------------------

CREATE TABLE NivelDificultad (
    id_dificultad INT IDENTITY(1,1) PRIMARY KEY,
    nombre NVARCHAR(100) NOT NULL UNIQUE
);

-- Datos iniciales
INSERT INTO NivelDificultad (nombre) VALUES
('Básico'),
('Intermedio'),
('Avanzado');

--------------------------------

CREATE TABLE EstadoEvento (
    id_estado INT IDENTITY(1,1) PRIMARY KEY,
    nombre NVARCHAR(100) NOT NULL UNIQUE
);

-- Datos iniciales
INSERT INTO EstadoEvento (nombre) VALUES
('Borrador'),
('Pendiente'),
('Publicado'),
('Finalizado');


CREATE TABLE Evento (
    id_evento INT IDENTITY(1,1) PRIMARY KEY,
    nombre_evento NVARCHAR(255) NOT NULL UNIQUE,
    fecha_evento DATE NOT NULL,
    ubicacion NVARCHAR(255) NOT NULL,
    id_tipo INT NOT NULL,       
    id_dificultad INT NOT NULL,     
    descripcion NVARCHAR(255),
    costo_participacion DECIMAL(10,2) NOT NULL, 
    enlaces_redes NVARCHAR(255) NOT NULL,     
    id_estado INT NOT NULL DEFAULT 1, 
    multimedia NVARCHAR(255),
    id_admin INT NOT NULL,
    fecha_creacion DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Evento_Admin FOREIGN KEY (id_admin) REFERENCES Usuario_Admin(id_Admin),
    CONSTRAINT FK_Evento_Tipo FOREIGN KEY (id_tipo) REFERENCES TipoEvento(id_tipo),
    CONSTRAINT FK_Evento_Dificultad FOREIGN KEY (id_dificultad) REFERENCES NivelDificultad(id_dificultad),
    CONSTRAINT FK_Evento_Estado FOREIGN KEY (id_estado) REFERENCES EstadoEvento(id_estado)
);
---------------------------------------

CREATE TABLE EstadoSolicitud (
    id_estado_solicitud INT IDENTITY(1,1) PRIMARY KEY,
    nombre NVARCHAR(100) NOT NULL UNIQUE
);

-- Datos iniciales
INSERT INTO EstadoSolicitud (nombre) VALUES
('Pendiente'),
('Aprobada'),
('Rechazada');


CREATE TABLE Solicitud_Publicacion (
    id_solicitud INT IDENTITY(1,1) PRIMARY KEY,
    nombre_evento NVARCHAR(255) NOT NULL UNIQUE,
    fecha_evento DATE NOT NULL,
    ubicacion NVARCHAR(255) NOT NULL,
    id_tipo INT NOT NULL,       
    id_dificultad INT NOT NULL,     
    descripcion NVARCHAR(255),
    costo_participacion DECIMAL(10,2) NOT NULL, 
    enlaces_redes NVARCHAR(255) NOT NULL,     
    id_estado INT NOT NULL DEFAULT 1, 
    multimedia NVARCHAR(255),
    contacto_organizador NVARCHAR(255),
    fecha_solicitud DATE NOT NULL DEFAULT GETDATE(),
    observaciones_admin NVARCHAR (1000),
    id_estado_solicitud INT,
    CONSTRAINT FK_Solicitud_Tipo FOREIGN KEY (id_tipo) REFERENCES TipoEvento(id_tipo),
    CONSTRAINT FK_Solicitud_Dificultad FOREIGN KEY (id_dificultad) REFERENCES NivelDificultad(id_dificultad),
    CONSTRAINT FK_Solicitud_Estado FOREIGN KEY (id_estado) REFERENCES EstadoEvento(id_estado),
    CONSTRAINT FK_Solicitud_Estado_Solicitud FOREIGN KEY (id_estado_solicitud) REFERENCES EstadoSolicitud (id_estado_solicitud)
);

-----------------------------------------------------------

CREATE TABLE EstadoReserva(
	id_estado_reserva INT IDENTITY (1,1) PRIMARY KEY,
	nombre NVARCHAR(255) NOT NULL UNIQUE
);

-- Datos iniciales
INSERT INTO EstadoReserva (nombre) VALUES
('Pendiente'),
('Confirmada'),
('Cancelada'),
('Expirada');


CREATE TABLE Reserva_Evento (
	id_reserva INT IDENTITY (1,1) PRIMARY KEY,
	id_evento INT NOT NULL,
	nombre_usuario NVARCHAR(255) NOT NULL,
	correo_usuario NVARCHAR(255) NOT NULL, 
	fecha_reserva DATETIME DEFAULT GETDATE(),
	fecha_expiracion AS DATEADD(DAY, 3, fecha_reserva), 
	confirmada BIT NOT NULL,
	id_estado_reserva INT NOT NULL DEFAULT 1,
	categoria_participante NVARCHAR(255),
	CONSTRAINT FK_Reserva_Evento FOREIGN KEY (id_evento) REFERENCES Evento(id_evento),
	CONSTRAINT FK_Reserva_EstadoReserva FOREIGN KEY (id_estado_reserva) REFERENCES EstadoReserva(id_estado_reserva),
)

---------------------------------------



CREATE TABLE Cambio_Evento(
	id_cambio INT IDENTITY(1,1) PRIMARY KEY,
	id_edicion INT NOT NULL, 
	campo_modificado NVARCHAR(200) NOT NULL,
	valor_anterior NVARCHAR(200) NOT NULL,
	valor_nuevo NVARCHAR(200) NOT NULL,
	CONSTRAINT FK_Cambio FOREIGN KEY (id_evento) REFERENCES Evento(id_evento)

);

CREATE TABLE Edicion_Evento(
	id_edicion INT IDENTITY(1,1) PRIMARY KEY,
	id_evento INT NOT NULL,
	fecha_edicion DATETIME NOT NULL DEFAULT GETDATE(), -- fecha y hora de edicion
	id_admin INT NOT NULL,
	historial_cambios, --- lista de cambios de eventos
	CONSTRAINT FK_Edicion_Evento FOREIGN KEY (id_evento) REFERENCES Evento(id_evento,)
	CONSTRAINT FK_Edicion_Admin FOREIGN KEY (id_admin) REFERENCES Usuario_Admin(id_admin)
	
);
