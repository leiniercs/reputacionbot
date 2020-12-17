const Telegraf = require('telegraf');
const { baseDatos } = require('./basedatos');
const comun = require('./comun');
const notificaciones = require('./notificaciones');
// Produccion: 1342202179:AAHUaRsyypamrLOojbz7w3m3TjY7gdjpD1g
// Desarrollo: 1250980023:AAEQdEYzdC2VEVeff6GWwCDieFm6YzK2CoU
const idBot = '1342202179';

const comando = 'repuinfo';
const descripcion = `Solicita un informe con detalles de la reputación de un usuario.
<b>Variantes de uso:</b>
  1- /repuinfo
  2- /repuinfo @usuario
  3- Responder a un mensaje del usuario al que se desea ver el informe de reputación con el texto:
    /repuinfo`;


/**
 * Visualiza los Términos y Condiciones para su lectura, entendimiento y aprobación
 * @param {Telegraf} contexto Referencia al objeto de la sesion
 */
async function accion (contexto) {
    try {
        await comun.inicializarVariablesSesion(contexto);
        await obtener(contexto);
        await comun.guardarVariablesSesion(contexto);
    } catch (_e) {}
}

/**
 * Genera el informe de reputación
 * @param {Telegraf} contexto Referencia al objeto de la sesion
 */
async function obtener (contexto) {
	let instruccionSQL = '';
	let resultados = {};
	let usuario = {};
	let totalEvaluacionesPositivas = 0;
	let totalEvaluacionesNegativas = 0;
	let mensajeEvaluacionesPositivas = '';
	let mensajeEvaluacionesNegativas = '';
	let mensajeInformacionReputacion = '';
	let mensajeInformacionReducidaReputacion = '';

	if (contexto.message.from.is_bot === true) {
		return;
	}

	if (contexto.session.registrado === true && contexto.session.cambioUsuario === true && contexto.session.verificado === true) {
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
			notificaciones.noElegibleInformeReputacion(contexto, contexto.message.reply_to_message.from, 2);
			return;
		}
	
		usuario = contexto.message.reply_to_message.from;
	} else {
		usuario = contexto.message.text.split(' ');
		usuario.shift();
		if (usuario.length > 0) {
			if (usuario[0][0] === '@') {
				instruccionSQL = `
SELECT
	id::integer
FROM usuarios
WHERE (
	usuario = $1
)
				`;
				resultados = await baseDatos.query(instruccionSQL, [ usuario[0].substring(1) ]);
				if (resultados.rowCount === 0) {
					notificaciones.noElegibleInformeReputacion(contexto, { username: usuario[0].substring(1) }, 2);
					return;
				} else {
					usuario = {
						id: resultados.rows[0].id,
						username: usuario[0].substring(1)
					};
				}
            }
		} else {
			usuario = contexto.from;
		}
	}

	instruccionSQL = `
SELECT
	estado::integer
FROM identidades
WHERE (
	usuario_id = $1
)
ORDER BY id DESC
LIMIT 1
	`;
	resultados = await baseDatos.query(instruccionSQL, [ usuario.id ]);
	if (resultados.rowCount === 0) {
		notificaciones.noElegibleInformeReputacion(contexto, usuario, 2);
		return;
	} else {
		if (resultados.rows[0].estado === 3) {
			mostrarInformeSancionado(contexto, usuario);
			return;
		} else if (resultados.rows[0].estado === 2) {
			notificaciones.noElegibleInformeReputacion(contexto, usuario, 2);
			return;
		}
	}
	
	instruccionSQL = `
SELECT
	datos_personales_primer_nombre::text AS primer_nombre,
	datos_personales_segundo_nombre::text AS segundo_nombre,
	direccion_localidad::text AS localidad,
	direccion_region::text AS region,
	direccion_codigo_pais::text AS codigo_pais,
	tiempo_creacion::timestamptz
FROM identidades
WHERE (
	usuario_id = $1 AND
	estado = 1
)
ORDER BY id DESC
LIMIT 1
	`;
	resultados = await baseDatos.query(instruccionSQL, [ usuario.id ]);
	if (resultados.rowCount === 0) {
		notificaciones.noElegibleInformeReputacion(contexto, usuario, 2);
		return;
	} else {
		usuario.first_name = resultados.rows[resultados.rowCount - 1].primer_nombre;
		usuario.middle_name = resultados.rows[resultados.rowCount - 1].segundo_nombre;
		usuario.location = resultados.rows[resultados.rowCount - 1].localidad;
		usuario.region = resultados.rows[resultados.rowCount - 1].region;
		usuario.country_code = resultados.rows[resultados.rowCount - 1].codigo_pais;
		usuario.tiempo_creacion = new Date(resultados.rows[resultados.rowCount - 1].tiempo_creacion);
	}

	instruccionSQL = `
SELECT
	COUNT(id)::integer AS total
FROM evaluaciones
WHERE (
	tipo = 1 AND
	destino = $1
)
	`;
	resultados = await baseDatos.query(instruccionSQL, [ usuario.id ]);
	if (resultados.rowCount > 0) {
		totalEvaluacionesPositivas = resultados.rows[0].total;
	}

	instruccionSQL = `
SELECT
	COUNT(id)::integer AS total
FROM evaluaciones
WHERE (
	tipo = 2 AND
	destino = $1
)
		`;
	resultados = await baseDatos.query(instruccionSQL, [ usuario.id ]);
	if (resultados.rowCount > 0) {
		totalEvaluacionesNegativas = resultados.rows[0].total;
	}

	instruccionSQL = `
SELECT
	evaluaciones.tiempo_creacion::timestamptz AS tiempo_creacion,
	(SELECT identidades.datos_personales_primer_nombre::text FROM identidades WHERE (identidades.estado = 1 AND identidades.usuario_id = evaluaciones.origen) ORDER BY identidades.tiempo_creacion DESC LIMIT 1) AS origen,
	evaluaciones.testimonio::text AS testimonio
FROM evaluaciones
WHERE (
	evaluaciones.tipo = 1 AND
	evaluaciones.destino = $1
)
ORDER BY evaluaciones.tiempo_creacion DESC
LIMIT 3
	`;
	resultados = await baseDatos.query(instruccionSQL, [ usuario.id ]);
	for (let fila of resultados.rows) {
		mensajeEvaluacionesPositivas += `${new Intl.DateTimeFormat('es', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' }).format(new Date(fila.tiempo_creacion))} - ${fila.origen} - "${fila.testimonio}"\n`;
	}

	instruccionSQL = `
SELECT
	evaluaciones.tiempo_creacion::timestamptz AS tiempo_creacion,
	(SELECT identidades.datos_personales_primer_nombre::text FROM identidades WHERE (identidades.estado = 1 AND identidades.usuario_id = evaluaciones.origen) ORDER BY identidades.tiempo_creacion DESC LIMIT 1) AS origen,
	evaluaciones.testimonio::text AS testimonio
FROM evaluaciones
WHERE (
	tipo = 2 AND
	destino = $1
)
ORDER BY evaluaciones.tiempo_creacion DESC
LIMIT 3
	`;
	resultados = await baseDatos.query(instruccionSQL, [ usuario.id ]);
	for (let fila of resultados.rows) {
		mensajeEvaluacionesNegativas += `${new Intl.DateTimeFormat('es', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' }).format(new Date(fila.tiempo_creacion))} - ${fila.origen} - "${fila.testimonio}"\n`;
	}

	mensajeInformacionReputacion = `<b>Informe de reputación - ${new Intl.DateTimeFormat('es', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' }).format(new Date())}</b>

Nombre: ${usuario.first_name} ${usuario.middle_name}
Usuario: @${usuario.username}
Ubicación: ${usuario.location}, ${usuario.region}, ${usuario.country_code}
Verificado desde: ${new Intl.DateTimeFormat('es', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' }).format(new Date(usuario.tiempo_creacion))}
Evaluaciones positivas recibidas: ${(totalEvaluacionesPositivas > 0 ? totalEvaluacionesPositivas : 'Ninguna')}
Evaluaciones negativas recibidas: ${(totalEvaluacionesNegativas > 0 ? totalEvaluacionesNegativas : 'Ninguna')}
<b>Calificación general: `;

	mensajeInformacionReducidaReputacion = `<b>Informe reducido de reputación - ${new Intl.DateTimeFormat('es', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' }).format(new Date())}</b>

Usuario: @${usuario.username}
Verificado desde: ${new Intl.DateTimeFormat('es', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' }).format(new Date(usuario.tiempo_creacion))}
Evaluaciones positivas recibidas: ${(totalEvaluacionesPositivas > 0 ? totalEvaluacionesPositivas : 'Ninguna')}
Evaluaciones negativas recibidas: ${(totalEvaluacionesNegativas > 0 ? totalEvaluacionesNegativas : 'Ninguna')}
<b>Calificación general: `;

	if (totalEvaluacionesPositivas + totalEvaluacionesNegativas === 0) {
		mensajeInformacionReputacion += `Ninguna`;
		mensajeInformacionReducidaReputacion += `Ninguna`;
	} else {
		for (let i = 0; i < Math.floor(((totalEvaluacionesPositivas / (totalEvaluacionesPositivas + totalEvaluacionesNegativas)) * 5) / 1); i++) {
			mensajeInformacionReputacion += '⭐️';
			mensajeInformacionReducidaReputacion += '⭐️';
		}
	}
	mensajeInformacionReputacion += `</b>\n`;
	mensajeInformacionReducidaReputacion += `</b>

Obtenga más información solicitando el reporte en el <a href="tg://user?id=${idBot}">privado</a>.`;
	if (totalEvaluacionesPositivas > 0) {
		mensajeInformacionReputacion += `\nÚltimas 3 evaluaciones positivas:
${mensajeEvaluacionesPositivas}`;
	}
	if (totalEvaluacionesNegativas > 0) {
		mensajeInformacionReputacion += `\nÚltimas 3 evaluaciones negativas:
${mensajeEvaluacionesNegativas}`;
	}
	
	if (contexto.session.idChat === contexto.session.usuario.id) {
		contexto.telegram.sendMessage(contexto.session.usuario.id, mensajeInformacionReputacion, { parse_mode: 'HTML', reply_to_message_id: contexto.update.message.message_id })
			.then(() => {})
			.catch(() => {})
		;
	} else {
		contexto.telegram.sendMessage(contexto.session.idChat, mensajeInformacionReducidaReputacion, { parse_mode: 'HTML', reply_to_message_id: contexto.update.message.message_id })
			.then(() => {})
			.catch(() => {})
		;
	}
}


/**
 * Genera el informe de reputación de un usuario sancionado
 * @param {Telegraf} contexto Referencia al objeto de la sesion
 * @param {Object} usuario Referencia al objeto del usuario sancionado
 */
async function mostrarInformeSancionado (contexto, usuario) {
	let instruccionSQL = '';
	let resultados = {};
	let totalEvaluacionesNegativas = 0;
	let mensajeEvaluacionesNegativas = '';
	let mensajeInformacionReputacion = '';

	instruccionSQL = `
SELECT
	datos_personales_primer_nombre::text AS primer_nombre,
	datos_personales_segundo_nombre::text AS segundo_nombre,
	direccion_localidad::text AS localidad,
	direccion_region::text AS region,
	direccion_codigo_pais::text AS codigo_pais,
	tiempo_creacion::timestamptz
FROM identidades
WHERE (
	usuario_id = $1
)
ORDER BY id DESC
LIMIT 1
	`;
	resultados = await baseDatos.query(instruccionSQL, [ usuario.id ]);
	if (resultados.rowCount === 0) {
		notificaciones.noElegibleInformeReputacion(contexto, usuario, 2);
		return;
	} else {
		usuario.first_name = resultados.rows[resultados.rowCount - 1].primer_nombre;
		usuario.middle_name = resultados.rows[resultados.rowCount - 1].segundo_nombre;
		usuario.location = resultados.rows[resultados.rowCount - 1].localidad;
		usuario.region = resultados.rows[resultados.rowCount - 1].region;
		usuario.country_code = resultados.rows[resultados.rowCount - 1].codigo_pais;
		usuario.tiempo_creacion = new Date(resultados.rows[resultados.rowCount - 1].tiempo_creacion);
	}

	instruccionSQL = `
SELECT
	COUNT(id)::integer AS total
FROM evaluaciones
WHERE (
	tipo = 2 AND
	destino = $1
)
		`;
	resultados = await baseDatos.query(instruccionSQL, [ usuario.id ]);
	if (resultados.rowCount > 0) {
		totalEvaluacionesNegativas = resultados.rows[0].total;
	}

	instruccionSQL = `
SELECT
	evaluaciones.tiempo_creacion::timestamptz AS tiempo_creacion,
	(SELECT identidades.datos_personales_primer_nombre::text FROM identidades WHERE (identidades.usuario_id = evaluaciones.origen) ORDER BY identidades.tiempo_creacion DESC LIMIT 1) AS origen,
	evaluaciones.testimonio::text AS testimonio
FROM evaluaciones
WHERE (
	tipo = 2 AND
	destino = $1
)
ORDER BY evaluaciones.tiempo_creacion DESC
LIMIT 3
	`;
	resultados = await baseDatos.query(instruccionSQL, [ usuario.id ]);
	for (let fila of resultados.rows) {
		mensajeEvaluacionesNegativas += `${new Intl.DateTimeFormat('es', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' }).format(new Date(fila.tiempo_creacion))} - ${fila.origen} - "${fila.testimonio}"\n`;
	}

	mensajeInformacionReputacion = `<b>Informe de reputación de usuario sancionado - ${new Intl.DateTimeFormat('es', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' }).format(new Date())}</b>

Nombre: ${usuario.first_name} ${usuario.middle_name}
Usuario: @${usuario.username}
Ubicación: ${usuario.location}, ${usuario.region}, ${usuario.country_code}
Evaluaciones negativas recibidas: ${(totalEvaluacionesNegativas > 0 ? totalEvaluacionesNegativas : 'Ninguna')}\n`;

	if (totalEvaluacionesNegativas > 0) {
		mensajeInformacionReputacion += `\nÚltimas 3 evaluaciones negativas:
${mensajeEvaluacionesNegativas}`;
	}
	
	contexto.telegram.sendMessage(contexto.session.idChat, mensajeInformacionReputacion, { parse_mode: 'HTML', reply_to_message_id: contexto.update.message.message_id })
		.then(() => {})
		.catch(() => {})
	;
}

module.exports = {
	comando,
	descripcion,
	accion,
};
