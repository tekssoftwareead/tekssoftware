// Endereços (#/cursos, #/aula/123...) e qual tela abre em cada um.
// Para criar uma tela nova: crie o arquivo em js/telas e adicione uma linha em "rotas".
// O painel admin só abre para quem tem o perfil "admin" (tabela perfis do banco).
import { Auth } from "./auth.js";
import { loginView, homeView, app, viewHomeEl, mostrar, naoEncontrado } from "./dom.js";
import { viewHome } from "../telas/inicio.js";
import { viewArtigos, viewArtigo } from "../telas/artigos.js";
import { viewCursos, viewCurso } from "../telas/cursos.js";
import { viewAula } from "../telas/aula.js";
import { viewBusca } from "../telas/resultados.js";
import { viewAdmin } from "../telas/admin/painel.js";
import { fecharBusca } from "../componentes/pesquisa.js";
import { fecharModal } from "../componentes/modal.js";

// troca de página suave: a tela nova aparece com um fade rápido (veja .troca no geral.css)
function animar(el) {
  if (!el) return;
  el.classList.remove("troca");
  void el.offsetWidth;          // reinicia a animação
  el.classList.add("troca");
}

const rotas = [
  { padrao: /^\/$/, view: viewHome },
  { padrao: /^\/artigos(?:\/([\w-]+))?$/, view: viewArtigos },
  { padrao: /^\/artigo\/([\w-]+)$/, view: viewArtigo },
  { padrao: /^\/cursos(?:\/([\w-]+))?$/, view: viewCursos },
  { padrao: /^\/curso\/([\w-]+)$/, view: viewCurso },
  { padrao: /^\/aula\/([\w-]+)$/, view: viewAula },
  { padrao: /^\/busca\/(.*)$/, view: viewBusca },
  { padrao: /^\/admin(?:\/(\w+))?$/, view: viewAdmin, perfil: "admin" }
];

function marcarMenu(caminho) {
  const seg = caminho.split("/")[1] || "";
  const secao = { "": "home", artigos: "artigos", artigo: "artigos", cursos: "cursos", curso: "cursos", aula: "cursos" }[seg] || seg;
  document.querySelectorAll(".nav a[data-secao]").forEach(a =>
    a.classList.toggle("active", a.dataset.secao === secao));
}

export function rotear() {
  if (!Auth.isLoggedIn()) return;
  fecharBusca();
  fecharModal();
  const caminho = location.hash.slice(1) || "/";

  for (const r of rotas) {
    if (r.perfil && Auth.perfil() !== r.perfil) continue;
    const m = caminho.match(r.padrao);
    if (m) {
      // o formulário do admin (janela) não deve sobrar aberto ao trocar de tela
      const janela = document.getElementById("adm-overlay");
      if (janela) janela.remove();
      const aviso = document.getElementById("adm-toast");
      if (aviso && r.view !== viewAdmin) aviso.hidden = true;
      mostrar(r.view === viewHome);
      app.innerHTML = "";
      r.view.apply(null, m.slice(1));
      animar(r.view === viewHome ? viewHomeEl : app);
      marcarMenu(caminho);
      window.scrollTo({ top: 0, behavior: "instant" });
      return;
    }
  }
  naoEncontrado();
}

// Mostra a tela de login ou o site, conforme a pessoa esteja logada
export function showView() {
  const logged = Auth.isLoggedIn();
  loginView.hidden = logged;
  animar(logged ? homeView : loginView);
  homeView.hidden = !logged;

  if (logged) {
    document.querySelectorAll("[data-perfil]").forEach(el => {
      el.hidden = el.dataset.perfil !== Auth.perfil();
    });
    rotear();
  }
  window.scrollTo(0, 0);
}

export function iniciarRotas() {
  window.addEventListener("hashchange", rotear);
}
