const Telegraf = require('telegraf');
const comun = require('./comun');
const { baseDatos } = require('./basedatos');
const notificaciones = require('./notificaciones');
const monitorizacion = require('./monitorizacion');
// Produccion: 1342202179
// Desarrollo: 1250980023
const idBot = 1342202179;
const idUsuarioTelegram = 777000;
const grupos = new Map();

const comando = 'configurar';
const descripcion = `Configura el comportamiento del bot en el grupo.
<b>Subcomandos:</b>
  - /configurar bienvenida v|f
    Activa/Desactiva el mensaje de bienvenida a los nuevos usuarios.
  - /configurar duracion &lt;segundos&gt;
    Especifica la duración, en segundos, de los mensajes a mostrar. Predeterminado: 30
  - /configurar estricto v|f
    Activa/Desactiva el modo estricto, en donde se permitira/prohibirán determinadas acciones si el usuario no está verificado.
  - /configurar estricto uniones v|f
    Permite/Prohibe la unión de un nuevo usuario al grupo si no está verificado.
  - /configurar estricto mensajes v|f
    Permite/Prohibe el envío de mensajes de un nuevo usuario al grupo si no está verificado.
`;

/**
 * Procesa el evento de un nuevo miembro en un grupo
 * @param {Telegraf} contexto Referencia al objeto de la sesion
 */
async function accion (contexto) {
	return configurar(contexto);
}

/**
 * Procesa el evento de un nuevo miembro en un grupo
 * @param {Telegraf} contexto Referencia al objeto de la sesion
 */
async function procesarNuevoMiembro (contexto) {
	let nuevoMiembro = {};

	if (contexto.update.message.new_chat_member.is_bot === true && contexto.update.message.new_chat_member.id === idBot) {
		registrarGrupo(contexto)
			.then(() => {})
			.catch(() => {
				let usuario = '';
				let grupo = contexto.update.message.chat.title;

				if (contexto.update.message.from.first_name !== undefined) {
					usuario = contexto.update.message.from.first_name;
				}
				if (contexto.update.message.from.username !== undefined) {
					if (contexto.update.message.from.first_name !== undefined) {
						usuario += ` (@${contexto.update.message.from.username})`;
					} else {
						usuario = `@${contexto.update.message.from.username}`;
					}
				}
			
				contexto.telegram.sendMessage(contexto.update.message.chat.id, `<b>Lamentamos darle una mala noticia!</b>

El usuario ${usuario} ha añadido al <b>Bot de la Reputación</b> al grupo <b>'${grupo}'</b> pero, lamentablemente, dicho usuario no posee privilegios administrativos, por lo que no está autorizado a agregarme.`, {
						parse_mode: 'HTML'
					})
					.then(() => {
						contexto.telegram.leaveChat(contexto.update.message.chat.id)
							.then(() => {})
							.catch(() => {})
						;
					})
					.catch(() => {
						contexto.telegram.sendMessage(contexto.update.message.from.id, `<b>Lamentamos darle una mala noticia!</b>

Usted ha añadido al <b>Bot de la Reputación</b> al grupo <b>'${grupo}'</b> pero, lamentablemente, no posee privilegios administrativos, por lo que no está autorizado a agregarme.`, {
								parse_mode: 'HTML'
							})
							.then(() => {})
							.catch(() => {})
						;

						contexto.telegram.leaveChat(contexto.update.message.chat.id)
							.then(() => {})
							.catch(() => {})
						;
					})
				;
			})
		;
		return;
	}

	for (nuevoMiembro of contexto.update.message.new_chat_members) {
		monitorizacion.monitorizar(contexto, nuevoMiembro, contexto.update.message.chat.id)
			.then(() => {})
			.catch(() => {})
		;
	}

	bienvenida(contexto);
}

/**
 * Procesa el evento de la partida de un miembro en un grupo
 * @param {Telegraf} contexto Referencia al objeto de la sesion
 */
async function procesarPartidaMiembro (contexto) {
	monitorizacion.monitorizar(contexto, contexto.update.message.left_chat_member, undefined)
		.then(() => {})
		.catch(() => {})
	;
	monitorizacion.eliminarGrupoUsuario(contexto.update.message.left_chat_member.id, contexto.update.message.chat.id);
}

/**
 * Procesa el evento de un nuevo mensaje en un grupo
 * @param {Telegraf} contexto Referencia al objeto de la sesion
 */
async function procesarNuevoMensaje (contexto) {
	let configuracion = {};
	let usuario = '';
	let grupo = contexto.update.message.chat.title;

	if (contexto.update.message.from.is_bot === true || contexto.update.message.chat.id > 0 || contexto.update.message.from.id === idUsuarioTelegram) {
		return;
	}

	if (contexto.update.message.from.first_name !== undefined) {
		usuario = contexto.update.message.from.first_name;
	}
	if (contexto.update.message.from.username !== undefined) {
		if (contexto.update.message.from.first_name !== undefined) {
			usuario += ` (@${contexto.update.message.from.username})`;
		} else {
			usuario = `@${contexto.update.message.from.username}`;
		}
	}

	monitorizacion.monitorizar(contexto, contexto.update.message.from, contexto.update.message.chat.id)
		.then(() => {})
		.catch(() => {})
	;
	if (contexto.update.message.forward_from !== undefined) {
		monitorizacion.monitorizar(contexto, contexto.update.message.forward_from, undefined)
			.then(() => {})
			.catch(() => {})
		;
	}
	if (contexto.update.message.reply_to_message !== undefined) {
		monitorizacion.monitorizar(contexto, contexto.update.message.reply_to_message.from, contexto.update.message.chat.id)
			.then(() => {})
			.catch(() => {})
		;
	}
	
	leerConfiguracion(contexto.update.message.chat.id)
		.then(() => {
			if (grupos.has(contexto.update.message.chat.id) === true) {
				configuracion = grupos.get(contexto.update.message.chat.id);

				if (configuracion.modoEstricto.activado === true) {
					if (configuracion.modoEstricto.mensajes === false) {
						comun.inicializarVariablesSesion(contexto)
							.then(() => {
								if (contexto.session.verificado === false) {
									contexto.telegram.deleteMessage(contexto.update.message.chat.id, contexto.update.message.message_id)
										.then(() => {})
										.catch(() => {})
									;
									contexto.telegram.restrictChatMember(contexto.update.message.chat.id, contexto.update.message.from.id, {
											can_send_messages: false,
											can_send_media_messages: false,
											can_send_polls: false,
											can_send_other_messages: false,
											can_add_web_page_previews: false,
											can_change_info: false,
											can_invite_users: false,
											can_pin_messages: false
										})
										.then(() => {})
										.catch(() => {})
									;
									contexto.telegram.sendMessage(contexto.update.message.chat.id, `Estimado ${usuario}, lamentamos darle una mala noticia.

El grupo <b>'${grupo}'</b> posee el <b>modo estricto activado</b> y requiere que usted se verifique en el <b>Bot de la Reputación</b> para poder enviar mensajes. Inicie una conversación con <b>@ReputacionBot</b> y complete el proceso <b>Conoce Tu Cliente</b>.

<b><i>Usted ha sido silenciado.</i></b>`, {
											parse_mode: 'HTML'
										})
										.then((mensaje) => {
											setTimeout(() => {
												contexto.telegram.deleteMessage(contexto.update.message.chat.id, mensaje.message_id)
													.then(() => {})
													.catch(() => {})
												;
											}, configuracion.duracionMensajes * 1000);
										})
										.catch(() => {})
									;
								}
							})
							.catch(() => {})
						;							
					}
				}
			}
		})
		.catch(() => {})
	;
}

/**
 * Registra los detalles del grupo al que han unido al bot
 * @param {Telegraf} contexto Referencia al objeto de la sesion
 */
async function registrarGrupo (contexto) {
	let usuarioAutorizado = false;
	let instruccionSQL = '';
	let usuario = {};

	try {
		usuario = await contexto.telegram.getChatMember(contexto.update.message.chat.id, contexto.update.message.from.id);
		if (usuario.status === 'creator' || usuario.status === 'administrator') {
			usuarioAutorizado = true;
		}

		if (usuarioAutorizado === true) {
			if (grupos.has(contexto.update.message.chat.id) === false) {
				grupos.set(contexto.update.message.chat.id, {
					mensajeBienvenida: false,
					duracionMensajes: 30,
					modoEstricto: {
						activado: false,
						uniones: false,
						mensajes: false
					}
				});

				instruccionSQL = `
INSERT INTO grupos (
	id
) VALUES (
	$1
)
				`;
				baseDatos.query(instruccionSQL, [
						contexto.update.message.chat.id
					])
					.then(() => {})
					.catch(() => {})
				;

				return true;
			} else {
				await leerConfiguracion(contexto.update.message.chat.id);
			}
		} else {
			throw new Error();
		}
	} catch(_e) {
		throw new Error();
	}
}

/**
 * Obtiene las configuraciones del grupo desde la base de datos
 * @param {number} idChat ID del chat
 */
async function leerConfiguracion (idChat) {
	const instruccionSQL = `
SELECT
	mensaje_bienvenida::boolean,
	duracion_mensajes::integer,
	modo_estricto::boolean,
	modo_estricto_uniones::boolean,
	modo_estricto_mensajes::boolean
FROM grupos 
WHERE (
	id = $1
)
	`;
	let resultados = {};

	resultados = await baseDatos.query(instruccionSQL, [
		idChat
	]);
	if (resultados.rowCount > 0) {
		grupos.set(idChat, {
			mensajeBienvenida: resultados.rows[0].mensaje_bienvenida,
			duracionMensajes: resultados.rows[0].duracion_mensajes,
			modoEstricto: {
				activado: resultados.rows[0].modo_estricto,
				uniones: resultados.rows[0].modo_estricto_uniones,
				mensajes: resultados.rows[0].modo_estricto_mensajes
			}
		});
	}
}

/**
 * Guarda las configuraciones del grupo en la base de datos
 * @param {number} idChat ID del chat
 * @param {Object} configuracion Configuraciones
 */
function guardarConfiguracion (idChat, configuracion) {
	const instruccionSQL = `
UPDATE grupos SET
	mensaje_bienvenida = $2,
	duracion_mensajes = $3,
	modo_estricto = $4,
	modo_estricto_uniones = $5,
	modo_estricto_mensajes = $6
WHERE (
	id = $1
)
	`;

	baseDatos.query(instruccionSQL, [
			idChat,
			configuracion.mensajeBienvenida,
			configuracion.duracionMensajes,
			configuracion.modoEstricto.activado,
			configuracion.modoEstricto.uniones,
			configuracion.modoEstricto.mensajes
		])
		.then(() => {})
		.catch(() => {})
	;
}

/**
 * Configura el grupo
 * @param {Telegraf} contexto Referencia al objeto de la sesion
 */
async function configurar (contexto) {
	let configuracion = {};
	let comando = [];
	let mensaje = '';

	leerConfiguracion(contexto.update.message.chat.id)
		.then(() => {
			contexto.telegram.getChatMember(contexto.update.message.chat.id, contexto.update.message.from.id)
				.then(async (usuario) => {
					if (usuario.status === 'creator' || usuario.status === 'administrator') {
						if (grupos.has(contexto.update.message.chat.id) === true) {
							configuracion = grupos.get(contexto.update.message.chat.id);
							comando = contexto.update.message.text.split(' ');
							comando.shift();
							if (comando.length === 0) { return; }
							switch(comando[0].toLowerCase()) {
								case 'bienvenida':
									comando.shift();
									if (comando.length === 0) { return; }
									switch (comando[0].toLowerCase()) {
										case '0':
										case 'f':
											configuracion.mensajeBienvenida = false;
											mensaje = 'Se ha desactivado el mensaje de bienvenida.';
											break;
										case '1':
										case 'v':
											configuracion.mensajeBienvenida = true;
											mensaje = 'Se ha activado el mensaje de bienvenida.';
											break;
									}
									break;
								case 'duracion':
									comando.shift();
									if (comando.length === 0) { return; }
									configuracion.duracionMensajes = parseInt(comando);
									mensaje = `Se ha establecido la duración de los mensaje a ${configuracion.duracionMensajes} segundos.`;
									break;
								case 'estricto':
									comando.shift();
									if (comando.length === 0) {
										mensaje = `<b>Modo estricto: ${(configuracion.modoEstricto.activado === false ? 'Desactivado' : 'Activado')}</b>

Privilegios de los usuarios no verificados:
- Unirse al grupo: ${(configuracion.modoEstricto.uniones === false ? 'Prohibido' : 'Permitido')}.
- Enviar mensajes: ${(configuracion.modoEstricto.mensajes === false ? 'Prohibido' : 'Permitido')}.`;
									} else {
										let bot = await contexto.telegram.getChatMember(contexto.update.message.chat.id, idBot);
										if ((bot.status === 'creator' || bot.status === 'administrator') && bot.can_delete_messages === true && bot.can_restrict_members === true) {
											switch (comando[0].toLowerCase()) {
												case '0':
												case 'f':
													configuracion.modoEstricto.activado = false;
													mensaje = 'Se ha desactivado el modo estricto. Las funciones de unión y envío de mensajes al grupo quedan restablecidas, exceptuando a aquellos usuarios que fueron sujetos de restricciones durante el funcionamiento del modo estricto.';
													break;
												case '1':
												case 'v':
													configuracion.modoEstricto.activado = true;
													mensaje = `<b>Se ha activado el modo estricto.</b>

Privilegios de los usuarios no verificados:
  - Unirse al grupo: ${(configuracion.modoEstricto.uniones === false ? 'Prohibido' : 'Permitido')}.
  - Enviar mensajes: ${(configuracion.modoEstricto.mensajes === false ? 'Prohibido' : 'Permitido')}.`;
													break;
												case 'uniones':
													comando.shift();
													if (comando.length === 0) { return; }
													switch (comando[0].toLowerCase()) {
														case '0':
														case 'f':
															configuracion.modoEstricto.uniones = false;
															break;
														case '1':
														case 'v':
															configuracion.modoEstricto.uniones = true;
															break;
													}
													mensaje = `Privilegios de los usuarios no verificados:
  - Unirse al grupo: ${(configuracion.modoEstricto.uniones === false ? 'Prohibido' : 'Permitido')}.`;
													break;
												case 'mensajes':
													comando.shift();
													if (comando.length === 0) { return; }
													switch (comando[0].toLowerCase()) {
														case '0':
														case 'f':
															configuracion.modoEstricto.mensajes = false;
															break;
														case '1':
														case 'v':
															configuracion.modoEstricto.mensajes = true;
															break;
													}
													mensaje = `Privilegios de los usuarios no verificados:
  - Enviar mensajes: ${(configuracion.modoEstricto.mensajes === false ? 'Prohibido' : 'Permitido')}.`;
													break;
											}
										} else {
											mensaje = `<b>Lamentamos darle una mala noticia!</b>

La configuración que intenta establecer requiere que el bot posea los siguientes privilegios:
  - Eliminar mensajes.
  - Restringir/expulsar usuarios.`;
										}
										break;
									}
									break;
							}
							
							guardarConfiguracion(contexto.update.message.chat.id, configuracion);

							if (mensaje.length > 0) {
								contexto.telegram.sendMessage(contexto.update.message.chat.id, mensaje, {
										parse_mode: 'HTML',
										reply_to_message_id: contexto.update.message.message_id
									})
									.then(() => {})
									.catch(() => {})
								;
							}
						}
					}
				})
				.catch(() => {})
			;
		})
		.catch(() => {})
	;
}

/**
 * Muestra el mensaje de bienvenida al grupo al nuevo usuario
 * @param {Telegraf} contexto Referencia al objeto de la sesion
 */
function bienvenida (contexto) {
	let configuracion = {};
	let usuario = '';
	let grupo = contexto.update.message.chat.title;

	if (contexto.update.message.new_chat_member.first_name !== undefined) {
		usuario = contexto.update.message.new_chat_member.first_name;
	}
	if (contexto.update.message.new_chat_member.username !== undefined) {
		if (contexto.update.message.new_chat_member.first_name !== undefined) {
			usuario += ` (@${contexto.update.message.new_chat_member.username})`;
		} else {
			usuario = `@${contexto.update.message.new_chat_member.username}`;
		}
	}

	if (contexto.update.message.new_chat_member.is_bot === true) {
		return;
	}

	contexto.update.message._from = contexto.update.message.from;
	contexto.update.message.from = contexto.update.message.new_chat_member;
	comun.inicializarVariablesSesion(contexto)
		.then(() => {
			contexto.update.message.from = contexto.update.message._from;
			leerConfiguracion(contexto.update.message.chat.id)
				.then(() => {
					if (grupos.has(contexto.update.message.chat.id) === true) {
						configuracion = grupos.get(contexto.update.message.chat.id);

						if (configuracion.modoEstricto.activado === true) {
							if (contexto.session.verificado === false) {
								if (configuracion.modoEstricto.uniones === false) {
									contexto.telegram.restrictChatMember(contexto.update.message.chat.id, contexto.update.message.new_chat_member.id, {
											can_send_messages: false,
											can_send_media_messages: false,
											can_send_polls: false,
											can_send_other_messages: false,
											can_add_web_page_previews: false,
											can_change_info: false,
											can_invite_users: false,
											can_pin_messages: false
										})
										.then(() => {})
										.catch(() => {})
									;
									contexto.telegram.sendMessage(contexto.update.message.chat.id, `Estimado ${usuario}, lamentamos darle una mala noticia.

El grupo <b>'${grupo}'</b> posee el <b>modo estricto activado</b> y requiere que usted se verifique en el <b>Bot de la Reputación</b> antes de unirse al grupo. Inicie una conversación con <b>@ReputacionBot</b> y complete el proceso <b>Conoce Tu Cliente</b>.

<b><i>Usted será expulsado de este grupo en ${configuracion.duracionMensajes} segundos.</i></b>`, {
											parse_mode: 'HTML'
										})
										.then((mensaje) => {
											setTimeout(() => {
												contexto.telegram.kickChatMember(contexto.update.message.chat.id, contexto.update.message.new_chat_member.id)
													.then(() => {
														contexto.telegram.deleteMessage(contexto.update.message.chat.id, mensaje.message_id)
															.then(() => {})
															.catch(() => {})
														;
														setTimeout(() => {
															contexto.telegram.unbanChatMember(contexto.update.message.chat.id, contexto.update.message.new_chat_member.id)
																.then(() => {})
																.catch(() => {})
															;
														}, 120 * 1000);
													})
													.catch(() => {})
												;
											}, configuracion.duracionMensajes * 1000);
										})
										.catch(() => {})
									;

									return;
								}
								if (configuracion.modoEstricto.mensajes === false) {
									contexto.telegram.restrictChatMember(contexto.update.message.chat.id, contexto.update.message.new_chat_member.id, {
											can_send_messages: false,
											can_send_media_messages: false,
											can_send_polls: false,
											can_send_other_messages: false,
											can_add_web_page_previews: false,
											can_change_info: false,
											can_invite_users: false,
											can_pin_messages: false
										})
										.then(() => {})
										.catch(() => {})
									;
									contexto.telegram.sendMessage(contexto.update.message.chat.id, `Estimado ${usuario}, lamentamos darle una mala noticia.

El grupo <b>'${grupo}'</b> posee el <b>modo estricto activado</b> y requiere que usted se verifique en el <b>Bot de la Reputación</b> para poder enviar mensajes. Inicie una conversación con <b>@ReputacionBot</b> y complete el proceso <b>Conoce Tu Cliente</b>.

<b><i>Usted ha sido silenciado.</i></b>`, {
											parse_mode: 'HTML'
										})
										.then((mensaje) => {
											setTimeout(() => {
												contexto.telegram.deleteMessage(contexto.update.message.chat.id, mensaje.message_id)
													.then(() => {})
													.catch(() => {})
												;
											}, configuracion.duracionMensajes * 1000);
										})
										.catch(() => {})
									;

									return;
								}
							}
						}

						if (configuracion.mensajeBienvenida === true) {
							bienvenidaGrupo(contexto);
						}
					}
				})
				.catch(() => {})
			;
		})
		.catch(() => {})
	;
}

/**
 * Muestra el mensaje de bienvenida al grupo al nuevo usuario en el grupo en el que el bot
 * es administrador
 * @param {Telegraf} contexto Referencia al objeto de la sesion
 */
async function bienvenidaGrupo (contexto) {
	let configuracion = {};
	let usuario = '';

	if (contexto.update.message.new_chat_member.first_name !== undefined) {
		usuario = contexto.update.message.new_chat_member.first_name;
	}
	if (contexto.update.message.new_chat_member.username !== undefined) {
		if (contexto.update.message.new_chat_member.first_name !== undefined) {
			usuario += ` (@${contexto.update.message.new_chat_member.username})`;
		} else {
			usuario = `@${contexto.update.message.new_chat_member.username}`;
		}
	}

	leerConfiguracion(contexto.update.message.chat.id)
		.then(() => {
			if (grupos.has(contexto.update.message.chat.id) === true) {
				configuracion = grupos.get(contexto.update.message.chat.id);

				contexto.telegram.sendMessage(contexto.update.message.chat.id, `Bienvenido(a), ${usuario}.

Usted se ha unido al grupo <b>'${contexto.update.message.chat.title}'</b>, en donde el <b>Bot de la Reputación</b>, ente de arbitraje de reputación de los cubanos, ofrece sus servicios. ¿Conoce usted qué es el Bot de la Reputación, cuál es su utilidad y cómo puede servirle, en detalles?`, {
						parse_mode: 'HTML',
						reply_markup: {
							inline_keyboard: [
								[ { text: '¿Qué es el Bot de la Reputación?', url: 'https://telegra.ph/Qu%C3%A9-es-el-Bot-de-la-Reputaci%C3%B3n-10-03' } ],
								[ { text: '¿Cómo utilizar el Bot de la Reputación?', url: 'https://telegra.ph/C%C3%B3mo-utilizar-el-Bot-de-la-Reputaci%C3%B3n-10-03' } ]
							]
						}
					})
					.then((mensaje) => {
						setTimeout(() => {
							contexto.telegram.deleteMessage(contexto.update.message.chat.id, mensaje.message_id)
								.then(() => {})
								.catch(() => {})
							;
						}, configuracion.duracionMensajes * 1000);
					})
					.catch(() => {})
				;
			}
		})
		.catch(() => {})
	;
}

module.exports = {
	comando,
	descripcion,
	accion,
	configurar,
	procesarNuevoMiembro,
	procesarPartidaMiembro,
	procesarNuevoMensaje
};