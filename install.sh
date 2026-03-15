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

# VARIABLES PARA LLEVAR REGISTRO
NODE_OK=0
PYTHON_OK=0
GIT_OK=0
BAILEYS_OK=0
VOSK_OK=0
MODELO_OK=0
SESION_OK=0

# VERIFICAR Node.js
echo -e "${AMARILLO}[1/8] Verificando Node.js...${RESET}"
if command -v node &> /dev/null; then
    NODE_OK=1
    echo -e "${VERDE}   ✅ Node.js ya está instalado${RESET}"
else
    echo -e "${AMARILLO}   ⚠️ Node.js no encontrado, instalando...${RESET}"
    pkg install -y nodejs
    if command -v node &> /dev/null; then
        NODE_OK=1
        echo -e "${VERDE}   ✅ Node.js instalado${RESET}"
    else
        echo -e "${ROJO}   ❌ Error instalando Node.js${RESET}"
    fi
fi
echo ""

# VERIFICAR Python
echo -e "${AMARILLO}[2/8] Verificando Python...${RESET}"
if command -v python &> /dev/null; then
    PYTHON_OK=1
    echo -e "${VERDE}   ✅ Python ya está instalado${RESET}"
else
    echo -e "${AMARILLO}   ⚠️ Python no encontrado, instalando...${RESET}"
    pkg install -y python
    if command -v python &> /dev/null; then
        PYTHON_OK=1
        echo -e "${VERDE}   ✅ Python instalado${RESET}"
    else
        echo -e "${ROJO}   ❌ Error instalando Python${RESET}"
    fi
fi
echo ""

# VERIFICAR Git
echo -e "${AMARILLO}[3/8] Verificando Git...${RESET}"
if command -v git &> /dev/null; then
    GIT_OK=1
    echo -e "${VERDE}   ✅ Git ya está instalado${RESET}"
else
    echo -e "${AMARILLO}   ⚠️ Git no encontrado, instalando...${RESET}"
    pkg install -y git
    if command -v git &> /dev/null; then
        GIT_OK=1
        echo -e "${VERDE}   ✅ Git instalado${RESET}"
    else
        echo -e "${ROJO}   ❌ Error instalando Git${RESET}"
    fi
fi
echo ""

# VERIFICAR wget
echo -e "${AMARILLO}[4/8] Verificando wget...${RESET}"
if command -v wget &> /dev/null; then
    echo -e "${VERDE}   ✅ wget ya está instalado${RESET}"
else
    echo -e "${AMARILLO}   ⚠️ wget no encontrado, instalando...${RESET}"
    pkg install -y wget
fi
echo ""

# VERIFICAR/INSTALAR DEPENDENCIAS NODE.JS (BAILEYS)
echo -e "${AMARILLO}[5/8] Instalando dependencias Node.js...${RESET}"
if [ -f "package.json" ]; then
    npm install
    if [ -d "node_modules/@whiskeysockets/baileys" ]; then
        BAILEYS_OK=1
        echo -e "${VERDE}   ✅ Baileys instalado correctamente${RESET}"
    else
        echo -e "${ROJO}   ❌ Error instalando Baileys${RESET}"
    fi
else
    echo -e "${ROJO}   ❌ No se encuentra package.json${RESET}"
fi
echo ""

# VERIFICAR VOSK
echo -e "${AMARILLO}[6/8] Verificando Vosk...${RESET}"

# Instalar módulo Vosk (versión correcta)
if [ ! -d "node_modules/vosk" ]; then
    echo -e "${AMARILLO}   ⚠️ Instalando módulo Vosk...${RESET}"
    npm install vosk@0.3.43
fi

# Descargar modelo español pequeño
if [ ! -d "vosk-model-small-es-0.42" ]; then
    echo -e "${AMARILLO}   ⚠️ Descargando modelo Vosk (40MB)...${RESET}"
    wget -O vosk-model-small-es-0.42.zip https://alphacephei.com/vosk/models/vosk-model-small-es-0.42.zip
    unzip vosk-model-small-es-0.42.zip
    rm vosk-model-small-es-0.42.zip
fi

if [ -d "node_modules/vosk" ] && [ -d "vosk-model-small-es-0.42" ]; then
    VOSK_OK=1
    echo -e "${VERDE}   ✅ Vosk instalado correctamente${RESET}"
else
    echo -e "${ROJO}   ❌ Error instalando Vosk${RESET}"
    echo -e "${AMARILLO}   ⚠️ Continuando sin Vosk (sin comandos de voz)${RESET}"
fi
echo ""

# VERIFICAR MODELO IA (Phi-2 - no requiere autenticación)
echo -e "${AMARILLO}[7/8] Verificando modelo IA...${RESET}"
if [ ! -f "modelo.gguf" ]; then
    echo -e "${AMARILLO}   ⚠️ Descargando modelo (350MB)...${RESET}"
    wget -O modelo.gguf https://huggingface.co/microsoft/phi-2/resolve/main/phi-2.Q4_K_M.gguf
    if [ $? -eq 0 ]; then
        MODELO_OK=1
        echo -e "${VERDE}   ✅ Modelo descargado${RESET}"
    else
        echo -e "${ROJO}   ❌ Error descargando modelo${RESET}"
        echo -e "${AMARILLO}   ⚠️ Continuando sin IA local${RESET}"
    fi
else
    MODELO_OK=1
    echo -e "${VERDE}   ✅ Modelo ya existe${RESET}"
fi
echo ""

# VERIFICAR sesión de WhatsApp
echo -e "${AMARILLO}[8/8] Verificando sesión de WhatsApp...${RESET}"
if [ -d "auth_info" ] && [ -f "auth_info/creds.json" ]; then
    if [ -s "auth_info/creds.json" ]; then
        SESION_OK=1
        echo -e "${VERDE}   ✅ Sesión existente encontrada${RESET}"
    else
        echo -e "${ROJO}   ❌ Archivo de credenciales vacío${RESET}"
        rm -rf auth_info
    fi
else
    echo -e "${AMARILLO}   ⚠️ No hay sesión guardada${RESET}"
fi
echo ""

# VERIFICAR configuración de números
echo -e "${AMARILLO} Verificando configuración de números...${RESET}"
if [ -f "config.json" ]; then
    DUENO=$(grep -o '"dueno":"[^"]*"' config.json | cut -d '"' -f4)
    BOT=$(grep -o '"bot":"[^"]*"' config.json | cut -d '"' -f4)
    if [ -n "$DUENO" ] && [ -n "$BOT" ]; then
        echo -e "${VERDE}   ✅ Configuración existente: Dueño: $DUENO${RESET}"
    else
        echo -e "${ROJO}   ❌ Archivo config.json corrupto${RESET}"
        rm -f config.json
    fi
else
    echo -e "${AMARILLO}   ⚠️ No hay configuración de números${RESET}"
fi
echo ""

# Si no hay config.json, pedir números
if [ ! -f "config.json" ]; then
    echo -e "${AMARILLO}📱 CONFIGURACIÓN INICIAL DE NÚMEROS${RESET}"
    echo ""
    echo "Ingresa el número del DUEÑO (el que dará instrucciones):"
    echo "Ejemplo: 5215512345678"
    read -p "➤ " NUMERO_DUENO
    echo ""
    echo "Ingresa el número del BOT (el que contestará a clientes):"
    echo "Ejemplo: 5215512345679"
    read -p "➤ " NUMERO_BOT
    echo ""
    
    echo "{\"dueno\":\"$NUMERO_DUENO\",\"bot\":\"$NUMERO_BOT\",\"familiares\":{},\"menu\":{\"desayunos\":[],\"comida\":[]}}" > config.json
    echo -e "${VERDE}✅ Configuración guardada${RESET}"
    echo ""
fi

# Mostrar resumen
echo -e "${AZUL}====================================${RESET}"
echo -e "${VERDE}📊 RESUMEN DE INSTALACIÓN${RESET}"
echo -e "${AZUL}====================================${RESET}"
echo ""
[ $NODE_OK -eq 1 ] && echo -e "${VERDE}✅ Node.js: Instalado${RESET}" || echo -e "${ROJO}❌ Node.js: No instalado${RESET}"
[ $PYTHON_OK -eq 1 ] && echo -e "${VERDE}✅ Python: Instalado${RESET}" || echo -e "${ROJO}❌ Python: No instalado${RESET}"
[ $GIT_OK -eq 1 ] && echo -e "${VERDE}✅ Git: Instalado${RESET}" || echo -e "${ROJO}❌ Git: No instalado${RESET}"
[ $BAILEYS_OK -eq 1 ] && echo -e "${VERDE}✅ Baileys: Instalado${RESET}" || echo -e "${ROJO}❌ Baileys: No instalado${RESET}"
[ $VOSK_OK -eq 1 ] && echo -e "${VERDE}✅ Vosk: Instalado${RESET}" || echo -e "${AMARILLO}⚠️ Vosk: No instalado${RESET}"
[ $MODELO_OK -eq 1 ] && echo -e "${VERDE}✅ Modelo IA: Instalado${RESET}" || echo -e "${AMARILLO}⚠️ Modelo IA: No instalado${RESET}"
[ $SESION_OK -eq 1 ] && echo -e "${VERDE}✅ Sesión WhatsApp: Activa${RESET}" || echo -e "${AMARILLO}⚠️ Sesión WhatsApp: Nueva${RESET}"
echo ""

# Iniciar bot
echo -e "${AZUL}====================================${RESET}"
echo -e "${VERDE}🚀 INICIANDO BOT...${RESET}"
echo -e "${AZUL}====================================${RESET}"
echo ""
sleep 2

node bot.js
