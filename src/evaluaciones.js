const Telegraf = require('telegraf');
const { baseDatos } = require('./basedatos');
const comun = require('./comun');
const notificaciones = require('./notificaciones');

const comandos = {
    positiva: {
        comando: 'repupositiva',
        descripcion: `Otorga una evaluación de reputación positiva a otro usuario.
<b>Variantes de uso:</b>
  1- /repupositiva @usuario breve testimonio de 512 caracteres de longitud
  2- Responder a un mensaje del usuario al que se le desea otorgar la evaluación positiva con el texto:
     /repupositiva breve testimonio de 512 caracteres de longitud`
    },
    negativa: {
        comando: 'repunegativa',
        descripcion: `Otorga una evaluación de reputación negativa a otro usuario.
<b>Variantes de uso:</b>
  1- /repunegativa @usuario breve testimonio de 512 caracteres de longitud
  2- Responder a un mensaje del usuario al que se le desea otorgar la evaluación negativa con el texto:
     /repunegativa breve testimonio de 512 caracteres de longitud`
    }
};


/**
 * Visualiza los Términos y Condiciones para su lectura, entendimiento y aprobación
 * @param {Telegraf} contexto Referencia al objeto de la sesion
 */
async function accion (contexto) {
	try {
		await comun.inicializarVariablesSesion(contexto);
		await otorgarEvaluacion(contexto);
		await comun.guardarVariablesSesion(contexto);
	} catch (_e) {}
}

/**
 * Visualiza los Términos y Condiciones para su lectura, entendimiento y aprobación
 * @param {Telegraf} contexto Referencia al objeto de la sesion
 */
async function otorgarEvaluacion (contexto) {
	let instruccionSQL = '';
	let resultados = {};
	let tipo = 0;
	let origen = {};
	let destino = {};
	let testimonio = '';
	
	if (contexto.update.message.from.is_bot === true) {
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

	if (contexto.session.tycAceptadas !== true) {
		notificaciones.tyc(contexto);
		return;
	}

	if (contexto.session.poseeUsuario === false || contexto.session.registrado === false || contexto.session.cambioUsuario === true || contexto.session.verificado === false) {
		contexto.telegram.sendMessage(contexto.session.idChat, `<b>Lamentamos darle una mala noticia!</b>

Usted no es elegible para otorgar una evaluación a otro usuario. Una de las posibles causas son:

  - No posee su identidad verificada y aprobada por el Departamento de Revisión de Identidades de Reputación.
  - No está registrado en Reputación.
  - El nombre de usuario actual no coincide con el que usó para registarse anteriormente.
  - No ha asignado un nombre de usuario a su cuenta de Telegram.

Si todavía no se ha registrado y verificado, puede hacerlo iniciando una conversación con @ReputacionBot y ejecutando el comando /registrar`, { parse_mode: 'HTML', reply_to_message_id: contexto.update.message.message_id })
			.then(() => {})
			.catch(() => {})
		;
		return;
	}

	if (contexto.update.message.text.startsWith(`/${comandos.positiva.comando}`) === true) {
		tipo = 1;
	}
	if (contexto.update.message.text.startsWith(`/${comandos.negativa.comando}`) === true) {
		tipo = 2;
	}

	origen = contexto.session.usuario;

	if (contexto.update.message.reply_to_message !== undefined) {
		destino = contexto.update.message.reply_to_message.from;

        if (contexto.update.message.reply_to_message.from.is_bot === true || origen.id === destino.id) {
			notificaciones.noElegibleOtorgarEvaluaciones(contexto, destino);
			return;
		}

		instruccionSQL = `
SELECT
	id::integer
FROM usuarios
WHERE (
	id = $1 AND
	verificado = true
)
		`;
		resultados = await baseDatos.query(instruccionSQL, [ destino.id ]);
		if (resultados.rowCount === 0) {
			notificaciones.noElegibleOtorgarEvaluaciones(contexto, destino);
			return;
		}
	}

	testimonio = contexto.update.message.text.split(' ');
	testimonio.shift();
	if (testimonio.length > 0) {
		if (testimonio[0][0] === '@') {
			instruccionSQL = `
SELECT
	id::integer,
	nombre::text
FROM usuarios
WHERE (
	usuario = $1 AND
	verificado = true
)
			`;
			resultados = await baseDatos.query(instruccionSQL, [ testimonio[0].substring(1) ]);
			if (resultados.rowCount > 0) {
				destino = {
					id: resultados.rows[0].id,
					username: testimonio[0].substring(1),
					first_name: resultados.rows[0].nombre
				};

				if (origen.id === destino.id) {
					notificaciones.noElegibleOtorgarEvaluaciones(contexto, destino);
					return;
				}
			} else {
                destino = {
                    username: testimonio[0].substring(1)
                };
				notificaciones.noElegibleOtorgarEvaluaciones(contexto, destino);
				return;
			}
			testimonio.shift();
			if (testimonio.length === 0) {
				if (tipo === 1) {
					contexto.telegram.sendMessage(contexto.session.idChat, `<b>ERROR!</b>

La sintáxis del comando es incorrecta. Se muestra la ayuda a continuación:

<b>Desripción:</b> ${comandos.positiva.descripcion}`, { parse_mode: 'HTML', reply_to_message_id: contexto.update.message.message_id })
						.then(() => {})
						.catch(() => {})
					;
				} else {
					contexto.telegram.sendMessage(contexto.session.idChat, `<b>ERROR!</b>

La sintáxis del comando es incorrecta. Se muestra la ayuda a continuación:

<b>Desripción:</b> ${comandos.negativa.descripcion}`, { parse_mode: 'HTML', reply_to_message_id: contexto.update.message.message_id })
						.then(() => {})
						.catch(() => {})
					;
				}
				return;
			}
		} else {
			if (contexto.update.message.reply_to_message === undefined) {
				if (tipo === 1) {
					contexto.telegram.sendMessage(contexto.session.idChat, `<b>ERROR!</b>

La sintáxis del comando es incorrecta. Se muestra la ayuda a continuación:

<b>Desripción:</b> ${comandos.positiva.descripcion}`, { parse_mode: 'HTML', reply_to_message_id: contexto.update.message.message_id })
						.then(() => {})
						.catch(() => {})
					;
				} else {
					contexto.telegram.sendMessage(contexto.session.idChat, `<b>ERROR!</b>

La sintáxis del comando es incorrecta. Se muestra la ayuda a continuación:

<b>Desripción:</b> ${comandos.negativa.descripcion}`, { parse_mode: 'HTML', reply_to_message_id: contexto.update.message.message_id })
						.then(() => {})
						.catch(() => {})
					;
				}
				return;
			}
		}

		testimonio = testimonio.join(' ');
	} else {
		if (contexto.update.message.reply_to_message === undefined) {
			if (tipo === 1) {
				contexto.telegram.sendMessage(contexto.session.idChat, `<b>ERROR!</b>

La sintáxis del comando es incorrecta. Se muestra la ayuda a continuación:

<b>Desripción:</b> ${comandos.positiva.descripcion}`, { parse_mode: 'HTML', reply_to_message_id: contexto.update.message.message_id })
					.then(() => {})
					.catch(() => {})
				;
			} else {
				contexto.telegram.sendMessage(contexto.session.idChat, `<b>ERROR!</b>

La sintáxis del comando es incorrecta. Se muestra la ayuda a continuación:

<b>Desripción:</b> ${comandos.negativa.descripcion}`, { parse_mode: 'HTML', reply_to_message_id: contexto.update.message.message_id })
					.then(() => {})
					.catch(() => {})
				;
			}
			return;
		}
	}

	if (destino.id === undefined || testimonio.length === 0) {
		return;
	}

	instruccionSQL = `
INSERT INTO evaluaciones (
	tipo,
	origen,
	destino,
	testimonio
) VALUES (
	$1,
	$2,
	$3,
	$4
)
RETURNING id::integer
	`;
	baseDatos.query(instruccionSQL, [
			tipo,
			origen.id,
			destino.id,
			testimonio
		])
		.then(() => {
			if (tipo === 1) {
				contexto.telegram.sendMessage(contexto.session.idChat, `<b>Excelente!</b>

Se le ha otorgado una evaluación positiva a ${destino.first_name} y, de ésta forma, ha ganado un punto más de confiabilidad, seriedad y buena reputación.

Puede obtener más información sobre la reputación de ${destino.first_name} con el comando /repuinfo @${destino.username}`, { parse_mode: 'HTML', reply_to_message_id: contexto.update.message.message_id })
					.then(() => {})
					.catch(() => {})
				;
				contexto.telegram.sendMessage(destino.id, `<b>Enhorabuena!</b>

Usted ha recibido una evaluación positiva del usuario @${origen.username} logrando, así, ganar un punto más de confiabilidad, seriedad y buena reputación.

Testimonio:	"${testimonio}"`, { parse_mode: 'HTML' })
					.then(() => {})
					.catch(() => {})
				;
			} else {
				contexto.telegram.sendMessage(contexto.session.idChat, `<b>Valiente de su parte!</b>

Se le ha otorgado una evaluación negativa a ${destino.first_name} y, de ésta forma, se alerta a la comunidad sobre los fallos que pueda tener esta persona.

Puede obtener más información sobre la reputación de ${destino.first_name} con el comando /repuinfo @${destino.username}`, { parse_mode: 'HTML', reply_to_message_id: contexto.update.message.message_id })
					.then(() => {})
					.catch(() => {})
				;
				contexto.telegram.sendMessage(destino.id, `<b>Hoy no es un buen día!</b>

Usted ha recibido una evaluación negativa del usuario @${origen.username}, siendo esto una forma de expresión y llamado de atención para que usted mejore.

Testimonio:	"${testimonio}"`, { parse_mode: 'HTML' })
					.then(() => {})
					.catch(() => {})
				;
			}
	})
		.catch(() => {})
	;
}

module.exports = {
	comandos,
	accion,
};
