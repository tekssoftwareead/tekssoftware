// Elementos principais da página e trocas de tela.
export const loginView = document.getElementById("login-view");
export const homeView = document.getElementById("home-view");
export const app = document.getElementById("app");
export const viewHomeEl = document.getElementById("view-home");

// true = mostra a home (do HTML); false = mostra a área onde as outras telas são desenhadas
export function mostrar(home) {
  viewHomeEl.hidden = !home;
  app.hidden = home;
}

export function naoEncontrado() {
  mostrar(false);
  app.innerHTML = '<p class="empty">Conteúdo não encontrado. <a class="voltar" href="#/">Voltar ao início</a></p>';
}

export function limparRota() {
  try { history.replaceState(null, "", location.pathname + location.search); }
  catch (e) { location.hash = ""; }
}
