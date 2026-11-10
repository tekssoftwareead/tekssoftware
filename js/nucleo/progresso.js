// Progresso (aulas concluídas) e anotações de cada aluno. Ficam salvos no banco, na conta da pessoa,
// e também na memória, para a tela responder na hora. Tabelas: "progresso" e "notas" (do banco do site 1).
import { sb } from "../config/supabase.js";
import { Store } from "./store.js";

let usuarioAtual = null;

export const Progresso = {
  _feitas: {},

  async carregar(uid) {
    usuarioAtual = uid;
    const { data, error } = await sb.from("progresso").select("aula_id").eq("user_id", uid);
    if (error) throw error;
    this._feitas = {};
    (data || []).forEach(r => { this._feitas[r.aula_id] = true; });
  },

  limpar() { this._feitas = {}; usuarioAtual = null; },

  concluida(aulaId) { return !!this._feitas[aulaId]; },

  marcar(aulaId, feita) {
    if (!usuarioAtual) return;
    if (feita) this._feitas[aulaId] = true;
    else delete this._feitas[aulaId];

    const uid = usuarioAtual;
    const pedido = feita
      ? sb.from("progresso").upsert({ user_id: uid, aula_id: aulaId }, { onConflict: "user_id,aula_id" })
      : sb.from("progresso").delete().eq("user_id", uid).eq("aula_id", aulaId);

    pedido.then(({ error }) => {
      if (error) console.error("Não foi possível salvar o progresso:", error.message);
    });
  },

  doCurso(cursoId) {
    const aulas = Store.aulasDoCurso(cursoId);
    const feitas = aulas.filter(a => this.concluida(a.id)).length;
    const pct = aulas.length ? Math.round(feitas * 100 / aulas.length) : 0;
    const status = feitas === 0 ? "nao-iniciado" : (feitas === aulas.length ? "concluido" : "andamento");
    return { feitas, total: aulas.length, pct, status };
  },

  // primeira aula que o aluno ainda não concluiu (ou a primeira, se já terminou tudo)
  proximaAula(cursoId) {
    const aulas = Store.aulasDoCurso(cursoId);
    return aulas.find(a => !this.concluida(a.id)) || aulas[0] || null;
  }
};

export const Notas = {
  _t: {},
  _timers: {},

  async carregar(uid) {
    const { data, error } = await sb.from("notas").select("aula_id, texto").eq("user_id", uid);
    if (error) throw error;
    this._t = {};
    (data || []).forEach(r => { this._t[r.aula_id] = r.texto; });
  },

  limpar() {
    Object.keys(this._timers).forEach(k => clearTimeout(this._timers[k]));
    this._t = {};
    this._timers = {};
  },

  ler(aulaId) { return this._t[aulaId] || ""; },

  // salva no banco um instante depois que a pessoa para de digitar
  salvar(aulaId, texto) {
    if (!usuarioAtual) return;
    if (texto) this._t[aulaId] = texto;
    else delete this._t[aulaId];

    const uid = usuarioAtual;
    clearTimeout(this._timers[aulaId]);
    this._timers[aulaId] = setTimeout(() => {
      const pedido = texto
        ? sb.from("notas").upsert(
            { user_id: uid, aula_id: aulaId, texto, atualizado_em: new Date().toISOString() },
            { onConflict: "user_id,aula_id" })
        : sb.from("notas").delete().eq("user_id", uid).eq("aula_id", aulaId);
      pedido.then(({ error }) => {
        if (error) console.error("Não foi possível salvar a anotação:", error.message);
      });
    }, 800);
  }
};

export const STATUS = { "nao-iniciado": "Não iniciado", andamento: "Em andamento", concluido: "Concluído" };

export function rotuloCurso(p) {
  return p.status === "nao-iniciado" ? "Começar" : (p.status === "concluido" ? "Revisar" : "Continuar");
}

export function barraProgresso(p) {
  return `<div class="progresso" role="progressbar" aria-valuenow="${p.pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Progresso do curso">
            <div class="progresso-barra" style="width:${p.pct}%"></div><span>${p.pct}%</span>
          </div>`;
}
