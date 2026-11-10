// Assistente de IA do portal.
//  - Página de resultados (Enter na barra de pesquisa): a resposta aparece no topo, antes das aulas e manuais
//    (veja responderNaBusca, usada em js/telas/resultados.js).
//  - Painel de conversa (perguntarIA): continua disponível para quem quiser chamar.
// A resposta vem da função "perguntar-ia" do Supabase (a chave da IA fica lá, nunca aqui).
import { sb } from "../config/supabase.js";
import { esc } from "../nucleo/helpers.js";

const WHATSAPP = "https://wa.me/5585981960909?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20o%20sistema.";
const BOAS_VINDAS = "Olá! Sou o assistente da Teks. Pergunte sua dúvida sobre os sistemas: eu respondo com base nos manuais.";
const ICONE_ZAP = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>';

let historico = [];   // [{ papel: "user" | "assistant", texto }]
let ocupado = false;
let el = {};

// texto da IA -> HTML seguro (negrito **x**, quebras de linha, listas simples)
function formatar(t) {
  return esc(t)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^\s*[-•]\s+/gm, "• ")
    .replace(/\n/g, "<br>");
}

function rolarFim() { el.msgs.scrollTop = el.msgs.scrollHeight; }

function bolha(papel, html, classe = "") {
  const d = document.createElement("div");
  d.className = "ia-msg ia-" + papel + (classe ? " " + classe : "");
  d.innerHTML = html;
  el.msgs.appendChild(d);
  rolarFim();
  return d;
}

// prints do manual (links temporários gerados pela função)
function prints(imagens) {
  if (!imagens || !imagens.length) return "";
  return '<div class="ia-prints">' + imagens.map(u =>
    `<a href="${esc(u)}" target="_blank" rel="noopener"><img src="${esc(u)}" alt="Print da tela do sistema" loading="lazy"></a>`).join("") + "</div>";
}

function links(fontes, videos) {
  fontes = fontes || [];
  const botaoVideo = (videos || []).map(u =>
    `<a class="ia-aula" href="${esc(u)}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg><span>Assistir vídeo</span></a>`).join("");
  if (!fontes.length) return botaoVideo ? '<div class="ia-aulas">' + botaoVideo + "</div>" : "";
  const rot = { artigo: "Artigo", curso: "Curso" };
  const aulas = fontes.filter(f => f.tipo === "aula");
  const outros = fontes.filter(f => f.tipo !== "aula");
  let h = "";
  // botão grande para ver a aula em vídeo
  if (aulas.length || botaoVideo) h += '<div class="ia-aulas">' + botaoVideo + aulas.map(f =>
    `<a class="ia-aula" href="#/aula/${esc(f.id)}" data-ia-link><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg><span>Assistir aula: ${esc(f.titulo)}</span></a>`).join("") + "</div>";
  if (outros.length) h += '<div class="ia-fontes"><span>Veja também:</span>' + outros.map(f =>
    `<a href="#/${esc(f.tipo)}/${esc(f.id)}" data-ia-link>${esc(rot[f.tipo] || "")}: ${esc(f.titulo)}</a>`).join("") + "</div>";
  return h;
}

// páginas da internet que a IA consultou
function fontesWeb(web) {
  if (!web || !web.length) return "";
  const dominio = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return u; } };
  return '<div class="ia-web"><span>Fontes da internet:</span>' + web.map(w =>
    `<a href="${esc(w.url)}" target="_blank" rel="noopener" title="${esc(w.titulo)}">${esc(dominio(w.url))}</a>`).join("") + "</div>";
}

// resposta completa (texto + prints + aulas/vídeos + fontes + WhatsApp) em HTML
function respostaHtml(data) {
  return formatar(data.resposta) + prints(data.imagens) + links(data.fontes, data.videos) + fontesWeb(data.web) + (data.whatsapp ? botaoZap(data.whatsapp) : "");
}

// botão verde que leva o cliente para o WhatsApp da equipe
const botaoZap = (href) =>
  `<a class="ia-zap" href="${esc(href || WHATSAPP)}" target="_blank" rel="noopener">${ICONE_ZAP}<span>Falar com a equipe no WhatsApp</span></a>`;

async function mensagemDeErro(error) {
  let corpo = {}, status = 0;
  try { status = error.context.status; corpo = await error.context.json(); } catch (e) { /* sem corpo */ }
  if (corpo.erro === "limite") return "Você chegou ao limite de perguntas de hoje. Amanhã você pode perguntar de novo, ou fale agora com a equipe no WhatsApp.";
  if (corpo.erro === "nao_logado" || status === 401) return "Sua sessão expirou. Saia e entre de novo para continuar.";
  if (status === 404) return "O assistente ainda não foi ativado neste site.";
  if (corpo.erro === "cota") return "O assistente está com muitas perguntas agora. Tente de novo em alguns minutos ou fale com a equipe no WhatsApp.";
  if (corpo.erro === "ia_nao_configurada") return "O assistente ainda não foi configurado (falta a chave da IA no Supabase).";
  return "Não consegui responder agora. Tente de novo em instantes ou fale com a equipe no WhatsApp.";
}

async function enviar(texto) {
  ocupado = true;

  bolha("user", esc(texto).replace(/\n/g, "<br>"));
  historico.push({ papel: "user", texto });
  const digitando = bolha("bot", '<span class="ia-pontos"><i></i><i></i><i></i></span>', "ia-digitando");

  try {
    const { data, error } = await sb.functions.invoke("perguntar-ia", { body: { mensagens: historico.slice(-6) } });
    digitando.remove();
    if (error || !data || !data.resposta) {
      bolha("bot", esc(error ? await mensagemDeErro(error) : "Não consegui responder agora. Tente de novo.") + botaoZap(), "ia-erro");
      historico.pop(); // a pergunta que falhou não entra no contexto
    } else {
      bolha("bot", respostaHtml(data));
      historico.push({ papel: "assistant", texto: data.resposta });
    }
  } catch (e) {
    digitando.remove();
    bolha("bot", "Não consegui falar com o assistente agora. Verifique sua internet e tente de novo." + botaoZap(), "ia-erro");
    historico.pop();
  }
  ocupado = false;
}

// coloca o painel logo abaixo da barra de pesquisa (no celular o CSS cobre a tela)
function posicionar() {
  if (!el.painel || el.painel.hidden) return;
  if (window.innerWidth <= 640) {
    el.painel.style.left = el.painel.style.top = el.painel.style.width = el.painel.style.height = "";
    return;
  }
  const r = (document.getElementById("botaoflutuante") || document.body).getBoundingClientRect();
  const largura = Math.min(430, window.innerWidth - 24);
  const topo = r.bottom + 12;
  el.painel.style.left = Math.max(12, Math.min(r.left, window.innerWidth - largura - 12)) + "px";
  el.painel.style.top = topo + "px";
  el.painel.style.width = largura + "px";
  el.painel.style.height = Math.max(260, Math.min(540, window.innerHeight - topo - 16)) + "px";
}

function abrir() {
  // no celular a barra fica dentro do menu: fecha o menu para o painel aparecer
  const nav = document.getElementById("nav");
  if (nav) nav.classList.remove("open");
  const menu = document.getElementById("menu");
  if (menu) menu.setAttribute("aria-expanded", false);

  el.painel.hidden = false;
  if (!el.msgs.children.length) bolha("bot", esc(BOAS_VINDAS));
  posicionar();
}

export function fecharIA() { el.painel.hidden = true; }

// Chamada pela barra de pesquisa (Enter): abre o painel e envia a pergunta.
export function perguntarIA(texto) {
  if (!el.painel) return;
  texto = String(texto || "").trim().slice(0, 600);
  abrir();
  const q = document.getElementById("q");
  if (!texto) { q.focus(); return; }
  if (ocupado) return;   // espera a resposta anterior
  q.value = "";
  q.dispatchEvent(new Event("input"));   // limpa a lista de resultados da pesquisa
  enviar(texto);
}

// ao sair da conta: apaga a conversa e fecha o painel
export function limparIA() {
  respostasDaBusca.clear();
  if (!el.painel) return;
  historico = [];
  ocupado = false;
  el.msgs.innerHTML = "";
  el.painel.hidden = true;
}

export function iniciarIA() {
  el = {
    painel: document.getElementById("ia-painel"),
    msgs: document.getElementById("ia-msgs")
  };
  if (!el.painel) return;

  document.getElementById("ia-fechar").addEventListener("click", fecharIA);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !el.painel.hidden) fecharIA(); });
  window.addEventListener("resize", posicionar);

  // no celular o painel cobre a tela: fecha ao abrir um link sugerido
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-ia-link]") && window.innerWidth <= 640) fecharIA();
  });
}

// ===== RESPOSTA NA PÁGINA DE RESULTADOS =====
// Faz UMA pergunta e devolve { html, erro }. A mesma pesquisa não é perguntada duas vezes na mesma visita.
const respostasDaBusca = new Map();
export async function responderNaBusca(pergunta) {
  pergunta = String(pergunta || "").trim().slice(0, 600);
  if (!pergunta) return { html: "", erro: true };
  const chave = pergunta.toLowerCase();
  if (respostasDaBusca.has(chave)) return respostasDaBusca.get(chave);
  try {
    const { data, error } = await sb.functions.invoke("perguntar-ia", { body: { mensagens: [{ papel: "user", texto: pergunta }] } });
    if (error || !data || !data.resposta) {
      return { html: esc(error ? await mensagemDeErro(error) : "Não consegui responder agora. Tente de novo."), erro: true };
    }
    const r = { html: respostaHtml(data), erro: false };
    respostasDaBusca.set(chave, r);
    return r;
  } catch (e) {
    return { html: esc("Não consegui falar com o assistente agora. Verifique sua internet e tente de novo."), erro: true };
  }
}
export function limparRespostasDaBusca() { respostasDaBusca.clear(); }
