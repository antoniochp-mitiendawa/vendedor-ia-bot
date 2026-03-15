const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const fs = require('fs');
const readline = require('readline');

// Cargar configuración
const config = JSON.parse(fs.readFileSync('./config.json'));
const numeroDueno = config.dueno + '@s.whatsapp.net';
const numeroBot = config.bot;

let codigoMostrado = false;

// Función para mostrar logs con timestamp
function log(mensaje) {
    const fecha = new Date().toLocaleTimeString();
    console.log(`[${fecha}] ${mensaje}`);
}

// Función principal
async function iniciarBot() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState('auth_info');
        
        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            browser: ['Termux', 'Chrome', '20.0'],
            syncFullHistory: false,
            markOnlineOnConnect: true,
            keepAliveIntervalMs: 25000
        });

        // Si no hay credenciales registradas, generar código
        if (!sock.authState.creds.registered && !codigoMostrado) {
            console.log('\n====================================');
            console.log('📱 CONFIGURACIÓN INICIAL DEL BOT');
            console.log('====================================\n');
            
            log(`🔄 Preparando código para: ${numeroBot}`);
            
            setTimeout(async () => {
                try {
                    const codigo = await sock.requestPairingCode(numeroBot);
                    
                    // Formatear código con guiones cada 4 dígitos
                    const codigoFormateado = codigo.match(/.{1,4}/g)?.join('-') || codigo;
                    
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
                    console.log('⏳ El bot esperará a que vincules...');
                    console.log('====================================\n');
                    
                } catch (error) {
                    log('❌ Error generando código: ' + error.message);
                    log('Reintentando en 10 segundos...');
                    setTimeout(iniciarBot, 10000);
                }
            }, 2000);
        }

        // Manejar eventos de conexión
        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect } = update;
            
            if (connection === 'open') {
                console.log('\n====================================');
                console.log('✅ BOT CONECTADO EXITOSAMENTE');
                console.log('====================================\n');
                log('Dueño configurado: ' + config.dueno);
                log('Bot conectado: ' + numeroBot);
                console.log('\n📝 El bot ya está listo para recibir instrucciones por voz\n');
            }
            
            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                
                // Si no es logout, reconectar
                if (statusCode !== 401) {
                    log('❌ Conexión cerrada. Reconectando en 5 segundos...');
                    setTimeout(iniciarBot, 5000);
                } else {
                    log('🚫 Sesión cerrada. Se necesita nuevo código.');
                    // Borrar sesión para que pida código nuevo
                    try {
                        fs.rmSync('auth_info', { recursive: true, force: true });
                    } catch (e) {}
                    setTimeout(iniciarBot, 5000);
                }
            }
        });

        // Guardar credenciales cuando se actualicen
        sock.ev.on('creds.update', saveCreds);

        // Escuchar mensajes entrantes
        sock.ev.on('messages.upsert', async ({ messages }) => {
            const msg = messages[0];
            if (!msg.message || msg.key.fromMe) return;

            const numero = msg.key.remoteJid;
            const texto = msg.message.conversation || 
                         msg.message.extendedTextMessage?.text || '';

            // Solo procesar mensajes privados (no grupos)
            if (!numero.includes('@g.us')) {
                
                // Si es el dueño
                if (numero === numeroDueno) {
                    log('📝 Instrucción del dueño: ' + texto);
                    
                    // Responder confirmación
                    await sock.sendMessage(numero, { 
                        text: '✅ Instrucción recibida. Pronto podrás dar instrucciones por voz.' 
                    });
                }
                else {
                    // Es un cliente
                    log('💬 Cliente: ' + texto);
                    
                    // Respuesta básica (después se mejorará con IA)
                    if (texto.toLowerCase().includes('hola') || 
                        texto.toLowerCase().includes('menu') ||
                        texto.toLowerCase().includes('desayuno')) {
                        
                        await sock.sendMessage(numero, { 
                            text: '¡Buenos días! 🌞 Soy el asistente de Comidas Doña Rosa.\n\n' +
                                  'Hoy tenemos:\n' +
                                  '🍳 *Desayunos*: Huevos divorciados, chilaquiles, huevos a la mexicana\n' +
                                  '☕ *Incluyen*: Fruta, jugo y café\n' +
                                  '🍽️ *Comida corrida*: Sopa de verduras, pollo en mole, arroz\n\n' +
                                  '¿Qué se le antoja, jefe? 😋'
                        });
                    }
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
    process.exit(0);
});

// Iniciar el bot
console.log('\n🤖 Iniciando Vendedor IA...\n');
iniciarBot();
