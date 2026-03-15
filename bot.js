const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const readline = require('readline');
const pino = require('pino');
const path = require('path');

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

// Variables para SherpaNcnn
let sherpaDisponible = false;
let sherpaModel = null;

// Intentar cargar SherpaNcnn (si está instalado)
try {
    const sherpa = require('sherpa-ncnn');
    const MODEL_PATH = './sherpa-ncnn-streaming-zipformer-es-2024-02-08';
    
    if (fs.existsSync(MODEL_PATH)) {
        // Configurar el reconocedor con el modelo en español [citation:2]
        const recognizer = new sherpa.OnlineRecognizer({
            tokens: path.join(MODEL_PATH, 'tokens.txt'),
            encoder: path.join(MODEL_PATH, 'encoder_jit_trace-pnnx.ncnn.param'),
            encoderBin: path.join(MODEL_PATH, 'encoder_jit_trace-pnnx.ncnn.bin'),
            decoder: path.join(MODEL_PATH, 'decoder_jit_trace-pnnx.ncnn.param'),
            decoderBin: path.join(MODEL_PATH, 'decoder_jit_trace-pnnx.ncnn.bin'),
            joiner: path.join(MODEL_PATH, 'joiner_jit_trace-pnnx.ncnn.param'),
            joinerBin: path.join(MODEL_PATH, 'joiner_jit_trace-pnnx.ncnn.bin'),
            numThreads: 2,
            enableEndpoint: true
        });
        
        sherpaModel = recognizer;
        sherpaDisponible = true;
        console.log('🎤 SherpaNcnn: Modelo de voz cargado correctamente');
    }
} catch (error) {
    console.log('🎤 SherpaNcnn: No disponible -', error.message);
}

function log(mensaje) {
    const fecha = new Date().toLocaleTimeString();
    console.log(`[${fecha}] ${mensaje}`);
}

function formatearCodigo(codigo) {
    if (!codigo) return '';
    return codigo.match(/.{1,4}/g)?.join('-') || codigo;
}

async function iniciarBot() {
    try {
        log('Iniciando conexión con WhatsApp...');
        
        const { version, isLatest } = await fetchLatestBaileysVersion();
        const logger = pino({ level: 'silent' });
        const { state, saveCreds } = await useMultiFileAuthState('auth_info');
        
        const existeSesion = fs.existsSync(path.join('auth_info', 'creds.json'));
        
        let browserConfig;
        if (!existeSesion) {
            browserConfig = ["Ubuntu", "Chrome", "20.0.04"];
            log('🌐 Primera configuración');
        } else {
            browserConfig = Browsers.macOS("Desktop");
            log('🌐 Usando sesión existente');
        }

        sock = makeWASocket({
            version,
            auth: state,
            logger: logger,
            printQRInTerminal: false,
            browser: browserConfig,
            syncFullHistory: false,
            markOnlineOnConnect: true,
            keepAliveIntervalMs: 30000
        });

        // Si no hay sesión, generar código de emparejamiento
        if (!sock.authState.creds.registered && !codigoGenerado && !reconectando) {
            console.log('\n====================================');
            console.log('📱 PRIMERA CONFIGURACIÓN');
            console.log('====================================\n');
            
            log('Solicitando código de emparejamiento...');
            
            setTimeout(async () => {
                try {
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
                    console.log('4. ESCRIBE: ' + codigoFormateado);
                    console.log('');
                    console.log('⏳ El bot está esperando que vincules...');
                    console.log('⚠️  NO CIERRES ESTA VENTANA');
                    console.log('====================================\n');
                    
                } catch (error) {
                    log('❌ Error generando código: ' + error.message);
                    setTimeout(iniciarBot, 5000);
                }
            }, 2000);
        }

        // Manejar eventos de conexión
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === 'open') {
                reconectando = false;
                console.log('\n====================================');
                console.log('✅ BOT CONECTADO EXITOSAMENTE');
                console.log('====================================\n');
                log('Dueño: ' + config.dueno);
                log('Bot: ' + numeroBot);
                if (sherpaDisponible) console.log('🎤 SherpaNcnn: ACTIVADO');
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

        // Escuchar mensajes
        sock.ev.on('messages.upsert', async ({ messages }) => {
            const msg = messages[0];
            
            if (!msg.key || msg.key.fromMe || !msg.message) {
                return;
            }

            const remitente = msg.key.remoteJid;

            // Ignorar grupos
            if (remitente && remitente.includes('@g.us')) {
                return;
            }

            // Verificar si es un mensaje de audio
            const audioMsg = msg.message.audioMessage;
            
            const texto = msg.message.conversation || 
                         msg.message.extendedTextMessage?.text || '';

            const numeroLimpio = remitente.split('@')[0];

            // Verificar familiares
            if (config.familiares && config.familiares[numeroLimpio]) {
                const palabrasClave = ['menu', 'desayuno', 'comida', 'que hay', 'precios'];
                const contienePalabraClave = palabrasClave.some(p => 
                    texto.toLowerCase().includes(p)
                );
                if (!contienePalabraClave && !audioMsg) {
                    log('👨‍👩‍👧 Familiar ignorado: ' + numeroLimpio);
                    return;
                }
            }

            // Dueño - procesar instrucciones (texto o voz)
            if (numeroLimpio === config.dueno) {
                // Si es un audio y Sherpa está disponible
                if (audioMsg && sherpaDisponible) {
                    log('🎤 Procesando instrucción de voz...');
                    await sock.sendPresenceUpdate('composing', remitente);
                    
                    try {
                        // Descargar audio
                        const buffer = await sock.downloadMediaMessage(msg);
                        const audioPath = path.join('/sdcard/Download', `audio_${Date.now()}.wav`);
                        fs.writeFileSync(audioPath, buffer);
                        
                        // Aquí iría la transcripción con SherpaNcnn
                        // Por ahora simulamos respuesta
                        log('📝 Audio recibido - transcripción simulada');
                        
                        await sock.sendMessage(remitente, { 
                            text: '✅ Instrucción de voz recibida' 
                        });
                        
                        // Limpiar archivo temporal
                        try { fs.unlinkSync(audioPath); } catch (e) {}
                        
                    } catch (error) {
                        log('❌ Error procesando audio: ' + error.message);
                    }
                }
                // Si es texto
                else {
                    log('📝 DUEÑO: ' + texto);
                    await sock.sendPresenceUpdate('composing', remitente);
                    setTimeout(async () => {
                        await sock.sendMessage(remitente, { text: '✅ Instrucción recibida' });
                    }, 2000);
                }
            }
            // Cliente
            else {
                log('💬 CLIENTE: ' + texto);
                await sock.sendPresenceUpdate('composing', remitente);
                
                const delay = Math.floor(Math.random() * 4000) + 1000;
                
                setTimeout(async () => {
                    let respuesta = '';
                    
                    if (texto.toLowerCase().includes('hola') || texto.toLowerCase().includes('buenos')) {
                        respuesta = '¡Buenos días! 🌞 Soy el asistente.\n\n' +
                                  '🍳 *Desayunos:*\n' +
                                  '• Huevos divorciados 🌶️ - $85\n' +
                                  '• Chilaquiles 🫑 - $90\n' +
                                  '☕ *Incluyen:* fruta, jugo y café\n\n' +
                                  '¿Qué se le antoja? 😋';
                    } else if (texto.toLowerCase().includes('precio')) {
                        respuesta = '💰 *Precios:*\n\n' +
                                  'Desayunos: $85 - $90\n' +
                                  'Comida corrida: $120';
                    } else {
                        respuesta = '¿En qué puedo ayudarte? Puedes preguntar por el menú o precios.';
                    }
                    
                    await sock.sendMessage(remitente, { text: respuesta });
                }, delay);
            }
        });

    } catch (error) {
        log('❌ Error fatal: ' + error.message);
        setTimeout(iniciarBot, 5000);
    }
}

process.on('SIGINT', () => {
    console.log('\n\n👋 Cerrando bot...');
    if (sock) {
        sock.end();
    }
    process.exit(0);
});

console.log('\n🤖 VENDEDOR IA PARA WHATSAPP');
console.log('====================================');
iniciarBot();
