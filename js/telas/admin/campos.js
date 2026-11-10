// Painel admin: como cada tipo de item é guardado no banco (do site 1) e os campos de cada formulário.
// Para mudar ou acrescentar um campo, mexa só aqui (e crie a coluna no banco).
import { Store } from "../../nucleo/store.js";
import { esc } from "../../nucleo/helpers.js";

export const ADM_TIPOS = {
  sistema: {
    tabela: "categorias", rotulo: "sistema",
    campos: [
      { nome: "nome", rotulo: "Nome do sistema", tipo: "texto", obrigatorio: true },
      { nome: "ativo", rotulo: "Visível para os alunos e clientes", tipo: "check" }
    ]
  },
  curso: {
    tabela: "cursos", rotulo: "curso", paiCampo: "categoria_id",
    campos: [
      { nome: "titulo", rotulo: "Título do curso", tipo: "texto", obrigatorio: true },
      { nome: "descricao", rotulo: "Descrição", tipo: "area", dica: "A pesquisa e o assistente de IA também leem este texto." },
      { nome: "capa", rotulo: "Imagem de capa (link)", tipo: "texto", url: true,
        dica: "Opcional. Se ficar vazio, usa a imagem da primeira aula do YouTube." },
      { nome: "ativo", rotulo: "Publicado (aparece para quem tem acesso)", tipo: "check" }
    ]
  },
  modulo: {
    tabela: "modulos", rotulo: "módulo", paiCampo: "curso_id",
    campos: [
      { nome: "titulo", rotulo: "Título do módulo", tipo: "texto", obrigatorio: true }
    ]
  },
  aula: {
    tabela: "aulas", rotulo: "aula", paiCampo: "modulo_id",
    campos: [
      { nome: "titulo", rotulo: "Título da aula", tipo: "texto", obrigatorio: true },
      { nome: "video", rotulo: "Link do vídeo (YouTube)", tipo: "texto", url: true, video: true,
        dica: "Cole o link do YouTube (watch?v=..., youtu.be/..., shorts ou live) ou de um arquivo .mp4." },
      { nome: "descricao", rotulo: "Descrição", tipo: "area",
        dica: "Escreva o que o vídeo ensina (passo a passo, nomes de menus). A pesquisa e o assistente de IA usam este texto." },
      { nome: "duracao", rotulo: "Duração", tipo: "texto", duracao: true, dica: "Ex.: 14:20 (minutos:segundos). Opcional." },
      { nome: "material", rotulo: "Material de apoio (link)", tipo: "texto", url: true, dica: "Opcional. Link de um PDF, planilha, etc." },
      { nome: "capa", rotulo: "Imagem da aula (link)", tipo: "texto", url: true,
        dica: "Opcional. Se ficar vazio, usa a imagem do vídeo no YouTube." },
      { nome: "ativo", rotulo: "Publicada (aparece para quem tem acesso)", tipo: "check" }
    ]
  },
  artigo: {
    tabela: "artigos", rotulo: "artigo",
    campos: [
      { nome: "titulo", rotulo: "Título", tipo: "texto", obrigatorio: true },
      { nome: "categoria_id", rotulo: "Sistema", tipo: "select", fonte: "categorias", vazio: "— todos os sistemas —",
        dica: "Só quem tem este sistema liberado vê o artigo. O assistente de IA usa o artigo para responder sobre este sistema." },
      { nome: "resumo", rotulo: "Resumo curto (aparece na lista)", tipo: "area", linhas: 2 },
      { nome: "conteudo", rotulo: "Texto do artigo", tipo: "area", linhas: 12, obrigatorio: true,
        dica: "Deixe uma linha em branco entre os parágrafos." },
      { nome: "ativo", rotulo: "Publicado (visível para os clientes)", tipo: "check" }
    ]
  }
};

function opcoes(fonte) {
  if (fonte === "categorias") return Store.todos("categorias").map(c => ({ v: c.id, l: c.nome }));
  return [];
}

// desenha um campo do formulário (texto, área, lista ou caixinha)
export function campoHtml(c, valor) {
  const id = "adm-c-" + c.nome;
  const dica = c.dica ? `<small>${esc(c.dica)}</small>` : "";
  const rot = esc(c.rotulo) + (c.obrigatorio ? " *" : "");

  if (c.tipo === "check") {
    return `<label class="adm-check"><input type="checkbox" id="${id}"${valor ? " checked" : ""}> ${esc(c.rotulo)}</label>`;
  }
  if (c.tipo === "area") {
    return `<label class="adm-campo" for="${id}"><span>${rot}</span><textarea id="${id}" rows="${c.linhas || 4}">${esc(valor)}</textarea>${dica}</label>`;
  }
  if (c.tipo === "select") {
    const ops = opcoes(c.fonte).map(o => `<option value="${esc(o.v)}"${o.v === valor ? " selected" : ""}>${esc(o.l)}</option>`).join("");
    return `<label class="adm-campo" for="${id}"><span>${rot}</span><select id="${id}"><option value="">${esc(c.vazio || "— nenhum —")}</option>${ops}</select>${dica}</label>`;
  }
  return `<label class="adm-campo" for="${id}"><span>${rot}</span><input id="${id}" type="text" value="${esc(valor)}" autocomplete="off">${dica}</label>`;
}
