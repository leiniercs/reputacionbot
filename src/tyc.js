const Telegraf = require('telegraf');
const comun = require('./comun');
const notificaciones = require('./notificaciones');

const comando = 'tyc';
const descripcion = 'Visualiza los Términos y Condiciones para su lectura, entendimiento y aprobación.';


/**
 * Visualiza los Términos y Condiciones para su lectura, entendimiento y aprobación
 * @param {Telegraf} contexto Referencia al objeto de la sesion
 */
async function accion (contexto) {
	await comun.inicializarVariablesSesion(contexto);
	mostrar(contexto);
	await comun.guardarVariablesSesion(contexto);
}

/**
 * Visualiza los Términos y Condiciones para su lectura, entendimiento y aprobación
 * @param {Telegraf} contexto Referencia al objeto de la sesion
 */
function mostrar (contexto) {
	const mensaje = `<b>TÉRMINOS Y CONDICIONES DE USO</b>
	
<u>INFORMACIÓN RELEVANTE</u>

Es requisito necesario para la adquisición de los servicios que se ofrecen en este bot, que lea y acepte los siguientes <u>Términos y Condiciones</u> que a continuación se redactan. El uso de nuestros servicios implicará que usted ha leído y aceptado los <u>Términos y Condiciones de Uso</u> en el presente documento. Todas las informaciones que son ofrecidas por nuestro servicio son aportadas por las personas que usan el servicio, los que también están sujetas a estos <u>Términos y Condiciones</u>. En todos los casos, para utilizar nuestro servicio, será obligatorio el registro por parte del usuario, con ingreso de datos personales fidedignos.

El usuario deberá autorizar al <u>Departamento de Revisión de Identidades de Reputación</u> a acceder a sus datos personales y fotos requeridas para la verificación de su identidad a través del servicio <u>Pasaporte de Telegram</u>. El <u>Departamento de Revisión de Identidades de Reputación</u> recibirá la solicitud de verificación de la identidad y, después de una minuciosa verificación, podrá <u>Aprobar</u> o <u>Rechazar</u> su solicitud de verificación de identidad. En caso tal que la identidad sea rechazada, el usuario no podrá utilizar los servicios de <u>Reputación</u> hasta tanto haya enviado nuevamente una identidad verificable.

<u>Reputación</u> ofrece sus servicios de forma gratuita sin cargo alguno, pero si ofrece la opción de donar a todos los usuarios que lo deseen para, así, apoyar el proyecto.

<u>PRIVACIDAD</u>

Tanto el creador como el bot <u>Reputación</u> garantizan que la información personal que usted autoriza a usar cuenta con la seguridad y protección necesaria. Los datos ingresados por el usuario no serán entregados a terceros, salvo que deba ser revelada en cumplimiento a una orden judicial cubana o para el esclarecimiento de algún delito en proceso de investigación por las autoridades del gobierno cubano. Los datos personales serán guardados, de forma segura en los servidores de <u>Reputación</u>, por todo el tiempo que el usuario esté registrado y, las fotos requeridas se almacenarán solo hasta que su identidad sea aprobada o rechazada.

Los datos y fotos que se requieren para la verificación de su identidad son:
  - Número de identidad
  - Fecha de expiración de la tarjeta de identidad
  - Nombre completo
  - Ubicación geográfica
  - Número de teléfono
  - Foto del frente y reverso de su tarjeta de identificación
  - Selfie mostrando completamente su rostro y un papel en donde esté escrito la fecha actual y se muestre el frente de su tarjeta de identificación

Los datos que se almacenan en los servidores de <u>Reputación</u> son:
  - Número de identidad
  - Fecha de expiración de la tarjeta de identidad
  - Nombre completo
  - Ubicación geográfica
  - Número de teléfono
  - Correo electrónico

Sólamente los usuarios verificados de <u>Reputación</u> podrán obtener acceso a algunas informaciones de otros usuarios verificados, que servirán para la finalidad de mostrar un informe de reputación. Los datos que se muestran a los usuarios verificados en el informe de reputación son:
  - Nombre (sin apellidos)
  - Ubicación geográfica
  - Total de evaluaciones positivas y negativas recibidas
  - Extracto de las últimas evaluaciones recibidas

<u>RENUNCIA DE RESPONSABILIDAD</u>

En ningún caso, este bot ni su creador serán responsables de ningún daño incluyendo, pero no limitado a, daños directos, indirectos, especiales, fortuitos o consecuentes u otras pérdidas, resultantes del uso o de la imposibilidad de utilizar nuestros servicios. Es nuestra misión altruista el ofrecer un espacio confiable en donde las personas puedan comprobar la reputación de otros usuarios y para ello se esmera en solo aceptar a personas que validen su identidad.
  
<u>Reputación</u> se reserva los derechos de cambiar o de modificar estos términos sin previo aviso.`;
	
	if (contexto.session.tycAceptadas === false) {
		contexto.telegram.sendMessage(contexto.session.usuario.id, mensaje, {
				parse_mode: 'HTML',
				reply_markup: {
					inline_keyboard: [
						[ { text: 'Aceptar', callback_data: JSON.stringify({ _origen: comun.Origenes.TerminosYCondiciones, accion: 2 }) }, { text: 'Rechazar', callback_data: JSON.stringify({ _origen: comun.Origenes.TerminosYCondiciones, accion: 3 }) } ]
					]
				}
			})
			.then(() => {})
			.catch(() => {})
		;

		if (contexto.update.callback_query !== undefined) {
			contexto.answerCbQuery('')
				.then(() => {})
				.catch(() => {})
			;
		}
	} else {
		contexto.telegram.sendMessage(contexto.session.usuario.id, mensaje, { parse_mode: 'HTML' })
			.then(() => {
				contexto.telegram.sendMessage(contexto.session.usuario.id, 'Usted ya ha aceptado nuestros Términos y Condiciones de Uso. Si desea obtener más información, ejecute el comando /ayuda o ingrese en nuestro grupo de Soporte Técnico: https://t.me/joinchat/ERsTFVSnBuXI2i-_6C3tzg')
					.then(() => {})
					.catch(() => {})
				;
			})
			.catch(() => {})
		;
	}
}

/**
 * Acepta/Rechaza los Términos y Condiciones
 * @param {Telegraf} contexto Referencia al objeto de la sesion
 */
function aceptarRechazar (contexto) {
	const datos = JSON.parse(contexto.update.callback_query.data);
	let mensaje = '';

	switch (datos.accion) {
		case 2:
			contexto.session.tycAceptadas = true;
			mensaje = 'aprobados';
			break;
		case 3:
			contexto.session.tycAceptadas = false;
			mensaje = 'rechazados';
			break;
	}

	contexto.editMessageReplyMarkup({})
		.then(() => {})
		.catch(() => {})
	;
	contexto.telegram.sendMessage(contexto.session.usuario.id, `<b>Términos y Condiciones de Uso ${mensaje}.</b>`, { parse_mode: 'HTML' })
		.then(() => {
			if (contexto.session.tycAceptadas === true) {
				if (contexto.session.registrado === true) {
					if (contexto.session.ctc === false || contexto.session.verificado === false) {
						notificaciones.ausenciaVerificacion(contexto);
					} else {
						notificaciones.registroExistente(contexto);
					} 
				} else {
					notificaciones.ausenciaRegistro(contexto);
				}
			}		
		})
		.catch(() => {})
	;

	contexto.answerCbQuery('')
		.then(() => {})
		.catch(() => {})
	;
}

module.exports = {
	comando,
	descripcion,
	accion,
	mostrar,
	aceptarRechazar
};
