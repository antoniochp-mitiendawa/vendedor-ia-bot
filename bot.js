const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const readline = require('readline');

// Cargar configuración
let config = { dueno: "", bot: "" };
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

function log(mensaje) {
    const fecha = new Date().toLocaleTimeString();
    console.log(`[${fecha}] ${mensaje}`);
}

// Función para pedir número (solo si es necesario)
function pedirNumeroSilencioso() {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        rl.question('📱 Introduce el número del bot: ', (numero) => {
            rl.close();
            resolve(numero.trim());
        });
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
            keepAliveIntervalMs: 30000
        });

        // Si no hay credenciales registradas, generar código de emparejamiento
        if (!sock.authState.creds.registered && !codigoGenerado && !reconectando) {
            console.log('\n====================================');
            console.log('📱 CONFIGURACIÓN INICIAL DEL BOT');
            console.log('====================================\n');
            
            log(`Preparando código para: ${numeroBot}`);
            
            // Esperar 2 segundos (como en tu ejemplo)
            setTimeout(async () => {
                try {
                    log('Solicitando código de emparejamiento...');
                    const codigo = await sock.requestPairingCode(numeroBot);
                    
                    // Formatear código con guiones cada 4 dígitos (como en tu ejemplo)
                    const codigoFormateado = codigo.match(/.{1,4}/g)?.join('-') || codigo;
                    
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
                console.log('\n📝 El bot ya está listo para recibir instrucciones');
                console.log('   Envía mensajes de voz desde tu número\n');
            }
            
            if (connection === 'close') {
                const statusCode = lastDisconnect?.error instanceof Boom ? lastDisconnect.error.output.statusCode : 500;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                
                if (shouldReconnect) {
                    reconectando = true;
                    log('❌ Conexión cerrada. Reconectando en 5 segundos...');
                    setTimeout(iniciarBot, 5000);
                } else {
                    log('🚫 Sesión cerrada. Se necesita nuevo código de emparejamiento.');
                    log('Eliminando sesión anterior...');
                    
                    try {
                        fs.rmSync('auth_info', { recursive: true, force: true });
                    } catch (e) {}
                    
                    codigoGenerado = false;
                    setTimeout(iniciarBot, 5000);
                }
            }
        });

        // Guardar credenciales
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
                
                // Responder confirmación (igual que en tu ejemplo)
                setTimeout(async () => {
                    await sock.sendMessage(numero, { 
                        text: '✅ Instrucción recibida' 
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
                            text: '¡Buenos días! 🌞 Soy el asistente.\n\n' +
                                  '🍳 *Desayunos:*\n' +
                                  '• Huevos divorciados 🌶️ - $85\n' +
                                  '• Chilaquiles 🫑 - $90\n\n' +
                                  '☕ *Incluyen:* fruta, jugo y café\n\n' +
                                  '¿Qué se le antoja? 😋'
                        });
                    }, 3000);
                }
                else {
                    setTimeout(async () => {
                        await sock.sendMessage(numero, { 
                            text: '¿En qué puedo ayudarte? Puedes preguntar por el menú o precios.'
                        });
                    }, 2000);
                }
            }
        });

    } catch (error) {
        log('❌ Error fatal: ' + error.message);
        log('Reiniciando en 10 segundos...');
        setTimeout(iniciarBot, 10000);
    }
}

// Manejar cierre del programa
process.on('SIGINT', () => {
    console.log('\n\n👋 Cerrando bot...');
    if (sock) {
        sock.end();
    }
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    log('⚠️ Error no capturado: ' + error.message);
});

// Iniciar el bot
console.log('\n🤖 VENDEDOR IA PARA WHATSAPP');
console.log('====================================');
iniciarBot();
