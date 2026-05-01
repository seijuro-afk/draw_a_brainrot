@echo off
REM Install dependencies if needed, then start the Next.js dev server.
if not exist node_modules (
  echo Installing dependencies...
  npm install
  echo Installing bcryptjs, jsonwebtoken, and mongodb...
  npm install bcryptjs jsonwebtoken mongodb
)

REM Ensure required helper packages are installed.
echo Installing bcryptjs, jsonwebtoken, and mongodb...
npm install bcryptjs jsonwebtoken mongodb

echo Starting development server...
npm run dev
