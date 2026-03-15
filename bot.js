const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const path = require('path');
const fsPromises = fs.promises;
const vosk = require('vosk');
const wav = require('wav');

// Cargar configuración
let config = { dueno: "", bot: "", familiares: {}, menu: { desayunos: [], comida: [] } };
try {
    config = JSON.parse(fs.readFileSync('./config.json'));
    console.log(`📱 Configuración cargada:`);
    console.log(`   Dueño: ${config.dueno}`);
    console.log(`   Bot: ${config.bot}`);
} catch (error) {
    console.log('❌ Error: No se pudo cargar config.json');
    console.log('Ejecuta primero: bash install.sh');
    process.exit(1);
}

const numeroDueno = config.dueno + '@s.whatsapp.net';
const numeroBot = config.bot;

let sock = null;
let codigoGenerado = false;
let reconectando = false;

// Inicializar Vosk (si está instalado)
let voskModel = null;
let voskDisponible = false;
try {
    const MODEL_PATH = './vosk-model-small-es-0.42';
    if (fs.existsSync(MODEL_PATH)) {
        vosk.setLogLevel(-1); // Silenciar logs de Vosk
        voskModel = new vosk.Model(MODEL_PATH);
        voskDisponible = true;
        console.log('🎤 Vosk: Modelo de voz cargado correctamente');
    } else {
        console.log('🎤 Vosk: Modelo no encontrado (funciones de voz limitadas)');
    }
} catch (error) {
    console.log('🎤 Vosk: Error al cargar modelo:', error.message);
}

function log(mensaje) {
    const fecha = new Date().toLocaleTimeString();
    console.log(`[${fecha}] ${mensaje}`);
}

function formatearCodigo(codigo) {
    if (!codigo) return '';
    return codigo.match(/.{1,4}/g)?.join('-') || codigo;
}

// NUEVA FUNCIÓN: Procesar audio de WhatsApp con Vosk
async function procesarAudioConVosk(audioPath) {
    if (!voskDisponible) {
        return { error: 'Vosk no disponible' };
    }
    
    return new Promise((resolve, reject) => {
        try {
            if (!fs.existsSync(audioPath)) {
                return resolve({ error: 'Archivo de audio no encontrado' });
            }

            const wfReader = new wav.Reader();
            const rec = new vosk.Recognizer({ model: voskModel, sampleRate: 16000 });
            let resultadoFinal = '';

            wfReader.on('format', ({ audioFormat, sampleRate, channels }) => {
                if (audioFormat !== 1 || channels !== 1) {
                    reject(new Error('El audio debe ser mono PCM 16kHz'));
                    return;
                }
            });

            wfReader.on('data', (data) => {
                if (rec.acceptWaveform(data)) {
                    const res = rec.result();
                    if (res.text) {
                        resultadoFinal += ' ' + res.text;
                    }
                }
            });

            wfReader.on('end', () => {
                const res = rec.finalResult();
                if (res.text) {
                    resultadoFinal += ' ' + res.text;
                }
                rec.free();
                resolve({ texto: resultadoFinal.trim() });
            });

            wfReader.on('error', (err) => {
                rec.free();
                reject(err);
            });

            fs.createReadStream(audioPath).pipe(wfReader);
            
        } catch (error) {
            reject(error);
        }
    });
}

async function iniciarBot() {
    try {
        log('Iniciando conexión con WhatsApp...');
        
        const { state, saveCreds } = await useMultiFileAuthState('auth_info');
        
        sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            browser: ['Termux', 'Chrome', '20.0'],
            syncFullHistory: false,
            markOnlineOnConnect: true,
            keepAliveIntervalMs: 60000
        });

        if (!sock.authState.creds.registered && !codigoGenerado && !reconectando) {
            console.log('\n====================================');
            console.log('📱 CONFIGURACIÓN INICIAL DEL BOT');
            console.log('====================================\n');
            
            log(`Preparando código para: ${numeroBot}`);
            
            setTimeout(async () => {
                try {
                    log('Solicitando código de emparejamiento...');
                    const codigo = await sock.requestPairingCode(numeroBot);
                    const codigoFormateado = formatearCodigo(codigo);
                    
                    codigoGenerado = true;
                    
                    console.log('\n====================================');
                    console.log('🔐 CÓDIGO DE EMPAREJAMIENTO');
                    console.log('====================================');
                    console.log('');
                    console.log('⚡⚡⚡ ' + codigoFormateado + ' ⚡⚡⚡');
                    console.log('');
                    console.log('====================================');
                    console.log('INSTRUCCIONES:');
                    console.log('====================================');
                    console.log('1. Abre WhatsApp en tu teléfono');
                    console.log('2. Ve a Ajustes > Dispositivos vinculados');
                    console.log('3. Toca "Vincular con número de teléfono"');
                    console.log('4. ESCRIBE EL CÓDIGO: ' + codigoFormateado);
                    console.log('');
                    console.log('⏳ El bot está esperando que vincules...');
                    console.log('⚠️  NO CIERRES ESTA VENTANA');
                    console.log('====================================\n');
                    
                    log('Código generado: ' + codigoFormateado);
                    
                } catch (error) {
                    log('❌ Error generando código: ' + error.message);
                    log('Reintentando en 10 segundos...');
                    setTimeout(iniciarBot, 10000);
                }
            }, 2000);
        }

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            if (qr) return;
            
            if (connection === 'open') {
                reconectando = false;
                console.log('\n====================================');
                console.log('✅ BOT CONECTADO EXITOSAMENTE');
                console.log('====================================\n');
                log('Dueño configurado: ' + config.dueno);
                log('Bot conectado: ' + numeroBot);
                console.log('\n📝 El bot ya está listo para recibir instrucciones');
                if (voskDisponible) {
                    console.log('🎤 Instrucciones por voz: ACTIVADAS (Vosk)');
                } else {
                    console.log('🎤 Instrucciones por voz: NO DISPONIBLES');
                }
                console.log('');
            }
            
            if (connection === 'close') {
                const statusCode = lastDisconnect?.error instanceof Boom ? lastDisconnect.error.output.statusCode : 500;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                
                if (shouldReconnect) {
                    reconectando = true;
                    log('❌ Conexión cerrada. Reconectando en 5 segundos...');
                    setTimeout(iniciarBot, 5000);
                } else {
                    log('🚫 Sesión cerrada. Se necesita nuevo código.');
                    try {
                        fs.rmSync('auth_info', { recursive: true, force: true });
                    } catch (e) {}
                    codigoGenerado = false;
                    setTimeout(iniciarBot, 5000);
                }
            }
        });

        sock.ev.on('creds.update', saveCreds);

        // Escuchar mensajes - NUEVO: Soporte para audio
        sock.ev.on('messages.upsert', async ({ messages }) => {
            const msg = messages[0];
            
            if (!msg.message || msg.key.fromMe || msg.key.remoteJid === 'status@broadcast') {
                return;
            }

            const numero = msg.key.remoteJid;
            
            if (numero.includes('@g.us')) {
                return;
            }

            // Obtener texto del mensaje (puede ser conversación, texto extendido, o caption)
            const texto = msg.message.conversation || 
                         msg.message.extendedTextMessage?.text || 
                         msg.message.imageMessage?.caption || 
                         msg.message.videoMessage?.caption || '';

            // Verificar si es un mensaje de audio
            const audioMsg = msg.message.audioMessage;
            
            // Limpiar número para comparación
            const numeroLimpio = numero.split('@')[0];
            
            // Verificar familiares
            if (config.familiares && config.familiares[numeroLimpio]) {
                const palabrasClave = ['menu', 'desayuno', 'comida', 'que hay', 'precios'];
                const contienePalabraClave = palabrasClave.some(palabra => 
                    texto.toLowerCase().includes(palabra)
                );
                
                if (!contienePalabraClave && !audioMsg) {
                    log('👨‍👩‍👧 Familiar ignorado: ' + numeroLimpio);
                    return;
                }
            }
            
            // Si es el dueño
            if (numeroLimpio === config.dueno) {
                // SI ES UN AUDIO (instrucción por voz)
                if (audioMsg && voskDisponible) {
                    log('🎤 Recibiendo instrucción de voz del dueño...');
                    
                    // Mostrar typing mientras procesa
                    await sock.sendPresenceUpdate('composing', numero);
                    
                    try {
                        // Descargar el audio
                        const buffer = await sock.downloadMediaMessage(msg);
                        const audioPath = path.join('/sdcard/Download', `audio_${Date.now()}.wav`);
                        fs.writeFileSync(audioPath, buffer);
                        
                        // Procesar con Vosk
                        const resultado = await procesarAudioConVosk(audioPath);
                        
                        // Limpiar archivo temporal
                        try { fs.unlinkSync(audioPath); } catch (e) {}
                        
                        if (resultado.texto) {
                            log('📝 Transcripción: ' + resultado.texto);
                            await sock.sendMessage(numero, { 
                                text: '✅ Instrucción recibida: "' + resultado.texto + '"' 
                            });
                            
                            // Aquí se procesará la instrucción (actualizar menú, etc.)
                            // Por ahora solo confirmamos
                            
                        } else {
                            await sock.sendMessage(numero, { 
                                text: '❌ No pude entender el audio. ¿Puedes repetirlo?' 
                            });
                        }
                        
                    } catch (error) {
                        log('❌ Error procesando audio: ' + error.message);
                        await sock.sendMessage(numero, { 
                            text: '❌ Error procesando el audio. Intenta de nuevo.' 
                        });
                    }
                }
                // SI ES TEXTO
                else {
                    log('📝 INSTRUCCIÓN DEL DUEÑO (texto): ' + texto);
                    await sock.sendPresenceUpdate('composing', numero);
                    setTimeout(async () => {
                        await sock.sendMessage(numero, { text: '✅ Instrucción recibida' });
                    }, 2000);
                }
            }
            else {
                // Es un cliente - responder como siempre
                log('💬 CLIENTE: ' + texto + ' - ' + numeroLimpio);
                await sock.sendPresenceUpdate('composing', numero);
                
                const delay = Math.floor(Math.random() * 4000) + 1000;
                
                setTimeout(async () => {
                    let respuesta = '';
                    
                    if (texto.toLowerCase().includes('hola') || 
                        texto.toLowerCase().includes('buenos')) {
                        respuesta = '¡Buenos días! 🌞 Soy el asistente de Comidas Doña Rosa.\n\n' +
                                  '🍳 *Desayunos:*\n' +
                                  '• Huevos divorciados 🌶️ - $85\n' +
                                  '• Chilaquiles 🫑 - $90\n' +
                                  '• Huevos a la mexicana 🍅 - $85\n\n' +
                                  '☕ *Todos incluyen:* fruta, jugo y café\n\n' +
                                  '🍽️ *Comida corrida:*\n' +
                                  '• Sopa de verduras 🥕\n' +
                                  '• Pollo en mole 🍗\n' +
                                  '• Arroz blanco\n\n' +
                                  '¿Qué se le antoja? 😋';
                    }
                    else if (texto.toLowerCase().includes('precio') || 
                             texto.toLowerCase().includes('costo')) {
                        respuesta = '💰 *Precios:*\n\n' +
                                  'Desayunos: $85 - $90\n' +
                                  'Comida corrida: $120\n' +
                                  'Bebidas: $15 - $30\n\n' +
                                  '¿Algo más que quieras saber? 🤔';
                    }
                    else if (texto.toLowerCase().includes('gracias')) {
                        respuesta = '¡A ti por preferirnos! 🙏\n\n' +
                                  'Que tengas excelente día 🌟';
                    }
                    else {
                        respuesta = 'Gracias por contactarnos. 😊\n\n' +
                                  'Puedes preguntarme por:\n' +
                                  '• Menú del día 🍳\n' +
                                  '• Precios 💰\n' +
                                  '• Promociones 🎁\n\n' +
                                  '¿En qué puedo ayudarte?';
                    }
                    
                    await sock.sendMessage(numero, { text: respuesta });
                    
                }, delay);
            }
        });

    } catch (error) {
        log('❌ Error fatal: ' + error.message);
        log('Reiniciando en 10 segundos...');
        setTimeout(iniciarBot, 10000);
    }
}

process.on('SIGINT', () => {
    console.log('\n\n👋 Cerrando bot...');
    if (voskModel) {
        voskModel.free();
    }
    if (sock) {
        sock.end();
    }
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    log('⚠️ Error no capturado: ' + error.message);
});

console.log('\n🤖 VENDEDOR IA PARA WHATSAPP');
console.log('====================================');
iniciarBot();
