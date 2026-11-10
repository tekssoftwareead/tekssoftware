// Motor da pesquisa (lógica do site 1 + melhorias): procura em aulas, cursos, sistemas e artigos.
// Só mostra o que a pessoa tem liberado. Acentos e maiúsculas não importam.
// Usado na janela de pesquisa (botão "Pesquisa" / Ctrl+K), na página inicial e na página de resultados.
import { Store } from "../nucleo/store.js";
import { Auth } from "../nucleo/auth.js";
import { esc, escRe, normTexto } from "../nucleo/helpers.js";

/* nota 0 = começa com o texto, 1 = uma palavra começa com o texto,
   2 = contém (a partir de 3 letras) / todas as palavras no título, 3 = só na descrição */
function pontuar(texto, q) {
  const t = normTexto(texto || "");
  if (t.startsWith(q)) return { nota: 0, pos: 0 };
  const m = new RegExp("(^|[^a-z0-9])" + escRe(q)).exec(t);
  if (m) return { nota: 1, pos: m.index + m[1].length };
  if (q.length >= 3 && t.indexOf(q) > -1) return { nota: 2, pos: t.indexOf(q) };
  return null;
}

// Várias palavras ("cadastro de produtos"): acha mesmo fora de ordem e no singular/plural
function pontuarMulti(titulo, extra, q) {
  const p = pontuar(titulo, q);
  if (p) return p;
  if (q.length < 3) return null;

  const ws = q.split(/\s+/).filter(w => w.length > 2).map(w => w.length > 5 ? w.slice(0, -2) : w);
  if (!ws.length) return null;

  const t = normTexto(titulo || "");
  if (ws.every(w => t.includes(w))) return { nota: 2, pos: -1 };
  const tudo = t + " " + normTexto(extra || "");
  if (ws.every(w => tudo.includes(w))) return { nota: 3, pos: -1 };
  return null;
}

// q já normalizado (normTexto)
export function buscarTudo(q) {
  const res = { aulas: [], cursos: [], artigos: [], categorias: [] };
  const porNota = (a, b) => a.nota - b.nota || a.titulo.localeCompare(b.titulo);

  Store.aulasAtivas().forEach(a => {
    const m = Store.modulo(a.modulo_id);
    const c = Store.curso(m.curso_id);
    if (!Auth.temAcesso(c.categoria_id)) return;
    const p = pontuarMulti(a.titulo, a.descricao, q);
    if (!p) return;
    res.aulas.push({ tipo: "aula", titulo: a.titulo, sub: c.titulo + " • " + m.titulo, trecho: a.descricao || "", href: "#/aula/" + a.id, nota: p.nota, pos: p.pos });
  });

  Store.cursos().forEach(c => {
    if (!Auth.temAcesso(c.categoria_id)) return;
    const p = pontuarMulti(c.titulo, c.descricao, q);
    if (!p) return;
    const cat = Store.categoria(c.categoria_id);
    res.cursos.push({ tipo: "curso", titulo: c.titulo, sub: cat ? cat.nome : "", trecho: c.descricao || "", href: "#/curso/" + c.id, nota: p.nota, pos: p.pos });
  });

  Store.artigos().forEach(a => {
    if (a.categoria_id && !Auth.temAcesso(a.categoria_id)) return;
    const p = pontuarMulti(a.titulo, (a.resumo || "") + " " + (a.conteudo || ""), q);
    if (!p) return;
    const cat = Store.categoria(a.categoria_id);
    res.artigos.push({ tipo: "artigo", titulo: a.titulo, sub: cat ? cat.nome : "Artigo", trecho: a.resumo || a.conteudo || "", href: "#/artigo/" + a.id, nota: p.nota, pos: p.pos });
  });

  Store.categorias().forEach(c => {
    if (!Auth.temAcesso(c.id)) return;
    const p = pontuar(c.nome, q);
    if (!p) return;
    const n = Store.cursos(c.id).length;
    res.categorias.push({ tipo: "categoria", titulo: c.nome, sub: n + (n === 1 ? " curso" : " cursos"), trecho: "", href: "#/cursos/" + c.id, nota: p.nota, pos: p.pos });
  });

  Object.keys(res).forEach(k => res[k].sort(porNota));
  return res;
}

export const totalResultados = (r) => r.aulas.length + r.cursos.length + r.artigos.length + r.categorias.length;

// Marca a parte do título que bateu com a busca
function destacar(texto, nota, pos, tam) {
  if (nota > 2 || pos < 0 || normTexto(texto).length !== texto.length) return esc(texto);
  return esc(texto.slice(0, pos)) + "<mark>" + esc(texto.slice(pos, pos + tam)) + "</mark>" + esc(texto.slice(pos + tam));
}

function grupo(titulo, itens, tam) {
  if (!itens.length) return "";
  return '<h2 class="res-titulo">' + titulo + "</h2>" + itens.slice(0, 8).map(i => `
    <a class="res-item" href="${esc(i.href)}">
      <span>${destacar(i.titulo, i.nota, i.pos, tam)}</span>
      <small>${esc(i.sub)}</small>
    </a>`).join("");
}

// HTML dos resultados agrupados (Aulas, Cursos, Artigos, Sistemas)
export function htmlResultados(r, tam) {
  return grupo("Aulas", r.aulas, tam) +
    grupo("Cursos", r.cursos, tam) +
    grupo("Artigos", r.artigos, tam) +
    grupo("Sistemas", r.categorias, tam);
}

// Resultados rápidos na página inicial (enquanto a pessoa digita na barra do robô)
export function mostrarResultados(termo) {
  const box = document.getElementById("resultados");
  const empty = document.getElementById("empty");
  const q = normTexto(String(termo || "").trim());

  if (!q) {
    box.hidden = true;
    box.innerHTML = "";
    empty.hidden = true;
    return;
  }

  const r = buscarTudo(q);
  box.hidden = false;
  box.innerHTML = htmlResultados(r, q.length);

  const t = String(termo).trim();
  // a pesquisa completa (com os manuais) abre com Enter
  empty.innerHTML = 'Nenhuma sugestão rápida para "' + esc(t) + '". <a class="voltar" href="#/busca/' + encodeURIComponent(t) + '">Pesquisar também nos manuais (ou aperte Enter) →</a>';
  empty.hidden = totalResultados(r) > 0;
}
