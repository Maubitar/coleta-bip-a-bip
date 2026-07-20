// Helpers de UI reaproveitados entre páginas: toast e modal simples.

export function toast(mensagem, tipo = '') {
  const container = document.getElementById('toastContainer') || document.body;
  const el = document.createElement('div');
  el.className = 'toast' + (tipo ? ' ' + tipo : '');
  el.textContent = mensagem;
  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 250);
  }, 2600);
}

// Retorna uma Promise que resolve com o valor confirmado, ou null se cancelado.
export function abrirModal(htmlConteudo, { onAbrir } = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `<div class="modal-box">${htmlConteudo}</div>`;
    document.body.appendChild(overlay);

    function fechar(valor) {
      overlay.remove();
      document.removeEventListener('keydown', onEsc, true);
      resolve(valor);
    }
    function onEsc(ev) {
      if (ev.key === 'Escape') { ev.preventDefault(); fechar(null); }
    }
    document.addEventListener('keydown', onEsc, true);
    overlay.addEventListener('click', (ev) => { if (ev.target === overlay) fechar(null); });

    if (onAbrir) onAbrir(overlay, fechar);
  });
}

export function confirmar(mensagem) {
  return new Promise((resolve) => {
    abrirModal(`
      <h3>${mensagem}</h3>
      <div class="row" style="margin-top:1em">
        <button data-acao="nao" class="ghost">Cancelar</button>
        <button data-acao="sim" class="danger">Confirmar</button>
      </div>
    `, {
      onAbrir(overlay, fechar) {
        overlay.querySelector('[data-acao="sim"]').addEventListener('click', () => fechar(true));
        overlay.querySelector('[data-acao="nao"]').addEventListener('click', () => fechar(false));
      }
    }).then(resolve);
  });
}
