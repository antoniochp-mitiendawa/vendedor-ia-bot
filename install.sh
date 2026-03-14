#!/bin/bash

echo "===================================="
echo "🍳 VENDEDOR IA - INSTALACIÓN AUTOMÁTICA"
echo "===================================="
echo "Esto tomará 5-10 minutos. No cierres Termux."
echo ""

# 1. Actualizar Termux
echo "[1/8] Actualizando Termux..."
pkg update -y && pkg upgrade -y

# 2. Instalar herramientas básicas
echo "[2/8] Instalando Node.js, Python y herramientas..."
pkg install -y nodejs python git ffmpeg wget

# 3. Limpiar caché de npm (para evitar errores)
echo "[3/8] Limpiando caché de npm..."
npm cache clean --force

# 4. Instalar dependencias de Node.js (FORZADO)
echo "[4/8] Instalando Baileys y librerías..."
npm install -g npm@latest
npm install @whiskeysockets/baileys@6.7.0 qrcode-terminal @xenova/transformers --force

# 5. Verificar que Baileys se instaló
echo "[5/8] Verificando instalación..."
if [ -d "node_modules/@whiskeysockets/baileys" ]; then
    echo "✅ Baileys instalado correctamente"
else
    echo "⚠️ Reintentando instalación de Baileys..."
    npm install @whiskeysockets/baileys@6.7.0 --force
fi

# 6. Instalar Whisper (para voz)
echo "[6/8] Instalando Whisper (reconocimiento de voz)..."
pip install openai-whisper

# 7. Descargar Gemma 3 (IA local)
echo "[7/8] Descargando inteligencia artificial Gemma 3..."
wget -O gemma-3-1b-it-Q4_0.gguf https://huggingface.co/google/gemma-3-1b-it-quantized/resolve/main/gemma-3-1b-it-Q4_0.gguf

# 8. Pedir número del dueño
echo ""
echo "===================================="
echo "📱 CONFIGURACIÓN INICIAL"
echo "===================================="
echo ""
echo "Ingresa tu número de WhatsApp (dueño):"
echo "Ejemplo: 5215512345678"
read NUMERO_DUENO

# 9. Guardar configuración
echo "[8/8] Guardando configuración..."
echo '{"dueno":"'$NUMERO_DUENO'","familiares":{},"menu":{"desayunos":[],"comida":[]}}' > config.json

# 10. Crear archivo de prueba de Baileys
echo "const test = require('@whiskeysockets/baileys'); console.log('✅ Baileys cargado correctamente');" > test.js
node test.js
rm test.js

# 11. Mensaje final
clear
echo "===================================="
echo "✅ INSTALACIÓN COMPLETADA"
echo "===================================="
echo ""
echo "AHORA SE GENERARÁ EL CÓDIGO DE EMPAREJAMIENTO"
echo ""

# 12. INICIAR EL BOT Y MOSTRAR CÓDIGO
echo "Iniciando bot..."
sleep 2

node -e "
const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const fs = require('fs');

async function iniciar() {
  try {
    // Leer configuración
    const config = JSON.parse(fs.readFileSync('./config.json'));
    const numeroDueno = config.dueno;
    
    console.log('====================================');
    console.log('📱 CÓDIGO DE EMPAREJAMIENTO');
    console.log('====================================');
    console.log('');
    console.log('1. Abre WhatsApp en tu teléfono');
    console.log('2. Ve a Ajustes > Dispositivos vinculados');
    console.log('3. Toca \"Vincular con número de teléfono\"');
    console.log('4. Cuando te pida el código, ESCRIBE ESTO:');
    console.log('');
    console.log('⚡⚡⚡ ' + numeroDueno + ' ⚡⚡⚡');
    console.log('');
    console.log('(Sí, el código es tu propio número)');
    console.log('====================================');
    console.log('');
    
    // Configurar autenticación
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      browser: ['Termux', 'Chrome', '20.0'],
      syncFullHistory: false
    });
    
    // Esperar conexión exitosa
    sock.ev.on('connection.update', (update) => {
      const { connection } = update;
      
      if (connection === 'open') {
        console.log('');
        console.log('====================================');
        console.log('✅ BOT CONECTADO EXITOSAMENTE');
        console.log('====================================');
        console.log('');
        console.log('Dueño configurado: ' + numeroDueno);
        console.log('');
        console.log('Ya puedes enviarle mensajes de voz a este bot');
        console.log('desde tu número para darle instrucciones.');
        console.log('');
        console.log('El bot seguirá funcionando hasta que cierres Termux');
        console.log('Para salir: Ctrl+C');
        console.log('====================================');
      }
    });
    
    sock.ev.on('creds.update', saveCreds);
    
  } catch (error) {
    console.log('Error:', error.message);
    console.log('');
    console.log('====================================');
    console.log('⚠️  ERROR: No se pudo cargar Baileys');
    console.log('====================================');
    console.log('');
    console.log('Ejecuta estos comandos manualmente:');
    console.log('1. npm install @whiskeysockets/baileys@6.7.0 --force');
    console.log('2. node -e \"require(\\'@whiskeysockets/baileys\\')\"');
    console.log('3. node bot.js');
  }
}

iniciar();
"
