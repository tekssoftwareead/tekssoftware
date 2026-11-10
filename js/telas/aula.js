// Tela da aula (lógica do site 1, adaptada ao site 2): vídeo, reprodução automática, velocidade,
// modo cinema, anotação, marcar como concluída e, ao lado, os módulos com o progresso de cada um.
import { app, naoEncontrado } from "../nucleo/dom.js";
import { Store } from "../nucleo/store.js";
import { Auth } from "../nucleo/auth.js";
import { Progresso, Notas } from "../nucleo/progresso.js";
import { esc, normTexto, miniaturaYT, paragrafos } from "../nucleo/helpers.js";
import { pref, carregarYT, videoHtml } from "../componentes/video.js";
import { semAcesso } from "../componentes/modal.js";

const ICONE_OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const ICONE_PLAY = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';

// miniatura da aula (imagem cadastrada ou a do YouTube) com a duração no canto
export function miniaturaAula(a) {
  const img = a.capa || miniaturaYT(a.video);
  return `<span class="aula-mini">
            ${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : ICONE_PLAY}
            ${a.duracao ? `<small>${esc(a.duracao)}</small>` : ""}
          </span>`;
}

export function viewAula(id) {
  const a = Store.aula(id);
  const m = a && Store.modulo(a.modulo_id);
  const c = m && Store.curso(m.curso_id);
  if (!a || !c) return naoEncontrado();
  if (!Auth.temAcesso(c.categoria_id)) return semAcesso();

  const todas = Store.aulasDoCurso(c.id);
  const i = todas.findIndex(x => x.id === a.id);
  const anterior = todas[i - 1];
  const proxima = todas[i + 1];
  const modulos = Store.modulos(c.id);
  const abertos = new Set([m.id]);
  const voltarHref = "#/cursos" + (c.categoria_id ? "/" + esc(c.categoria_id) : "");
  let termo = "";

  // veio da reprodução automática? então já começa tocando
  let tocar = false;
  try { tocar = sessionStorage.getItem("teks_tocar") === "1"; sessionStorage.removeItem("teks_tocar"); } catch (e) { /* sem armazenamento */ }

  app.innerHTML = `
    <section class="player">
      <div class="player-principal">
        <a class="voltar" href="${voltarHref}">← Voltar aos cursos</a>
        <p class="player-modulo">${esc(c.titulo)} • ${esc(m.titulo)}</p>
        <h1 class="player-titulo">${esc(a.titulo)}</h1>
        <div class="video">${videoHtml(a.video, a.titulo, tocar)}</div>

        <div class="video-opcoes">
          <label class="opcao-auto" title="Ir para a próxima aula quando o vídeo terminar">
            <input type="checkbox" id="opc-auto">
            <span class="trilho"></span>
            Reprodução automática
          </label>
          <button type="button" class="opcao" id="opc-vel" title="Velocidade do vídeo">1x</button>
          <button type="button" class="opcao" id="opc-cinema" title="Modo cinema">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="2"/></svg>
            Cinema
          </button>
        </div>

        <div class="aula-acoes">
          <button type="button" class="btn" id="btn-concluir"></button>
          ${/^https?:\/\//.test(a.material || "") ? `<a class="material" href="${esc(a.material)}" target="_blank" rel="noopener">📎 Material da aula</a>` : ""}
        </div>

        ${a.descricao ? `<div class="descricao">${paragrafos(a.descricao)}</div>` : ""}

        <details class="anotacao">
          <summary>Minhas anotações</summary>
          <textarea id="nota" placeholder="Escreva aqui as suas anotações desta aula..."></textarea>
          <small id="nota-status"></small>
        </details>

        <div class="aula-nav">
          ${anterior ? `<a href="#/aula/${esc(anterior.id)}">← Anterior</a>` : "<span></span>"}
          ${proxima ? `<a href="#/aula/${esc(proxima.id)}">Próxima →</a>` : "<span></span>"}
        </div>
      </div>

      <aside class="player-lateral" aria-label="Aulas do curso">
        <div id="lat-topo"></div>
        <div class="lat-busca">
          <input id="lat-q" type="search" placeholder="Pesquisar neste curso..." aria-label="Pesquisar aulas deste curso" autocomplete="off">
        </div>
        <div id="lat-modulos"></div>
      </aside>
    </section>`;

  // coluna da direita: anel de progresso + módulos com as aulas
  function pintarLateral() {
    const p = Progresso.doCurso(c.id);

    document.getElementById("lat-topo").innerHTML = `
      <div class="anel">
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <circle class="anel-fundo" cx="18" cy="18" r="15.9155"/>
          <circle class="anel-valor" cx="18" cy="18" r="15.9155" stroke-dasharray="${p.pct} 100"/>
        </svg>
        <span>${p.pct}%</span>
      </div>
      <div>
        <a class="lat-curso" href="${voltarHref}">${esc(c.titulo)}</a>
        <p class="lat-conta">${p.feitas} de ${p.total} aulas concluídas</p>
      </div>`;

    const t = normTexto(termo.trim());

    document.getElementById("lat-modulos").innerHTML = modulos.map(mod => {
      const aulasMod = Store.aulas(mod.id);
      const feitas = aulasMod.filter(x => Progresso.concluida(x.id)).length;
      const pct = aulasMod.length ? Math.round(feitas * 100 / aulasMod.length) : 0;

      // cada aula guarda o número dela dentro do módulo (01, 02...)
      const linhas = aulasMod
        .map((x, idx) => ({ x, num: String(idx + 1).padStart(2, "0") }))
        .filter(o => !t || normTexto(o.x.titulo).includes(t));

      if (t && !linhas.length) return "";
      const aberto = t ? true : abertos.has(mod.id);

      return `
        <details class="mod" data-mod="${esc(mod.id)}"${aberto ? " open" : ""}>
          <summary>
            <div class="mod-cab"><span class="mod-titulo">${esc(mod.titulo)}</span></div>
            <div class="mod-progresso">
              <span class="mod-cont">${feitas}/${aulasMod.length}</span>
              <div class="mod-barra"><div style="width:${pct}%"></div></div>
            </div>
          </summary>
          <div class="mod-aulas">
            ${linhas.map(o => {
              const feita = Progresso.concluida(o.x.id);
              return `<a class="aula-linha${feita ? " feita" : ""}${o.x.id === a.id ? " atual" : ""}" href="#/aula/${esc(o.x.id)}">
                        <span class="aula-num">${o.num}</span>
                        ${miniaturaAula(o.x)}
                        <span class="aula-nome">${esc(o.x.titulo)}</span>
                        <span class="aula-ok" role="button" title="${feita ? "Desmarcar" : "Marcar como concluída"}">${ICONE_OK}</span>
                      </a>`;
            }).join("")}
          </div>
        </details>`;
    }).join("") || '<p class="res-vazio">Nada encontrado.</p>';

    document.querySelectorAll("#lat-modulos details").forEach(d => d.addEventListener("toggle", () => {
      if (termo.trim()) return;
      if (d.open) abertos.add(d.dataset.mod);
      else abertos.delete(d.dataset.mod);
    }));
  }

  document.getElementById("lat-q").addEventListener("input", (e) => {
    termo = e.target.value;
    pintarLateral();
  });

  // clicar na bolinha marca/desmarca a aula como vista (sem abrir a aula)
  document.getElementById("lat-modulos").addEventListener("click", (e) => {
    const ok = e.target.closest(".aula-ok");
    if (!ok) return;
    e.preventDefault();
    const link = ok.closest("a");
    if (!link) return;
    const aulaId = link.getAttribute("href").replace("#/aula/", "");
    Progresso.marcar(aulaId, !Progresso.concluida(aulaId));
    pintar();
  });

  // botão "Marcar como concluída"
  const btn = document.getElementById("btn-concluir");

  function pintar() {
    const feita = Progresso.concluida(a.id);
    btn.textContent = feita ? "✓ Aula concluída" : "Marcar como concluída";
    btn.classList.toggle("principal", feita);
    pintarLateral();
  }

  btn.addEventListener("click", () => {
    Progresso.marcar(a.id, !Progresso.concluida(a.id));
    pintar();
  });

  // ===== opções abaixo do vídeo =====
  const VELOCIDADES = [1, 1.25, 1.5, 2, 0.75];
  const lerVel = () => Number(pref.ler("teks_vel", "1")) || 1;
  const videoEl = app.querySelector(".video video");   // arquivo de vídeo (quando não é YouTube)
  const player = app.querySelector(".player");
  const btnVel = document.getElementById("opc-vel");
  const chkAuto = document.getElementById("opc-auto");
  const btnCinema = document.getElementById("opc-cinema");
  let yt = null;

  function aplicarVel() {
    const v = lerVel();
    btnVel.textContent = v + "x";
    if (videoEl) videoEl.defaultPlaybackRate = videoEl.playbackRate = v;
    if (yt && yt.setPlaybackRate) yt.setPlaybackRate(v);
  }

  // quando o vídeo termina: marca como vista e, se estiver ligado, vai para a próxima aula
  function aoTerminar() {
    Progresso.marcar(a.id, true);
    pintar();
    if (chkAuto.checked && proxima) {
      try { sessionStorage.setItem("teks_tocar", "1"); } catch (e) { /* sem armazenamento */ }
      location.hash = "#/aula/" + proxima.id;
    }
  }

  btnVel.addEventListener("click", () => {
    const k = VELOCIDADES.indexOf(lerVel());
    pref.gravar("teks_vel", VELOCIDADES[(k + 1) % VELOCIDADES.length]);
    aplicarVel();
  });

  chkAuto.checked = pref.ler("teks_auto", "0") === "1";
  chkAuto.addEventListener("change", () => pref.gravar("teks_auto", chkAuto.checked ? "1" : "0"));

  function aplicarCinema(ligado) {
    player.classList.toggle("cinema", ligado);
    btnCinema.classList.toggle("ativo", ligado);
    pref.gravar("teks_cinema", ligado ? "1" : "0");
  }
  btnCinema.addEventListener("click", () => aplicarCinema(!player.classList.contains("cinema")));
  aplicarCinema(pref.ler("teks_cinema", "0") === "1");

  if (videoEl) {
    videoEl.addEventListener("ended", aoTerminar);
    if (tocar) videoEl.play().catch(() => {});
  }

  if (document.getElementById("yt-player")) {
    carregarYT(() => {
      const el = document.getElementById("yt-player");
      if (!el) return;                                  // a pessoa já saiu desta aula
      yt = new window.YT.Player(el, { events: {
        onReady: aplicarVel,
        onStateChange: (e) => {
          if (e.data === 1) aplicarVel();               // começou a tocar
          if (e.data === 0) aoTerminar();               // terminou
        }
      }});
    });
  }

  aplicarVel();

  // anotação (salva sozinha)
  const nota = document.getElementById("nota");
  const notaStatus = document.getElementById("nota-status");
  nota.value = Notas.ler(a.id);
  if (nota.value) nota.closest("details").open = true;
  nota.addEventListener("input", () => {
    Notas.salvar(a.id, nota.value);
    notaStatus.textContent = "Salvo automaticamente";
  });

  pintar();
}
