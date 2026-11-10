// Sessão do usuário: quem está logado, o perfil (admin, cliente ou aluno) e quais sistemas ele pode ver.
// Usa as tabelas do banco do site 1: "perfis" (papel, ativo) e "acessos" (sistemas liberados para cada cliente).
import { sb } from "../config/supabase.js";
import { Store } from "./store.js";
import { Progresso, Notas } from "./progresso.js";

export const Auth = {
  sessao: null,
  _s: null,   // { id, email, nome, perfil, liberados }

  isLoggedIn() { return !!this._s; },
  perfil() { return this._s ? this._s.perfil : null; },
  usuario() { return this._s; },
  id() { return this._s ? this._s.id : null; },

  /* admin e aluno veem tudo; cliente só vê os sistemas liberados para ele */
  temAcesso(catId) {
    const s = this._s;
    return !s || s.perfil !== "cliente" || !s.liberados || s.liberados.indexOf(catId) > -1;
  },

  /* chamada depois do login (ou ao abrir a página com login salvo) */
  async entrar(sessao) {
    const user = sessao.user;
    const { data: p, error } = await sb.from("perfis")
      .select("id, email, nome, papel, ativo")
      .eq("id", user.id)
      .maybeSingle();

    if (error) throw error;
    if (!p) throw new Error("perfil-nao-encontrado");
    if (!p.ativo) {
      await sb.auth.signOut();
      throw new Error("conta-inativa");
    }

    let liberados = null;
    if (p.papel === "cliente") {
      const { data: acessos, error: erroAcessos } = await sb.from("acessos")
        .select("categoria_id, valido_ate")
        .eq("user_id", user.id);
      if (erroAcessos) throw erroAcessos;

      const hoje = new Date().toISOString().slice(0, 10);
      liberados = (acessos || [])
        .filter(a => !a.valido_ate || a.valido_ate >= hoje)
        .map(a => a.categoria_id);
    }

    this.sessao = sessao;
    this._s = { id: user.id, email: p.email || user.email, nome: p.nome, perfil: p.papel, liberados };

    try {
      await Store.carregar();
      await Progresso.carregar(user.id);
      await Notas.carregar(user.id);
    } catch (e) {
      this.sessao = null;
      this._s = null;
      throw e;
    }
  },

  async sair() {
    try { await sb.auth.signOut(); } catch (e) { /* segue */ }
    this.sessao = null;
    this._s = null;
    Store.limpar();
    Progresso.limpar();
    Notas.limpar();
  }
};

/* traduz os erros do Supabase para mensagens que o usuário entende */
export function mensagemDeErro(e) {
  const m = String((e && e.message) || e || "");
  if (/Invalid login credentials/i.test(m)) return "E-mail ou senha incorretos.";
  if (/Email not confirmed|not confirmed/i.test(m)) return "Seu e-mail ainda não foi confirmado. Confirme pelo e-mail que enviamos ou fale com o suporte.";
  if (/already registered/i.test(m)) return "Este e-mail já tem conta. Clique em Entrar.";
  if (/at least|should be/i.test(m)) return "A senha precisa ter pelo menos 6 caracteres.";
  if (/rate limit/i.test(m)) return "Muitas tentativas. Espere alguns minutos.";
  if (/conta-inativa/.test(m)) return "Esta conta está desativada. Fale com o suporte.";
  if (/perfil-nao-encontrado/.test(m)) return "Sua conta ainda não está configurada. Fale com o suporte.";
  if (/fetch|network|Failed to/i.test(m)) return "Não foi possível conectar. Verifique sua internet e tente de novo.";
  return "Não foi possível entrar agora. Tente de novo em instantes.";
}
