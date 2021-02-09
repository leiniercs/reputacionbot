const Telegraf = require('telegraf');
const util = require('util');
const comun = require('./comun');
const { baseDatos } = require('./basedatos');
const notificaciones = require('./notificaciones');
// Produccion: 1342202179
// Desarrollo: 1250980023
const idBot = 1342202179;

const comandos = {
    administradores: {
        comando: 'lnadministradores',
        descripcion: 'Muestra la lista de Administradores de la Lista Negra.'
    },
    admAgregar: {
        comando: 'lnadmagregar',
        descripcion: `Otorga privilegios de Administrador de la Lista Negra a un usuario.
<b>Variantes de uso:</b>
  1- /lnadmagregar id_usuario
  2- /lnadmagregar @usuario
  3- Responder a un mensaje del usuario al que se le va otorgar privilegios administrativos con el texto:
     /lnadmagregar`
    },
    admEliminar: {
        comando: 'lnadmeliminar',
        descripcion: `Revoca los privilegios de Administrador de la Lista Negra a un usuario.
<b>Variantes de uso:</b>
  1- /lnadmeliminar id_usuario
  2- /lnadmeliminar @usuario
  3- Responder a un mensaje del usuario al que se le va revocar los privilegios administrativos con el texto:
     /lnadmeliminar`
    },
    agregar: {
        comando: 'lnagregar',
        descripcion: `Agrega a un usuario a la lista negra.
<b>Variantes de uso:</b>
  1- /lnagregar id_usuario Motivos de la inclusión
  2- /lnagregar @usuario Motivos de la inclusión
  3- Responder a un mensaje del usuario al que va a agregar a la lista negra con el texto:
     /lnagregar Motivos de la inclusión`
    },
    eliminar: {
        comando: 'lneliminar',
        descripcion: `Elimina un usuario de la lista negra.
<b>Variantes de uso:</b>
  1- /lneliminar id_usuario
  2- /lneliminar @usuario
  3- Responder a un mensaje del usuario al que va a eliminar de la lista negra con el texto:
     /lneliminar`
	},
    buscar: {
        comando: 'lnbuscar',
        descripcion: `Obtiene un listado de usuarios de la lista negra filtrados por criterios.
<b>Variantes de uso:</b>
  1- /lnbuscar criterios de busqueda`
    }
};

/**
 * Muestra la información de un usuario
 * @param {Telegraf} contexto Referencia al objeto de la sesion
 */
async function accion (contexto) {
	return procesar(contexto);
}

/**
 * Agrega/elimina un usuario en la lista negra
 * @param {Telegraf} contexto Referencia al objeto de la sesion
 */
async function procesar (contexto) {
	let comando = 0;
	let linea = {};
	let usuario = 0;
	let motivos = '';
	let criterios = '';
	let instruccionSQL = '';
	let resultados = {};
	let usuarioAutorizado = false;
	let mensaje = '';

	if (contexto.update.message.from.is_bot === true) {
		return;
	}

	if (contexto.update.message.text.startsWith(`/${comandos.administradores.comando}`) === true) {
		comando = 1;
	}
	if (contexto.update.message.text.startsWith(`/${comandos.admAgregar.comando}`) === true) {
		comando = 2;
	}
	if (contexto.update.message.text.startsWith(`/${comandos.admEliminar.comando}`) === true) {
		comando = 3;
	}
	if (contexto.update.message.text.startsWith(`/${comandos.agregar.comando}`) === true) {
		comando = 4;
	}
	if (contexto.update.message.text.startsWith(`/${comandos.eliminar.comando}`) === true) {
		comando = 5;
	}
	if (contexto.update.message.text.startsWith(`/${comandos.buscar.comando}`) === true) {
		comando = 6;
	}

	if (comando === 0) {
		return;
	}

	try {
		instruccionSQL = `
SELECT id::bigint
FROM listanegra_administradores
WHERE (
	id = $1
)
		`;
		resultados = await baseDatos.query(instruccionSQL, [ contexto.update.message.from.id ]);
		if (resultados.rowCount > 0) {
			usuarioAutorizado = true;
		}
	} catch (_e) {
		return;
	}

	if (comando < 6) {
		if (usuarioAutorizado === false) {
			contexto.telegram.sendMessage(contexto.update.message.chat.id, `<b>Lamentamos darle una mala noticia!</b>

Usted ha intentado ejecutar un comando en el módulo de la Lista Negra del <b>Bot de la Reputación</b> pero, lamentablemente, no posee privilegios administrativos, por lo que no está autorizado(a) a ejecutar esta acción.`, {
					parse_mode: 'HTML',
					reply_to_message_id: contexto.update.message.message_id
				})
				.then(() => {})
				.catch(() => {})
			;
			
			return;
		}


		if (contexto.update.message.reply_to_message !== undefined) {
			if (contexto.update.message.reply_to_message.from.is_bot === true) {
				return;
			}
		
			usuario = contexto.update.message.reply_to_message.from.id;

			linea = contexto.update.message.text.split(' ');
			linea.shift();
			if (linea.length > 0) {
				motivos = linea.join(' ');
			}
		} else {
			linea = contexto.update.message.text.split(' ');
			linea.shift();
			if (linea.length > 0) {
				if (linea[0][0] === '@') {
					usuario = linea[0].substring(1);
				} else {
					try {
						usuario = parseInt(linea[0]);
					} catch (_e) {
						return;
					}
				}
				linea.shift();
				if (linea.length > 0) {
					motivos = linea.join(' ');
				}
			}
		}

		if (typeof usuario === 'string') {
			try {
				instruccionSQL = `
SELECT id::bigint
FROM monitorizacion_usuarios
WHERE (
	usuario = $1
)
ORDER BY tiempo DESC
LIMIT 1
				`;
				resultados = await baseDatos.query(instruccionSQL, [ usuario ]);
				if (resultados.rowCount > 0) {
					usuario = parseInt(resultados.rows[0].id);
				} else {
					mensaje = `<b>Lamentamos darle una mala noticia!</b>

El usuario @${usuario} no ha sido visto jamás por el <b>Bot de la Reputación</b>, por lo que no se puede ejecutar la acción solicitada. Intente ejecutar otra vez el comando utilizando el ID del usuario.`;
				}
			} catch (_e) {
				mensaje = `<b>Lamentamos darle una mala noticia!</b>

El usuario @${usuario} no ha sido visto jamás por el <b>Bot de la Reputación</b>, por lo que no se puede ejecutar la acción solicitada. Intente ejecutar otra vez el comando utilizando el ID del usuario.`;
			}
		}
	}

	if (comando === 6) {
		linea = contexto.update.message.text.split(' ');
		linea.shift();
		if (linea.length > 0) {
			criterios = linea.join(' ');
		} else {
			mensaje = `<b>Lamentamos darle una mala noticia!</b>

No se pudo ejecutar la acción solicitada debido a que no ha especificado los criterios de búsqueda.

Sintaxis:
  /lnbuscar criterios de busqueda`;
		}
	}

	if (mensaje.length > 0) {
		contexto.telegram.sendMessage(contexto.update.message.chat.id, mensaje, {
				parse_mode: 'HTML',
				reply_to_message_id: contexto.update.message.message_id
			})
			.then(() => {})
			.catch(() => {})
		;

		return;
	}

	switch (comando) {
		case 1:
			return administracionMostrarListado(contexto);
		case 2:
			return administracionConfirmacionOtorgamiento(contexto, usuario);
		case 3:
			return administracionRevocar(contexto, usuario);
		case 4:
			return listaNegraAgregar(contexto, usuario, motivos);
		case 5:
			return listaNegraRevocar(contexto, usuario);
		case 6:
			return listaNegraBuscar(contexto, criterios);
		default:
			break;
	}
}

/**
 * Envía un mensaje de confirmación de otorgamiento de privilegios de Administrador
 * de la Lista Negra a un usuario
 * @param {Telegraf} contexto Referencia al objeto de la sesion
 * @param {number} usuario ID del usuario
 */
async function administracionConfirmacionOtorgamiento (contexto, usuario) {
	let instruccionSQL = '';
	let resultados = {};
	let nombreUsuario = '';
	let nombres = '';

	try {
		instruccionSQL = `
SELECT id::bigint
FROM listanegra_administradores
WHERE (
	id = $1
)
		`;
		resultados = await baseDatos.query(instruccionSQL, [ usuario ]);
		if (resultados.rowCount > 0) {
			contexto.telegram.sendMessage(contexto.update.message.chat.id, `<b>Lamentamos darle una mala noticia!</b>

No se pudo finalizar la acción solicitada debido a que el <a href="tg://user?id=${usuario}">usuario suministrado</a> ya posee privilegios administrativos en la <b>Lista Negra</b> del <b>Bot de la Reputación</b>.`, {
					parse_mode: 'HTML',
					reply_to_message_id: contexto.update.message.message_id
				})
				.then(() => {})
				.catch(() => {})
			;

			return;
		}

		instruccionSQL = `
SELECT id::bigint
FROM usuarios
WHERE (
	id = $1 AND
	verificado = true
)
		`;
		resultados = await baseDatos.query(instruccionSQL, [ usuario ]);
		if (resultados.rowCount === 0) {
			contexto.telegram.sendMessage(contexto.update.message.chat.id, `<b>Lamentamos darle una mala noticia!</b>

No se pudo otorgar privilegios administrativos en la <b>Lista Negra</b> al <a href="tg://user?id=${usuario}">usuario suministrado</a> debido a que este no posee su identidad verificada en el <b>Bot de la Reputación</b>.`, {
					parse_mode: 'HTML',
					reply_to_message_id: contexto.update.message.message_id
				})
				.then(() => {})
				.catch(() => {})
			;

			return;
		}
	} catch (_e) {
		return;
	}

	try {
		instruccionSQL = `
SELECT
	usuario_usuario::text,
	datos_personales_primer_nombre::text,
	datos_personales_segundo_nombre::text
FROM identidades
WHERE (
	usuario_id = $1 AND
	estado = 1
)
ORDER BY tiempo_creacion DESC
LIMIT 1
		`;
		resultados = await baseDatos.query(instruccionSQL, [ usuario ]);
		if (resultados.rowCount > 0) {
			nombreUsuario = resultados.rows[0].usuario_usuario;
			nombres = `${resultados.rows[0].datos_personales_primer_nombre} ${resultados.rows[0].datos_personales_segundo_nombre}`;
		} else {
			return;
		}
	} catch (_e) {
		return;
	}

	contexto.telegram.sendMessage(contexto.update.message.chat.id, `<b>Lista negra - Confirmación de nuevo administrador!</b>

Se requiere de la confirmación de ${nombres.trim()} (@${nombreUsuario}) para finalizar la acción de otorgamiento de privilegios administrativos en la <b>Lista Negra</b> del <b>Bot de la Reputación</b>.`, {
			parse_mode: 'HTML',
			reply_to_message_id: contexto.update.message.message_id,
			reply_markup: {
				inline_keyboard: [
					[ { text: 'Confirmar', callback_data: JSON.stringify({ _origen: comun.Origenes.ListaNegra, accion: 1, u: usuario, p: contexto.update.message.from.id }) } ]
				]
			}
		})
		.then(() => {})
		.catch(() => {})
	;
}

/**
 * Otorga de privilegios de Administrador de la Lista Negra a un usuario
 * @param {Telegraf} contexto Referencia al objeto de la sesion
 * @param {Object} datos Datos del usuario
 */
async function administracionOtorgar (contexto, datos) {
	let instruccionSQL = '';
	let nombreUsuario = '';
	let nombres = '';

	try {
		instruccionSQL = `
SELECT
	usuario_usuario::text,
	datos_personales_primer_nombre::text,
	datos_personales_segundo_nombre::text
FROM identidades
WHERE (
	usuario_id = $1 AND
	estado = 1
)
ORDER BY tiempo_creacion DESC
LIMIT 1
		`;
		resultados = await baseDatos.query(instruccionSQL, [ datos.u ]);
		if (resultados.rowCount > 0) {
			nombreUsuario = resultados.rows[0].usuario_usuario;
			nombres = `${resultados.rows[0].datos_personales_primer_nombre} ${resultados.rows[0].datos_personales_segundo_nombre}`;
		}

		instruccionSQL = `
INSERT INTO listanegra_administradores (id, id_promotor) VALUES ($1, $2)
		`;
		resultados = await baseDatos.query(instruccionSQL, [ datos.u, datos.p ]);

		contexto.editMessageText(`<b>Lista negra - Nuevo administrador confirmado!</b>

<b>Enhorabuena ${nombres.trim()} (@${nombreUsuario})!</b>

A partir de este momento usted posee privilegios administrativos en la <b>Lista Negra</b> del <b>Bot de la Reputación</b>.

Puede agregar usuarios a la <b>Lista Negra</b> con el comando /lnagregar y revocar con /lneliminar.`, {
				parse_mode: 'HTML',
				reply_markup: {}
			})
			.then(() => {})
			.catch(() => {})
		;

		contexto.answerCbQuery('Confirmación exitosa.')
			.then(() => {})
			.catch(() => {})
		;
	} catch (_e) {
		return;
	}
}

/**
 * Revoca los privilegios de Administrador de la Lista Negra a un usuario
 * @param {Telegraf} contexto Referencia al objeto de la sesion
 * @param {number} usuario ID del usuario
 */
async function administracionRevocar (contexto, usuario) {
	let instruccionSQL = '';
	let resultados = {};
	let nombreUsuario = '';
	let nombres = '';

	try {
		instruccionSQL = `
SELECT
	usuario_usuario::text,
	datos_personales_primer_nombre::text,
	datos_personales_segundo_nombre::text
FROM identidades
WHERE (
	usuario_id = $1 AND
	estado = 1
)
ORDER BY tiempo_creacion DESC
LIMIT 1
		`;
		resultados = await baseDatos.query(instruccionSQL, [ usuario ]);
		if (resultados.rowCount > 0) {
			nombreUsuario = resultados.rows[0].usuario_usuario;
			nombres = `${resultados.rows[0].datos_personales_primer_nombre} ${resultados.rows[0].datos_personales_segundo_nombre}`;
		} else {
			contexto.telegram.sendMessage(contexto.update.message.chat.id, `<b>Lamentamos darle una mala noticia!</b>

No se pudo ejecutar la acción solicitada debido a que dicho <a href="tg://user?id=${usuario}">usuario</a> no posee la identidad verificada en el <b>Bot de la Reputación</b>.`, {
					parse_mode: 'HTML',
					reply_to_message_id: contexto.update.message.message_id
				})
				.then(() => {})
				.catch(() => {})
			;

			return;
		}

		instruccionSQL = `
SELECT
	id::bigint
FROM listanegra_administradores
WHERE (id = $1)
		`;
		resultados = await baseDatos.query(instruccionSQL, [ usuario ]);
		if (resultados.rowCount === 0) {
			contexto.telegram.sendMessage(contexto.update.message.chat.id, `<b>Lamentamos darle una mala noticia!</b>

No se pudo ejecutar la acción solicitada debido a que el usuario ${nombres.trim()} (@${nombreUsuario}) no posee privilegios administrativos en la <b>Lista Negra</b> del <b>Bot de la Reputación</b>.`, {
					parse_mode: 'HTML',
					reply_to_message_id: contexto.update.message.message_id
				})
				.then(() => {})
				.catch(() => {})
			;

			return;
		}
	} catch (_e) {
		return;
	}

	instruccionSQL = 'DELETE FROM listanegra_administradores WHERE (id = $1)';
	baseDatos.query(instruccionSQL, [ usuario ])
		.then(() => {})
		.catch(() => {})
	;

	contexto.telegram.sendMessage(contexto.update.message.chat.id, `<b>Lista negra - Administrador revocado!</b>

Se han revocado los privilegios administrativos a ${nombres.trim()} (@${nombreUsuario}) en la <b>Lista Negra</b> del <b>Bot de la Reputación</b>.`, {
			parse_mode: 'HTML',
			reply_to_message_id: contexto.update.message.message_id
		})
		.then(() => {})
		.catch(() => {})
	;
}

/**
 * Muestra la lista de Administradores de la Lista Negra
 * @param {Telegraf} contexto Referencia al objeto de la sesion
 */
async function administracionMostrarListado (contexto) {
	let instruccionSQL = '';
	let resultados = {};
	let mensaje = `<b>Lista Negra - Listado de administradores</b>

Fecha del reporte: ${new Date().toLocaleString('es', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' })}\n`;
	let fila = {};
	let nombres = '';

	try {
		instruccionSQL = `
SELECT
	listanegra_administradores.id::bigint AS id,
	identidades.datos_personales_primer_nombre::text AS primer_nombre,
	identidades.datos_personales_segundo_nombre::text AS segundo_nombre,
	listanegra_administradores.tiempo::timestamptz AS tiempo
FROM listanegra_administradores
LEFT JOIN identidades ON (identidades.usuario_id = listanegra_administradores.id)
ORDER BY listanegra_administradores.tiempo ASC
		`;

		resultados = await baseDatos.query(instruccionSQL);
		if (resultados.rowCount > 0) {
			for (fila of resultados.rows) {
				nombres = `${fila.primer_nombre} ${fila.segundo_nombre}`;
				mensaje += `\n- <a href="tg://user?id=${fila.id}">${nombres.trim()}</a> - ${new Date(fila.tiempo).toLocaleString('es', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' })}`;
			}

			contexto.telegram.sendMessage(contexto.update.message.chat.id, mensaje, {
					parse_mode: 'HTML',
					reply_to_message_id: contexto.update.message.message_id
				})
				.then(() => {})
				.catch(() => {})
			;
		}
	} catch (_e) {}
}

/**
 * Agregar a un usuario a la Lista Negra
 * @param {Telegraf} contexto Referencia al objeto de la sesion
 * @param {number} usuario ID del usuario
 * @param {string} motivos Motivos de la adicion
 */
async function listaNegraAgregar (contexto, usuario, motivos) {
	let instruccionSQL = '';
	let resultados = {};
	let idAdministrador = 0;
	let nombresAdministrador = '';
	let motivosAnteriores = '';
	let mensaje = '';

	if (motivos.length === 0) {
		contexto.telegram.sendMessage(contexto.update.message.chat.id, `<b>Lamentamos darle una mala noticia!</b>

No se pudo ejecutar la acción solicitada debido a que no ha especificado los motivos de la adición.`, {
				parse_mode: 'HTML',
				reply_to_message_id: contexto.update.message.message_id
			})
			.then(() => {})
			.catch(() => {})
		;
		return;
	}

	try {
		instruccionSQL = `
SELECT
	listanegra_administradores.id::bigint AS id,
	identidades.datos_personales_primer_nombre::text AS primer_nombre,
	identidades.datos_personales_segundo_nombre::text AS segundo_nombre
FROM listanegra_administradores
LEFT JOIN identidades ON (identidades.usuario_id = listanegra_administradores.id)
WHERE (listanegra_administradores.id = $1)
		`;

		resultados = await baseDatos.query(instruccionSQL, [ usuario ]);
		if (resultados.rowCount > 0) {
			idAdministrador = resultados.rows[0].id;
			nombresAdministrador = `${resultados.rows[0].primer_nombre} ${resultados.rows[0].segundo_nombre}`;
			mensaje = `<b>Lamentamos darle una mala noticia</b>

No se pudo ejecutar la acción solicitada debido a que el usuario <a href="tg://user?id=${idAdministrador}">${nombresAdministrador.trim()}</a> es un Administrador en la <b>Lista Negra</b> del <b>Bot de la Reputación</b>.`;
		} else {
			instruccionSQL = `
SELECT
	listanegra.id_administrador::bigint AS id_administrador,
	identidades.datos_personales_primer_nombre::text AS primer_nombre,
	identidades.datos_personales_segundo_nombre::text AS segundo_nombre,
	listanegra.motivos::text AS motivos
FROM listanegra
LEFT JOIN identidades ON (identidades.usuario_id = listanegra.id_administrador)
WHERE (listanegra.id = $1)
			`;

			resultados = await baseDatos.query(instruccionSQL, [ usuario ]);
			if (resultados.rowCount > 0) {
				if (motivos.trim() === resultados.rows[0].motivos.trim()) {
					mensaje = `<b>Lamentamos darle una mala noticia</b>

No se pudo agregar ni actualizar el <a href="tg://user?id=${usuario}">usuario suministrado</a> a la <b>Lista Negra</b> debido a que ya existe una entrada para dicho usuario con el mismo motivo.`;
				} else {
					idAdministrador = resultados.rows[0].id_administrador;
					nombresAdministrador = `${resultados.rows[0].primer_nombre} ${resultados.rows[0].segundo_nombre}`;
					motivosAnteriores = resultados.rows[0].motivos;
					instruccionSQL = 'UPDATE listanegra SET motivos = $2 WHERE (id = $1)';
					mensaje = `<b>Lista Negra - Actualización de motivos</b>

<b>Fecha de actualización:</b> ${new Date().toLocaleString('es', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' })}
<b>Administrador inicial:</b> <a href="tg://user?id=${idAdministrador}">${nombresAdministrador.trim()}</a>

<b>Motivos actuales:</b>
${motivos}

<b>Motivos anteriores:</b>
${motivosAnteriores}`;
				resultados = await baseDatos.query(instruccionSQL, [ usuario, motivos ]);
				}
			} else {
				instruccionSQL = 'INSERT INTO listanegra (id, motivos, id_administrador) VALUES ($1, $2, $3)';
				mensaje = `<b>Lista Negra - Nuevo usuario agregado</b>

<b>Fecha:</b> ${new Date().toLocaleString('es', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' })}
<b>Motivos:</b>
${motivos}`;
				resultados = await baseDatos.query(instruccionSQL, [ usuario, motivos, contexto.update.message.from.id ]);
			}
		}

		contexto.telegram.sendMessage(contexto.update.message.chat.id, mensaje, {
				parse_mode: 'HTML',
				reply_to_message_id: contexto.update.message.message_id
			})
			.then(() => {
				listaNegraExpulsarGrupos(contexto, usuario, motivos);
			})
			.catch(() => {})
		;
	} catch (_e) {}
}

/**
 * Revoca a un usuario de la Lista Negra
 * @param {Telegraf} contexto Referencia al objeto de la sesion
 * @param {number} usuario ID del usuario
 */
async function listaNegraRevocar (contexto, usuario) {
	let instruccionSQL = '';
	let idAdministrador = 0;
	let nombresAdministrador = '';
	let motivos = '';
	let mensaje = '';

	try {
		instruccionSQL = `
SELECT
	listanegra.id_administrador::bigint AS id_administrador,
	identidades.datos_personales_primer_nombre::text AS primer_nombre,
	identidades.datos_personales_segundo_nombre::text AS segundo_nombre,
	listanegra.motivos::text AS motivos,
	listanegra.tiempo::timestamptz AS tiempo
FROM listanegra
LEFT JOIN identidades ON (identidades.usuario_id = listanegra.id_administrador)
WHERE (listanegra.id = $1)
		`;

		resultados = await baseDatos.query(instruccionSQL, [ usuario ]);
		if (resultados.rowCount > 0) {
			idAdministrador = resultados.rows[0].id_administrador;
			nombresAdministrador = `${resultados.rows[0].primer_nombre} ${resultados.rows[0].segundo_nombre}`;
			motivos = resultados.rows[0].motivos;
			mensaje = `<b>Lista Negra - Revocación de un usuario</b>

Se ha revocado a un usuario de la <b>Lista Negra</b>. Los detalles de la expulsión son:

<b>Fecha de expulsión:</b> ${new Date(resultados.rows[0].tiempo).toLocaleString('es', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' })}
<b>Administrador:</b> <a href="tg://user?id=${idAdministrador}">${nombresAdministrador.trim()}</a>
<b>Usuario:</b> <a href="tg://user?id=${usuario}">${usuario}</a>

<b>Motivos:</b>
${motivos}`;
			instruccionSQL = 'DELETE FROM listanegra WHERE (id = $1)';
			resultados = await baseDatos.query(instruccionSQL, [ usuario ]);
		} else {
			mensaje = `<b>Lamentamos darle una mala noticia</b>

No se pudo revocar al <a href="tg://user?id=${usuario}">usuario suministrado</a> debido a que no existe ninguna entrada para dicho usuario en la <b>Lista Negra</b> del <b>Bot de la Reputación</b>.`;
		}

		contexto.telegram.sendMessage(contexto.update.message.chat.id, mensaje, {
				parse_mode: 'HTML',
				reply_to_message_id: contexto.update.message.message_id
			})
			.then(() => {})
			.catch(() => {})
		;
	} catch (_e) {}
}

/**
 * Expulsa a un usuario
 * @param {Telegraf} contexto Referencia al objeto de la sesion
 * @param {Object} datos Datos
 */
function listaNegraExpulsar (contexto, datos) {
	let mensaje = `<b>Detección de usuario de la Lista Negra</b>

El usuario <a href="tg://user?id=${datos.usuario.id}">${datos.usuario.first_name.trim()}${(datos.usuario.username.length > 0 ? ` (@${datos.usuario.username})` : `(${datos.usuario.id})`)}</a> existe en la base de datos de la <b>Lista Negra</b>, por lo que será expulsado de este grupo de forma inmediata.

<b>Motivos:</b>
${datos.motivos}`;

	contexto.telegram.getChatMember(datos.chat, datos.usuario.id)
		.then((miembro) => {
			if (miembro.status === "kicked") {
				return;
			} else {
				contexto.telegram.sendMessage(datos.chat, mensaje, { parse_mode: 'HTML' })
					.then(() => {
						contexto.telegram.kickChatMember(datos.chat, datos.usuario.id)
							.then(() => {})
							.catch(() => {})
						;
					})
					.catch(() => {})
				;
			}
		})
		.catch(() => {})
	;

}

/**
 * Expulsa a un usuario de todos los grupos en donde radique
 * @param {Telegraf} contexto Referencia al objeto de la sesion
 * @param {number} usuario ID del usuario
 * @param {string} motivos Motivos de la expulsion
 */
async function listaNegraExpulsarGrupos (contexto, usuario, motivos) {
	let instruccionSQL = `
SELECT
	monitorizacion_usuarios_grupos.grupo::bigint AS id_grupo,
	grupos.lista_negra::boolean AS lista_negra
FROM monitorizacion_usuarios_grupos
LEFT JOIN grupos ON (grupos.id = monitorizacion_usuarios_grupos.grupo)
WHERE (monitorizacion_usuarios_grupos.usuario = $1)`;

	baseDatos.query(instruccionSQL, [ usuario ])
		.then(async (resultados) => {
			let res = {};
			let i = 0;
			let nombreUsuario = '';
			let nombres = '';

			if (resultados.rowCount > 0) {
				instruccionSQL = `
SELECT
	usuario::text
FROM monitorizacion_usuarios
WHERE (id = $1)
ORDER BY tiempo DESC
LIMIT 1
				`;
				res = await baseDatos.query(instruccionSQL, [ usuario ]);
				if (res.rowCount > 0) {
					nombreUsuario = res.rows[0].usuario;
				}
				instruccionSQL = `
SELECT
	nombres::text
FROM monitorizacion_nombres
WHERE (id = $1)
ORDER BY tiempo DESC
LIMIT 1
				`;
				res = await baseDatos.query(instruccionSQL, [ usuario ]);
				if (res.rowCount > 0) {
					nombres = res.rows[0].nombres;
				}

				for (i = 0; i < resultados.rowCount; i++) {
					const fila = resultados.rows[i];
					if (fila.lista_negra === true) {
						setTimeout(() => {
							listaNegraExpulsar(contexto, { usuario: { id: usuario, first_name: nombres, username: nombreUsuario }, chat: fila.id_grupo, motivos: motivos });
						}, i * 1000);
					}
				}
			}
		})
		.catch(() => {})
	;
}

/**
 * Verifica la existencia de un usuario en la Lista Negra y lo expulsa
 * del grupo en donde acciona en caso de existir
 * @param {Telegraf} contexto Referencia al objeto de la sesion
 * @param {Object} datos Datos
 */
async function listaNegraProcesar (contexto, datos) {
	let instruccionSQL = 'SELECT motivos::text FROM listanegra WHERE (id = $1)';

	baseDatos.query(instruccionSQL, [ datos.usuario.id ])
		.then((resultados) => {
			if (resultados.rowCount > 0) {
				listaNegraExpulsar(contexto, { usuario: datos.usuario, chat: datos.chat, motivos: resultados.rows[0].motivos });
			}
		})
		.catch(() => {})
	;
}

/**
 * Obtiene un listado de usuarios de la lista negra filtrados por criterios
 * @param {Telegraf} contexto Referencia al objeto de la sesion
 * @param {string} criterios Criterios de busqueda
 */
async function listaNegraBuscar (contexto, criterios) {
	let filtros = '';
	let instruccionSQL = '';

	for (let criterio of criterios.split(' ')) {
		filtros += `${criterio}%`;
	}

	instruccionSQL = `
SELECT
	listanegra.id::bigint AS id,
	(SELECT monitorizacion_usuarios.usuario::text
		FROM monitorizacion_usuarios
		WHERE (monitorizacion_usuarios.id = listanegra.id)
		ORDER BY monitorizacion_usuarios.tiempo DESC LIMIT 1) AS usuario,
	(SELECT monitorizacion_nombres.nombres::text
		FROM monitorizacion_nombres
		WHERE (monitorizacion_nombres.id = listanegra.id)
		ORDER BY monitorizacion_nombres.tiempo DESC LIMIT 1) AS nombres
FROM listanegra
WHERE (listanegra.motivos ILIKE '%${filtros}')
	`;

	baseDatos.query(instruccionSQL)
		.then((resultados) => {
			let fila = {};
			let mensaje = `<b>Lista Negra - Resultados de la búsqueda</b>

<b>Criterios:</b> ${criterios}
<b>Resultados:</b>
`;

			try {
				if (resultados.rowCount > 0) {
					for (let i = 0; i < resultados.rowCount; i++) {
						fila = resultados.rows[i];
						mensaje += ` ${i + 1}- `;
						if (fila.nombres !== null) {
							if (fila.nombres.length > 0) {
								mensaje += `${fila.nombres.trim()} - `;
							}
						}
						if (fila.usuario !== null) {
							if (fila.usuario.length > 0) {
								if (fila.nombres !== null) {
									if (fila.nombres.length > 0) {
										mensaje += ` - `;
									}
								}
								mensaje += `@${fila.usuario} - `;
							}
						}
						mensaje += `<a href="tg://user?id=${fila.id}">${fila.id}</a>\n`;
					}
				} else {
					mensaje = `<b>Lamentamos darle una mala noticia!</b>

La búsqueda no arrojó ningún resultado con los criterios especificados.`;
				}
			} catch (_e) {}

			contexto.telegram.sendMessage(contexto.update.message.chat.id, mensaje, {
					parse_mode: 'HTML',
					reply_to_message_id: contexto.update.message.message_id
				})
				.then(() => {})
				.catch(() => {})
			;
		})
		.catch((_e) => {})
	;
}

module.exports = {
	comandos,
	accion,
	administracionOtorgar,
	listaNegraProcesar
};
