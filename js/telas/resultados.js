// Página de resultados da pesquisa (#/busca/palavras), como uma central de ajuda.
// 1) Mostra NA HORA o que achou no portal (aulas, cursos, artigos, sistemas), só do que a pessoa tem liberado.
// 2) Em seguida procura também nos manuais (PDF/Word), pela função "perguntar-ia" (modo "buscar", sem IA).
//    Se essa função ainda não estiver publicada no banco, a página continua funcionando só com o passo 1.
import { app } from "../nucleo/dom.js";
import { esc, normTexto } from "../nucleo/helpers.js";
import { sb } from "../config/supabase.js";
import { buscarTudo } from "../busca/busca.js";


const ROTULO = { arquivo: "Manual", artigo: "Artigo", aula: "Aula", curso: "Curso", categoria: "Sistema" };
const WHATSAPP_PADRAO = () => {
  const n = (window.TEKS_CONFIG && window.TEKS_CONFIG.whatsapp) || "";
  return n ? "https://wa.me/" + n + "?text=" + encodeURIComponent("Olá! Estou no portal da Teks e não encontrei o que procurava.") : "";
};

const botaoZap = (href) => href
  ? `<a class="ia-zap res-zap" href="${esc(href)}" target="_blank" rel="noopener">Falar com a equipe no WhatsApp</a>` : "";

// texto do manual: parágrafos e quebras de linha preservados
const texto = (t) => esc(t).replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br>");
const corta = (t, n = 220) => { t = String(t || "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n) + "…" : t; };

// ===== PESQUISA "INTELIGENTE" =====
// Mostra só o que é SOBRE o assunto pesquisado: o título precisa ter a palavra (ex.: "cadastro" → "Cadastro de clientes").
// Nos manuais, procura dentro do texto uma linha curta que pareça um título com a palavra e mostra só ela.
// Trechos em que a palavra só aparece no meio de um parágrafo ficam de fora.
const raiz = (w) => (w.length > 5 ? w.slice(0, -2) : w.length > 4 ? w.slice(0, -1) : w);   // cadastro/cadastrar → "cadast"
// palavras que não ajudam a achar o assunto ("como trocar a senha" procura só "trocar" e "senha")
const IGNORAR = new Set(["como", "que", "qual", "quais", "onde", "quando", "para", "por", "com", "sem", "uma", "uns", "umas",
  "dos", "das", "nos", "nas", "meu", "minha", "seu", "sua", "isso", "esse", "essa", "este", "esta", "fazer", "faco", "posso",
  "pode", "preciso", "quero", "gostaria", "sobre", "tem", "ter", "mais", "mas", "porque", "favor", "ajuda", "sistema"]);
const palavrasDe = (q) => normTexto(q).split(/[^a-z0-9]+/).filter(w => w.length > 2 && !IGNORAR.has(w)).map(raiz);
const temTodas = (texto, ws) => { const t = normTexto(texto); return ws.length > 0 && ws.every(w => t.includes(w)); };

function assuntoDoManual(texto, ws) {
  const linhas = String(texto || "").split(/\n+|(?<=[.:;!?])\s+/).map(l => l.replace(/\s+/g, " ").trim().replace(/[:.;,\-–]+$/, ""));
  const candidatas = linhas.filter(l => l.length >= 4 && l.length <= 60 && l.split(" ").length <= 6 && temTodas(l, ws));
  if (!candidatas.length) return "";
  candidatas.sort((a, b) => a.length - b.length);                 // a mais curta costuma ser o título
  const t = candidatas[0];
  return t === t.toUpperCase() ? t.charAt(0) + t.slice(1).toLowerCase() : t.charAt(0).toUpperCase() + t.slice(1);
}

const cache = new Map(); // manuais já consultados nesta visita
let seq = 0;             // descarta respostas antigas quando a pessoa continua digitando

export async function viewBusca(q) {
  const meu = ++seq;
  let consulta = "";
  try { consulta = decodeURIComponent(q || "").trim(); } catch { consulta = String(q || "").trim(); }
  const barra = document.getElementById("q");
  if (barra && barra.value.trim() !== consulta) barra.value = consulta;

  app.innerHTML = `
    <section class="res-pagina">
      <nav class="res-trilha" aria-label="Você está em"><a href="#/">Página inicial</a><span>›</span><span>Busca por ${esc(consulta)}</span></nav>
      <p class="res-contagem" id="res-contagem"></p>
      <div id="res-corpo"></div>
    </section>`;
  const contagem = document.getElementById("res-contagem");
  const corpo = document.getElementById("res-corpo");

  if (!consulta) { contagem.textContent = "Digite o que você procura na barra de pesquisa."; return; }

  // 1) resultados do portal (na hora)
  const r = buscarTudo(normTexto(consulta));
  const ws = palavrasDe(consulta);
  // só o que tem a palavra no título (nota 0, 1 ou 2); o que só bate na descrição fica de fora
  const locais = [...r.aulas, ...r.cursos, ...r.artigos, ...r.categorias].filter(x => x.nota <= 2);
  let manuais = [];
  let buscandoManuais = true;
  let zap = WHATSAPP_PADRAO();

  function lista() {
    const itens = [...locais, ...manuais];
    contagem.textContent = `Resultados encontrados: ${itens.length}` + (buscandoManuais ? " • procurando nos manuais…" : "");
    corpo.innerHTML = itens.map((it, i) => {
      const href = it.tipo === "arquivo" ? "#" : it.href;
      const origem = it.tipo === "arquivo" ? it.origem : it.sub;
      return `
        <a class="rs-item" href="${esc(href)}" data-i="${i}">
          <small class="rs-tag">${esc(ROTULO[it.tipo] || "")}${origem ? " | " + esc(origem) : ""}</small><h2>${esc(it.titulo)}</h2>

        </a>`;
    }).join("") +
      (!itens.length && !buscandoManuais ? '<p class="res-vazio">Nenhum resultado para esta pesquisa. Tente outras palavras.</p>' : "") +
      (buscandoManuais ? "" : `<div class="res-rodape"><p>Não encontrou o que procurava?</p>${botaoZap(zap)}</div>`);

    corpo.querySelectorAll(".rs-item[data-i]").forEach(a => {
      const it = itens[Number(a.dataset.i)];
      if (it.tipo === "arquivo") a.addEventListener("click", (e) => { e.preventDefault(); detalhe(it); });
    });
  }

  function detalhe(it) {
    contagem.textContent = "";
    corpo.innerHTML = `
      <a class="voltar" href="#" id="res-voltar">← Voltar aos resultados</a>
      <article class="res-detalhe">
        <h1>${esc(it.titulo)}</h1>
        ${it.origem ? `<p class="res-origem">${esc(it.origem)}</p>` : ""}
        <div class="res-texto"><p>${texto(it.texto || it.trecho || "")}</p></div>
        ${(it.imagens || []).map(u => `<a class="res-print" href="${esc(u)}" target="_blank" rel="noopener"><img src="${esc(u)}" alt="Print da tela do sistema" loading="lazy"></a>`).join("")}
        ${(it.videos || []).map(u => `<a class="ia-aula res-video" href="${esc(u)}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg><span>Assistir vídeo</span></a>`).join("")}
      </article>
      <div class="res-rodape"><p>Ainda com dúvida?</p>${botaoZap(zap)}</div>`;
    document.getElementById("res-voltar").addEventListener("click", (e) => { e.preventDefault(); lista(); window.scrollTo(0, 0); });
    window.scrollTo(0, 0);
  }

  lista();

  // 2) manuais (PDF/Word), pela função do Supabase
  try {
    const chave = consulta.toLowerCase();
    let data = cache.get(chave);
    if (!data) {
      const resp = await sb.functions.invoke("perguntar-ia", { body: { modo: "buscar", consulta } });
      if (resp.error) throw resp.error;
      data = resp.data;
      if (data && data.resultados) cache.set(chave, data);
    }
    if (meu !== seq) return;
    if (data && data.whatsapp) zap = data.whatsapp;
    // só os trechos de manuais: aulas, cursos e artigos já vieram do passo 1
    const vistos = new Set();
    manuais = ((data && data.resultados) || [])
      .filter(x => x.tipo === "arquivo")
      .map(x => ({ ...x, titulo: assuntoDoManual(x.texto || x.trecho, ws) }))
      .filter(x => {
        const k = normTexto(x.titulo);
        if (!x.titulo || vistos.has(k)) return false;   // sem título sobre o assunto, ou repetido
        vistos.add(k); return true;
      })
      .slice(0, 12);
  } catch (e) {
    if (meu !== seq) return;
    console.warn("Pesquisa nos manuais indisponível:", e && e.message);
  }
  buscandoManuais = false;
  lista();
}
