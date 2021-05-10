const Telegraf = require('telegraf');
const comun = require('./comun');
const { baseDatos } = require('./basedatos');
const notificaciones = require('./notificaciones');
const { Operaciones, Usuario } = require('./usuario');

const comando = 'informacion';
const descripcion = `Muestra información de un usuario.
<b>Variantes de uso:</b>
  1- /informacion
  2- /informacion id_usuario
  3- /informacion @usuario
  4- Responder a un mensaje del usuario al que se desea ver información con el texto:
    /informacion`;

/**
 * Muestra la información de un usuario
 * @param {Telegraf} contexto Referencia al objeto de la sesion
 */
async function accion (contexto) {
	try {
        await comun.inicializarVariablesSesion(contexto);
        await mostrar(contexto);
        await comun.guardarVariablesSesion(contexto);
    } catch (_e) {}
}

/**
 * Muestra la información de un usuario
 * @param {Telegraf} contexto Referencia al objeto de la sesion
 */
async function mostrar (contexto) {
	let usuarioProcesamiento;
	let usuario;
	let mensaje = '';
	let vistoPrimeraVez = new Date();
	let nombres = '';

	if (contexto.message.from.is_bot === true) {
		return;
	}
/*
	if (contexto.session.registrado === true && contexto.session.verificado === true && contexto.session.cambioUsuario === true) {
		instruccionSQL = `
UPDATE usuarios
SET
	ctc = false,
	verificado = false
WHERE (
	id = $1
)
		`;
		baseDatos.query(instruccionSQL, [ contexto.session.usuario.id ])
			.then(() => {})
			.catch(() => {})
		;
		instruccionSQL = `
UPDATE identidades
SET
	estado = 2
WHERE (
	usuario_id = $1
)
		`;
		baseDatos.query(instruccionSQL, [ contexto.session.usuario.id ])
			.then(() => {})
			.catch(() => {})
		;
		instruccionSQL = `
DELETE FROM evaluaciones
WHERE (
	tipo = 1 AND
	destino = $1
)
		`;
		baseDatos.query(instruccionSQL, [ contexto.session.usuario.id ])
			.then(() => {})
			.catch(() => {})
		;

		contexto.telegram.sendMessage(contexto.session.idChat, `<b>Lamentamos darle una mala noticia!</b>

Se ha detectado que usted tiene su identidad verificada y, aún así, ha cambiado su nombre de usuario y/o nombre, por lo que ha incurrido en una falta que es sancionada con la invalidación de su verificación y todas las evaluaciones positivas. Si desea volver a utilizar los servicios del Bot de la Reputación debe volver a verificar su identidad.`, { parse_mode: 'HTML', reply_to_message_id: contexto.update.message.message_id })
			.then(() => {})
			.catch(() => {})
		;
		return;
	}
*/
/*
	if (contexto.session.poseeUsuario === false || contexto.session.registrado === false || contexto.session.cambioUsuario === true || contexto.session.verificado === false) {
		notificaciones.noElegibleInformeReputacion(contexto, contexto.message.reply_to_message.from, 1);
		return;
	}
*/
	if (contexto.update.message.reply_to_message !== undefined) {
		if (contexto.update.message.reply_to_message.from.is_bot === true) {
			return;
		}
	
		usuario = contexto.update.message.reply_to_message.from.id;
	} else {
		usuario = contexto.update.message.text.split(' ');
		usuario.shift();
		if (usuario.length > 0) {
			if (usuario[0][0] === '@') {
				usuario = usuario[0].substring(1);
			} else {
				try {
					usuario = parseInt(usuario[0]);
				} catch (_e) {
					return;
				}
			}
		} else {
			usuario = contexto.update.message.from.id;
		}
	}

	usuarioProcesamiento = new Usuario(usuario);
	try {
		await usuarioProcesamiento.obtenerTelegramDatosUsuario(contexto);
		await usuarioProcesamiento.obtenerEstimacionCreacion();
//		await usuarioProcesamiento.obtenerHistorialListadoNombres();
//		await usuarioProcesamiento.obtenerHistorialListadoUsuarios();
		await usuarioProcesamiento.obtenerDatosRegistro();
		await usuarioProcesamiento.obtenerDatosListaNegra();
/*
		if (usuarioProcesamiento.historial.usuarios.length === 0) {
			if (usuarioProcesamiento.datosActuales.usuario.length > 0) {
				await usuarioProcesamiento.registrarHistorialUsuario(usuarioProcesamiento.datosActuales.usuario);
			}
		}
		if (usuarioProcesamiento.historial.nombres.length === 0) {
			if (usuarioProcesamiento.datosActuales.nombres.length > 0) {
				await usuarioProcesamiento.registrarHistorialNombres(usuarioProcesamiento.datosActuales.nombres);
			}
		}
		if (usuarioProcesamiento.historial.usuarios.length === 0 && usuarioProcesamiento.historial.nombres.length === 0 && usuarioProcesamiento.datosActuales.usuario.length === 0 && usuarioProcesamiento.datosActuales.nombres.length === 0 && usuarioProcesamiento.listaNegra.motivos.length === 0) {
			throw new Error('Usuario inexistente');
		}
*/
		if (usuarioProcesamiento.datosActuales.usuario.length === 0 && usuarioProcesamiento.datosActuales.nombres.length === 0 && usuarioProcesamiento.listaNegra.motivos.length === 0) {
			throw new Error('Usuario inexistente');
		}
		
		mensaje = `<b>Información del usuario</b>

<a href="tg://user?id=${usuarioProcesamiento.id}">Enlace al usuario</a>
Fecha creación: ${(usuarioProcesamiento.estimacionCreacion.operador === -1 ? 'Antes de' : (usuarioProcesamiento.estimacionCreacion.operador === 0 ? 'Aprox.' : 'Después de' ))} ${usuarioProcesamiento.estimacionCreacion.tiempo.toLocaleString('es', { year: 'numeric', month: 'short', day: 'numeric' })}
ID: ${usuarioProcesamiento.id}
Usuario: ${(usuarioProcesamiento.datosActuales.usuario.length > 0 ? `@${usuarioProcesamiento.datosActuales.usuario}` : '[No definido]')}
Nombres: ${(usuarioProcesamiento.datosActuales.nombres.length > 0 ? usuarioProcesamiento.datosActuales.nombres : '[No definido]')}
`;
/*
		if (usuarioProcesamiento.historial.usuarios.length > 0) {
			mensaje += '\n<b>Historial de usuarios</b>\n';
		}
		for (let fila of usuarioProcesamiento.historial.usuarios) {
			mensaje += `${new Date(fila.tiempo).toLocaleString('es', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' })} - ${(fila.usuario.length > 0 ? fila.usuario : '[No definido]')}\n`;
		}
		if (usuarioProcesamiento.historial.nombres.length > 0) {
			mensaje += '\n<b>Historial de nombres</b>\n';
		}
		for (let fila of usuarioProcesamiento.historial.nombres) {
			mensaje += `${new Date(fila.tiempo).toLocaleString('es', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' })} - ${(fila.nombres.length > 0 ? fila.nombres : '[No definido]')}\n`;
		}
*/
		if (usuarioProcesamiento.registro.verificado === true) {
			mensaje += `\nEste usuario posee su identidad verificada en el <b>Bot de la Reputación</b>.\n`;
		}
		if (usuarioProcesamiento.listaNegra.esAdministrador === true) {
			mensaje += `\nEste usuario es <b>Administrador</b> de la <b>Lista Negra</b> del <b>Bot de la Reputación</b>.\n`;
		}
		if (usuarioProcesamiento.listaNegra.motivos.length > 0) {
			mensaje += `\nEste usuario está sancionado en la <b>Lista Negra</b> del <b>Bot de la Reputación</b>.
<b>Motivos de la sanción:</b>\n${usuarioProcesamiento.listaNegra.motivos}`;
		}

		if (mensaje.length > 0) {
			contexto.telegram.sendMessage(contexto.update.message.chat.id, mensaje, { parse_mode: 'HTML', reply_to_message_id: contexto.update.message.message_id })
				.then(() => {})
				.catch(() => {})
			;
		}
	} catch(_e) {
		contexto.telegram.sendMessage(contexto.update.message.chat.id, `<b>No se pudo obtener el informe del usuario</b>

No se pudo obtener ninguna información del usuario solicitado desde Telegram ni existe en la base de datos, por lo que no se pudo generar el informe. Si ha utilizado un nombre de usuario entonces intente consultar el informe otra vez utilizando el ID, para mayor probabilidad de éxito.`, { parse_mode: 'HTML', reply_to_message_id: contexto.update.message.message_id })
			.then(() => {})
			.catch(() => {})
		;
	}
/*
	if (typeof usuario === 'string') {
		try {
			instruccionSQL = `
SELECT
	id::bigint
FROM monitorizacion_usuarios
WHERE (
	usuario = $1
)
LIMIT 1`;
			resultadosUsuarios = await baseDatos.query(instruccionSQL, [ usuario ]);

			if (resultadosUsuarios.rowCount > 0) {
				usuario = parseInt(resultadosUsuarios.rows[0].id);
			} else {
				contexto.telegram.sendMessage(contexto.update.message.chat.id, `<b>No se pudo obtener el informe del usuario</b>

El usuario al que desea consultar la información no existe en la base de datos, por lo que no se pudo generar el informe. Intente consultar el informe otra vez utilizando el ID, para mayor probabilidad de éxito.`, { parse_mode: 'HTML', reply_to_message_id: contexto.update.message.message_id })
					.then(() => {})
					.catch(() => {})
				;
			}
		} catch (_e) {}
	}

	if (typeof usuario === 'number') {
		contexto.telegram.getChat(usuario)
			.then(async (informacion) => {
				await monitorizar(contexto, informacion);
				try {
					instruccionSQL = `
SELECT
	motivos::text
FROM listanegra
WHERE (
	id = $1
)`;
					resultadosUsuarios = await baseDatos.query(instruccionSQL, [ usuario ]);
					if (resultadosUsuarios.rowCount > 0) {
						motivoExpulsion = resultadosUsuarios.rows[0].motivos;
					}

					instruccionSQL = `
SELECT
	id::bigint
FROM listanegra_administradores
WHERE (
	id = $1
)`;
					resultadosUsuarios = await baseDatos.query(instruccionSQL, [ usuario ]);
					if (resultadosUsuarios.rowCount > 0) {
						administradorListaNegra = true;
					}

					instruccionSQL = `
SELECT
	usuario::text,
	tiempo::timestamptz
FROM monitorizacion_usuarios
WHERE (
	id = $1
)
ORDER BY tiempo ASC`;
					resultadosUsuarios = await baseDatos.query(instruccionSQL, [ usuario ]);

					instruccionSQL = `
SELECT
	nombres::text,
	apellidos::text,
	tiempo::timestamptz
FROM monitorizacion_nombres
WHERE (
	id = $1
)
ORDER BY tiempo ASC`;
					resultadosNombres = await baseDatos.query(instruccionSQL, [ usuario ]);
				} catch (_e) {
					return;
				}

				mensaje = `<b>Información del usuario</b>

<a href="tg://user?id=${usuario}">Enlace al usuario</a>
Visto por primera vez: ${new Date(resultadosUsuarios.rows[0].tiempo).toLocaleString('es', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' })}
ID: ${usuario}
Usuario: ${(resultadosUsuarios.rows[resultadosUsuarios.rowCount - 1].usuario.length > 0 ? `@${resultadosUsuarios.rows[resultadosUsuarios.rowCount - 1].usuario}` : '[No definido]')}
Nombre: ${resultadosNombres.rows[resultadosNombres.rowCount - 1].nombres} ${resultadosNombres.rows[resultadosNombres.rowCount - 1].apellidos}

<b>Historial de usuarios</b>
`;
				for (fila of resultadosUsuarios.rows) {
					mensaje += `${new Date(fila.tiempo).toLocaleString('es', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' })} - ${fila.usuario}\n`;
				}
				mensaje += `
<b>Historial de nombres</b>
`;
				for (fila of resultadosNombres.rows) {
					mensaje += `${new Date(fila.tiempo).toLocaleString('es', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' })} - ${fila.nombres} ${fila.apellidos}\n`;
				}
				if (administradorListaNegra === true) {
					mensaje += `\nEste usuario es <b>Administrador</b> de la <b>Lista Negra</b> del <b>Bot de la Reputación</b>.\n`;
				}
				if (motivoExpulsion.length === 0) {
					mensaje += `\nEste usuario no está en la Lista Negra.`;
				} else {
					mensaje += `\n<b>Motivos de la inclusión en la Lista Negra</b>:\n${motivoExpulsion}`;
				}

				if (mensaje.length > 0) {
					contexto.telegram.sendMessage(contexto.update.message.chat.id, mensaje, { parse_mode: 'HTML', reply_to_message_id: contexto.update.message.message_id })
						.then(() => {})
						.catch(() => {})
					;
				}
			})
			.catch((_e) => {
				contexto.telegram.sendMessage(contexto.update.message.chat.id, `<b>Lamentamos darle una mala noticia</b>

No se pudo obtener los datos del usuario al que desea consultar la información, por lo que no se pudo generar el informe. Intente nuevamente en algunos minutos.`, { parse_mode: 'HTML', reply_to_message_id: contexto.update.message.message_id })
					.then(() => {})
					.catch(() => {})
				;
			})
		;
	}
*/
}

/**
 * Registra/actualiza la información de un usuario
 * @param {Telegraf} contexto Referencia al objeto de la sesion
 */
async function registrarCambios(contexto) {
	let comprobaciones = [];
	let agregar = true;
	let comprobacionesCuradas = [];
	const usuario = new Usuario(0);

	if (contexto.update.message !== undefined) {
		if (contexto.update.message.from !== undefined) {
			comprobaciones.push({ from: contexto.update.message.from, chat: contexto.update.message.chat });
		}
		if (contexto.update.message.new_chat_members !== undefined) {
			for (let nuevoMiembro of contexto.update.message.new_chat_members) {
				comprobaciones.push({ from: nuevoMiembro, chat: contexto.update.message.chat });
			}
		}
		if (contexto.update.message.left_chat_member !== undefined) {
			comprobaciones.push({ from: contexto.update.message.left_chat_member, chat: contexto.update.message.chat, partida: true });
		}
	}
	if (contexto.update.edited_message !== undefined) {
		comprobaciones.push({ from: contexto.update.edited_message.from, chat: contexto.update.message.chat });
	}
	if (contexto.update.forward_from !== undefined) {
		comprobaciones.push({ from: contexto.update.forward_from.from, chat: contexto.update.message.chat });
	}
	if (contexto.update.callback_query !== undefined) {
		comprobaciones.push({ from: contexto.update.callback_query.from, chat: contexto.update.message.chat });
	}

	for (let i1 = 0; i1 < comprobaciones.length; i1++) {
		if (comprobaciones[i1].from.is_bot === true || comprobaciones[i1].from.id === 777000) {
			//comprobaciones.splice(i1, 1);
			//i1--;
			continue;
		} else {
			agregar = true;
			for (let i2 = i1 + 1; i2 < comprobaciones.length; i2++) {
				if (comprobaciones[i2].from.id === comprobaciones[i1].from.id) {
					agregar = false;
					break;
					//comprobaciones.splice(i2, 1);
					//i2--;
				}
			}
			if (agregar === true) {
				comprobacionesCuradas.push(comprobaciones[i1]);
			}
		}
	}

//	console.debug(`${comprobacionesCuradas.length}`);

	for (let i = 0; i < comprobacionesCuradas.length; i++) {
		try {

			usuario.inicializarVariables();
			usuario.id = comprobacionesCuradas[i].from.id;
			let nombres = '';
			let nombresAnteriores = '';
			let usuarioAnterior = '';
			let realizarRegistroNombres = false;
			let realizarRegistroUsuario = false;
			let notificarCambios = false;
			let mensaje = '';

			await usuario.obtenerHistorialListadoNombres();
			await usuario.obtenerHistorialListadoUsuarios();

			nombres = `${(comprobacionesCuradas[i].from.first_name !== undefined ? comprobacionesCuradas[i].from.first_name : '')}${(comprobacionesCuradas[i].from.last_name !== undefined ? ` ${comprobacionesCuradas[i].from.last_name}` : '')}`;

			if (usuario.historial.nombres.length > 0) {
				if (usuario.historial.nombres[usuario.historial.nombres.length - 1].nombres !== nombres) {
					nombresAnteriores = usuario.historial.nombres[usuario.historial.nombres.length - 1].nombres;
					realizarRegistroNombres = true;
					notificarCambios = true;
				}
			} else {
				if (usuario.datosActuales.nombres.length > 0) {
					realizarRegistroNombres = true;
				}
			}
			if (realizarRegistroNombres === true) {
				await usuario.registrarHistorialNombres(nombres);
			}

			if (usuario.historial.usuarios.length > 0) {
				if (usuario.historial.usuarios[usuario.historial.usuarios.length - 1].usuario !== comprobacion.from.username) {
					usuarioAnterior = usuario.historial.usuarios[usuario.historial.usuarios.length - 1].usuario;
					realizarRegistroUsuario = true;
					notificarCambios = true;
				}
			} else {
				if (usuario.datosActuales.usuario.length > 0) {
					realizarRegistroUsuario = true;
				}
			}
			if (realizarRegistroUsuario === true) {
				await usuario.registrarHistorialUsuario(comprobacion.from.username);
			}

			if (comprobacion.chat !== undefined) {
				if (comprobacion.chat.id !== comprobacion.from.id) {
					if (comprobacion.partida === true) {
						await usuario.eliminarHistorialUsuarioGrupo(comprobacion.chat.id);
					} else {
						await usuario.registrarHistorialUsuarioGrupo(comprobacion.chat.id);
					}
				}
			}

		} catch (_e) {}
	}
}

/**
 * Registra/actualiza la información de un usuario
 * @param {Telegraf} contexto Referencia al objeto de la sesion
 * @param {Object} usuario Referencia al objeto del usuario
 * @param {number} idChat ID del chat
 */
async function monitorizar (contexto, usuario, idChat) {
	let instruccionSQL = '';
	let resultados = {};
	let cambios = '';
	let i = 0;

	if (usuario.is_bot === true) {
		return;
	}

	if (usuario.username === undefined) { usuario.username = ''; }
	if (usuario.first_name === undefined) { usuario.first_name = ''; }
	if (usuario.last_name === undefined) { usuario.last_name = ''; }

	try {
		instruccionSQL = `
SELECT
	usuario::text
FROM monitorizacion_usuarios
WHERE (
	id = $1
)
ORDER BY tiempo DESC
LIMIT 1
		`;
		resultados = await baseDatos.query(instruccionSQL, [ usuario.id ]);
		if (resultados.rowCount > 0) {
			if (usuario.username !== resultados.rows[0].usuario) {
				registrarUsuario(usuario);
				cambios = `\n\n<b>Nombre de usuario</b>
Anterior: ${(resultados.rows[0].usuario.length > 0 ? `@${resultados.rows[0].usuario}` : '[No definido]')}
Actual: ${(usuario.username.length > 0 ? `@${usuario.username}` : '[No definido]')}`;
			}
		} else {
			registrarUsuario(usuario);
		}

		instruccionSQL = `
SELECT
	nombres::text,
	apellidos::text
FROM monitorizacion_nombres
WHERE (
	id = $1
)
ORDER BY tiempo DESC
LIMIT 1
		`;
		resultados = await baseDatos.query(instruccionSQL, [ usuario.id ]);
		if (resultados.rowCount > 0) {
			if (usuario.first_name !== resultados.rows[0].nombres || usuario.last_name !== resultados.rows[0].apellidos) {
				registrarNombres(usuario);
			}
			if (usuario.first_name !== resultados.rows[0].nombres) {
				cambios += `\n\n<b>Nombres</b>
Anterior: ${(resultados.rows[0].nombres.length > 0 ? `${resultados.rows[0].nombres}` : '[No definido]')}
Actual: ${(usuario.first_name.length > 0 ? `${usuario.first_name}` : '[No definido]')}`;
			}
			if (usuario.last_name !== resultados.rows[0].apellidos) {
				cambios += `\n\n<b>Apellidos</b>
Anterior: ${(resultados.rows[0].apellidos.length > 0 ? `${resultados.rows[0].apellidos}` : '[No definido]')}
Actual: ${(usuario.last_name.length > 0 ? `${usuario.last_name}` : '[No definido]')}`;
			}
		} else {
			registrarNombres(usuario);
		}

		if (idChat !== undefined) {
			instruccionSQL = `
SELECT
	usuario::integer
FROM monitorizacion_usuarios_grupos
WHERE (
	usuario = $1 AND
	grupo = $2
)
LIMIT 1
			`;
			resultados = await baseDatos.query(instruccionSQL, [ usuario.id, idChat ]);
			if (resultados.rowCount === 0) {
				await registrarGrupoUsuario(usuario.id, idChat);
			}
		}

		if (cambios.length > 0) {
			cambios = `<b>Notificación de cambio en la identidad</b>

Se ha detectado un cambio en la identidad del usuario <a href="tg://user?id=${usuario.id}">${usuario.id}</a>.${cambios}`;
			instruccionSQL = `
SELECT
	grupo::bigint
FROM monitorizacion_usuarios_grupos
WHERE (
	usuario = $1
)
			`;
			resultados = await baseDatos.query(instruccionSQL, [ usuario.id ]);
			for (i = 0; i < resultados.rowCount; i++) {
				const fila = resultados.rows[i];
				setTimeout(() => {
					contexto.telegram.sendMessage(fila.grupo, cambios, { parse_mode: 'HTML' })
						.then(() => {})
						.catch(() => {})
					;
				}, i * 1000);
			}
		}
	} catch (_e) {}
}

function registrarUsuario(usuario) {
	const instruccionSQL = `
INSERT INTO monitorizacion_usuarios (
	id,
	usuario
) VALUES (
	$1,
	$2
)
	`;
	baseDatos.query(instruccionSQL, [ usuario.id, usuario.username ])
		.then(() => {})
		.catch(() => {})
	;
}

function registrarNombres(usuario) {
	const instruccionSQL = `
INSERT INTO monitorizacion_nombres (
	id,
	nombres,
	apellidos
) VALUES (
	$1,
	$2,
	$3
)
	`;
	baseDatos.query(instruccionSQL, [ usuario.id, usuario.first_name, usuario.last_name ])
		.then(() => {})
		.catch(() => {})
	;
}

/**
 * Registra el ID del grupo en el cual esta unido el ID del usuario especificado
 * @param {number} usuario ID del usuario
 * @param {number} grupo ID del grupo
 */
async function registrarGrupoUsuario(usuario, grupo) {
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
		resultados = await baseDatos.query(instruccionSQL, [ usuario, grupo ]);
		if (resultados.rowCount === 0) {
			instruccionSQL = `
INSERT INTO monitorizacion_usuarios_grupos (
	usuario,
	grupo
) VALUES (
	$1,
	$2
)`;
			await baseDatos.query(instruccionSQL, [ usuario, grupo ]);
		}
	} catch (_e) {}
}

function eliminarGrupoUsuario(usuario, grupo) {
	const instruccionSQL = `
DELETE FROM monitorizacion_usuarios_grupos
WHERE (
	usuario = $1 AND
	grupo = $2
)
	`;
	baseDatos.query(instruccionSQL, [ usuario, grupo ])
		.then(() => {})
		.catch(() => {})
	;
}

module.exports = {
	comando,
	descripcion,
	accion,
	registrarCambios,
	monitorizar,
	eliminarGrupoUsuario
};
