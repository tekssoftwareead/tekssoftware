// Peças reutilizadas nas telas de lista (artigos e cursos): busca da lista e filtro por sistema.
import { app } from "../nucleo/dom.js";
import { Store } from "../nucleo/store.js";
import { Auth } from "../nucleo/auth.js";
import { esc, normTexto } from "../nucleo/helpers.js";

// Filtra a lista conforme a pessoa digita em #busca
export function ligarBusca(fonte, desenhar, texto) {
  const busca = document.getElementById("busca");
  const lista = document.getElementById("lista");
  const vazio = document.getElementById("vazio");

  function redesenhar() {
    const t = normTexto(busca.value.trim());
    const itens = fonte().filter(i => normTexto(texto(i)).includes(t));
    lista.innerHTML = itens.map(desenhar).join("");
    vazio.hidden = itens.length > 0;
  }

  busca.addEventListener("input", redesenhar);
  redesenhar();
  return redesenhar;
}

export function chipsCategorias(comTodos = true) {
  return `<div class="filtros">
    ${comTodos ? '<button class="chip" data-cat="">Todos</button>' : ""}
    ${Store.categorias().filter(c => Auth.temAcesso(c.id)).map(c => `<button class="chip" data-cat="${esc(c.id)}">${esc(c.nome)}</button>`).join("")}
  </div>`;
}

// sel = { v: "id-da-categoria" } (objeto para a seleção poder mudar)
export function ligarChips(sel, redesenhar) {
  const chips = [].slice.call(app.querySelectorAll(".chip"));
  const marcar = () => chips.forEach(b => b.classList.toggle("ativo", b.dataset.cat === sel.v));
  chips.forEach(b => b.addEventListener("click", () => { sel.v = (sel.v === b.dataset.cat && b.dataset.cat !== "") ? "" : b.dataset.cat; marcar(); redesenhar(); }));
  marcar();
}