// Ponto de partida do site: liga as peças e abre a tela certa.
import { sb } from "./config/supabase.js";
import { Auth } from "./nucleo/auth.js";
import { showView, iniciarRotas } from "./nucleo/rotas.js";
import { iniciarLogin } from "./telas/login.js?v=27";
import { iniciarBuscaInicio } from "./telas/inicio.js";
import { iniciarMenu } from "./componentes/menu.js?v=27";
import { carregarImagens } from "./componentes/imagens.js";
import { iniciarModal } from "./componentes/modal.js";
import { limparRota } from "./nucleo/dom.js";
import { mostrarStatus } from "./nucleo/status.js";

// ao abrir ou recarregar o site, sempre começa na página inicial (tira #/cursos, #/admin... do endereço)
if (location.hash) limparRota();

iniciarRotas();
iniciarLogin();
iniciarBuscaInicio();
iniciarMenu();
carregarImagens();
iniciarModal();

// Entrar no site (abrir o endereço, nova aba ou depois de fechar o navegador) sempre começa na tela de login.
// Recarregar a página (F5) depois de já ter feito login mantém a pessoa logada e abre a página inicial.
// (Para voltar a lembrar o login sempre, troque SEMPRE_PEDIR_LOGIN para false.)
const SEMPRE_PEDIR_LOGIN = true;
const logadoNestaAba = () => { try { return sessionStorage.getItem("teks_logado_aba") === "1"; } catch (e) { return false; } };

(async function iniciar() {
  try {
    if (SEMPRE_PEDIR_LOGIN && !logadoNestaAba()) {
      await sb.auth.signOut({ scope: "local" });
    } else {
      const { data } = await sb.auth.getSession();
      if (data.session) await Auth.entrar(data.session);
    }
  } catch (e) {
    // login salvo, mas a conta não pôde ser carregada (sem perfil, inativa, sem internet...): volta para o login
    console.error("Não foi possível restaurar o login:", e && (e.message || e));
  }
  showView();
  mostrarStatus();   // mostra no console (F12) se o back-end está funcionando
})();