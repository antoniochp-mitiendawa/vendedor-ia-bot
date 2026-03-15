#!/bin/bash

# Colores para mejor visibilidad
VERDE='\033[0;32m'
AMARILLO='\033[1;33m'
ROJO='\033[0;31m'
AZUL='\033[0;34m'
RESET='\033[0m'

clear
echo -e "${AZUL}====================================${RESET}"
echo -e "${VERDE}🍳 VENDEDOR IA - INSTALACIÓN${RESET}"
echo -e "${AZUL}====================================${RESET}"
echo ""

# Verificar si ya existe configuración
if [ -f "config.json" ]; then
    echo -e "${AMARILLO}📋 Configuración existente detectada${RESET}"
    echo -e "   Usando números guardados"
    echo ""
    sleep 2
else
    echo -e "${AMARILLO}📱 CONFIGURACIÓN INICIAL${RESET}"
    echo ""
    echo "Ingresa el número del DUEÑO (el que dará instrucciones):"
    echo "Ejemplo: 5215512345678"
    read -p "➤ " NUMERO_DUENO
    echo ""
    echo "Ingresa el número del BOT (el que contestará a clientes):"
    echo "Ejemplo: 5215512345679"
    read -p "➤ " NUMERO_BOT
    echo ""
    
    # Guardar configuración
    echo "{\"dueno\":\"$NUMERO_DUENO\",\"bot\":\"$NUMERO_BOT\",\"familiares\":{},\"menu\":{\"desayunos\":[],\"comida\":[]}}" > config.json
    echo -e "${VERDE}✅ Configuración guardada${RESET}"
    echo ""
    sleep 2
fi

# PASO 1: Actualizar Termux
echo -e "${AMARILLO}[1/7] Actualizando Termux...${RESET}"
echo "   ⏳ Puede tomar 1-2 minutos..."
pkg update -y && pkg upgrade -y
echo -e "${VERDE}   ✅ Termux actualizado${RESET}"
echo ""

# PASO 2: Instalar herramientas básicas
echo -e "${AMARILLO}[2/7] Instalando herramientas necesarias...${RESET}"
pkg install -y nodejs python git wget
echo -e "${VERDE}   ✅ Herramientas instaladas${RESET}"
echo ""

# PASO 3: Instalar dependencias de Node.js
echo -e "${AMARILLO}[3/7] Instalando Baileys y librerías...${RESET}"
npm install --no-fund --no-audit @whiskeysockets/baileys@6.7.0 qrcode-terminal @xenova/transformers
echo -e "${VERDE}   ✅ Dependencias instaladas${RESET}"
echo ""

# PASO 4: Instalar Whisper
echo -e "${AMARILLO}[4/7] Instalando Whisper...${RESET}"
pip install openai-whisper > /dev/null 2>&1 &
PID=$!
while kill -0 $PID 2>/dev/null; do
    echo -ne "   ⏳ Instalando...\r"
    sleep 2
done
echo -e "${VERDE}   ✅ Whisper instalado${RESET}"
echo ""

# PASO 5: Descargar Gemma 3 (si no existe)
echo -e "${AMARILLO}[5/7] Verificando IA Gemma 3...${RESET}"
if [ -f "gemma-3-1b-it-Q4_0.gguf" ]; then
    echo -e "${VERDE}   ✅ Modelo ya existe${RESET}"
else
    echo "   ⏳ Descargando modelo (529MB)..."
    wget -O gemma-3-1b-it-Q4_0.gguf --show-progress -q https://huggingface.co/google/gemma-3-1b-it-quantized/resolve/main/gemma-3-1b-it-Q4_0.gguf
    echo -e "${VERDE}   ✅ Modelo descargado${RESET}"
fi
echo ""

# PASO 6: Verificar sesión de WhatsApp
echo -e "${AMARILLO}[6/7] Verificando sesión de WhatsApp...${RESET}"
if [ -d "auth_info" ] && [ -f "auth_info/creds.json" ]; then
    echo -e "${VERDE}   ✅ Sesión existente encontrada${RESET}"
else
    echo -e "${AMARILLO}   ⚠️ No hay sesión guardada (se generará código nuevo)${RESET}"
fi
echo ""

# PASO 7: Iniciar bot
echo -e "${AMARILLO}[7/7] Iniciando bot...${RESET}"
echo ""
sleep 2

# Ejecutar bot.js
node bot.js
