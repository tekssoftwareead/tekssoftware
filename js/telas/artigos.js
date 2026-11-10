// Telas de artigos: lista e leitura.
import { app, naoEncontrado } from "../nucleo/dom.js";
import { Store } from "../nucleo/store.js";
import { esc, paragrafos } from "../nucleo/helpers.js";
import { ligarBusca, chipsCategorias, ligarChips } from "../componentes/lista.js";
import { Auth } from "../nucleo/auth.js";
import { semAcesso } from "../componentes/modal.js";

// artigo sem sistema é para todos; com sistema, só para quem tem esse sistema liberado
const podeVer = (a) => !a.categoria_id || Auth.temAcesso(a.categoria_id);

function cardArtigo(a) {
  const cat = Store.categoria(a.categoria_id);
  return `
    <a class="aula-item" href="#/artigo/${esc(a.id)}">
      <span>${esc(a.titulo)}</span>
      <small>${esc((cat ? cat.nome + " • " : "") + (a.resumo || ""))}</small>
    </a>`;
}

export function viewArtigos(catId) {
  const sel = { v: catId || "" };

  app.innerHTML = `
    <section class="hero">
      <h1>Artigos</h1>
      <div class="search">
        <input id="busca" type="search" placeholder="Pesquisar artigos" aria-label="Pesquisar artigos" autocomplete="off">
      </div>
      ${chipsCategorias()}
    </section>
    <section class="band">
      <div class="lista-simples" id="lista"></div>
      <p class="empty" id="vazio" hidden>Nenhum artigo encontrado.</p>
    </section>`;

  const redesenhar = ligarBusca(
    () => Store.artigos(sel.v).filter(podeVer),
    cardArtigo,
    a => a.titulo + " " + (a.resumo || "") + " " + (a.conteudo || "")
  );
  ligarChips(sel, redesenhar);
}

export function viewArtigo(id) {
  const a = Store.artigo(id);
  if (!a) return naoEncontrado();
  if (!podeVer(a)) return semAcesso();
  const cat = Store.categoria(a.categoria_id);

  app.innerHTML = `
    <section class="pagina">
      <a class="voltar" href="#/artigos${a.categoria_id ? "/" + esc(a.categoria_id) : ""}">← Voltar</a>
      <h1>${esc(a.titulo)}</h1>
      ${cat ? `<span class="tag">${esc(cat.nome)}</span>` : ""}
      <div class="artigo-texto">${paragrafos(a.conteudo)}</div>
    </section>`;
}
