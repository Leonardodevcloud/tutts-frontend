#!/usr/bin/env node

/**
 * Script de Build - Sistema Tutts
 * 
 * Atualiza automaticamente a versão do Service Worker antes do deploy.
 * 
 * Uso:
 *   node build.js
 *   npm run build (se configurado no package.json)
 */

const fs = require('fs');
const path = require('path');

// Gera versão baseada em timestamp (YYYYMMDD_HHMMSS)
function generateVersion() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

// Atualiza a versão no arquivo sw.js
function updateServiceWorker(version) {
  const swPath = path.join(__dirname, 'sw.js');
  
  if (!fs.existsSync(swPath)) {
    console.error('❌ Arquivo sw.js não encontrado!');
    process.exit(1);
  }
  
  let content = fs.readFileSync(swPath, 'utf8');
  
  // Regex para encontrar a linha CACHE_VERSION
  const versionRegex = /const CACHE_VERSION = ['"][^'"]+['"]/;
  
  if (!versionRegex.test(content)) {
    console.error('❌ CACHE_VERSION não encontrado no sw.js!');
    process.exit(1);
  }
  
  // Substitui a versão
  content = content.replace(
    versionRegex,
    `const CACHE_VERSION = '${version}'`
  );
  
  fs.writeFileSync(swPath, content);
  console.log(`✅ sw.js atualizado para versão: ${version}`);
}

// Cria/atualiza arquivo de versão (útil para debug)
function createVersionFile(version) {
  const versionInfo = {
    version: version,
    buildTime: new Date().toISOString(),
    buildTimeBrasilia: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  };
  
  const versionPath = path.join(__dirname, 'version.json');
  fs.writeFileSync(versionPath, JSON.stringify(versionInfo, null, 2));
  console.log(`✅ version.json criado`);
}

// Executa o build
function build() {
  console.log('🔧 Iniciando build do Sistema Tutts...\n');
  
  const version = generateVersion();
  console.log(`📦 Nova versão: ${version}`);
  console.log(`🕐 Build em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}\n`);
  
  updateServiceWorker(version);
  createVersionFile(version);
  
  console.log('\n✅ Build concluído com sucesso!');
  console.log('📤 Agora faça o deploy para Vercel:\n');
  console.log('   git add .');
  console.log('   git commit -m "Build v' + version + '"');
  console.log('   git push');
  console.log('\n🚀 Ou se usa Vercel CLI: vercel --prod');
}

// Executa
build();
