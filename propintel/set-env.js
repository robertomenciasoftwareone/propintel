// Script prebuild/postbuild: gestiona la inyección de GEMINI_API_KEY
// en environment.production.ts sin exponer la clave en el repositorio.
//
// Uso:
//   node set-env.js          → sustituye %%GEMINI_API_KEY%% con el valor real
//   node set-env.js --restore → restaura el placeholder (ejecutado en postbuild)
//
// En Vercel: define GEMINI_API_KEY en Settings → Environment Variables.
// En local:  crea propintel/.env con GEMINI_API_KEY=tu_clave (.gitignore lo excluye).

const fs = require('fs');
const path = require('path');

const PLACEHOLDER = '%%GEMINI_API_KEY%%';
const envFile = path.join(__dirname, 'src/environments/environment.production.ts');
const isRestore = process.argv.includes('--restore');

if (isRestore) {
  // Postbuild: restaurar el placeholder para que git no vea la key
  let content = fs.readFileSync(envFile, 'utf8');
  // Reemplazar cualquier valor real con el placeholder
  content = content.replace(/geminiApiKey: '(?!%%)[^']*'/, `geminiApiKey: '${PLACEHOLDER}'`);
  fs.writeFileSync(envFile, content, 'utf8');
  console.log('[set-env] Placeholder restaurado en environment.production.ts');
  process.exit(0);
}

// Prebuild: cargar .env local si existe
const dotenvPath = path.join(__dirname, '.env');
if (fs.existsSync(dotenvPath)) {
  fs.readFileSync(dotenvPath, 'utf8')
    .split('\n')
    .forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const idx = trimmed.indexOf('=');
      if (idx === -1) return;
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (key && !process.env[key]) process.env[key] = val;
    });
}

const geminiKey = process.env.GEMINI_API_KEY || '';
if (!geminiKey) {
  console.warn('[set-env] ADVERTENCIA: GEMINI_API_KEY no definida. El asistente IA no funcionará en producción.');
}

let content = fs.readFileSync(envFile, 'utf8');
content = content.replace(PLACEHOLDER, geminiKey);
fs.writeFileSync(envFile, content, 'utf8');
console.log('[set-env] environment.production.ts actualizado con GEMINI_API_KEY.');
