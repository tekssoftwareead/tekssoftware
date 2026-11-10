// Painel do administrador (lógica do site 1, adaptada ao site 2). Só abre para quem tem perfil "admin".
//  - Conteúdo: árvore Sistema > Curso > Módulo > Aula. Criar, editar, excluir, mudar a ordem (↑ ↓) e publicar/despublicar.
//  - Usuários: criar contas com senha, perfil, sistemas liberados e validade (arquivo usuarios.js).
import { sb } from "../../config/supabase.js";
import { app, naoEncontrado } from "../../nucleo/dom.js";
import { Store } from "../../nucleo/store.js";
import { Auth } from "../../nucleo/auth.js";
import { esc, porOrdem, ytId, miniaturaYT, plural } from "../../nucleo/helpers.js";
import { miniaturaAula } from "../aula.js";
import { ADM_TIPOS, campoHtml } from "./campos.js";
import { ICONE, avisar, abrirJanela, confirmar, botaoIcone, estadoVazio } from "./ui.js";
import { desenharUsuarios } from "./usuarios.js";

// guarda o que está aberto/fechado na árvore, para não fechar tudo a cada alteração
const ADM = { abertos: new Set(), secao: "conteudo", corpo: null };

const SECOES = {
  conteudo: { nome: "Conteúdo", icone: ICONE.conteudo },
  usuarios: { nome: "Usuários", icone: ICONE.usuarios }
};

/* ================= ENTRADA DA TELA ================= */
export function viewAdmin(secao) {
  const antigo = document.getElementById("adm-overlay");
  if (antigo) antigo.remove();
  if (Auth.perfil() !== "admin") return naoEncontrado();

  ADM.secao = SECOES[secao] ? secao : "conteudo";
  const u = Auth.usuario() || {};
  const primeiroNome = String(u.nome || "").trim().split(/\s+/)[0];

  app.innerHTML = `
    <section class="adm">
      <header class="adm-cab">
        <div class="adm-cab-texto">
          <span class="adm-sobre">Administração</span>
          <h1>Painel do administrador</h1>
          <p>${primeiroNome ? `Olá, ${esc(primeiroNome)}. ` : ""}Organize o conteúdo e quem pode acessar o portal.</p>
        </div>
        <nav class="adm-abas" aria-label="Seções do painel">
          ${Object.keys(SECOES).map(k => `
            <a href="#/admin${k === "conteudo" ? "" : "/" + k}" class="${ADM.secao === k ? "ativa" : ""}"${ADM.secao === k ? ' aria-current="page"' : ""}>
              ${SECOES[k].icone}<span>${SECOES[k].nome}</span>
            </a>`).join("")}
        </nav>
      </header>
      <div id="adm-corpo"></div>
    </section>`;

  ADM.corpo = document.getElementById("adm-corpo");

  if (ADM.secao === "usuarios") return desenharUsuarios(ADM.corpo);

  // um único "ouvinte" para todos os botões
  ADM.corpo.addEventListener("click", (e) => {
    const b = e.target.closest("[data-acao]");
    if (!b) return;
    e.preventDefault();
    acaoAdmin(b.dataset.acao, b.dataset.tipo, b.dataset.id, b.dataset.pai);
  });

  // lembra o que a pessoa abriu na árvore
  ADM.corpo.addEventListener("toggle", (e) => {
    const d = e.target;
    if (!d.dataset || !d.dataset.no) return;
    if (d.open) ADM.abertos.add(d.dataset.no);
    else ADM.abertos.delete(d.dataset.no);
  }, true);

  redesenhar();
}

function redesenhar() {
  desenharConteudo();
}

/* ================= PEÇAS DA ÁRVORE ================= */
const aberto = (chave) => ADM.abertos.has(chave) ? " open" : "";
const emRascunho = (ativo) => ativo ? "" : '<span class="adm-badge">Rascunho</span>';

function botoesAdm(tipo, id, ativo, temAtivo, comOrdem = true) {
  const base = `data-tipo="${tipo}" data-id="${esc(id)}"`;
  return `
    ${comOrdem ? botaoIcone("subir", ICONE.subir, "Mover para cima", base) + botaoIcone("descer", ICONE.descer, "Mover para baixo", base) : ""}
    ${botaoIcone("editar", ICONE.editar, "Editar", base)}
    ${temAtivo ? botaoIcone("alternar", ativo ? ICONE.olho : ICONE.olhoFechado, ativo ? "Despublicar (virar rascunho)" : "Publicar", base, ativo ? "" : "apagado") : ""}
    ${botaoIcone("excluir", ICONE.lixo, "Excluir", base, "perigo")}`;
}

function linhaNo(tipo, icone, titulo, detalhe, ativo, temAtivo, id) {
  return `
    <summary class="adm-linha">
      <span class="adm-seta" aria-hidden="true"></span>
      <span class="adm-ico adm-ico-${tipo}">${icone}</span>
      <span class="adm-titulo"><strong>${esc(titulo)}</strong><small>${detalhe}</small></span>
      ${emRascunho(ativo)}
      <span class="adm-acoes">${botoesAdm(tipo, id, ativo, temAtivo)}</span>
    </summary>`;
}

const botaoNovo = (tipo, pai, texto) =>
  `<button type="button" class="adm-novo" data-acao="novo" data-tipo="${tipo}" data-pai="${esc(pai)}">${ICONE.mais}${texto}</button>`;

function cartaoNumero(icone, numero, rotulo, classe = "") {
  return `<div class="adm-stat${classe ? " " + classe : ""}"><span class="adm-stat-ico">${icone}</span><div><strong>${numero}</strong><small>${rotulo}</small></div></div>`;
}

/* ================= CONTEÚDO (sistema > curso > módulo > aula) ================= */
function desenharConteudo() {
  const D = { categorias: Store.todos("categorias"), cursos: Store.todos("cursos"), modulos: Store.todos("modulos"), aulas: Store.todos("aulas") };
  const sistemas = D.categorias.slice().sort(porOrdem);
  const rascunhos = [D.categorias, D.cursos, D.aulas].reduce((n, l) => n + l.filter(x => !x.ativo).length, 0);

  ADM.corpo.innerHTML = `
    <div class="adm-stats">
      ${cartaoNumero(ICONE.sistema, D.categorias.length, D.categorias.length === 1 ? "Sistema" : "Sistemas")}
      ${cartaoNumero(ICONE.curso, D.cursos.length, D.cursos.length === 1 ? "Curso" : "Cursos")}
      ${cartaoNumero(ICONE.aula, D.aulas.length, D.aulas.length === 1 ? "Aula" : "Aulas")}
      ${cartaoNumero(ICONE.olhoFechado, rascunhos, rascunhos === 1 ? "Rascunho" : "Rascunhos", rascunhos ? "alerta" : "")}
    </div>
    <div class="adm-barra">
      <p>Clique numa linha para abrir. Itens em <span class="adm-badge">Rascunho</span> não aparecem para alunos e clientes.</p>
      <button type="button" class="btn principal" data-acao="novo" data-tipo="sistema">${ICONE.mais}Novo sistema</button>
    </div>
    <div class="adm-arvore">
      ${sistemas.map(c => noSistema(D, c)).join("") ||
        estadoVazio(ICONE.sistema, "Nenhum sistema cadastrado ainda", "Comece criando um sistema (ex.: PowerChef). Depois é só adicionar cursos, módulos e aulas dentro dele.")}
    </div>`;
}

function noSistema(D, c) {
  const chave = "s:" + c.id;
  const cursos = D.cursos.filter(x => x.categoria_id === c.id).sort(porOrdem);
  return `
    <details class="adm-no" data-no="${chave}"${aberto(chave)}>
      ${linhaNo("sistema", ICONE.sistema, c.nome, plural(cursos.length, "curso", "cursos"), c.ativo, true, c.id)}
      <div class="adm-filhos">
        ${cursos.map(x => noCurso(D, x)).join("")}
        ${botaoNovo("curso", c.id, "Novo curso")}
      </div>
    </details>`;
}

function noCurso(D, c) {
  const chave = "c:" + c.id;
  const modulos = D.modulos.filter(x => x.curso_id === c.id).sort(porOrdem);
  const nAulas = D.aulas.filter(a => modulos.some(m => m.id === a.modulo_id)).length;
  return `
    <details class="adm-no" data-no="${chave}"${aberto(chave)}>
      ${linhaNo("curso", ICONE.curso, c.titulo, plural(modulos.length, "módulo", "módulos") + " · " + plural(nAulas, "aula", "aulas"), c.ativo, true, c.id)}
      <div class="adm-filhos">
        ${modulos.map(x => noModulo(D, x)).join("")}
        ${botaoNovo("modulo", c.id, "Novo módulo")}
      </div>
    </details>`;
}

function noModulo(D, m) {
  const chave = "m:" + m.id;
  const aulas = D.aulas.filter(x => x.modulo_id === m.id).sort(porOrdem);
  return `
    <details class="adm-no" data-no="${chave}"${aberto(chave)}>
      ${linhaNo("modulo", ICONE.modulo, m.titulo, plural(aulas.length, "aula", "aulas"), true, false, m.id)}
      <div class="adm-filhos">
        ${aulas.map((x, i) => linhaAula(x, i)).join("")}
        ${botaoNovo("aula", m.id, "Nova aula")}
      </div>
    </details>`;
}

function linhaAula(a, i) {
  const extras = [a.duracao && `${ICONE.relogio}${esc(a.duracao)}`, a.material && "Material de apoio"].filter(Boolean);
  return `
    <div class="adm-aula${a.ativo ? "" : " rascunho"}">
      <span class="aula-num">${String(i + 1).padStart(2, "0")}</span>
      ${miniaturaAula(a)}
      <span class="adm-titulo"><strong>${esc(a.titulo)}</strong>${extras.length ? `<small class="adm-meta">${extras.join('<i aria-hidden="true">·</i>')}</small>` : ""}</span>
      ${emRascunho(a.ativo)}
      <span class="adm-acoes">${botoesAdm("aula", a.id, a.ativo, true)}</span>
    </div>`;
}

/* ================= DADOS DE CADA TIPO ================= */
function itensDoTipo(tipo) {
  return { sistema: Store.todos("categorias"), curso: Store.todos("cursos"), modulo: Store.todos("modulos"),
    aula: Store.todos("aulas"), artigo: Store.todos("artigos") }[tipo] || [];
}

const acharItem = (tipo, id) => itensDoTipo(tipo).find(x => String(x.id) === String(id));

// os "irmãos" de um item: itens do mesmo tipo dentro do mesmo pai
function irmaosDe(tipo, item) {
  const campo = ADM_TIPOS[tipo].paiCampo;
  return itensDoTipo(tipo).filter(x => !campo || x[campo] === item[campo]).slice().sort(porOrdem);
}

function proximaOrdem(tipo, paiId) {
  const campo = ADM_TIPOS[tipo].paiCampo;
  const lista = itensDoTipo(tipo).filter(x => !campo || x[campo] === paiId);
  return lista.reduce((mx, x) => Math.max(mx, x.ordem || 0), 0) + 1;
}

// código único para itens novos (o item já nasce com o id, assim dá para deixá-lo aberto na tela)
function novoId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

function slugAdm(texto) {
  return texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "sistema";
}

// sistemas usam um código legível (ex.: "powerchef"), como no site 1
function slugUnico(nome) {
  const usados = new Set(itensDoTipo("sistema").map(x => x.id));
  const base = slugAdm(nome);
  let id = base, n = 2;
  while (usados.has(id)) { id = base + "-" + n; n++; }
  return id;
}

// deixa aberto o caminho até o item novo, para ele aparecer na tela
function abrirCadeia(tipo, paiId) {
  if (tipo === "curso") ADM.abertos.add("s:" + paiId);
  if (tipo === "modulo") {
    ADM.abertos.add("c:" + paiId);
    const c = Store.achar("cursos", paiId);
    if (c) ADM.abertos.add("s:" + c.categoria_id);
  }
  if (tipo === "aula") {
    ADM.abertos.add("m:" + paiId);
    const m = Store.achar("modulos", paiId);
    if (m) {
      ADM.abertos.add("c:" + m.curso_id);
      const c = Store.achar("cursos", m.curso_id);
      if (c) ADM.abertos.add("s:" + c.categoria_id);
    }
  }
}

/* ================= AÇÕES DOS BOTÕES ================= */
async function recarregarEDesenhar() {
  await Store.carregar();
  redesenhar();
}

async function acaoAdmin(acao, tipo, id, pai) {
  try {
    if (acao === "novo") return abrirFormulario(tipo, null, pai);

    const item = acharItem(tipo, id);
    if (!item) return;

    if (acao === "editar") return abrirFormulario(tipo, item);

    if (acao === "alternar") {
      const { error } = await sb.from(ADM_TIPOS[tipo].tabela).update({ ativo: !item.ativo }).eq("id", item.id);
      if (error) throw error;
      await recarregarEDesenhar();
      return avisar(item.ativo ? "Despublicado: agora é rascunho." : "Publicado.");
    }

    if (acao === "excluir") return excluirItem(tipo, item);

    if (acao === "subir" || acao === "descer") return moverItem(tipo, item, acao === "subir" ? -1 : 1);
  } catch (e) {
    console.error(e);
    avisar("Não foi possível concluir: " + (e.message || e), true);
  }
}

async function moverItem(tipo, item, delta) {
  const lista = irmaosDe(tipo, item);
  const i = lista.findIndex(x => x.id === item.id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= lista.length) return;

  [lista[i], lista[j]] = [lista[j], lista[i]];

  // renumera 1, 2, 3... e só grava o que mudou
  const mudancas = lista
    .map((x, k) => ({ id: x.id, antes: x.ordem, depois: k + 1 }))
    .filter(x => x.antes !== x.depois);

  const tabela = ADM_TIPOS[tipo].tabela;
  const resultados = await Promise.all(mudancas.map(m => sb.from(tabela).update({ ordem: m.depois }).eq("id", m.id)));
  const falha = resultados.find(r => r.error);
  if (falha) throw falha.error;

  await recarregarEDesenhar();
}

async function excluirItem(tipo, item) {
  const cursosT = Store.todos("cursos"), modulosT = Store.todos("modulos"), aulasT = Store.todos("aulas");
  let aviso = "";

  if (tipo === "sistema") {
    const cursos = cursosT.filter(x => x.categoria_id === item.id);
    const modulos = modulosT.filter(m => cursos.some(c => c.id === m.curso_id));
    const aulas = aulasT.filter(a => modulos.some(m => m.id === a.modulo_id));
    aviso = `Isso também apaga <b>${plural(cursos.length, "curso", "cursos")}</b>, <b>${plural(modulos.length, "módulo", "módulos")}</b> e <b>${plural(aulas.length, "aula", "aulas")}</b> dentro dele, e remove os acessos liberados a esse sistema.`;
  } else if (tipo === "curso") {
    const modulos = modulosT.filter(m => m.curso_id === item.id);
    const aulas = aulasT.filter(a => modulos.some(m => m.id === a.modulo_id));
    aviso = `Isso também apaga <b>${plural(modulos.length, "módulo", "módulos")}</b> e <b>${plural(aulas.length, "aula", "aulas")}</b> dentro dele.`;
  } else if (tipo === "modulo") {
    const aulas = aulasT.filter(a => a.modulo_id === item.id);
    aviso = `Isso também apaga <b>${plural(aulas.length, "aula", "aulas")}</b> dentro dele.`;
  } else if (tipo === "aula") {
    aviso = "O progresso e as anotações dos alunos nesta aula também serão apagados.";
  } else {
    aviso = "O artigo deixa de aparecer para os clientes e para o assistente de IA.";
  }

  const nome = item.nome || item.titulo;
  const ok = await confirmar({
    titulo: `Apagar ${ADM_TIPOS[tipo].rotulo}?`,
    texto: `<p><strong>${esc(nome)}</strong></p><p>${aviso}</p><p class="adm-muda">Essa ação não pode ser desfeita.${tipo !== "modulo" ? " Se quiser só esconder, use o botão de despublicar." : ""}</p>`
  });
  if (!ok) return;

  try {
    const { error } = await sb.from(ADM_TIPOS[tipo].tabela).delete().eq("id", item.id);
    if (error) throw error;
    await recarregarEDesenhar();
    avisar("Apagado.");
  } catch (e) {
    console.error(e);
    avisar("Não foi possível apagar: " + (e.message || e), true);
  }
}

/* ================= FORMULÁRIO (criar e editar) ================= */
function abrirFormulario(tipo, item, paiId) {
  const cfg = ADM_TIPOS[tipo];
  const editando = !!item;

  const valorInicial = (c) => {
    if (c.tipo === "check") return editando ? !!item[c.nome] : true;
    return editando ? (item[c.nome] == null ? "" : item[c.nome]) : "";
  };

  // onde o item novo vai ficar (ajuda a não criar no lugar errado)
  let caminho = "";
  if (!editando && paiId) {
    if (tipo === "curso") { const s = Store.categoria(paiId); caminho = s ? s.nome : ""; }
    if (tipo === "modulo") { const c = Store.achar("cursos", paiId); caminho = c ? c.titulo : ""; }
    if (tipo === "aula") {
      const m = Store.achar("modulos", paiId);
      const c = m && Store.achar("cursos", m.curso_id);
      caminho = (c ? c.titulo + " › " : "") + (m ? m.titulo : "");
    }
  } else if (editando) {
    caminho = item.nome || item.titulo || "";
  }

  const corpo = cfg.campos.map(c => {
    const html = campoHtml(c, valorInicial(c));
    // a prévia da imagem do YouTube aparece logo abaixo do campo do vídeo
    return c.video
      ? html + '<div class="adm-preview" id="adm-preview" hidden><img alt=""><span>Imagem do vídeo no YouTube</span></div>'
      : html;
  }).join("");

  abrirJanela({
    icone: ICONE[tipo] || ICONE.editar,
    titulo: `${editando ? "Editar" : "Novo"} ${cfg.rotulo}`.replace(/^Novo (aula)$/, "Nova $1"),
    subtitulo: caminho ? (editando ? caminho : "Em: " + caminho) : "",
    corpo,
    larga: tipo === "artigo" || tipo === "aula",
    aoAbrir() {
      // prévia da imagem do YouTube
      const campoVideo = document.getElementById("adm-c-video");
      if (!campoVideo) return;
      const prev = document.getElementById("adm-preview");
      const atualizar = () => {
        const img = miniaturaYT(campoVideo.value);
        prev.hidden = !img;
        if (img) prev.querySelector("img").src = img;
      };
      campoVideo.addEventListener("input", atualizar);
      atualizar();
    },
    async aoSalvar() {
      const v = {};
      cfg.campos.forEach(c => {
        const el = document.getElementById("adm-c-" + c.nome);
        v[c.nome] = c.tipo === "check" ? el.checked : el.value.trim();
      });

      const problema = validarCampos(cfg, v);
      if (problema) throw new Error(problema);

      // campos de texto vazios viram "nada" no banco
      const dados = {};
      cfg.campos.forEach(c => {
        dados[c.nome] = (c.tipo !== "check" && !c.obrigatorio && v[c.nome] === "") ? null : v[c.nome];
      });

      try {
        if (editando) {
          const { error } = await sb.from(cfg.tabela).update(dados).eq("id", item.id);
          if (error) throw error;
        } else {
          const linha = Object.assign({}, dados);
          if (tipo !== "artigo") linha.ordem = proximaOrdem(tipo, paiId);
          linha.id = tipo === "sistema" ? slugUnico(dados.nome) : novoId();
          if (cfg.paiCampo) linha[cfg.paiCampo] = paiId;

          const { error } = await sb.from(cfg.tabela).insert(linha);
          if (error) throw error;

          if (cfg.paiCampo) abrirCadeia(tipo, paiId);
          const prefixo = { sistema: "s:", curso: "c:", modulo: "m:" }[tipo];
          if (prefixo) ADM.abertos.add(prefixo + linha.id);   // o item novo já fica aberto, pronto para receber os filhos
        }
      } catch (err) {
        throw new Error("Não foi possível salvar: " + (err.message || err));
      }

      await recarregarEDesenhar();
      avisar(editando ? "Alterações salvas." : "Criado com sucesso.");
    }
  });
}

// confere o que a pessoa digitou antes de gravar
function validarCampos(cfg, v) {
  for (const c of cfg.campos) {
    const valor = v[c.nome];
    if (c.obrigatorio && !valor) return `Preencha o campo "${c.rotulo}".`;
    if (c.tipo === "check" || c.tipo === "select" || !valor) continue;

    if (c.url && !/^https?:\/\/\S+$/i.test(valor)) {
      return `O campo "${c.rotulo}" precisa ser um link completo, começando com http:// ou https://.`;
    }
    if (c.video && !ytId(valor) && !/\.(mp4|webm|ogg)(\?.*)?$/i.test(valor)) {
      return "Não reconheci esse link de vídeo. Use um link do YouTube (youtube.com/watch?v=..., youtu.be/..., shorts ou live) ou um arquivo .mp4.";
    }
    if (c.duracao && !/^\d{1,3}(:\d{2}){1,2}$/.test(valor)) {
      return "Use a duração no formato 14:20 (minutos:segundos).";
    }
  }
  return "";
}
