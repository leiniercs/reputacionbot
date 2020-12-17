CREATE ROLE reputacionbot WITH LOGIN ENCRYPTED PASSWORD 'LYhUuFYaoCS4gyUoumpmNbc1v71rJ2OWdurDSKBfGNo5fNUWhyPnSQ3j8';

CREATE DATABASE reputacionbot;

\c reputacionbot


BEGIN TRANSACTION;

DROP TABLE IF EXISTS sesiones;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS identidades;
DROP TABLE IF EXISTS evaluaciones;
DROP TABLE IF EXISTS grupos;

CREATE TABLE sesiones (
	id BIGINT NOT NULL,
	variables VARCHAR DEFAULT '{}',
	CONSTRAINT pkey_sesiones_id PRIMARY KEY (id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON sesiones TO reputacionbot;

CREATE TABLE usuarios (
	id BIGINT NOT NULL,
	nombre VARCHAR(128) NOT NULL,
	usuario VARCHAR(64) NOT NULL,
	tyc_aceptadas BOOLEAN DEFAULT false,
	ctc BOOLEAN DEFAULT false,
	verificado BOOLEAN DEFAULT false,
	tiempo_creacion TIMESTAMPTZ DEFAULT NOW(),
	CONSTRAINT pkey_usuarios_id PRIMARY KEY (id)
);
CREATE INDEX ind_usuarios_usuario ON usuarios (usuario);
GRANT SELECT, INSERT, UPDATE, DELETE ON usuarios TO reputacionbot;

CREATE TABLE identidades (
	id BIGSERIAL NOT NULL,
	usuario_id BIGINT NOT NULL,
	usuario_nombre VARCHAR(128) NOT NULL,
	usuario_usuario VARCHAR(64) NOT NULL,
	telefono VARCHAR(12) NOT NULL,
	correo VARCHAR(64) NOT NULL,
	datos_personales_primer_nombre VARCHAR(128) NOT NULL,
	datos_personales_segundo_nombre VARCHAR(128) DEFAULT '',
	datos_personales_apellidos VARCHAR(128) NOT NULL,
	direccion_localidad VARCHAR(128) NOT NULL,
	direccion_region VARCHAR(128) NOT NULL,
	direccion_codigo_pais VARCHAR(2) NOT NULL,
	documento_identidad_numero VARCHAR(16) NOT NULL,
	documento_identidad_expiracion DATE NOT NULL,
	estado SMALLINT DEFAULT 0,
	tiempo_creacion TIMESTAMPTZ DEFAULT NOW(),
	CONSTRAINT pkey_identidades_id PRIMARY KEY (id)
);
CREATE INDEX ind_identidades_usuario_id ON identidades (usuario_id);
CREATE INDEX ind_identidades_usuario_usuario ON identidades (usuario_usuario);
CREATE INDEX ind_identidades_correo ON identidades (correo);
CREATE INDEX ind_identidades_telefono ON identidades (telefono);
CREATE INDEX ind_identidades_documento_identidad_numero ON identidades (documento_identidad_numero);
GRANT USAGE ON identidades_id_seq TO reputacionbot;
GRANT SELECT, INSERT, UPDATE ON identidades TO reputacionbot;

CREATE TABLE evaluaciones (
	id BIGSERIAL NOT NULL,
	tipo SMALLINT NOT NULL,
	origen BIGINT NOT NULL,
	destino BIGINT NOT NULL,
	testimonio VARCHAR(512) NOT NULL,
	tiempo_creacion TIMESTAMPTZ DEFAULT NOW(),
	CONSTRAINT pkey_evaluaciones_id PRIMARY KEY (id)
);
CREATE INDEX ind_evaluaciones_tipo ON evaluaciones (tipo);
CREATE INDEX ind_evaluaciones_origen ON evaluaciones (origen);
CREATE INDEX ind_evaluaciones_destino ON evaluaciones (destino);
GRANT USAGE ON evaluaciones_id_seq TO reputacionbot;
GRANT SELECT, INSERT, DELETE ON evaluaciones TO reputacionbot;

CREATE TABLE grupos (
	id BIGINT NOT NULL,
	mensaje_bienvenida BOOLEAN DEFAULT false,
	duracion_mensajes SMALLINT DEFAULT 30,
	modo_estricto BOOLEAN DEFAULT false,
	modo_estricto_uniones BOOLEAN DEFAULT false,
	modo_estricto_mensajes BOOLEAN DEFAULT false,
	tiempo_union TIMESTAMPTZ DEFAULT NOW(),
	CONSTRAINT pkey_grupos_id PRIMARY KEY (id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON grupos TO reputacionbot;

CREATE TABLE monitorizacion_usuarios (
	id BIGINT NOT NULL,
	usuario VARCHAR(64) NOT NULL,
	tiempo TIMESTAMPTZ DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON monitorizacion_usuarios TO reputacionbot;

CREATE TABLE monitorizacion_nombres (
	id BIGINT NOT NULL,
	nombres VARCHAR(128) NOT NULL,
	apellidos VARCHAR(128) NOT NULL,
	tiempo TIMESTAMPTZ DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON monitorizacion_nombres TO reputacionbot;

COMMIT;
