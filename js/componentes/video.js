// Player de vídeo (YouTube ou arquivo .mp4) e preferências do aluno (velocidade, reprodução automática, cinema).
import { esc, ytId } from "../nucleo/helpers.js";

// preferências guardadas no navegador da pessoa
export const pref = {
  ler(k, padrao) { try { const v = localStorage.getItem(k); return v === null ? padrao : v; } catch (e) { return padrao; } },
  gravar(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* navegador sem armazenamento */ } }
};

// carrega a API do player do YouTube (só uma vez)
export function carregarYT(pronto) {
  if (window.YT && window.YT.Player) return pronto();
  const anterior = window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady = () => { if (anterior) anterior(); pronto(); };
  if (!document.getElementById("yt-api")) {
    const sc = document.createElement("script");
    sc.id = "yt-api";
    sc.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(sc);
  }
}

// monta o vídeo da aula (link do YouTube ou arquivo de vídeo)
export function videoHtml(url, titulo, tocar) {
  if (!url) return '<p class="empty video-vazio">Vídeo ainda não disponível.</p>';
  const id = ytId(url);
  if (id) {
    const origem = location.protocol.indexOf("http") === 0 ? "&origin=" + encodeURIComponent(location.origin) : "";
    return `<div class="yt"><iframe id="yt-player" src="https://www.youtube.com/embed/${id}?enablejsapi=1&rel=0${tocar ? "&autoplay=1" : ""}${origem}"
              title="${esc(titulo || "Vídeo da aula")}" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe></div>`;
  }
  return `<video controls preload="metadata" src="${esc(url)}"></video>`;
}
