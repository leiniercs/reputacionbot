const { comun } = require('./comun');
const { baseDatos } = require('./basedatos');


/**
 * Listado de operaciones
 */
const Operaciones = {
	Registro: 0x01,
	Identidad: 0x02,
	Evaluaciones: 0x03,
	Monitorizacion: 0x04,
	ListaNegra: 0x05
};

/**
 * Listado de motivos de sancion
 */
const Sanciones = {
	CambioUsuario: 0x03,
	Cibercrimen: 0x04
};

/**
 * Objeto que representa a un usuario
 */
class Usuario {
	/**
	 * Constructor
	 * @param {any} id Usuario
	 */
	constructor(id) {
		this.id = id;
		
		this.inicializarVariables();

		if (typeof this.id !== 'number' && typeof this.id !== 'string') {
			throw new Error('ID de usuario inválido.');
		}
	}
	
	inicializarVariables() {
		this.datosActuales = {
			nombres: '',
			apellidos: '',
			usuario: ''
		};
		this.registro = {
			usuario: '',
			registrado: false,
			tycAceptadas: false,
			ctc: false,
			verificado: false
		};
		this.identidad = {
			telefono: '',
			correo: '',
			numeroIdentidad: '',
			fechaExpiracion: new Date(),
			primerNombre: '',
			segundoNombre: '',
			apellidos: '',
			localidad: '',
			region: '',
			codigoPais: '',
			estado: 0
		};
		this.historial = {
			nombres: [],
			usuarios: []
		}
		this.grupos = [];
		this.listaNegra = {
			esAdministrador: false,
			tiempo: new Date(),
			motivos: '',
			administrador: {
				id: 0,
				nombres: ''
			}
		};
		this.estimacionCreacion = {
			operador: 1,
			tiempo: new Date()
		};
	}

	/**
	 * Obtiene los datos de registro del usuario
	 */
	async obtenerDatosRegistro() {
		let resultados = {};
		let fila = {};
		let instruccionSQL = '';
		const idNumerico = (typeof this.id === 'number' ? true : false);

		if (idNumerico === true) {
			instruccionSQL = `
SELECT
	usuario::text,
	tyc_aceptadas::boolean,
	ctc::boolean,
	verificado::boolean
FROM usuarios
WHERE (
	id = $1
)`;
		} else {
			instruccionSQL = `
SELECT
	id::bigint,
	tyc_aceptadas::boolean,
	ctc::boolean,
	verificado::boolean
FROM usuarios
WHERE (
	usuario = $1
)`;
		}

		try {
			resultados = await baseDatos.query(instruccionSQL, [ this.id ]);
			if (resultados.rowCount > 0) {
				fila = resultados.rows[0];
				if (idNumerico === true) {
					this.registro.usuario = fila.usuario;
				} else {
					this.registro.usuario = this.id;
					this.id = parseInt(fila.id);
				}
				this.registro.registrado = true;
				this.registro.tycAceptadas = fila.tyc_aceptadas;
				this.registro.ctc = fila.ctc;
				this.registro.verificado = fila.verificado;
			}
		} catch (e) {
			throw e;
		}
	}

	/**
	 * Obtiene los datos de la identidad del usuario
	 */
	async obtenerDatosIdentidad() {
		let resultados = {};
		let fila = {};
		let instruccionSQL = '';
		const idNumerico = (typeof this.id === 'number' ? true : false);

		instruccionSQL = `
SELECT
	usuario_id::bigint,
	usuario_usuario::text,
	telefono::text,
	correo::text,
	datos_personales_primer_nombre::text,
	datos_personales_segundo_nombre::text,
	datos_personales_apellidos::text,
	direccion_localidad::text,
	direccion_region::text,
	direccion_codigo_pais::text,
	documento_identidad_numero::text,
	documento_identidad_expiracion::timestamptz,
	estado::smallint
FROM usuarios
WHERE (`;

		if (idNumerico === true) {
			instruccionSQL += `
	usuario_id = $1
)`;
		} else {
			instruccionSQL += `
	usuario_usuario = $1
)`;
		}

		try {
			resultados = await baseDatos.query(instruccionSQL, [ this.id ]);
			if (resultados.rowCount > 0) {
				fila = resultados.rows[0];
				if (idNumerico === true) {
					if (this.registro.usuario.length === 0) {
						this.registro.usuario = fila.usuario_usuario;
					}
				} else {
					if (this.registro.usuario.length === 0) {
						this.registro.usuario = this.id;
						this.id = parseInt(fila.usuario_id);
					}
				}
				this.identidad.telefono = fila.telefono;
				this.identidad.correo = fila.correo;
				this.identidad.numeroIdentidad = fila.documento_identidad_numero;
				this.identidad.fechaExpiracion = new Date(fila.documento_identidad_expiracion);
				this.identidad.primerNombre = fila.datos_personales_primer_nombre;
				this.identidad.segundoNombre = fila.datos_personales_segundo_nombre;
				this.identidad.apellidos = fila.datos_personales_apellidos;
				this.identidad.localidad = fila.direccion_localidad;
				this.identidad.region = fila.direccion_region;
				this.identidad.codigoPais = fila.direccion_codigo_pais;
				this.identidad.estado = parseInt(fila.estado);
			}
		} catch (e) {
			throw e;
		}
	}

	/**
	 * Verificar si existe cambio en el usuario y aplica sancion si se especifica
	 * @param {object} contexto Referncia al objeto del contexto
	 * @param {boolean} aplicarSancion Determina si se aplica sanción a los infractores detectados
	 * @returns {Array<number>}Devuelve el listado de ID de usuarios que fueron sancionados
	 */
	static async comprobarCambioUsuario(contexto, aplicarSancion) {
		let comprobaciones = [];
		let usuariosSancionados = [];
		let usuario;

		if (contexto.update.message !== undefined) {
			if (contexto.update.message.from !== undefined) {
				comprobaciones.push(contexto.update.message.from);
			}
			if (contexto.update.message.new_chat_members !== undefined) {
				for (let nuevoMiembro of contexto.update.message.new_chat_members) {
					comprobaciones.push(nuevoMiembro.from);
				}
			}
			if (contexto.update.message.left_chat_member !== undefined) {
				comprobaciones.push(contexto.update.message.left_chat_member);
			}
		}
		if (contexto.update.edited_message !== undefined) {
			comprobaciones.push(contexto.update.edited_message.from);
		}
		if (contexto.update.forward_from !== undefined) {
			comprobaciones.push(contexto.update.forward_from.from);
		}
		if (contexto.update.callback_query !== undefined) {
			comprobaciones.push(contexto.update.callback_query.from);
		}

		for (let comprobacion of comprobaciones) {
			if (comprobacion.is_bot === true) { continue; }
			usuario = new Usuario(comprobacion.id);
			await usuario.obtenerDatosRegistro();
			if (usuario.registro.verificado === true && usuario.registro.usuario !== comprobacion.username) {
				usuariosSancionados.push(usuario.id);
				if (aplicarSancion === true) {
					usuario.sancionar(Sanciones.CambioUsuario);
				}
			}
		}

		return usuariosSancionados;
	}

	/**
	 * Sanciona al usuario
	 * @param {number} motivo Motivo de la sancion
	 */
	sancionar(motivo) {
		let instruccionSQL = `
UPDATE usuarios
SET
	ctc = false,
	verificado = false
WHERE (
	id = $1
)`;
		baseDatos.query(instruccionSQL, [ this.id ])
			.then(() => {})
			.catch(() => {})
		;

		instruccionSQL = `
UPDATE identidades
SET
	estado = $2
WHERE (
	usuario_id = $1
)`;
		baseDatos.query(instruccionSQL, [ this.id, motivo ])
			.then(() => {})
			.catch(() => {})
		;

		instruccionSQL = `
DELETE FROM evaluaciones
WHERE (
	tipo = 1 AND
	destino = $1
)`;
		baseDatos.query(instruccionSQL, [ this.id ])
			.then(() => {})
			.catch(() => {})
		;
		
	}

	/**
	 * Obtiene los datos actuales del usuario desde Telegram
	 * @param {Telegraf} contexto Referencia al objeto de la sesion
	 */
	async obtenerTelegramDatosUsuario(contexto) {
		let datos = {
			first_name: '',
			last_name: '',
			username: ''
		};
		let instruccionSQL = '';
		let resultados = {};
		const idNumerico = (typeof this.id === 'number' ? true : false);

		if (idNumerico === false) {
			instruccionSQL = `
SELECT
	id::bigint
FROM monitorizacion_usuarios
WHERE (
	usuario = $1
)
ORDER BY tiempo DESC
LIMIT 1`;
			resultados = await baseDatos.query(instruccionSQL, [ this.id ]);
			if (resultados.rowCount > 0) {
				this.id = parseInt(resultados.rows[0].id);
			} else {
				throw new Error('No se pudo obtener la información del usuario.');
			}
		}

		try {
			datos = await contexto.telegram.getChat(this.id);
		} catch (_e) {
			instruccionSQL = `
SELECT
	nombres::text
FROM monitorizacion_nombres
WHERE (
	id = $1
)
ORDER BY tiempo DESC
LIMIT 1`;
			resultados = await baseDatos.query(instruccionSQL, [ this.id ]);
			if (resultados.rowCount > 0) {
				datos.first_name = resultados.rows[0].nombres;
			} else {
				throw new Error('No se pudo obtener la información del usuario.');
			}

			instruccionSQL = `
SELECT
	usuario::text
FROM monitorizacion_usuarios
WHERE (
	id = $1
)
ORDER BY tiempo DESC
LIMIT 1`;
			resultados = await baseDatos.query(instruccionSQL, [ this.id ]);
			if (resultados.rowCount > 0) {
				datos.username = resultados.rows[0].usuario;
			}
		}

		this.datosActuales.nombres = `${(typeof datos.first_name === 'string' ? datos.first_name : '')} ${(typeof datos.last_name === 'string' ? datos.last_name : '')}`;
		this.datosActuales.nombres = this.datosActuales.nombres.trim();
		this.datosActuales.usuario = (typeof datos.username === 'string' ? datos.username : '');
	}

	/**
	 * Obtiene el listado de nombres desde historial de nombres
	 */
	async obtenerHistorialListadoNombres() {
		let resultados = {};
		const instruccionSQL = `
SELECT
	nombres::text,
	tiempo::timestamptz
FROM monitorizacion_nombres
WHERE (
	id = $1
)
ORDER BY tiempo`;

		try {
			resultados = await baseDatos.query(instruccionSQL, [ this.id ]);
			this.historial.nombres = resultados.rows;
		} catch (_e) {}
	}

	/**
	 * Registra los nombres y apellidos en el historial
	 * @param {nombres} Nombres
	 */
	async registrarHistorialNombres(nombres) {
		const instruccionSQL = `
INSERT INTO monitorizacion_nombres (
	id,
	nombres
) VALUES (
	$1,
	$2
)`;
		try {
			await baseDatos.query(instruccionSQL, [ this.id, nombres ])
			this.historial.nombres.push({ nombres: nombres, tiempo: new Date() });
		} catch (_e) {}
	}

	/**
	 * Obtiene el listado de nombres usuarios desde historial de nombres de usuario
	 */
	async obtenerHistorialListadoUsuarios() {
		let resultados = {};
		const instruccionSQL = `
SELECT
	usuario::text,
	tiempo::timestamptz
FROM monitorizacion_usuarios
WHERE (
	id = $1
)
ORDER BY tiempo`;

		try {
			resultados = await baseDatos.query(instruccionSQL, [ this.id ]);
			this.historial.usuarios = resultados.rows;
		} catch (_e) {}
	}

	/**
	 * Registra el nombre de usuario en el historial
	 * @param {usuario} Nombre de usuario
	 */
	async registrarHistorialUsuario(usuario) {
		const instruccionSQL = `
INSERT INTO monitorizacion_usuarios (
	id,
	usuario
) VALUES (
	$1,
	$2
)`;
		try {
			await baseDatos.query(instruccionSQL, [ this.id, usuario ]);
			this.historial.nombres.push({ usuario: usuario, tiempo: new Date() });
		} catch (_e) {}
	}

	/**
	 * Registra el ID del grupo en el cual esta unido el usuario en el historial
	 * @param {number} grupo ID del grupo
	 */
	async registrarHistorialUsuarioGrupo(grupo) {
		let resultados = {};
		let instruccionSQL = `
SELECT
	usuario::bigint
FROM monitorizacion_usuarios_grupos
WHERE (
	usuario = $1 AND
	grupo = $2
)
LIMIT 1`;

		try {
			resultados = await baseDatos.query(instruccionSQL, [ this.id, grupo ]);
			if (resultados.rowCount === 0) {
				instruccionSQL = `
INSERT INTO monitorizacion_usuarios_grupos (
	usuario,
	grupo
) VALUES (
	$1,
	$2
)`;
				await baseDatos.query(instruccionSQL, [ this.id, grupo ]);
			}
		} catch (_e) {}
	}

	/**
	 * Elimina el ID del grupo en el cual esta unido el usuario del historial
	 * @param {number} grupo ID del grupo
	 */
	async eliminarHistorialUsuarioGrupo(grupo) {
		const instruccionSQL = `
DELETE FROM monitorizacion_usuarios_grupos
WHERE (
	usuario = $1 AND
	grupo = $2
)`;
		try {
			await baseDatos.query(instruccionSQL, [ this.id, grupo ]);
		} catch (_e) {}
	}

	/**
	 * Obtiene el listado de IDs de grupo en los cuales el usuario se ha unido
	 */
	async obtenerListadoGrupos() {
		let resultados = {};
		const instruccionSQL = `
SELECT
	grupo::bigint AS id
FROM monitorizacion_usuarios_grupos
WHERE (
	usuario = $1
)`;
		try {
			resultados = await baseDatos.query(instruccionSQL, [ this.id ]);
			this.grupos = resultados.rows;
		} catch (_e) {}
	}

	/**
	 * Obtiene los datos de la Lista Negra asociados al usuario
	 */
	async obtenerDatosListaNegra() {
		let resultados = {};
		let instruccionSQL = '';

		try {
			instruccionSQL = `
SELECT
	id::bigint
FROM listanegra_administradores
WHERE (
	id = $1
)`;
			resultados = await baseDatos.query(instruccionSQL, [ this.id ]);
			if (resultados.rowCount > 0) {
				this.listaNegra.esAdministrador = true;
			}

			instruccionSQL = `
SELECT
	listanegra.tiempo::timestamptz AS tiempo,
	listanegra.motivos::text AS motivos,
	listanegra.id_administrador AS id_administrador,
	identidades.datos_personales_primer_nombre AS administrador_primer_nombre,
	identidades.datos_personales_segundo_nombre AS administrador_segundo_nombre
FROM listanegra
LEFT JOIN identidades ON (identidades.usuario_id = listanegra.id)
WHERE (
	listanegra.id = $1
)`;
			resultados = await baseDatos.query(instruccionSQL, [ this.id ]);
			if (resultados.rowCount > 0) {
				this.listaNegra.tiempo = new Date(resultados.rows[0].tiempo);
				this.listaNegra.motivos = resultados.rows[0].motivos;
				this.listaNegra.administrador.id = resultados.rows[0].id_administrador;
				this.listaNegra.administrador.nombres = `${resultados.rows[0].administrador_primer_nombre} ${resultados.rows[0].administrador_segundo_nombre}`;
				this.listaNegra.administrador.nombres = this.listaNegra.administrador.nombres.trim();
			}
		} catch (_e) {}
	}

	/**
	 * Obtiene el tiempo estimado de creacion de la cuenta en Telegram
	 */
	async obtenerEstimacionCreacion() {
		let resultados = {};
		const instruccionSQL = 'SELECT * FROM estimar_tiempo_creacion($1);';

		try {
			resultados = await baseDatos.query(instruccionSQL, [ this.id ]);
			if (resultados.rowCount > 0) {
				this.estimacionCreacion.operador = parseInt(resultados.rows[0].operador);
				this.estimacionCreacion.tiempo = new Date(resultados.rows[0].tiempo);
			}
		} catch (_e) {}
	}
};

module.exports = {
	Operaciones,
	Sanciones,
	Usuario
};
