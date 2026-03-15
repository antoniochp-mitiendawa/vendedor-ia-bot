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
SHERPA_OK=0
MODELO_OK=0
SESION_OK=0

# VERIFICAR Node.js
echo -e "${AMARILLO}[1/8] Verificando Node.js...${RESET}"
if command -v node &> /dev/null; then
    NODE_OK=1
    echo -e "${VERDE}   ✅ Node.js ya está instalado${RESET}"
else
    echo -e "${AMARILLO}   ⚠️ Node.js no encontrado, instalando nodejs-lts...${RESET}"
    pkg install -y nodejs-lts
    if command -v node &> /dev/null; then
        NODE_OK=1
        echo -e "${VERDE}   ✅ Node.js LTS instalado${RESET}"
    else
        echo -e "${ROJO}   ❌ Error instalando Node.js${RESET}"
    fi
fi
echo ""

# VERIFICAR Python (opcional)
echo -e "${AMARILLO}[2/8] Verificando Python...${RESET}"
if command -v python &> /dev/null; then
    PYTHON_OK=1
    echo -e "${VERDE}   ✅ Python ya está instalado${RESET}"
else
    echo -e "${AMARILLO}   ⚠️ Python no encontrado (opcional, se omitirá)${RESET}"
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

# INSTALAR DEPENDENCIAS NODE.JS (PRIMERO BAILEYS SOLO)
echo -e "${AMARILLO}[5/8] Instalando dependencias Node.js...${RESET}"

# Instalar Baileys y otras dependencias básicas
npm install @whiskeysockets/baileys
npm install @hapi/boom
npm install qrcode-terminal
npm install axios
npm install pino

if [ -d "node_modules/@whiskeysockets/baileys" ]; then
    BAILEYS_OK=1
    echo -e "${VERDE}   ✅ Baileys instalado correctamente${RESET}"
else
    echo -e "${ROJO}   ❌ Error instalando Baileys${RESET}"
fi
echo ""

# INSTALAR SHERPANCNN (NUEVO - RECONOCIMIENTO DE VOZ)
echo -e "${AMARILLO}[6/8] Instalando SherpaNcnn...${RESET}"

# Instalar el paquete de Node.js para sherpa-ncnn
npm install sherpa-ncnn

if [ -d "node_modules/sherpa-ncnn" ]; then
    echo -e "${VERDE}   ✅ SherpaNcnn instalado correctamente${RESET}"
    
    # Descargar modelo en español para sherpa-ncnn
    echo -e "${AMARILLO}   ⚠️ Descargando modelo de voz (35MB)...${RESET}"
    wget -O sherpa-model.zip https://github.com/k2-fsa/sherpa-ncnn/releases/download/models/sherpa-ncnn-streaming-zipformer-es-2024-02-08.zip
    unzip sherpa-model.zip
    rm sherpa-model.zip
    
    if [ -d "sherpa-ncnn-streaming-zipformer-es-2024-02-08" ]; then
        SHERPA_OK=1
        echo -e "${VERDE}   ✅ Modelo Sherpa descargado${RESET}"
    else
        echo -e "${ROJO}   ❌ Error descargando modelo Sherpa${RESET}"
    fi
else
    echo -e "${ROJO}   ❌ Error instalando SherpaNcnn${RESET}"
    echo -e "${AMARILLO}   ⚠️ Continuando sin reconocimiento de voz${RESET}"
fi
echo ""

# VERIFICAR MODELO IA (TinyLlama - opcional)
echo -e "${AMARILLO}[7/8] Verificando modelo IA (opcional)...${RESET}"
if [ ! -f "modelo.gguf" ]; then
    echo -e "${AMARILLO}   ⚠️ Modelo no encontrado (opcional, se omitirá)${RESET}"
    echo -e "${AMARILLO}   Puedes descargarlo después con: wget [URL]${RESET}"
else
    MODELO_OK=1
    echo -e "${VERDE}   ✅ Modelo IA ya existe${RESET}"
fi
echo ""

# VERIFICAR sesión de WhatsApp
echo -e "${AMARILLO}[8/8] Verificando sesión de WhatsApp...${RESET}"
if [ -d "auth_info" ] && [ -f "auth_info/creds.json" ]; then
    if [ -s "auth_info/creds.json" ]; then
        SESION_OK=1
        echo -e "${VERDE}   ✅ Sesión existente encontrada${RESET}"
    else
        echo -e "${ROJO}   ❌ Archivo vacío${RESET}"
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
    echo -e "${AMARILLO}   ⚠️ No hay configuración${RESET}"
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
[ $PYTHON_OK -eq 1 ] && echo -e "${VERDE}✅ Python: Instalado${RESET}" || echo -e "${AMARILLO}⚠️ Python: No instalado${RESET}"
[ $GIT_OK -eq 1 ] && echo -e "${VERDE}✅ Git: Instalado${RESET}" || echo -e "${ROJO}❌ Git: No instalado${RESET}"
[ $BAILEYS_OK -eq 1 ] && echo -e "${VERDE}✅ Baileys: Instalado${RESET}" || echo -e "${ROJO}❌ Baileys: No instalado${RESET}"
[ $SHERPA_OK -eq 1 ] && echo -e "${VERDE}✅ SherpaNcnn: Instalado${RESET}" || echo -e "${AMARILLO}⚠️ SherpaNcnn: No instalado${RESET}"
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
