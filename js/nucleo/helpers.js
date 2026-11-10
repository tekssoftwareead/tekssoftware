// Funções pequenas usadas em várias telas.

export const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, ch =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

export const normTexto = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const porOrdem = (a, b) => (a.ordem || 0) - (b.ordem || 0);
export const porTitulo = (a, b) => String(a.titulo || a.nome).localeCompare(String(b.titulo || b.nome));

// Texto simples -> parágrafos (linha em branco separa parágrafos)
export const paragrafos = t => String(t || "").split(/\n{2,}/).filter(p => p.trim())
  .map(p => "<p>" + esc(p.trim()).replace(/\n/g, "<br>") + "</p>").join("");

// Aceita links do YouTube (watch, youtu.be, shorts, embed) e devolve o id do vídeo
export function ytId(url) {
  const m = String(url || "").match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/);
  return m ? m[1] : null;
}

// Imagem do vídeo no YouTube (a mesma que aparece lá)
export function miniaturaYT(url) {
  const id = ytId(url);
  return id ? "https://img.youtube.com/vi/" + id + "/mqdefault.jpg" : "";
}

// "1 aula", "3 aulas"
export const plural = (n, um, varios) => n + " " + (n === 1 ? um : varios);
