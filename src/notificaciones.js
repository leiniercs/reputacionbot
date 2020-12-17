const Telegraf = require('telegraf');
const comun = require('./comun');
 

/**
 * Visualiza el mensaje de requerimiento de aceptación de los Términos y Condiciones de Uso
 * @param {Telegraf} contexto Referencia al objeto de la sesion
 */
function tyc (contexto) {
	contexto.telegram.sendMessage(contexto.session.usuario.id, 'Para poder usar los servicios de este bot, primeramente debe leer, entender y aceptar los <b>Términos y Condiciones de Uso.</b>', {
			parse_mode: 'HTML',
			reply_markup: {
				inline_keyboard: [
					[ { text: 'Revisar los Términos y Condiciones de Uso', callback_data: JSON.stringify({ _origen: comun.Origenes.TerminosYCondiciones, accion: 1 }) } ]
				]
			}
		})
		.then(() => {})
		.catch(() => {})
	;
}

/**
 * Notifica al usuario la ausencia de un registro asociado a su ID
 * @param {Telegraf} contexto Referencia al objeto de la sesion
 */
function ausenciaRegistro (contexto) {
	contexto.telegram.sendMessage(contexto.session.usuario.id, `Usted todavía no se ha registrado en el sistema. Puede iniciar el proceso con el comando /registrar`)
		.then(() => {})
		.catch(() => {})
	;
}

/**
 * Notifica al usuario que existe un registro asociado a su ID
 * @param {Telegraf} contexto Referencia al objeto de la sesion
 */
function registroExistente (contexto) {
	contexto.telegram.sendMessage(contexto.session.usuario.id, 'Usted ya está registrado en el sistema. Puede consultar la ayuda sobre los comandos disponibles con /ayuda')
		.then(() => {})
		.catch(() => {})
	;
}

/**
 * Notifica al usuario que se ha detectado cambio en la información de su usuario y
 * se procedera a reemplazar el registro anterior.
 * @param {Telegraf} contexto Referencia al objeto de la sesion
 */
function registroCambioUsuario (contexto) {
	contexto.telegram.sendMessage(contexto.session.usuario.id, `Se ha detectado cambios en las informaciones de su usuario de Telegram, por lo que se procederá a eliminar el registro anterior.`)
		.then(() => {})
		.catch(() => {})
	;
}

/**
 * Notifica al usuario que no es elegible para realizar el proceso Conoce Tu Cliente
 * @param {Telegraf} contexto Referencia al objeto de la sesion
 */
function noElegibleParaCTC (contexto) {
	contexto.telegram.sendMessage(contexto.session.usuario.id, `<b>Lamentamos darle una mala noticia!</b>

Usted no es elegible para realizar el proceso <b>Conoce Tu Cliente</b>. Una de las posibles causas son:

  - Ya ha sido aprobada su identidad.
  - Ya completó el proceso Conoce Tu Cliente y está en espera de aprobación.
  - No está registrado.
  - El nombre de usuario actual no coincide con el que usó para registarse anteriormente.
  - No ha asignado un nombre de usuario a su cuenta de Telegram.
  - Es un bot de Telegram.`, { parse_mode: 'HTML' })
		.then(() => {})
		.catch(() => {})
	;
}

/**
 * Notifica al usuario que no todavia no ha superado el proceso Conoce Tu Cliente
 * @param {Telegraf} contexto Referencia al objeto de la sesion
 */
function ausenciaVerificacion (contexto) {
	contexto.telegram.sendMessage(contexto.session.usuario.id, 'Todavía no puede utilizar las funciones de otorgamiento y recibimientos de puntos de reputación hasta que no complete el proceso de <b>Conoce a Tu Cliente</b>. Para comenzar con dicho proceso, ejecute el comando /ctc', { parse_mode: 'HTML' })
		.then(() => {})
		.catch(() => {})
	;
}

/**
 * Notifica al usuario que no es elegible para otorgar evaluaciones
 * @param {Telegraf} contexto Referencia al objeto de la sesion
 * @param {number} idUsuario ID del usuario beneficiario
 */
function noElegibleOtorgarEvaluaciones (contexto, beneficiario) {
	let usuario = (beneficiario.username !== undefined ? `@${beneficiario.username}` : beneficiario.first_name);
	contexto.telegram.sendMessage(contexto.session.usuario.id, `<b>ERROR!</b>

El usuario beneficiario (${usuario}) no es elegible para recibir una evaluación. Una de las posibles causas son:

  - No posee la identidad verificada y aprobada por el Departamento de Revisión de Identidades de Reputación.
  - No está registrado en Reputación.
  - Es usted mismo.
  - Es un bot de Telegram.`, { parse_mode: 'HTML' })
		.then(() => {})
		.catch(() => {})
	;
}

/**
 * Notifica al usuario origen que el usuario del que intenta obtener el informe de reputación no es elegible
 * @param {Telegraf} contexto Referencia al objeto de la sesion
 * @param {Object} origen Usuario origen
 * @param {number} codigo Código del error
 */
function noElegibleInformeReputacion (contexto, origen, codigo) {
	let usuario = (origen.username !== undefined ? `@${origen.username}` : origen.first_name);
	let mensaje = '';
	
	switch (codigo) {
		case 1:
			mensaje = `<b>Lamentamos darle una mala noticia!</b>

No se pudo obtener el informe de reputación. Una de las posibles causas son:

  - Usted no posee su identidad verificada y aprobada por el Departamento de Revisión de Identidades de Reputación.
  - Usted no está registrado en Reputación.
  - Su nombre de usuario actual no coincide con el que usó para registarse inicialmente.
  - Usted no ha asignado un nombre de usuario a su cuenta de Telegram.

Si todavía usted no se ha registrado y verificado, puede hacerlo iniciando una conversación con @ReputacionBot y ejecutando el comando /registrar`;
			break;
		case 2:
			mensaje = `<b>Lamentamos darle una mala noticia!</b>

No se pudo obtener el informe de reputación del usuario ${usuario}. Una de las posibles causas son:

  - El usuario no posee la identidad verificada y aprobada por el Departamento de Revisión de Identidades de Reputación.
  - El usuario no está registrado en Reputación.
  - El usuario es un bot de Telegram.`;
			break;
	}
	
	contexto.telegram.sendMessage(contexto.session.idChat, mensaje, { parse_mode: 'HTML', reply_to_message_id: contexto.update.message.message_id })
		.then(() => {})
		.catch(() => {})
	;
}

module.exports = {
    tyc,
    ausenciaRegistro,
	registroExistente,
	registroCambioUsuario,
	noElegibleParaCTC,
	ausenciaVerificacion,
	noElegibleOtorgarEvaluaciones,
	noElegibleInformeReputacion
};
