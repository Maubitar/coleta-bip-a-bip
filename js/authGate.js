// Gate de senha reaproveitável — usado por consolidador.html e corrigir.html.
// Assume os mesmos IDs de elementos em ambas as páginas: view-login, inputSenha,
// inputSenhaConfirmar, campoConfirmarSenha, loginInstrucao, lblSenha, loginErro, btnEntrar.
import { senhaGerenteConfigurada, definirSenhaGerente, verificarSenhaGerente } from './auth.js';

export function montarGateSenha({ viewLoginId = 'view-login', onLiberado }) {
  const viewLogin = document.getElementById(viewLoginId);
  const inputSenha = document.getElementById('inputSenha');
  const inputSenhaConfirmar = document.getElementById('inputSenhaConfirmar');
  const campoConfirmarSenha = document.getElementById('campoConfirmarSenha');
  const loginInstrucao = document.getElementById('loginInstrucao');
  const lblSenha = document.getElementById('lblSenha');
  const loginErro = document.getElementById('loginErro');
  const btnEntrar = document.getElementById('btnEntrar');

  let modoDefinirSenha = false;

  async function iniciar() {
    modoDefinirSenha = !(await senhaGerenteConfigurada());
    if (modoDefinirSenha) {
      loginInstrucao.textContent = 'Nenhuma senha definida ainda. Crie a senha de acesso à área do Gerente (só ela mostra valores em R$).';
      lblSenha.textContent = 'Nova senha';
      campoConfirmarSenha.classList.remove('hidden');
      btnEntrar.textContent = 'Definir e entrar';
    } else {
      loginInstrucao.textContent = 'Digite a senha do Gerente para continuar.';
      lblSenha.textContent = 'Senha';
      campoConfirmarSenha.classList.add('hidden');
      btnEntrar.textContent = 'Entrar';
    }
    inputSenha.value = '';
    inputSenhaConfirmar.value = '';
    loginErro.textContent = '';
    inputSenha.focus();
  }

  async function tentarEntrar() {
    loginErro.textContent = '';
    const senha = inputSenha.value;
    if (!senha || senha.length < 4) { loginErro.textContent = 'A senha precisa ter pelo menos 4 caracteres.'; return; }

    if (modoDefinirSenha) {
      if (senha !== inputSenhaConfirmar.value) { loginErro.textContent = 'As senhas não conferem.'; return; }
      await definirSenhaGerente(senha);
      viewLogin.classList.add('hidden');
      onLiberado();
      return;
    }

    const ok = await verificarSenhaGerente(senha);
    if (ok) { viewLogin.classList.add('hidden'); onLiberado(); return; }
    loginErro.textContent = 'Senha incorreta.';
    inputSenha.value = '';
    inputSenha.focus();
  }

  btnEntrar.addEventListener('click', tentarEntrar);
  inputSenha.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && campoConfirmarSenha.classList.contains('hidden')) tentarEntrar(); });
  inputSenhaConfirmar.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') tentarEntrar(); });

  iniciar();
}
