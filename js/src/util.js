// Utilitários compartilhados — sem dependências externas.

export function uuid() {
  if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function agoraISO() {
  return new Date().toISOString();
}

// Formata para uso em nome de arquivo: YYYYMMDD_HHmmss
export function carimboArquivo(data = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return (
    data.getFullYear().toString() +
    p(data.getMonth() + 1) +
    p(data.getDate()) +
    '_' +
    p(data.getHours()) +
    p(data.getMinutes()) +
    p(data.getSeconds())
  );
}

// Formata para exibição: DD/MM/YYYY HH:mm:ss
export function formatarDataHora(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

// Sanitiza um trecho de texto para uso seguro em nome de arquivo.
export function limparParaArquivo(texto) {
  return String(texto || 'SEM_NOME')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase() || 'SEM_NOME';
}

const CHAVE_DISPOSITIVO = 'bipabip_maquina_id';

export function nomeDispositivoPadrao() {
  let existente = null;
  try {
    existente = localStorage.getItem(CHAVE_DISPOSITIVO);
  } catch (e) {
    existente = null;
  }
  if (existente) return existente;
  const sufixo = Math.random().toString(16).slice(2, 6).toUpperCase();
  const gerado = `PC-${sufixo}`;
  try {
    localStorage.setItem(CHAVE_DISPOSITIVO, gerado);
  } catch (e) {
    /* localStorage indisponível — segue sem persistir */
  }
  return gerado;
}

// Som distinto do bip normal — usado no alerta de leitura repetida anormal.
export function tocarAlerta() {
  try {
    const ctx = tocarBip._ctx || (tocarBip._ctx = new (window.AudioContext || window.webkitAudioContext)());
    [0, 0.14].forEach((atraso) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = 420;
      gain.gain.setValueAtTime(0.001, ctx.currentTime + atraso);
      gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + atraso + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + atraso + 0.12);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + atraso);
      osc.stop(ctx.currentTime + atraso + 0.13);
    });
  } catch (e) {
    /* áudio indisponível — ignora silenciosamente */
  }
}

export function tocarBip(sucesso = true) {
  try {
    const ctx = tocarBip._ctx || (tocarBip._ctx = new (window.AudioContext || window.webkitAudioContext)());
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = sucesso ? 880 : 220;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch (e) {
    /* áudio indisponível (ex.: sem interação do usuário ainda) — ignora silenciosamente */
  }
}

export function baixarArquivo(nome, conteudo, tipo = 'text/csv;charset=utf-8') {
  const blob = new Blob(['﻿' + conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// Aceita "45.90", "45,90" ou "1.234,56". Retorna 0 para valores vazios/inválidos
// (nunca lança erro — preço ausente não pode travar a importação da base).
export function parseNumeroBR(valor) {
  if (valor === null || valor === undefined) return 0;
  let s = String(valor).trim();
  if (s === '') return 0;
  s = s.replace(/[^\d,.-]/g, '');
  if (s.includes(',') && s.includes('.')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

export function formatarMoeda(valor) {
  return (Number(valor) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Verdadeiro se a distância de edição entre a e b é 0 ou 1 (1 substituição,
// inserção ou remoção). Evita Levenshtein completo — early-exit, O(tamanho).
export function distanciaEdicaoAteUm(a, b) {
  if (a === b) return true;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;

  if (la === lb) {
    let diferencas = 0;
    for (let i = 0; i < la; i++) {
      if (a[i] !== b[i]) {
        diferencas++;
        if (diferencas > 1) return false;
      }
    }
    return diferencas <= 1;
  }

  const menor = la < lb ? a : b;
  const maior = la < lb ? b : a;
  let i = 0;
  let j = 0;
  let pulos = 0;
  while (i < menor.length && j < maior.length) {
    if (menor[i] === maior[j]) {
      i++; j++;
    } else {
      j++;
      pulos++;
      if (pulos > 1) return false;
    }
  }
  return true;
}

export function debounce(fn, ms) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
