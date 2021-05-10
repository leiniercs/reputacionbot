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
	lista_negra BOOLEAN DEFAULT false,
	privado BOOLEAN DEFAULT false,
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
CREATE INDEX ind_monitorizacion_usuarios_id ON monitorizacion_usuarios (id);

CREATE TABLE monitorizacion_usuarios_grupos (
	usuario BIGINT NOT NULL,
	grupo BIGINT NOT NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON monitorizacion_usuarios_grupos TO reputacionbot;
CREATE INDEX ind_monitorizacion_usuarios_grupos_usuario ON monitorizacion_usuarios_grupos (usuario);
CREATE INDEX ind_monitorizacion_usuarios_grupos_grupo ON monitorizacion_usuarios_grupos (grupo);

CREATE TABLE monitorizacion_nombres (
	id BIGINT NOT NULL,
	nombres VARCHAR(128) NOT NULL,
	apellidos VARCHAR(128) DEFAULT '',
	tiempo TIMESTAMPTZ DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON monitorizacion_nombres TO reputacionbot;
CREATE INDEX ind_monitorizacion_nombres_id ON monitorizacion_nombres (id);

CREATE TABLE listanegra_administradores (
	id BIGINT NOT NULL,
	id_promotor BIGINT NOT NULL,
	tiempo TIMESTAMPTZ DEFAULT NOW(),
	CONSTRAINT pkey_listanegra_administradores_id PRIMARY KEY (id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON listanegra_administradores TO reputacionbot;
CREATE INDEX ind_listanegra_administradores_id_promotor ON listanegra_administradores (id_promotor);

CREATE TABLE listanegra (
	id BIGINT NOT NULL,
	id_administrador BIGINT NOT NULL,
	motivos VARCHAR(2048) NOT NULL,
	tiempo TIMESTAMPTZ DEFAULT NOW(),
	CONSTRAINT pkey_listanegra_id PRIMARY KEY (id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON listanegra TO reputacionbot;
CREATE INDEX ind_listanegra_id_administrador ON listanegra (id_administrador);

CREATE TABLE cuentas_creacion (
	id BIGINT NOT NULL,
	tiempo TIMESTAMPTZ DEFAULT NOW(),
	CONSTRAINT pkey_cuentas_creacion_id PRIMARY KEY (id)
);
GRANT SELECT, INSERT, UPDATE ON cuentas_creacion TO reputacionbot;

CREATE FUNCTION estimar_tiempo_creacion(IN id_cuenta_telegram BIGINT) RETURNS TABLE (operador SMALLINT, tiempo TIMESTAMPTZ) AS $$
	DECLARE
		registros_menor RECORD;
		registros_mayor RECORD;
		operador SMALLINT := 0;
		tiempo TIMESTAMPTZ := NOW();
	BEGIN
		SELECT * INTO registros_menor FROM cuentas_creacion WHERE (id < id_cuenta_telegram) ORDER BY tiempo DESC LIMIT 1;
		SELECT * INTO registros_mayor FROM cuentas_creacion WHERE (id > id_cuenta_telegram) ORDER BY tiempo ASC LIMIT 1;

		IF registros_menor ISNULL THEN
			SELECT * INTO registros_menor FROM cuentas_creacion ORDER BY tiempo ASC LIMIT 1;
			operador := -1;
		END IF;

		IF registros_mayor ISNULL THEN
			SELECT * INTO registros_mayor FROM cuentas_creacion ORDER BY tiempo DESC LIMIT 1;
			operador := 1;
		END IF;

		SELECT date_trunc('day', registros_mayor.tiempo - age(registros_mayor.tiempo, registros_menor.tiempo) / 2) INTO tiempo;

		RETURN QUERY SELECT operador, tiempo;
	END;
$$ LANGUAGE plpgsql;

delete from monitorizacion_nombres a using monitorizacion_nombres b where a.tiempo > b.tiempo and a.nombres = b.nombres;
delete from monitorizacion_usuarios a using monitorizacion_usuarios b where a.tiempo > b.tiempo and a.usuario = b.usuario;

COMMIT;
