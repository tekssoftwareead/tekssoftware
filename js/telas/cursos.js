// Telas de cursos (lógica do site 1, adaptada ao site 2):
// lista com filtro por sistema, capa, progresso do aluno e botão Começar/Continuar/Revisar.
// Abrir um curso leva direto para a próxima aula que o aluno ainda não concluiu.
import { app, mostrar, naoEncontrado } from "../nucleo/dom.js";
import { Store } from "../nucleo/store.js";
import { Auth } from "../nucleo/auth.js";
import { Progresso, STATUS, rotuloCurso, barraProgresso } from "../nucleo/progresso.js";
import { esc, normTexto, ytId, miniaturaYT, plural } from "../nucleo/helpers.js";
import { abrirModal, semAcesso } from "../componentes/modal.js";

const ICONE_CADEADO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';

// capa do curso: a cadastrada ou, se não houver, a imagem da primeira aula do YouTube
export function capaDoCurso(c) {
  if (c.capa) return c.capa;
  const aula = Store.aulasDoCurso(c.id).find(x => x.capa || ytId(x.video));
  return aula ? (aula.capa || miniaturaYT(aula.video)) : "";
}

// linha de curso; a linha inteira abre o curso ao clicar
function linhaCurso(c) {
  const cat = Store.categoria(c.categoria_id);
  const p = Progresso.doCurso(c.id);
  const prox = Progresso.proximaAula(c.id);
  const capa = capaDoCurso(c);

  return `
    <article class="curso-linha" data-curso="${esc(c.id)}">
      <a class="curso-capa" href="#/curso/${esc(c.id)}" tabindex="-1" aria-hidden="true">${capa ? `<img src="${esc(capa)}" alt="" loading="lazy">` : esc(c.titulo.charAt(0))}</a>
      <div class="curso-dados">
        <a class="curso-titulo" href="#/curso/${esc(c.id)}">${esc(c.titulo)}</a>
        <p class="curso-sub">${esc(cat ? cat.nome : "")}${cat ? " • " : ""}${plural(p.total, "aula", "aulas")}</p>
        ${c.descricao ? `<p class="curso-desc">${esc(c.descricao)}</p>` : ""}
        <div class="curso-tags"><span class="status status-${p.status}">${STATUS[p.status]}</span></div>
      </div>
      <div class="curso-acao">
        ${barraProgresso(p)}
        ${prox ? `<a class="btn principal" href="#/aula/${esc(prox.id)}">${rotuloCurso(p)}</a>` : ""}
      </div>
    </article>`;
}

// lista de cursos
export function viewCursos(catId) {
  // sem sistema no endereço (#/cursos), abre o primeiro sistema liberado; um sistema bloqueado abre o aviso
  const cats = Store.categorias();
  const liberadas = cats.filter(c => Auth.temAcesso(c.id));
  let sel = catId && Auth.temAcesso(catId) ? catId : (liberadas[0] ? liberadas[0].id : "");

  app.innerHTML = `
    <section class="hero hero-cursos">
      <h1>Cursos</h1>
      <p class="cursos-sub">Escolha o sistema para ver os treinamentos disponíveis.</p>
      <div class="filtros">
        ${cats.map(c => `<button class="chip${Auth.temAcesso(c.id) ? "" : " bloqueado"}" data-cat="${esc(c.id)}">${Auth.temAcesso(c.id) ? "" : ICONE_CADEADO}${esc(c.nome)}</button>`).join("")}
      </div>
    </section>
    <section class="band">
      <div class="lista-topo"><span id="contador"></span></div>
      <div id="lista" class="linhas"></div>
      <p class="empty" id="vazio" hidden></p>
    </section>`;

  const lista = document.getElementById("lista");
  const vazio = document.getElementById("vazio");
  const contador = document.getElementById("contador");

  function desenhar() {
    const itens = sel ? Store.cursos(sel) : [];
    lista.innerHTML = itens.map(linhaCurso).join("");
    contador.textContent = plural(itens.length, "curso", "cursos");
    vazio.textContent = !liberadas.length
      ? "Você ainda não tem nenhum treinamento liberado. Fale com o suporte para solicitar o acesso."
      : "Nenhum curso encontrado.";
    vazio.hidden = itens.length > 0;
  }

  // clicar em qualquer lugar da linha abre o curso
  lista.addEventListener("click", (e) => {
    const linha = e.target.closest(".curso-linha");
    if (linha && !e.target.closest("a")) location.hash = "#/curso/" + linha.dataset.curso;
  });

  const chips = [...app.querySelectorAll(".chip[data-cat]")];
  const marcar = () => chips.forEach(b => b.classList.toggle("ativo", b.dataset.cat === sel));

  chips.forEach(b => b.addEventListener("click", () => {
    if (!Auth.temAcesso(b.dataset.cat)) return abrirModal();
    sel = b.dataset.cat;
    marcar();
    desenhar();
  }));

  marcar();
  desenhar();

  if (catId && !Auth.temAcesso(catId)) abrirModal();
}

// abrir um curso leva direto para a próxima aula (tela do player)
export function viewCurso(id) {
  const c = Store.curso(id);
  if (!c) return naoEncontrado();
  if (!Auth.temAcesso(c.categoria_id)) return semAcesso();

  const prox = Progresso.proximaAula(id);
  if (prox) {
    location.replace("#/aula/" + prox.id);
  } else {
    mostrar(false);
    app.innerHTML = `<p class="empty">Este curso ainda não tem aulas. <a class="voltar" href="#/cursos${c.categoria_id ? "/" + esc(c.categoria_id) : ""}">Voltar aos cursos</a></p>`;
  }
}