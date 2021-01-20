const Telegraf = require('telegraf');
const TelegramPassport = require('telegram-passport');
const fetch = require('node-fetch');
const fs = require('fs');
const comun = require('./comun');
const { baseDatos } = require('./basedatos');
const notificaciones = require('./notificaciones');
const urlSolicitudAutorizacion = 'https://reputacionbot.ccari.net/autorizar.html';
const urlGrupoSoporteTecnico = 'https://t.me/joinchat/ERsTFVSnBuXI2i-_6C3tzg';
let passport = null;
// Produccion: 1342202179:AAHUaRsyypamrLOojbz7w3m3TjY7gdjpD1g
// Desarrollo: 1250980023:AAEQdEYzdC2VEVeff6GWwCDieFm6YzK2CoU
const botToken = '1342202179:AAHUaRsyypamrLOojbz7w3m3TjY7gdjpD1g';
const idGrupoIdentidades = -1001271901286;

const comando = 'ctc';
const descripcion = 'Solicita la autorización para el uso de los datos del servicio Pasaporte de Telegram para luego enviarlo al Departamento de Revisión de Identidades de Reputación para su verificación y aprobación o rechazo.';


/**
 * Solicita la autorización para el uso de los datos del servicio Pasaporte de Telegram para luego enviarlo al Departamento de Revisión de Identidades de Reputación para su verificación y aprobación o rechazo
 * @param {Telegraf} contexto Referencia al objeto de la sesion
 */
async function accion (contexto) {
	try {
		inicializarPasaporte();
		await comun.inicializarVariablesSesion(contexto);
		solicitarAutorizacion(contexto);
		await comun.guardarVariablesSesion(contexto);
	} catch (_e) {}
}

function inicializarPasaporte () {
	if (passport === null) {
		const llavePrivada = fs.readFileSync('telegram_passport.key');
		passport = new TelegramPassport(llavePrivada);
	}
}
/**
 * Solicita la autorización para el uso de los datos del servicio Pasaporte de Telegram para luego enviarlo al Departamento de Revisión de Identidades de Reputación para su verificación y aprobación o rechazo
 * @param {Telegraf} contexto Referencia al objeto de la sesion
 */
function solicitarAutorizacion (contexto) {
	if (contexto.session.tycAceptadas !== true) {
		notificaciones.tyc(contexto);
		return;
    }
    
    if (contexto.session.poseeUsuario === false || contexto.session.registrado === false || contexto.session.cambioUsuario === true || contexto.session.ctc === true || contexto.session.verificado === true) {
		notificaciones.noElegibleParaCTC(contexto);
        return;
    }

	contexto.telegram.sendMessage(contexto.session.usuario.id, `El proceso <b>Conoce Tu Cliente</b> es lo más importante en el sistema de reputación ya que establece las bases para identificarlo como una persona verificada y aumentar, así, su nivel de reputación y confiabilidad. En él, usted otorgará, explícitamente, autorización para acceder a sus datos para poder verificarlo.

En este proceso se le requerirán:
  - Fotos del frente y reverso de su tarjeta de identidad.
  - Selfie mostrando completamente su rostro, frente de su tarjeta de identidad y un papel en blanco en donde esté escrito la fecha actual y la frase "Verificación Bot Reputación".
  - Datos personales.
  - Dirección postal.
  - Número telefónico.
  - Correo electrónico.

Debe suministrar datos reales y fotografías enfocadas, con buena definición y a color. A continuación se muestran algunos consejos a seguir para ofrecer datos que puedan conllevar a la aprobación de su solicitud de verificación de identidad:
  - La fotografía del frente y reverso de la tarjeta de identidad deben ser a color, nitidas, enfocadas, que el documento ocupe mas del 90% de la fotografía y se vean los bordes del mismo.
  - La fotografía del selfie debe mostrar completamente su rostro, frente de su tarjeta de identidad y un papel en blanco en donde esté escrito la fecha actual y la frase "Verificación Bot Reputación".
  - Los datos personales suministrados deben coincidir los datos de la tarjeta de identidad.`, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [ { text: "Iniciar proceso", url: urlSolicitudAutorizacion } ]
                ]
            }
        })
		.then((mensaje) => { contexto.session.idMensajeCTC = mensaje.message_id; })
		.catch(() => {})
	;
}

/**
 * Procesa la información obtenida desde el servicio Pasaporte de Telegram
 * @param {Telegraf} contexto Referencia al objeto de la sesion
 */
async function procesarInformacionPasaporteTelegram (contexto) {
	if (contexto.update.message.passport_data === undefined) {
		return;
	}

	inicializarPasaporte();
	await comun.inicializarVariablesSesion(contexto);

	if (contexto.session.poseeUsuario === false || contexto.session.registrado === false || contexto.session.cambioUsuario === true || contexto.session.ctc === true || contexto.session.verificado === true) {
		notificaciones.noElegibleParaCTC(contexto);
        return;
	}

	const pasaporte = passport.decrypt(contexto.update.message.passport_data);
	const pasaporteErrores = [];
	let hashTarjetaIdentificacion = '';
	let telefono = '';
	let correo = '';

	if (pasaporte.personal_details === undefined || pasaporte.identity_card === undefined || pasaporte.address === undefined) {
		contexto.telegram.sendMessage(contexto.session.usuario.id, `<b>Lamentamos darle una mala noticia!</b>
			
Los datos que usted ha declarado en su Pasaporte de Telegram están incompletos, por lo que no se han aceptado. No podrá utilizar nuestros servicios hasta que no provea los datos correctos utilizando el comando /ctc .

Si posee dudas, puede consultar su duda con los especialistas en el Grupo de Soporte Técnico del Bot de la Reputación: ${urlGrupoSoporteTecnico}`)
			.then(() => {})
			.catch(() => {})
		;
		return;
	}

	for (const parte of contexto.message.passport_data.data) {
		if (parte.type === 'phone_number') {
			telefono = parte.phone_number
		}
		if (parte.type === 'email') {
			correo = parte.email
		}
		if (parte.type === 'identity_card') {
			hashTarjetaIdentificacion = parte.hash;
		}
	}

	if (pasaporte.identity_card.data.document_no.length === 0) {
		pasaporteErrores.push({
			source: 'data',
			type: 'identity_card',
			field_name: 'document_no',
			data_hash: hashTarjetaIdentificacion,
			message: 'Debe introducir el número de identidad'
		});
	} else {
		if (pasaporte.identity_card.data.document_no.search(/[^0-9]/g) !== -1) {
			pasaporteErrores.push({
				source: 'data',
				type: 'identity_card',
				field_name: 'document_no',
				data_hash: hashTarjetaIdentificacion,
				message: 'Debe introducir el número de identidad (sólo números)'
			});
		}
	}
	if (pasaporte.identity_card.data.expiry_date.length === 0) {
		pasaporteErrores.push({
			source: 'data',
			type: 'identity_card',
			field_name: 'expiry_date',
			data_hash: hashTarjetaIdentificacion,
			message: 'Debe introducir la fecha de expiración'
		});
	}

	if (pasaporteErrores.length > 0) {
		contexto.telegram.sendMessage(contexto.session.usuario.id, `<b>Lamentamos darle una mala noticia!</b>
			
Los datos que usted ha declarado en su Pasaporte de Telegram están incompletos o son erróneos, por lo que no se han aceptado. Uno de los más comunes errores son el 'número de identidad' y la 'fecha de expiración de la tarjeta de identidad'. No podrá utilizar nuestros servicios hasta que no provea los datos correctos utilizando el comando /ctc .

Si posee dudas, puede consultar su duda con los especialistas en el Grupo de Soporte Técnico del Bot de la Reputación: ${urlGrupoSoporteTecnico}`, { parse_mode: 'HTML' })
			.then(() => {})
			.catch(() => {})
		;
		return contexto.setPassportDataErrors(pasaporteErrores);
	}

	let fechaExpiracionTarjetaIdentidad = [];
	let datosFotoADescargar = {};
	let datosFotoEncriptados = '';
	let buferFotoEncriptados = '';
	let buferDocumentoFrente = '';
	let buferDocumentoReverso = '';
	let buferDocumentoSelfie = '';
	let idSolicitud = 0;
	let listadoFotografias = [];
	
	fechaExpiracionTarjetaIdentidad = pasaporte.identity_card.data.expiry_date.match(/([0-9]{1,4})/g);

	contexto.telegram.editMessageReplyMarkup(contexto.session.usuario.id, contexto.session.idMensajeCTC, 0, {})
		.then(() => { contexto.session.idMensajeCTC = undefined; })
		.catch(() => {})
	;

	try {
		datosFotoADescargar = await contexto.telegram.getFile(pasaporte.identity_card.front_side.file.file_id);
		datosFotoEncriptados = await fetch(`https://api.telegram.org/file/bot${botToken}/${datosFotoADescargar.file_path}`);
		buferFotoEncriptados = await datosFotoEncriptados.buffer();
		buferDocumentoFrente = passport.decryptPassportCredentials(
			buferFotoEncriptados,
			Buffer.from(pasaporte.identity_card.front_side.hash, "base64"),
			Buffer.from(pasaporte.identity_card.front_side.secret, "base64")
		);
	} catch (_e) {}
	try {
		datosFotoADescargar = await contexto.telegram.getFile(pasaporte.identity_card.reverse_side.file.file_id);
		datosFotoEncriptados = await fetch(`https://api.telegram.org/file/bot${botToken}/${datosFotoADescargar.file_path}`);
		buferFotoEncriptados = await datosFotoEncriptados.buffer();
		buferDocumentoReverso = passport.decryptPassportCredentials(
			buferFotoEncriptados,
			Buffer.from(pasaporte.identity_card.reverse_side.hash, "base64"),
			Buffer.from(pasaporte.identity_card.reverse_side.secret, "base64")
		);
	} catch (_e) {}
	try {
		datosFotoADescargar = await contexto.telegram.getFile(pasaporte.identity_card.selfie.file.file_id);
		datosFotoEncriptados = await fetch(`https://api.telegram.org/file/bot${botToken}/${datosFotoADescargar.file_path}`);
		buferFotoEncriptados = await datosFotoEncriptados.buffer();
		buferDocumentoSelfie = passport.decryptPassportCredentials(
			buferFotoEncriptados,
			Buffer.from(pasaporte.identity_card.selfie.hash, "base64"),
			Buffer.from(pasaporte.identity_card.selfie.secret, "base64")
		);
	} catch (_e) {}

	instruccionSQL = `
INSERT INTO identidades (
    usuario_id,
	usuario_usuario,
	usuario_nombre,
	telefono,
	correo,
	datos_personales_primer_nombre,
	datos_personales_segundo_nombre,
	datos_personales_apellidos,
	direccion_localidad,
	direccion_region,
	direccion_codigo_pais,
	documento_identidad_numero,
	documento_identidad_expiracion
) VALUES (
	$1,
	$2,
	$3,
	$4,
	$5,
	$6,
	$7,
	$8,
	$9,
	$10,
	$11,
	$12,
	$13
)
RETURNING id::integer
	`;

	baseDatos.query(instruccionSQL, [
		contexto.message.from.id,
		contexto.message.from.username,
		contexto.message.from.first_name,
		telefono,
		correo,
		pasaporte.personal_details.data.first_name,
		pasaporte.personal_details.data.middle_name,
		pasaporte.personal_details.data.last_name,
		pasaporte.address.data.city,
		pasaporte.address.data.state,
		pasaporte.address.data.country_code,
		pasaporte.identity_card.data.document_no,
		new Date(fechaExpiracionTarjetaIdentidad[2], fechaExpiracionTarjetaIdentidad[1] - 1, fechaExpiracionTarjetaIdentidad[0])
	])
		.then((resultados) => {
			if (resultados.rowCount === 0) {
				contexto.telegram.sendMessage(contexto.session.usuario.id, 'Ocurrió un error al recibir los datos de la verificación. Inténtelo más tarde.')
					.then(() => {})
					.catch(() => {})
				;
			} else {
				idSolicitud = resultados.rows[0].id;
				instruccionSQL = `
UPDATE usuarios
SET ctc = true
WHERE (id = $1)
				`;

				baseDatos.query(instruccionSQL, [
						contexto.session.usuario.id
					])
					.then(() => {
						contexto.session.ctc = true;

						listadoFotografias.push({
							type: 'photo',
							media: { source: buferDocumentoFrente },
							caption: `ID de solicitud: ${idSolicitud}
Usuario: @${contexto.session.usuario.username}

<b>Datos personales</b>
Primer nombre: ${pasaporte.personal_details.data.first_name}
Segundo nombre: ${pasaporte.personal_details.data.middle_name}
Apellidos: ${pasaporte.personal_details.data.last_name}
Teléfono: ${telefono}
Correo: ${correo}

<b>Ubicación geográfica</b>
Localidad: ${pasaporte.address.data.city}
Región: ${pasaporte.address.data.state}
Código del pais: ${pasaporte.address.data.country_code}

<b>Tarjeta de identicación</b>
Número: ${pasaporte.identity_card.data.document_no}
Fecha de expiración: ${Intl.DateTimeFormat('es', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(fechaExpiracionTarjetaIdentidad[2], fechaExpiracionTarjetaIdentidad[1] - 1, fechaExpiracionTarjetaIdentidad[0]))}`,
							parse_mode: 'HTML'}
						);
						listadoFotografias.push({
							type: 'photo',
							media: { source: buferDocumentoReverso }
						});
						listadoFotografias.push({
							type: 'photo',
							media: { source: buferDocumentoSelfie }
						});
						
						contexto.telegram.sendMediaGroup(idGrupoIdentidades, listadoFotografias)
							.then(() => {
								contexto.telegram.sendMessage(idGrupoIdentidades, `ID de solicitud: ${idSolicitud}

Listado de acciones para la solicitud de verificación de identidad:`, {
									parse_mode: 'HTML',
									reply_markup: { 
										inline_keyboard: [ [ { text: 'Aprobar', callback_data: JSON.stringify({ _origen: comun.Origenes.Identidad, solicitud: idSolicitud, usuario: contexto.session.usuario.id, accion: 1}) }, { text: 'Rechazar', callback_data: JSON.stringify({ _origen: comun.Origenes.Identidad, solicitud: idSolicitud, usuario: contexto.session.usuario.id, accion: 2}) } ] ]
									}})
									.then(() => {})
									.catch(() => {})
								;
								contexto.telegram.sendMessage(contexto.session.usuario.id, `Se han recibido los datos solicitados desde el servicio Pasaporte de Telegram. Su solicitud será verificada por el Departamento de Revisión de Identidades de Reputación en un término de hasta 72 horas. Se le notificará en un mensaje si su solicitud ha sido aprobada o rechazada.

Fecha de la solicitud: ${new Date().toLocaleString('es-ES')}
ID de solicitud: ${idSolicitud}`)
									.then(() => {})
									.catch(() => {})
								;

								comun.guardarVariablesSesion(contexto)
									.then(() => {})
									.catch(() => {})
								;
							})
							.catch(() => {
								instruccionSQL = 'DELETE identidades WHERE (id = $1)';
								baseDatos.query(instruccionSQL, [ idSolicitud ])
									.then(() => {})
									.catch(() => {})
								;
								instruccionSQL = 'UPDATE usuarios SET ctc = false WHERE (id = $1)';
								baseDatos.query(instruccionSQL, [ contexto.session.usuario.id ])
									.then(() => {})
									.catch(() => {})
								;
								contexto.telegram.sendMessage(contexto.session.usuario.id, `Ocurrió un error al enviar su solicitud de verificación de identidad. Le recomendamos que espere algunos minutos y realice el proceso nuevamente.`)
									.then(() => {})
									.catch(() => {})
								;
							})
						;
					})
					.catch(() => {})
				;
			}
		})
		.catch(() => {})
	;

	await comun.guardarVariablesSesion(contexto);
}

async function aprobarRechazar (contexto) {
	const datos = JSON.parse(contexto.callbackQuery.data);
	let instruccionSQL = '';
	let estado = 2;
	let ctc = false;
	let verificado = false;
	let mensajeEdicion = '';
	let mensajeNotificacionEmergente = '';
	let mensajeNotificacion = '';

	switch (datos.accion) {
		case 1:
			estado = 1;
			ctc = true;
			verificado = true;

			instruccionSQL = `
UPDATE identidades SET
	estado = $2
WHERE (usuario_id = $1)
			`;
			baseDatos.query(instruccionSQL, [ datos.usuario, estado ])
				.then(() => {})
				.catch(() => {})
			;

			mensajeEdicion = `ID de solicitud: ${datos.solicitud}

<b>Aprobado por @${contexto.from.username}.</b>`;
			mensajeNotificacionEmergente = `Solicitud #${datos.solicitud} aprobada`;
			mensajeNotificacion = `<b>Enhorabuena!</b>

Se ha aprobado satisfactoriamente la identidad con ID de solicitud #${datos.solicitud}. A partir de este momento usted puede comenzar a otorgar y recibir evaluaciones a/desde otros usuarios con los comandos /repupositiva y /repunegativa. Puede consultar los comandos disponibles utilizando /ayuda

Recuerda consultar siempre la información de reputación de aquel usuario con el que va a realizar algún tipo de operación o tarea utilizando el comando /repuinfo para asegurarse de que es una persona confiable. Si la persona todavía no está registrada y verificada en el <b>Bot de la Reputación</b> entonces no realice ninguna operación con ella hasta que no cumpla este requisito. De esta forma, usted se asegurará de que la otra persona ha sido verificada y los riesgos a estafas y acciones delictivas serán reducidas a menos del 5%.`;
			break;
		case 2:
			instruccionSQL = `
DELETE FROM identidades
WHERE (id = $1)
			`;
			baseDatos.query(instruccionSQL, [ datos.solicitud ])
				.then(() => {})
				.catch(() => {})
			;
		
			mensajeEdicion = `ID de solicitud: ${datos.solicitud}

<b>Rechazado por @${contexto.from.username}.</b>`;
			mensajeNotificacionEmergente = `Solicitud #${datos.solicitud} rechazada`;
			mensajeNotificacion = `<b>Lamentamos informarle una mala noticia!</b>
			
La verificación de identidad con ID de solicitud #${datos.solicitud} ha sido rechazada debido a que usted no ha proporcionado las informaciones en el formato y condiciones requeridas, por lo que no podrá utilizar nuestros servicios hasta que no provea los datos correctos utilizando el comando /ctc .

A continuación se enumeran las posibles causas por las que se rechazó su solicitud de verificación de identidad:
  - Las fotos son borrosas o no legibles.
  - La persona en la fotografía del selfie no es la misma en la fotografía de su tarjeta de identificación.
  - No aparece el frente de su tarjeta de identificación en la fotografía del selfie.
  - No aparece el papel escrito con la fecha actual y la frase "Verificación Bot Reputación" en la fotografía del selfie.
  - Los datos personales suministrados no coinciden con su tarjeta de identificación.
  - Los datos de la dirección suministrada no coinciden con su tarjeta de identificación.

Si no encuentra la causa de su rechazo, puede consultar su duda con los especialistas en el Grupo de Soporte Técnico del Bot de la Reputación: ${urlGrupoSoporteTecnico}`;
			break;
	}
	
	instruccionSQL = `
UPDATE usuarios SET
	ctc = $2,
	verificado = $3
WHERE (id = $1)
	`;
	baseDatos.query(instruccionSQL, [ datos.usuario, ctc, verificado ])
		.then(() => {})
		.catch(() => {})
	;

	if (mensajeNotificacionEmergente.length > 0) {
		contexto.editMessageText(mensajeEdicion, { parse_mode: 'HTML', reply_markup: {} })
			.then(() => {})
			.catch(() => {})
		;
		contexto.telegram.sendMessage(datos.usuario, mensajeNotificacion, { parse_mode: 'HTML' })
			.then(() => {})
			.catch(() => {})
		;
	}

	contexto.answerCbQuery(mensajeNotificacionEmergente)
		.then(() => {})
		.catch(() => {})
	;
}

module.exports = {
	comando,
	descripcion,
    accion,
	solicitarAutorizacion,
	procesarInformacionPasaporteTelegram,
	aprobarRechazar
};
