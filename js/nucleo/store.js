// Todas as telas leem os dados por aqui. Os dados vêm do banco do site 1 (Supabase).
// Depois do login tudo é baixado de uma vez e fica na memória (por isso as telas são rápidas).
import { sb } from "../config/supabase.js";
import { porOrdem, porTitulo } from "./helpers.js";

// ordem definida no painel admin; empate = ordem alfabética
const porOrdemENome = (a, b) => ((a.ordem || 0) - (b.ordem || 0)) || porTitulo(a, b);

const USAR_ARTIGOS = false;

export const Store = {
  _d: null,
  temArtigos: false,   // a tabela "artigos" existe no banco? (se não existir, o site funciona sem ela)

  async carregar() {
    const [cat, cur, mod, aul, art] = await Promise.all([
      sb.from("categorias").select("*").order("ordem"),
      sb.from("cursos").select("*").order("ordem"),
      sb.from("modulos").select("*").order("ordem"),
      sb.from("aulas").select("*").order("ordem"),
      // artigos: a aba saiu do painel e a tabela não existe neste banco. Para voltar a usar, troque USAR_ARTIGOS para true.
      USAR_ARTIGOS ? sb.from("artigos").select("*") : Promise.resolve({ data: [], error: { message: "desligado" } })
    ]);

    const erro = cat.error || cur.error || mod.error || aul.error;
    if (erro) throw erro;

    // artigos são do site 2: se a tabela ainda não foi criada no banco, segue sem eles
    this.temArtigos = !art.error;
    if (art.error && USAR_ARTIGOS) console.warn("Artigos indisponíveis (rode banco/site1-complementos.sql):", art.error.message);

    this._d = {
      categorias: cat.data || [],
      cursos: cur.data || [],
      modulos: mod.data || [],
      aulas: aul.data || [],
      artigos: art.error ? [] : (art.data || [])
    };
  },
  limpar() { this._d = null; this.temArtigos = false; },

  todos(t) { return (this._d && this._d[t]) || []; },
  achar(t, id) { return this.todos(t).find(x => x.id === id); },

  categorias() { return this.todos("categorias").filter(c => c.ativo).sort(porOrdemENome); },
  categoria(id) { return this.achar("categorias", id); },

  artigos(catId) { return this.todos("artigos").filter(a => a.ativo && (!catId || a.categoria_id === catId)).sort(porTitulo); },
  artigo(id) { return this.todos("artigos").find(a => a.id === id && a.ativo); },

  cursos(catId) { return this.todos("cursos").filter(c => c.ativo && (!catId || c.categoria_id === catId)).sort(porOrdemENome); },
  curso(id) { return this.todos("cursos").find(c => c.id === id && c.ativo); },

  modulos(cursoId) { return this.todos("modulos").filter(m => m.curso_id === cursoId).sort(porOrdem); },
  modulo(id) { return this.achar("modulos", id); },

  aulas(moduloId) { return this.todos("aulas").filter(a => a.modulo_id === moduloId && a.ativo).sort(porOrdem); },
  aula(id) { return this.todos("aulas").find(a => a.id === id && a.ativo); },
  aulasDoCurso(cursoId) { return this.modulos(cursoId).flatMap(m => this.aulas(m.id)); },

  // todas as aulas ativas de cursos ativos (usado na pesquisa)
  aulasAtivas() {
    return this.todos("aulas").filter(a => {
      const m = this.modulo(a.modulo_id);
      return a.ativo && m && this.curso(m.curso_id);
    });
  }
};
