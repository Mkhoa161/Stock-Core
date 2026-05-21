#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Building Lambda bundle from $BACKEND_DIR..."

mkdir -p "$BACKEND_DIR/dist"

npx esbuild "$BACKEND_DIR/src/lambda/dailyDataCollector.ts" \
  --bundle \
  --platform=node \
  --target=node20 \
  --external:pg-native \
  --banner:js="const{File:_F}=require('buffer');if(typeof globalThis.File==='undefined'){globalThis.File=_F;}" \
  --outfile="$BACKEND_DIR/dist/lambda-handler.js"

cd "$BACKEND_DIR/dist"
rm -f lambda.zip
zip lambda.zip lambda-handler.js

echo "Lambda bundle created: $BACKEND_DIR/dist/lambda.zip"
ls -lh "$BACKEND_DIR/dist/lambda.zip"
