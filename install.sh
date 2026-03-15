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

# 3. Limpiar caché de npm
echo "[3/8] Limpiando caché de npm..."
npm cache clean --force

# 4. Instalar dependencias de Node.js
echo "[4/8] Instalando Baileys y librerías..."
npm install -g npm@latest
npm install @whiskeysockets/baileys@6.7.0 qrcode-terminal @xenova/transformers --force

# 5. Verificar instalación de Baileys
echo "[5/8] Verificando instalación..."
if [ -d "node_modules/@whiskeysockets/baileys" ]; then
    echo "✅ Baileys instalado correctamente"
else
    echo "⚠️ Reintentando instalación de Baileys..."
    npm install @whiskeysockets/baileys@6.7.0 --force
fi

# 6. Instalar Whisper
echo "[6/8] Instalando Whisper..."
pip install openai-whisper

# 7. Descargar Gemma 3
echo "[7/8] Descargando inteligencia artificial Gemma 3..."
wget -O gemma-3-1b-it-Q4_0.gguf https://huggingface.co/google/gemma-3-1b-it-quantized/resolve/main/gemma-3-1b-it-Q4_0.gguf

# 8. PEDIR LOS DOS NÚMEROS
clear
echo "===================================="
echo "📱 CONFIGURACIÓN DE NÚMEROS"
echo "===================================="
echo ""
echo "Vamos a necesitar DOS números diferentes:"
echo ""
echo "1️⃣  Número del DUEÑO (el que dará instrucciones al bot)"
echo "   Ejemplo: 5215512345678"
echo ""
read -p "➤ Número del DUEÑO: " NUMERO_DUENO
echo ""
echo "2️⃣  Número del BOT (el que va a contestar a los clientes)"
echo "   Ejemplo: 5215512345679"
echo ""
read -p "➤ Número del BOT: " NUMERO_BOT
echo ""

# 9. Guardar configuración
echo "[8/8] Guardando configuración..."
echo '{"dueno":"'$NUMERO_DUENO'","bot":"'$NUMERO_BOT'","familiares":{},"menu":{"desayunos":[],"comida":[]}}' > config.json

# 10. Mensaje final
clear
echo "===================================="
echo "✅ INSTALACIÓN COMPLETADA"
echo "===================================="
echo ""
echo "AHORA SE INICIARÁ EL BOT"
echo "Y TE MOSTRARÁ EL CÓDIGO DE EMPAREJAMIENTO"
echo "PARA EL NÚMERO DEL BOT: $NUMERO_BOT"
echo ""
echo "INICIANDO EN 3 SEGUNDOS..."
sleep 3

# 11. INICIAR EL BOT AUTOMÁTICAMENTE
node bot.js
