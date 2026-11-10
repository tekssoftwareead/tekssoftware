// Janela de pesquisa (do site 1): abre pelo botão "Pesquisa" do menu ou com Ctrl+K (Cmd+K no Mac).
// Mostra os resultados na hora, enquanto a pessoa digita. Enter abre o primeiro resultado.
// No fim da lista há um atalho para a pesquisa completa (que também procura nos manuais).
import { Auth } from "../nucleo/auth.js";
import { esc, normTexto } from "../nucleo/helpers.js";
import { buscarTudo, htmlResultados, totalResultados } from "../busca/busca.js";

let overlay, campo, box;

function mostrar(termo) {
  const t = String(termo || "").trim();
  const q = normTexto(t);

  if (!q) {
    box.innerHTML = '<p class="res-vazio">Digite para pesquisar aulas, cursos, artigos e sistemas.</p>';
    return;
  }

  const r = buscarTudo(q);
  const completa = `<a class="pesq-completa" href="#/busca/${encodeURIComponent(t)}">Ver todos os resultados, incluindo os manuais →</a>`;

  box.innerHTML = totalResultados(r)
    ? htmlResultados(r, q.length) + completa
    : `<p class="res-vazio">Nenhum resultado rápido para "${esc(t)}".</p>` + completa;
}

export function abrirBusca() {
  if (!overlay || !Auth.isLoggedIn()) return;
  // no celular o botão fica dentro do menu: fecha o menu
  const nav = document.getElementById("nav");
  const menu = document.getElementById("menu");
  if (nav) nav.classList.remove("open");
  if (menu) menu.setAttribute("aria-expanded", false);

  overlay.hidden = false;
  mostrar(campo.value);
  campo.focus();
  campo.select();
}

export function fecharBusca() {
  if (!overlay) return;
  overlay.hidden = true;
  campo.value = "";
}

export function iniciarPesquisa() {
  overlay = document.getElementById("busca-overlay");
  campo = document.getElementById("pesq-q");
  box = document.getElementById("pesq-resultados");
  if (!overlay) return;

  document.getElementById("abrir-busca").addEventListener("click", abrirBusca);
  document.getElementById("busca-fechar").addEventListener("click", fecharBusca);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) fecharBusca(); });
  box.addEventListener("click", (e) => { if (e.target.closest("a")) fecharBusca(); });
  campo.addEventListener("input", () => mostrar(campo.value));

  // Enter abre o primeiro resultado (ou a pesquisa completa, se não houver nenhum)
  campo.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const primeiro = box.querySelector(".res-item") || box.querySelector(".pesq-completa");
    if (primeiro) {
      location.hash = primeiro.getAttribute("href");
      fecharBusca();
    }
  });

  // Esc fecha; Ctrl+K (ou Cmd+K) abre
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.hidden) fecharBusca();
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k" && Auth.isLoggedIn()) {
      e.preventDefault();
      abrirBusca();
    }
  });
}
