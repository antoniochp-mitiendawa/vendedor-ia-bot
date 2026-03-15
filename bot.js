const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const pino = require('pino');

// Cargar configuración
let config;
try {
    config = JSON.parse(fs.readFileSync('./config.json'));
} catch (error) {
    console.log('❌ Error: No se pudo cargar config.json');
    console.log('Ejecuta primero el instalador: bash install.sh');
    process.exit(1);
}

const numeroDueno = config.dueno + '@s.whatsapp.net';
const numeroBot = config.bot;

let sock = null;
let codigoMostrado = false;
let reconectando = false;

// Función para mostrar logs con timestamp
function log(mensaje) {
    const fecha = new Date().toLocaleTimeString();
    console.log(`[${fecha}] ${mensaje}`);
}

// Función para formatear código de emparejamiento
function formatearCodigo(codigo) {
    if (!codigo) return '';
    const codigoLimpio = codigo.replace(/[^a-zA-Z0-9]/g, '');
    return codigoLimpio.match(/.{1,4}/g)?.join('-') || codigoLimpio;
}

// Función para pedir número silenciosamente (por si acaso)
function pedirNumeroSilencioso() {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        rl.question('📱 Introduce el número del bot (sin +): ', (numero) => {
            rl.close();
            resolve(numero.trim());
        });
    });
}

// Función principal
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
            keepAliveIntervalMs: 25000,
            logger: pino({ level: 'silent' })
        });

        // Verificar si ya está registrado
        if (!sock.authState.creds.registered && !codigoMostrado && !reconectando) {
            console.log('\n====================================');
            console.log('📱 CONFIGURACIÓN INICIAL DEL BOT');
            console.log('====================================\n');
            
            log(`Preparando código para: ${numeroBot}`);
            
            // Esperar un momento antes de solicitar el código
            setTimeout(async () => {
                try {
                    log('Solicitando código de emparejamiento...');
                    const codigo = await sock.requestPairingCode(numeroBot);
                    const codigoFormateado = formatearCodigo(codigo);
                    
                    codigoMostrado = true;
                    
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
                    console.log('4. ESCRIBE EL CÓDIGO DE ARRIBA');
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
            }, 3000);
        }

        // Manejar eventos de conexión
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            if (qr) {
                // Ignorar QR, solo usamos pairing code
                return;
            }
            
            if (connection === 'open') {
                reconectando = false;
                console.log('\n====================================');
                console.log('✅ BOT CONECTADO EXITOSAMENTE');
                console.log('====================================\n');
                log('Dueño configurado: ' + config.dueno);
                log('Bot conectado: ' + numeroBot);
                console.log('\n📝 Comandos disponibles:');
                console.log('   - Envía mensajes de voz al bot desde tu número');
                console.log('   - El bot responderá automáticamente a los clientes\n');
            }
            
            if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401;
                
                if (shouldReconnect) {
                    reconectando = true;
                    log('❌ Conexión perdida. Reconectando en 5 segundos...');
                    setTimeout(iniciarBot, 5000);
                } else {
                    log('🚫 Sesión cerrada. Se necesita nuevo código de emparejamiento.');
                    log('Eliminando sesión anterior...');
                    
                    try {
                        fs.rmSync('auth_info', { recursive: true, force: true });
                    } catch (e) {}
                    
                    codigoMostrado = false;
                    setTimeout(iniciarBot, 5000);
                }
            }
        });

        // Guardar credenciales cuando se actualicen
        sock.ev.on('creds.update', saveCreds);

        // Escuchar mensajes entrantes
        sock.ev.on('messages.upsert', async ({ messages }) => {
            const msg = messages[0];
            
            // Ignorar mensajes propios y actualizaciones de estado
            if (!msg.message || msg.key.fromMe || msg.key.remoteJid === 'status@broadcast') {
                return;
            }

            const numero = msg.key.remoteJid;
            
            // Ignorar mensajes de grupos (solo atender mensajes privados)
            if (numero.includes('@g.us')) {
                return;
            }

            const texto = msg.message.conversation || 
                         msg.message.extendedTextMessage?.text || 
                         msg.message.imageMessage?.caption || '';

            if (!texto || texto.trim() === '') {
                return;
            }

            // Limpiar número para comparación
            const numeroLimpio = numero.split('@')[0];
            
            // Si es el dueño
            if (numeroLimpio === config.dueno) {
                log('📝 INSTRUCCIÓN DEL DUEÑO: ' + texto);
                
                // Simular que está escribiendo
                await sock.sendPresenceUpdate('composing', numero);
                
                // Responder confirmación
                setTimeout(async () => {
                    await sock.sendMessage(numero, { 
                        text: '✅ Instrucción recibida. Pronto podrás dar instrucciones por voz.' 
                    });
                }, 2000);
            }
            else {
                // Es un cliente
                log('💬 CLIENTE: ' + texto + ' - ' + numeroLimpio);
                
                // Simular que está escribiendo
                await sock.sendPresenceUpdate('composing', numero);
                
                // Respuesta básica del menú
                if (texto.toLowerCase().includes('hola') || 
                    texto.toLowerCase().includes('buenos') ||
                    texto.toLowerCase().includes('menu') ||
                    texto.toLowerCase().includes('desayuno')) {
                    
                    setTimeout(async () => {
                        await sock.sendMessage(numero, { 
                            text: '¡Buenos días! 🌞 Soy el asistente de Comidas Doña Rosa.\n\n' +
                                  '🍳 *Desayunos de hoy:*\n' +
                                  '• Huevos divorciados con dos salsas 🌶️ - $85\n' +
                                  '• Chilaquiles verdes o rojos 🫑 - $90\n' +
                                  '• Huevos a la mexicana 🍅 - $85\n\n' +
                                  '☕ *TODOS incluyen:* fruta, jugo y café\n\n' +
                                  '🍽️ *Comida corrida:*\n' +
                                  '• Sopa de verduras 🥕\n' +
                                  '• Pollo en mole 🍗\n' +
                                  '• Arroz blanco\n\n' +
                                  '¿Qué se le antoja, jefe? 😋'
                        });
                    }, 3000);
                }
                else if (texto.toLowerCase().includes('precio') || texto.toLowerCase().includes('costo')) {
                    setTimeout(async () => {
                        await sock.sendMessage(numero, { 
                            text: '💰 *Precios:*\n\n' +
                                  'Desayunos: $85 - $90\n' +
                                  'Comida corrida: $120\n' +
                                  'Bebidas: $15 - $30\n\n' +
                                  '¿Algo más que quieras saber? 🤔'
                        });
                    }, 2000);
                }
                else {
                    setTimeout(async () => {
                        await sock.sendMessage(numero, { 
                            text: 'Gracias por contactarnos. 😊\n\n' +
                                  'Puedes preguntarme por:\n' +
                                  '• Menú del día 🍳\n' +
                                  '• Precios 💰\n' +
                                  '• Promociones 🎁\n\n' +
                                  '¿En qué puedo ayudarte?'
                        });
                    }, 2500);
                }
            }
        });

    } catch (error) {
        log('❌ Error fatal: ' + error.message);
        log('Reiniciando en 10 segundos...');
        setTimeout(iniciarBot, 10000);
    }
}

// Manejar cierre del programa (Ctrl+C)
process.on('SIGINT', () => {
    console.log('\n\n👋 Cerrando bot...');
    if (sock) {
        sock.end();
    }
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    log('⚠️ Error no capturado: ' + error.message);
    setTimeout(iniciarBot, 5000);
});

// Iniciar el bot
console.log('\n🤖 VENDEDOR IA PARA WHATSAPP');
console.log('====================================');
console.log('Dueño configurado: ' + config.dueno);
console.log('Bot: ' + numeroBot);
console.log('====================================\n');

iniciarBot();
