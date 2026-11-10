// Página inicial: título + resultados da pesquisa (a caixa fica na barra do topo).
import { mostrarResultados } from "../busca/busca.js";
import { Store } from "../nucleo/store.js";
import { Auth } from "../nucleo/auth.js";
import { esc } from "../nucleo/helpers.js";
import { abrirModal } from "../componentes/modal.js";

const ICONE_CADEADO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';

const ICONE_CURSO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11.5V16c0 1.2 2.7 3 6 3s6-1.8 6-3v-4.5"/><path d="M22 9v6"/></svg>';

const svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;

// Cards dos sistemas na seção "Cursos" da página inicial (ícone + nome + descrição).
// O texto e o ícone de cada sistema ficam aqui. A chave é o código ou o nome do sistema no banco
// (sem acento, espaço ou maiúscula). Sistema novo sem entrada aqui usa o ícone padrão e a descrição em branco.
const SISTEMAS_INFO = {
  powerstock: { descricao: "Controle de estoque, entradas, saídas e inventário sempre em dia. Aprenda a cadastrar produtos e acompanhar tudo em tempo real.",
    icone: svg('<path d="M2.5 3.5h2.7l2.1 11.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1l1.6-6.6H6"/><circle cx="9.5" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/>') },
  powerchef: { descricao: "Gestão completa para restaurantes e lanchonetes: pedidos, cardápio, mesas e caixa. Do básico ao uso avançado do sistema.",
    icone: svg('<path d="M7 14a4 4 0 1 1 1.5-7.7A4 4 0 0 1 15.5 6 4 4 0 1 1 17 14z"/><path d="M7 14v6h10v-6M7 17h10"/>') },
  posto: { descricao: "Sistema para postos de combustível: abastecimentos, bombas, conveniência e fechamento de caixa, explicados passo a passo.",
    icone: svg('<path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M4 21h12M8 8h4"/><path d="M15 9h2a2 2 0 0 1 2 2v5a1.5 1.5 0 0 0 3 0V9l-3-3"/>') }
};
const chave = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "").replace(/^powestock$/, "powerstock");
const infoSistema = (c) => SISTEMAS_INFO[chave(c.id)] || SISTEMAS_INFO[chave(c.nome)] || { descricao: "", icone: ICONE_CURSO };

// Seção "Cursos" da página inicial: um card para cada sistema (Power Stock, Power Chef, Posto...).
// Clicar no card abre direto a página de cursos daquele sistema.
// Sistema não liberado para o cliente aparece com cadeado e abre o aviso "Treinamento não liberado".
function desenharCursos() {
  const sec = document.getElementById("cursos-home");
  const abas = document.getElementById("cursos-home-abas");
  const sistemas = Store.categorias();
  sec.hidden = false;

  abas.innerHTML = sistemas.map(c => {
    const info = infoSistema(c);
    const liberado = Auth.temAcesso(c.id);
    return `
      <a class="curso-card sistema-card${liberado ? "" : " bloqueado"}" href="#/cursos/${esc(c.id)}"${liberado ? "" : " data-bloqueado"}>
        <div class="curso-card-icone">${info.icone}</div>
        <h3>${esc(c.nome)}</h3>
        ${info.descricao ? `<p>${esc(info.descricao)}</p>` : ""}
        ${liberado
          ? `<span class="curso-card-botao">Acessar treinamento <span aria-hidden="true">→</span></span>`
          : `<span class="curso-card-trava">${ICONE_CADEADO} Não liberado</span>`}
      </a>`;
  }).join("");
}

export function viewHome() {
  desenharCursos();
  // ao voltar para a página inicial a pesquisa começa limpa (sem sobrar texto nem mensagem da busca anterior)
  const q = document.getElementById("q");
  if (q) q.value = "";
  mostrarResultados("");
}

export function iniciarBuscaInicio() {
  const q = document.getElementById("q");

  // sistema bloqueado na página inicial: mostra o aviso em vez de abrir
  document.getElementById("cursos-home-abas").addEventListener("click", (e) => {
    if (e.target.closest("[data-bloqueado]")) { e.preventDefault(); abrirModal(); }
  });
  if (!q) return;   // a pesquisa saiu do site: não há mais barra para ligar
  const naHome = () => (location.hash.slice(1) || "/") === "/";
  const naBusca = () => location.hash.startsWith("#/busca/");
  let espera = null;
  // abre/atualiza a página de resultados sem empilhar histórico a cada letra
  function pesquisar(texto) {
    const alvo = "#/busca/" + encodeURIComponent(texto);
    if (naBusca()) {
      history.replaceState(null, "", alvo);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    } else location.hash = alvo;
  }

  // Resultados aparecem enquanto você digita (sem precisar apertar Enter)
  q.addEventListener("input", () => {
    clearTimeout(espera);
    const t = q.value.trim();
    if (!t) { if (naBusca()) location.hash = "#/"; else if (naHome()) mostrarResultados(""); return; }
    if (t.length < 2) return; // com 1 letra ainda é cedo
    espera = setTimeout(() => pesquisar(t), 350);
  });

  q.addEventListener("keydown", (e) => {
    // Enter: pesquisa na hora, sem esperar
    if (e.key === "Enter") {
      e.preventDefault();
      clearTimeout(espera);
      const t = q.value.trim();
      if (t) pesquisar(t);
    }
    // Esc limpa a pesquisa
    if (e.key === "Escape") {
      clearTimeout(espera);
      q.value = "";
      if (naBusca()) location.hash = "#/"; else if (naHome()) mostrarResultados("");
    }
  });
}