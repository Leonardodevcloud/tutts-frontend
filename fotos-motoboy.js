// ============================================================
// FOTOS DE MOTOBOY - helper compartilhado v1 (2026-05)
// Carrega thumbnails de motoboys sob demanda e cacheia em memória.
// Usado pelas listas de admin (Usuários, Saques) pra mostrar a foto
// do motoboy no lugar do avatar de inicial.
//
// API global: window.FotosMotoboy
//   .carregar(codigos, fetchAuth, apiUrl) → Promise<{cod: thumbUrl}>
//   .doCache(cod) → thumbUrl | null  (leitura síncrona do cache)
//   .useFotos(codigos, fetchAuth, apiUrl) → hook React
// ============================================================

(function () {
  // Cache em memória — persiste enquanto a página estiver aberta.
  // chave: cod_profissional (string)  valor: data URL do thumb (ou false = sem foto)
  const cache = {};
  // códigos já consultados (mesmo que não tenham foto) — evita re-pedir
  const consultados = {};

  function doCache(cod) {
    const v = cache[String(cod)];
    return v && v !== false ? v : null;
  }

  // Carrega thumbnails dos códigos informados (só os que ainda não estão em cache).
  async function carregar(codigos, fetchAuth, apiUrl) {
    const api = apiUrl || (typeof window !== 'undefined' && window.API_URL) || '';
    const fetchFn = fetchAuth || (typeof window !== 'undefined' && window.fetchAuth) || fetch;

    // normaliza, tira duplicados, filtra os que já foram consultados
    const pendentes = [];
    const vistos = {};
    (codigos || []).forEach(c => {
      const cod = String(c || '').trim();
      if (!cod || !/^\d+$/.test(cod)) return;
      if (vistos[cod]) return;
      vistos[cod] = true;
      if (!consultados[cod]) pendentes.push(cod);
    });

    if (pendentes.length === 0) {
      // tudo em cache — devolve o que tem
      const r = {};
      Object.keys(vistos).forEach(cod => { const f = doCache(cod); if (f) r[cod] = f; });
      return r;
    }

    // pede em lotes de 150 (limite do backend é 200)
    const LOTE = 150;
    for (let i = 0; i < pendentes.length; i += LOTE) {
      const lote = pendentes.slice(i, i + LOTE);
      try {
        const resp = await fetchFn(`${api}/perfil/fotos?codigos=${lote.join(',')}`, {
          credentials: 'include',
        });
        if (resp.ok) {
          const data = await resp.json();
          const fotos = data.fotos || {};
          lote.forEach(cod => {
            consultados[cod] = true;
            cache[cod] = fotos[cod] || false; // false = consultado, sem foto
          });
        } else if (resp.status === 401 || resp.status === 403) {
          // auth ainda não pronta — NÃO marca consultado, vale re-tentar depois
        } else {
          // outro erro — marca como consultado pra não ficar em loop
          lote.forEach(cod => { consultados[cod] = true; });
        }
      } catch (err) {
        // falha de rede — não marca consultado, pode tentar de novo depois
      }
    }

    const r = {};
    Object.keys(vistos).forEach(cod => { const f = doCache(cod); if (f) r[cod] = f; });
    return r;
  }

  // Hook React: recebe lista de códigos, devolve o mapa de fotos (re-render quando carrega).
  function useFotos(codigos, fetchAuth, apiUrl) {
    const [mapa, setMapa] = React.useState({});
    // chave estável pra disparar o efeito só quando a lista muda de verdade
    const chave = (codigos || []).map(c => String(c || '').trim()).filter(Boolean).sort().join(',');
    React.useEffect(() => {
      let vivo = true;
      if (!chave) { setMapa({}); return; }
      carregar(chave.split(','), fetchAuth, apiUrl).then(r => {
        if (vivo) setMapa(r);
      });
      return () => { vivo = false; };
    }, [chave]);
    return mapa;
  }

  // Componente avatar: foto do motoboy ou inicial do nome.
  // Usa o hook internamente — re-renderiza sozinho quando a foto carrega.
  // Props: cod, nome, size (px, default 44), className opcional
  function AvatarMotoboy(props) {
    const e = React.createElement;
    const cod = props.cod;
    const nome = props.nome || '';
    const size = props.size || 44;
    const mapa = useFotos(cod ? [cod] : [], props.fetchAuth, props.apiUrl);
    const foto = mapa && cod ? mapa[String(cod)] : null;
    const estiloBase = {
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
    };
    if (foto) {
      return e('img', {
        src: foto, alt: nome,
        className: props.className || '',
        style: Object.assign({}, estiloBase, { objectFit: 'cover', border: '1px solid #E5E7EB' }),
      });
    }
    return e('div', {
      className: props.className || '',
      style: Object.assign({}, estiloBase, {
        background: '#EDE9FE', color: '#6D28D9', fontWeight: 700,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: Math.round(size * 0.4),
      }),
    }, (nome || '?').charAt(0).toUpperCase());
  }

  if (typeof window !== 'undefined') {
    window.FotosMotoboy = { carregar, doCache, useFotos, AvatarMotoboy };
  }

  console.log('✅ FotosMotoboy v1.0 carregado');
})();
