const Telegraf = require('telegraf');
const comun = require('./comun');
const { baseDatos } = require('./basedatos');
const notificaciones = require('./notificaciones');

const comando = 'informacion';
const descripcion = `Muestra información de un usuario.
<b>Variantes de uso:</b>
  1- /informacion @usuario
  2- /informacion id
  3- Responder a un mensaje del usuario al que se desea ver información con el texto:
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
	let instruccionSQL = '';
	let resultadosUsuarios = {};
	let resultadosNombres = {};
	let fila = {};
	let usuario;
	let mensaje = '';

	if (contexto.message.from.is_bot === true) {
		return;
	}

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

	if (contexto.session.poseeUsuario === false || contexto.session.registrado === false || contexto.session.cambioUsuario === true || contexto.session.verificado === false) {
		notificaciones.noElegibleInformeReputacion(contexto, contexto.message.reply_to_message.from, 1);
		return;
	}

	if (contexto.update.message.reply_to_message !== undefined) {
		if (contexto.update.message.reply_to_message.from.is_bot === true) {
			return;
		}
	
		usuario = contexto.update.message.reply_to_message.from.id;
	} else {
		usuario = contexto.update.message.text.split(' ');
		usuario.shift();
		if (usuario.length > 0) {
			if (usuario[0] === '@reputacionbot') {
				usuario.shift();
			}
			if (usuario.length > 0) {
				if (usuario[0][0] === '@') {
					usuario = usuario[0].subtring(1);
				} else {
					try {
						usuario = parseInt(usuario[0]);
					} catch (_e) {
						return;
					}
				}
			}
		}
	}

	if (typeof usuario === 'number') {
		try {
			instruccionSQL = `
SELECT
	usuario::text,
	tiempo::timestamptz
FROM monitorizacion_usuarios
WHERE (
	id = $1
)
ORDER BY tiempo ASC
			`;
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
ORDER BY tiempo ASC
			`;
			resultadosNombres = await baseDatos.query(instruccionSQL, [ usuario ]);
		} catch (_e) {
			return;
		}

		if (resultadosUsuarios.rowCount === 0 && resultadosNombres.rowCount === 0) {
			contexto.telegram.getChat(usuario)
				.then((informacion) => {
					monitorizar(contexto, informacion);
					mensaje = `<b>Información del usuario</b>

<a href="tg://user?id=${informacion.id}">Enlace al usuario</a>
ID: ${informacion.id}`;
					if (informacion.username !== undefined) {
						mensaje += `\nUsuario: @${informacion.username}`;
					}
					if (informacion.first_name.length > 0) {
						mensaje += `\nNombre: ${informacion.first_name} ${(informacion.last_name !== undefined ? informacion.last_name : '')}`;
					}
					contexto.telegram.sendMessage(contexto.update.message.chat.id, mensaje, { parse_mode: 'HTML', reply_to_message_id: contexto.update.message.message_id })
						.then(() => {})
						.catch(() => {})
					;
				})
				.catch(() => {})
			;
			return;
		} else {
			mensaje = `<b>Información del usuario</b>

<a href="tg://user?id=${usuario}">Enlace al usuario</a>
Visto por primera vez: ${new Date(resultadosUsuarios.rows[0].tiempo).toLocaleString('es')}
ID: ${usuario}
Usuario: ${(resultadosUsuarios.rows[resultadosUsuarios.rowCount - 1].usuario.length > 0 ? `@${resultadosUsuarios.rows[resultadosUsuarios.rowCount - 1].usuario}` : '[No definido]')}
Nombre: ${resultadosNombres.rows[resultadosNombres.rowCount - 1].nombres} ${resultadosNombres.rows[resultadosNombres.rowCount - 1].apellidos}

<b>Historial de usuarios</b>
`;
			for (fila of resultadosUsuarios.rows) {
				mensaje += `${new Date(fila.tiempo).toLocaleString('es')} - ${fila.usuario}\n`;
			}
			mensaje += `
<b>Historial de nombres</b>
`;
			for (fila of resultadosNombres.rows) {
				mensaje += `${new Date(fila.tiempo).toLocaleString('es')} - ${fila.nombres} ${fila.apellidos}\n`;
			}
		}
	}
	if (typeof usuario === 'string') {
	}

	if (mensaje.length > 0) {
		contexto.telegram.sendMessage(contexto.update.message.chat.id, mensaje, { parse_mode: 'HTML', reply_to_message_id: contexto.update.message.message_id })
			.then(() => {})
			.catch(() => {})
		;
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
	let fila = {};

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
				registrarGrupoUsuario(usuario.id, idChat);
			}
		}

		if (cambios.length > 0) {
			cambios = `<b>Notificación de cambio en la identidad</b>

Se ha detectado un cambio en la identidad del usuario <a href="tg://user?id=${usuario.id}">${usuario.id}</a>.${cambios}`;
			instruccionSQL = `
SELECT
	grupo::integer
FROM monitorizacion_usuarios_grupos
WHERE (
	usuario = $1
)
			`;
			resultados = await baseDatos.query(instruccionSQL, [ usuario.id ]);
			if (resultados.rowCount > 0) {
				for (fila of resultados.rows) {
					contexto.telegram.sendMessage(fila.grupo, cambios, { parse_mode: 'HTML' })
						.then(() => {})
						.catch(() => {})
					;
				}
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

function registrarGrupoUsuario(usuario, grupo) {
	const instruccionSQL = `
INSERT INTO monitorizacion_usuarios_grupos (
	usuario,
	grupo
) VALUES (
	$1,
	$2
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
	monitorizar
};
