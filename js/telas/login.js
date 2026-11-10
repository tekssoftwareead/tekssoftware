// Tela de login e cadastro.
import { sb } from "../config/supabase.js";
import { Auth, mensagemDeErro } from "../nucleo/auth.js";
import { limparRota } from "../nucleo/dom.js";
import { showView } from "../nucleo/rotas.js";

export function iniciarLogin() {
  const password = document.getElementById("password");
  const togglePassword = document.getElementById("toggle-password");
  const loginForm = document.getElementById("login-form");
  const email = document.getElementById("email");
  const errorBox = document.getElementById("login-error");
  const loginBtn = document.getElementById("login-button");
  const registerP = document.getElementById("register-p");
  let modoCadastro = false;

  function showError(msg, ok) {
    errorBox.textContent = msg;
    errorBox.classList.toggle("ok", !!ok);
    errorBox.hidden = false;
  }

  function atualizarModo() {
    loginBtn.textContent = modoCadastro ? "CRIAR CONTA" : "ENTRAR";
    password.autocomplete = modoCadastro ? "new-password" : "current-password";
    if (registerP) registerP.innerHTML = modoCadastro
      ? 'Já tem uma conta? <a href="#" id="toggle-modo">Entrar</a>'
      : 'Não tem uma conta? <a href="#" id="toggle-modo">Cadastrar</a>';
    errorBox.hidden = true;
  }

  // botão de tema da tela de login: mesmo tema (e mesma memória) do resto do site
  const temaLogin = document.getElementById("tema-login");
  if (temaLogin) temaLogin.addEventListener("click", () => {
    const escuro = !document.body.classList.contains("escuro");
    document.body.classList.toggle("escuro", escuro);
    try { localStorage.setItem("teks-tema", escuro ? "escuro" : "claro"); } catch (e) {}
  });

  togglePassword.addEventListener("click", () => {
    const show = password.type === "password";
    password.type = show ? "text" : "password";
    togglePassword.classList.toggle("mostrando", show);   // senha visível = olho fechado (clique para esconder)
    togglePassword.setAttribute("aria-label", show ? "Ocultar senha" : "Mostrar senha");
    togglePassword.title = show ? "Ocultar senha" : "Mostrar senha";
  });

  // o link "Cadastrar" foi tirado da tela: as contas são criadas pelo administrador (Painel admin › Usuários)
  if (registerP) registerP.addEventListener("click", (e) => {
    if (e.target.id !== "toggle-modo") return;
    e.preventDefault();
    modoCadastro = !modoCadastro;
    atualizarModo();
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorBox.hidden = true;

    const emailValue = email.value.trim();
    if (!/^\S+@\S+\.\S+$/.test(emailValue)) return showError("Digite um e-mail válido.");
    if (password.value.length < 6) return showError("A senha precisa ter pelo menos 6 caracteres.");

    loginBtn.disabled = true;
    try {
      let r;
      if (modoCadastro) {
        r = await sb.auth.signUp({ email: emailValue, password: password.value });
        if (r.error) throw r.error;
        if (!r.data.session) {
          modoCadastro = false;
          atualizarModo();
          showError("Conta criada! Confirme pelo e-mail que enviamos e depois entre.", true);
          return;
        }
      } else {
        r = await sb.auth.signInWithPassword({ email: emailValue, password: password.value });
        if (r.error) throw r.error;
      }
      await Auth.entrar(r.data.session);
      try { sessionStorage.setItem("teks_logado_aba", "1"); } catch (x) {}   // recarregar esta aba não pede login de novo
      password.value = "";
      limparRota();
      showView();
    } catch (e) {
      console.error("Erro no login:", e);
      // entrou no Supabase mas a conta não está pronta no portal (sem perfil, inativa...): não deixa sessão pela metade
      if (/perfil-nao-encontrado|conta-inativa/.test(String(e && e.message))) { try { await sb.auth.signOut(); } catch (x) {} }
      showError(mensagemDeErro(e));
    } finally {
      loginBtn.disabled = false;
    }
  });
}
