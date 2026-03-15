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
    DUENO=$(grep -o '"dueno":"[^"]*"' config.json | cut -d '"' -f4)
    BOT=$(grep -o '"bot":"[^"]*"' config.json | cut -d '"' -f4)
    echo -e "   Dueño: ${DUENO}"
    echo -e "   Bot: ${BOT}"
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
    
    echo "{\"dueno\":\"$NUMERO_DUENO\",\"bot\":\"$NUMERO_BOT\"}" > config.json
    echo -e "${VERDE}✅ Configuración guardada${RESET}"
    echo ""
    sleep 2
fi

# Actualizar Termux
echo -e "${AMARILLO}[1/6] Actualizando Termux...${RESET}"
pkg update -y && pkg upgrade -y
if [ $? -eq 0 ]; then
    echo -e "${VERDE}   ✅ Termux actualizado${RESET}"
else
    echo -e "${ROJO}   ❌ Error actualizando Termux${RESET}"
    exit 1
fi
echo ""

# Instalar herramientas básicas
echo -e "${AMARILLO}[2/6] Instalando herramientas necesarias...${RESET}"
pkg install -y nodejs python git wget
if [ $? -eq 0 ]; then
    echo -e "${VERDE}   ✅ Herramientas instaladas${RESET}"
else
    echo -e "${ROJO}   ❌ Error instalando herramientas${RESET}"
    exit 1
fi
echo ""

# Verificar/Instalar dependencias Node.js
echo -e "${AMARILLO}[3/6] Verificando dependencias Node.js...${RESET}"

if [ -d "node_modules" ] && [ -d "node_modules/@whiskeysockets/baileys" ]; then
    echo -e "${VERDE}   ✅ Módulos Node.js ya existen${RESET}"
else
    echo -e "${AMARILLO}   ⚠️ Instalando módulos Node.js...${RESET}"
    npm install @whiskeysockets/baileys@6.7.0 qrcode-terminal
    if [ $? -eq 0 ]; then
        echo -e "${VERDE}   ✅ Módulos instalados${RESET}"
    else
        echo -e "${ROJO}   ❌ Error instalando módulos${RESET}"
        exit 1
    fi
fi
echo ""

# Verificar Whisper
echo -e "${AMARILLO}[4/6] Verificando Whisper...${RESET}"
pip show openai-whisper > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${VERDE}   ✅ Whisper ya está instalado${RESET}"
else
    echo -e "${AMARILLO}   ⚠️ Instalando Whisper (puede tomar varios minutos)...${RESET}"
    pip install openai-whisper
    if [ $? -eq 0 ]; then
        echo -e "${VERDE}   ✅ Whisper instalado${RESET}"
    else
        echo -e "${ROJO}   ❌ Error instalando Whisper${RESET}"
        echo -e "${AMARILLO}   ⚠️ Continuando sin Whisper (funciones de voz no disponibles)${RESET}"
    fi
fi
echo ""

# Verificar Gemma 3
echo -e "${AMARILLO}[5/6] Verificando modelo Gemma 3...${RESET}"
if [ -f "gemma-3-1b-it-Q4_0.gguf" ]; then
    TAMANO=$(wc -c < "gemma-3-1b-it-Q4_0.gguf" 2>/dev/null)
    if [ $TAMANO -gt 500000000 ]; then
        echo -e "${VERDE}   ✅ Modelo Gemma 3 ya existe${RESET}"
    else
        echo -e "${ROJO}   ❌ Modelo corrupto, descargando de nuevo...${RESET}"
        rm -f gemma-3-1b-it-Q4_0.gguf
        echo "   ⏳ Descargando modelo (529MB)..."
        wget -O gemma-3-1b-it-Q4_0.gguf https://huggingface.co/google/gemma-3-1b-it-quantized/resolve/main/gemma-3-1b-it-Q4_0.gguf
        echo -e "${VERDE}   ✅ Modelo descargado${RESET}"
    fi
else
    echo -e "${AMARILLO}   ⚠️ Descargando modelo Gemma 3 (529MB)...${RESET}"
    wget -O gemma-3-1b-it-Q4_0.gguf https://huggingface.co/google/gemma-3-1b-it-quantized/resolve/main/gemma-3-1b-it-Q4_0.gguf
    if [ $? -eq 0 ]; then
        echo -e "${VERDE}   ✅ Modelo descargado${RESET}"
    else
        echo -e "${ROJO}   ❌ Error descargando modelo${RESET}"
    fi
fi
echo ""

# Verificar sesión WhatsApp
echo -e "${AMARILLO}[6/6] Verificando sesión WhatsApp...${RESET}"
if [ -d "auth_info" ] && [ -f "auth_info/creds.json" ]; then
    echo -e "${VERDE}   ✅ Sesión existente encontrada${RESET}"
else
    echo -e "${AMARILLO}   ⚠️ No hay sesión guardada (se generará código nuevo)${RESET}"
fi
echo ""

# Iniciar bot
echo -e "${AZUL}====================================${RESET}"
echo -e "${VERDE}🚀 INICIANDO BOT...${RESET}"
echo -e "${AZUL}====================================${RESET}"
echo ""
sleep 2

# Ejecutar bot.js
node bot.js
