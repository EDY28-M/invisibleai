#!/bin/bash
# Quita la cuarentena de Gatekeeper de InvisibleAI y la abre.
# Uso: doble clic en este archivo, o ejecutarlo desde Terminal.
# Solo es necesario la primera vez tras descargar la app desde Releases.

APP="/Applications/InvisibleAI.app"

if [ ! -d "$APP" ]; then
  echo "No se encontro $APP"
  echo "Arrastra primero InvisibleAI.app a la carpeta Aplicaciones y vuelve a ejecutar este script."
  read -r -p "Pulsa Enter para cerrar..."
  exit 1
fi

echo "Quitando la cuarentena de descarga de $APP ..."
xattr -cr "$APP"

echo "Listo. Abriendo InvisibleAI..."
open "$APP"
