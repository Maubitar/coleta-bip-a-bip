// Controle de acesso simples à Área do Gerente (Consolidador) — não é criptografia
// forte, é uma barreira de UX: a senha nunca fica em texto puro no código-fonte nem
// no banco (guardamos hash SHA-256 + salt aleatório, via Web Crypto nativa do navegador).
// Isso NÃO impede alguém com acesso ao DevTools de ler os dados do IndexedDB — é apenas
// uma trava de acesso casual, como pedido.
import { getConfig, setConfig } from './db.js';

const CHAVE_HASH = 'senhaGerenteHash';
const CHAVE_SALT = 'senhaGerenteSalt';

function paraHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function gerarSalt() {
  const arr = crypto.getRandomValues(new Uint8Array(16));
  return paraHex(arr.buffer);
}

async function hashSenha(senha, salt) {
  const dados = new TextEncoder().encode(`${salt}:${senha}`);
  const buffer = await crypto.subtle.digest('SHA-256', dados);
  return paraHex(buffer);
}

export async function senhaGerenteConfigurada() {
  return (await getConfig(CHAVE_HASH, null)) !== null;
}

export async function definirSenhaGerente(novaSenha) {
  const salt = gerarSalt();
  const hash = await hashSenha(novaSenha, salt);
  await setConfig(CHAVE_SALT, salt);
  await setConfig(CHAVE_HASH, hash);
}

export async function verificarSenhaGerente(senha) {
  const salt = await getConfig(CHAVE_SALT, null);
  const hashArmazenado = await getConfig(CHAVE_HASH, null);
  if (!salt || !hashArmazenado) return false;
  const hash = await hashSenha(senha, salt);
  return hash === hashArmazenado;
}
