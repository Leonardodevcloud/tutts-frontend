// ==================== MÓDULO CONFIRMA FÁCIL ====================
// modulo-confirmafacil.js — v3
// Abas: NFs Recebidas (busca + paginação + detalhe) + Config
// Admin only
// ===============================================================
(function() {
  'use strict';
  const { useState, useEffect } = React;
  const h = React.createElement;

  // ─── helpers ──────────────────────────────────────────────────
  const fmt = v => {
    if (v == null || v === '') return '—';
    if (typeof v === 'object') {
      // Tenta extrair campo legível comum
      return v.nome || v.numero || v.descricao || v.id || JSON.stringify(v).slice(0,80);
    }
    return String(v);
  };
  const fmtD = d => { try { return d ? new Date(d).toLocaleString('pt-BR') : '—'; } catch(_) { return d; } };
  const fmtCNPJ = v => {
    if (!v) return ''; const n = v.replace(/\D/g,'');
    return n.length===14 ? n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,'$1.$2.$3/$4-$5') : v;
  };
  const fmtMoeda = v => v != null ? 'R$ '+Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2}) : '—';

  function Badge({ txt, cor }) {
    const cores = {
      green: 'bg-green-100 text-green-700', blue:  'bg-blue-100 text-blue-700',
      amber: 'bg-amber-100 text-amber-700', red:   'bg-red-100 text-red-700',
      gray:  'bg-gray-100 text-gray-600',   purple:'bg-purple-100 text-purple-700',
    };
    return h('span',{className:`text-xs font-medium px-2 py-0.5 rounded-full ${cores[cor]||cores.gray}`},txt);
  }

  // ─── Modal de detalhe de NF ────────────────────────────────────
  function ModalDetalheNF({ nf, onFechar, clientes, fetchAuth, API_URL, showToast }) {
    if (!nf) return null;
    const [clienteSel, setClienteSel] = React.useState('');
    const [criando, setCriando]       = React.useState(false);
    const [resultado, setResultado]   = React.useState(null);

    const [testando2, setTestando2] = React.useState(false);

    async function criarCorrida() {
      if (!clienteSel) { showToast('Selecione o cliente para criar a corrida','error'); return; }
      if (!confirm('Criar corrida real para NF '+nf.numero+'?')) return;
      setCriando(true); setResultado(null);
      try {
        const r = await fetchAuth(API_URL+'/confirmafacil/criar-corrida', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ nf, cliente_id: Number(clienteSel) }),
        });
        const d = await r.json();
        setResultado(d);
        if (d.ok) showToast('✅ OS '+d.os_numero+' criada!','success');
        else showToast('❌ '+(d.mensagem||'Erro'),'error');
      } catch(e) { showToast('Erro: '+e.message,'error'); }
      finally { setCriando(false); }
    }

    async function testarOcorrencia() {
      if (!resultado?.solicitacao_id) { showToast('Crie a corrida primeiro','error'); return; }
      setTestando2(true);
      try {
        const r = await fetchAuth(API_URL+'/confirmafacil/testar-ocorrencia', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ solicitacao_id: resultado.solicitacao_id, status: 'finalizado_ponto' }),
        });
        const d = await r.json();
        if (d.logs?.length > 0) {
          const log = d.logs[0];
          if (log.sucesso) {
            showToast('✅ CF recebeu a ocorrência! NF: '+log.numero_nf+' | Cod: '+log.cod_ocorrencia,'success');
          } else {
            showToast('❌ CF rejeitou: '+(log.erro_msg||'sem detalhe'),'error');
          }
        } else {
          showToast(d.mensagem||'Sem log','error');
        }
        setResultado(prev => ({...prev, logs: d.logs, log_mensagem: d.mensagem}));
      } catch(e) { showToast('Erro: '+e.message,'error'); }
      finally { setTestando2(false); }
    }
    const emb  = nf.embarque || nf;
    const dest = nf.destinatario || {};
    const end  = dest.endereco || nf.endereco || {};
    const embarcador = nf.embarcador || {};
    const transp = nf.transportadora || {};
    const ocorrs = nf.ocorrencias || [];
    const ultimaOc = nf.ultimaOcorrenciaDaNota || nf.ultimaOcorrenciaCriada || null;
    const status  = nf.statusEmbarque?.nome || '—';

    const Sec = ({titulo, children}) =>
      h('div',{className:'mb-5'},
        h('h4',{className:'text-xs font-semibold text-purple-700 uppercase tracking-wide mb-2 pb-1 border-b border-purple-100'},titulo),
        children
      );

    const Campo = ({label, valor, mono}) => {
      const safe = typeof valor === 'object' && valor !== null
        ? (valor.nome||valor.numero||valor.descricao||valor.id||JSON.stringify(valor).slice(0,80))
        : valor;
      return h('div',{className:'mb-1.5'},
        h('span',{className:'text-xs text-gray-400 block'},label),
        h('span',{className:'text-sm text-gray-800 '+(mono?'font-mono':'')},fmt(safe))
      );
    };

    const Grid = ({children}) => h('div',{className:'grid grid-cols-2 gap-x-6 gap-y-1'},children);

    return h('div',{
      className:'fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto',
      onClick: e => e.target===e.currentTarget && onFechar(),
    },
      h('div',{className:'bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8'},
        // Header
        h('div',{className:'flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10'},
          h('div',null,
            h('h3',{className:'text-base font-bold text-gray-900'},'NF '+fmt(emb.numero||nf.numero)),
            h('div',{className:'flex items-center gap-2 mt-1'},
              h(Badge,{txt:'Série '+(emb.serie||nf.serie||'—'),cor:'blue'}),
              h(Badge,{txt:status,cor:status==='ENTREGUE'?'green':status==='EM TRÂNSITO'?'amber':'gray'}),
              nf.idEmbarque && h(Badge,{txt:'ID '+nf.idEmbarque,cor:'purple'})
            )
          ),
          h('div',{className:'flex items-center gap-2'},
            // Seletor de cliente + botão criar corrida
            h('select',{
              value:clienteSel, onChange:e=>setClienteSel(e.target.value),
              className:'border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-400',
            },
              h('option',{value:''},'Selecione cliente...'),
              (clientes||[]).map(c=>h('option',{key:c.id,value:c.id},c.nome||c.empresa||c.email))
            ),
            h('button',{
              onClick:criarCorrida, disabled:criando||!clienteSel,
              className:'px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 whitespace-nowrap',
            }, criando?'⏳ Criando...':'🚀 Criar Corrida'),
            h('button',{onClick:onFechar,className:'text-gray-400 hover:text-gray-700 text-2xl leading-none ml-1'},'×')
          )
        ),

        resultado && h('div',{className:'mx-5 mt-4 space-y-2'},
          h('div',{
            className:'p-3 rounded-xl text-sm font-medium '+(resultado.ok
              ?'bg-green-50 border border-green-200 text-green-800'
              :'bg-red-50 border border-red-100 text-red-700')},
            resultado.ok
              ? '✅ Corrida criada! OS: '+resultado.os_numero+' | ID: '+resultado.solicitacao_id
              : '❌ '+resultado.mensagem
          ),
          resultado.ok && h('div',{className:'flex items-center gap-3 flex-wrap'},
            h('p',{className:'text-xs text-gray-500'},'Agora teste se o CF vai receber corretamente:'),
            h('button',{
              onClick:testarOcorrencia, disabled:testando2,
              className:'px-4 py-2 bg-green-600 text-white text-xs font-medium rounded-xl hover:bg-green-700 disabled:opacity-50',
            }, testando2?'⏳ Testando...':'🔔 Testar envio ao CF (simular entrega)'),
          ),
          resultado.logs && h('div',{className:'space-y-1'},
            resultado.logs.map((log,i)=>
              h('div',{key:i,className:'flex items-center gap-2 p-2 rounded-lg text-xs '+(log.sucesso?'bg-green-50 text-green-800':'bg-red-50 text-red-700')},
                h('span',null,log.sucesso?'✅':'❌'),
                h('span',{className:'font-medium'},'NF '+log.numero_nf),
                h('span',null,'Cod: '+(log.cod_ocorrencia||'—')),
                log.sucesso
                  ? h('span',{className:'text-green-600 font-medium'},'CF recebeu!')
                  : h('span',{className:'text-red-600'},'Erro: '+(log.erro_msg||'—'))
              )
            )
          )
        ),
        h('div',{className:'p-5 space-y-4'},

          // Embarque
          h(Sec,{titulo:'📦 Dados do Embarque'},
            h(Grid,null,
              h(Campo,{label:'Número NF',valor:emb.numero||nf.numero,mono:true}),
              h(Campo,{label:'Série',valor:emb.serie||nf.serie,mono:true}),
              h(Campo,{label:'Chave NF-e',valor:emb.chave||nf.chave,mono:true}),
              h(Campo,{label:'Tipo Operação',valor:emb.tipoOperacao!=null?String(emb.tipoOperacao):'—'}),
              h(Campo,{label:'Tipo Envio',valor:emb.tipoEnvio}),
              h(Campo,{label:'Tipo de Frete',valor:emb.tipoDeFrete}),
              h(Campo,{label:'Valor',valor:fmtMoeda(emb.valor)}),
              h(Campo,{label:'Peso Bruto',valor:emb.pesoBruto!=null?emb.pesoBruto+' kg':'—'}),
              h(Campo,{label:'Qtd Volumes',valor:emb.quantidadeVolumes}),
              h(Campo,{label:'Romaneio',valor:emb.romaneio?.numero||emb.romaneio?.id||''}),
              h(Campo,{label:'Data Emissão',valor:fmtD(emb.dataEmissao)}),
              h(Campo,{label:'Data Embarque',valor:fmtD(emb.dataEmbarque)}),
              h(Campo,{label:'Previsão',valor:fmtD(emb.dataPrevisao)}),
              h(Campo,{label:'Prev. Destinatário',valor:fmtD(emb.dataPrevisaoDestinatario)}),
              h(Campo,{label:'Data Entrega',valor:fmtD(emb.dataEntrega)}),
              h(Campo,{label:'Criado em',valor:fmtD(emb.dataCriacao||nf.dataCriacao)}),
              h(Campo,{label:'Dias de Atraso',valor:nf.diasAtraso!=null?nf.diasAtraso+' dias':'—'}),
              h(Campo,{label:'Lead Time Produtivo',valor:nf.leadTimeProdutivo!=null?nf.leadTimeProdutivo+' min':'—'}),
            )
          ),

          // Embarcador
          h(Sec,{titulo:'🏭 Embarcador'},
            h(Grid,null,
              h(Campo,{label:'Nome',valor:embarcador.nome}),
              h(Campo,{label:'CNPJ',valor:fmtCNPJ(embarcador.cnpj),mono:true}),
              h(Campo,{label:'Cidade',valor:embarcador.endereco?.cidade}),
              h(Campo,{label:'UF',valor:embarcador.endereco?.uf}),
            )
          ),

          // Destinatário
          h(Sec,{titulo:'📍 Destinatário'},
            h(Grid,null,
              h(Campo,{label:'Nome',valor:dest.nome}),
              h(Campo,{label:'CNPJ/CPF',valor:fmtCNPJ(dest.cnpj),mono:true}),
              h(Campo,{label:'Celular',valor:dest.celular}),
              h(Campo,{label:'Email',valor:dest.email}),
              h(Campo,{label:'Logradouro',valor:end.logradouro}),
              h(Campo,{label:'Número',valor:end.numero}),
              h(Campo,{label:'CEP',valor:end.cep,mono:true}),
              h(Campo,{label:'Cidade',valor:end.cidade}),
              h(Campo,{label:'UF',valor:end.uf}),
              h(Campo,{label:'Latitude',valor:end.latitude||'não informado pelo embarcador'}),
              h(Campo,{label:'Longitude',valor:end.longitude||'não informado pelo embarcador'}),
            )
          ),

          // Trecho
          nf.trecho?.length > 0 && h(Sec,{titulo:'🗺️ Trecho de Entrega'},
            h('div',{className:'space-y-3'},
              nf.trecho.map((t,i)=>
                h('div',{key:i,className:'bg-gray-50 rounded-xl p-3'},
                  h('p',{className:'text-xs font-semibold text-gray-500 mb-2'},'Trecho '+(t.ordem||i+1)),
                  h(Grid,null,
                    h(Campo,{label:'Origem',valor:[t.enderecoOrigem?.logradouro,t.enderecoOrigem?.numero,t.enderecoOrigem?.cidade,t.enderecoOrigem?.uf].filter(Boolean).join(', ')}),
                    h(Campo,{label:'Destino',valor:[t.enderecoDestino?.logradouro,t.enderecoDestino?.numero,t.enderecoDestino?.cidade,t.enderecoDestino?.uf].filter(Boolean).join(', ')}),
                    h(Campo,{label:'CEP Destino',valor:t.enderecoDestino?.cep,mono:true}),
                    h(Campo,{label:'Previsão',valor:fmtD(t.dataPrevisao)}),
                  )
                )
              )
            )
          ),

          // Status adicional + Link rastreamento
          h(Sec,{titulo:'📊 Status e Rastreamento'},
            h(Grid,null,
              h(Campo,{label:'Status Nota',valor:nf.statusNota}),
              h(Campo,{label:'Status Comercial',valor:nf.statusNotaComercial}),
              h(Campo,{label:'Status Trecho',valor:Array.isArray(nf.statusTrecho)?nf.statusTrecho.join(', '):nf.statusTrecho}),
              h(Campo,{label:'Rastron',valor:nf.rastronStatus}),
            ),
            nf.linkExterno && h('div',{className:'mt-3'},
              h('a',{
                href:nf.linkExterno, target:'_blank', rel:'noopener noreferrer',
                className:'inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700',
              },'🔗 Abrir rastreamento público →')
            )
          ),

          // Transportadora
          transp.nome && h(Sec,{titulo:'🚚 Transportadora'},
            h(Grid,null,
              h(Campo,{label:'Nome',valor:transp.nome}),
              h(Campo,{label:'CNPJ',valor:fmtCNPJ(transp.cnpj),mono:true}),
            )
          ),

          // Última ocorrência
          ultimaOc && h(Sec,{titulo:'🔔 Última Ocorrência'},
            h(Grid,null,
              h(Campo,{label:'Tipo',valor:ultimaOc.tipoOcorrencia?.nome||ultimaOc.tipoOcorrencia?.descricao||''}),
              h(Campo,{label:'Data',valor:fmtD(ultimaOc.data||ultimaOc.dataCriacao)}),
              h(Campo,{label:'Comentário',valor:ultimaOc.comentario}),
              h(Campo,{label:'Origem',valor:ultimaOc.origem}),
              h(Campo,{label:'Latitude',valor:ultimaOc.latitude,mono:true}),
              h(Campo,{label:'Longitude',valor:ultimaOc.longitude,mono:true}),
            )
          ),

          // Ocorrências anteriores
          ocorrs.length > 0 && h(Sec,{titulo:'📋 Histórico de Ocorrências ('+ocorrs.length+')'},
            h('div',{className:'space-y-2 max-h-48 overflow-y-auto'},
              ocorrs.map((oc,i)=>
                h('div',{key:i,className:'flex items-start gap-3 p-2.5 bg-gray-50 rounded-lg text-xs'},
                  h('span',{className:'text-gray-400 shrink-0'},fmtD(oc.data||oc.dataCriacao)),
                  h('div',null,
                    h('p',{className:'font-medium text-gray-700'},
                      oc.tipoOcorrencia?.nome||oc.tipoOcorrencia?.descricao||String(oc.tipoOcorrencia||'—')),
                    oc.comentario && h('p',{className:'text-gray-500 mt-0.5'},oc.comentario)
                  )
                )
              )
            )
          ),

          // JSON bruto
          h(Sec,{titulo:'🔧 Dados brutos (JSON completo da API)'},
            h('pre',{
              className:'bg-gray-900 text-green-400 text-xs p-4 rounded-xl overflow-auto max-h-64 select-all',
            }, JSON.stringify(nf, null, 2))
          )
        )
      )
    );
  }

  // ─── ABA NFs ──────────────────────────────────────────────────
  function AbaNFs({ fetchAuth, API_URL, showToast }) {
    const [vinculos, setVinculos]   = useState([]);
    const [loadingVinc, setLoadingVinc] = useState(false);
    const [testando3, setTestando3] = useState(null);
    const [logsVinc, setLogsVinc]   = useState({});

    async function testarVinculo(solicitacaoId) {
      setTestando3(solicitacaoId);
      try {
        const r = await fetchAuth(API_URL+'/confirmafacil/testar-ocorrencia', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ solicitacao_id: solicitacaoId, status: 'finalizado_ponto' }),
        });
        const d = await r.json();
        // Guardar resultado completo para mostrar diagnóstico
        setLogsVinc(prev => ({...prev, [solicitacaoId]: { logs: d.logs||[], mensagem: d.mensagem, ok: d.ok }}));
        if (d.ok) showToast('✅ CF recebeu a ocorrência!','success');
        else showToast('⚠️ '+d.mensagem,'error');
      } catch(e) { showToast('Erro: '+e.message,'error'); }
      finally { setTestando3(null); }
    }
    const [buscaVinc, setBuscaVinc] = useState('');
    const [paginaVinc, setPaginaVinc] = useState(0);

    // Busca direta CF
    const [testando, setTestando]   = useState(false);
    const [resultado, setResultado] = useState(null);
    const [filtroDE, setFiltroDE]   = useState('');
    const [filtroATE, setFiltroATE] = useState('');
    const [cfEmail, setCfEmail]     = useState('contato@tutts.com.br');
    const [cfSenha, setCfSenha]     = useState('Confirma@2026');
    const [cfCnpj, setCfCnpj]       = useState('');
    const [semConfig, setSemConfig] = useState(false);
    const [paginaCF, setPaginaCF]   = useState(0);
    const [totalCF, setTotalCF]     = useState(0);
    const [nfDetalhe, setNfDetalhe] = useState(null);
    const [buscaCF, setBuscaCF]     = useState('');
    const POR_PAG_CF   = 50;
    const POR_PAG_VINC = 25;

    const [clientes, setClientes] = useState([]);
    useEffect(() => {
      carregarVinculos();
      fetchAuth(API_URL+'/admin/solicitacao/clientes')
        .then(r=>r.json()).then(d=>setClientes(d.clientes||d||[])).catch(()=>{});
    }, []);

    async function carregarVinculos() {
      setLoadingVinc(true);
      try {
        const r = await fetchAuth(API_URL+'/confirmafacil/nfs');
        const d = await r.json();
        setVinculos(d.vinculos||[]);
      } catch(_) { showToast('Erro ao carregar','error'); }
      finally { setLoadingVinc(false); }
    }

    async function buscarNoCF(pg) {
      const pagAtual = pg !== undefined ? pg : paginaCF;
      setTestando(true);
      try {
        const body = { page: pagAtual, size: POR_PAG_CF };
        if (filtroDE) body.de = filtroDE.replace('T',' ');
        if (filtroATE) body.ate = filtroATE.replace('T',' ');
        if (cfEmail && cfSenha) { body.cf_email = cfEmail; body.cf_senha = cfSenha; }
        if (cfCnpj) body.cnpj_transportadora = cfCnpj;

        const r = await fetchAuth(API_URL+'/confirmafacil/buscar-nfs', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify(body),
        });
        const d = await r.json();

        if (d.ok) {
          setResultado(prev => {
            if (!prev || pagAtual === 0) return d;
            // Acumular páginas por cliente
            const merged = {...d};
            merged.resultados = d.resultados.map((r2, i) => ({
              ...r2,
              nfs: pagAtual > 0
                ? [...(prev.resultados?.[i]?.nfs||[]), ...(r2.nfs||[])]
                : r2.nfs,
            }));
            return merged;
          });
          const tot = d.resultados?.[0]?.total || 0;
          setTotalCF(tot);
          setSemConfig(false);
          if (pagAtual === 0) {
            showToast('🔍 '+tot+' NF(s) encontradas no CF','success');
          }
        } else {
          showToast(d.mensagem||'Erro ao buscar','error');
          if (d.mensagem?.includes('configurado')) setSemConfig(true);
        }
      } catch(e) { showToast('Erro: '+e.message,'error'); }
      finally { setTestando(false); }
    }

    function carregarMais() {
      const prox = paginaCF + 1;
      setPaginaCF(prox);
      buscarNoCF(prox);
    }

    // NFs da busca CF com filtro local
    const todasNfsCF = resultado?.resultados?.flatMap(r => r.nfs||[]) || [];
    const nfsCFfiltradas = buscaCF
      ? todasNfsCF.filter(nf =>
          JSON.stringify(nf).toLowerCase().includes(buscaCF.toLowerCase()))
      : todasNfsCF;

    // Vinculos com filtro
    const fmtCNPJf = v => v||'';
    const vincFiltrados = vinculos.filter(v =>
      !buscaVinc ||
      (v.numero_nf||'').toLowerCase().includes(buscaVinc.toLowerCase()) ||
      (v.cnpj_embarcador||'').includes(buscaVinc) ||
      String(v.id_embarque||'').includes(buscaVinc) ||
      (v.cliente_nome||'').toLowerCase().includes(buscaVinc.toLowerCase()) ||
      (v.tutts_os_numero||'').includes(buscaVinc)
    );
    const pagTotalVinc = Math.ceil(vincFiltrados.length/POR_PAG_VINC);
    const vincPaginados = vincFiltrados.slice(paginaVinc*POR_PAG_VINC,(paginaVinc+1)*POR_PAG_VINC);
    const jaCarregadas = todasNfsCF.length;
    const temMais = jaCarregadas < totalCF;

    return h('div',{className:'space-y-5'},

      // ── Painel busca CF ──────────────────────────────────────
      h('div',{className:'bg-white rounded-2xl border border-gray-100 shadow-sm p-5'},
        h('h3',{className:'text-sm font-semibold text-gray-700 mb-1'},'🔍 Buscar NFs no ConfirmaFácil agora'),
        h('p',{className:'text-xs text-gray-500 mb-4'},'Consulta a API do CF diretamente — sem criar corridas. Clique em qualquer NF para ver todos os dados.'),

        h('div',{className:'flex flex-wrap items-end gap-3 mb-4'},
          h('div',null,
            h('label',{className:'block text-xs font-medium text-gray-600 mb-1'},'De'),
            h('input',{type:'datetime-local',value:filtroDE,onChange:e=>setFiltroDE(e.target.value),
              className:'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400'})
          ),
          h('div',null,
            h('label',{className:'block text-xs font-medium text-gray-600 mb-1'},'Até'),
            h('input',{type:'datetime-local',value:filtroATE,onChange:e=>setFiltroATE(e.target.value),
              className:'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400'})
          ),
          h('button',{
            onClick:()=>{setPaginaCF(0);setResultado(null);buscarNoCF(0);},
            disabled:testando,
            className:'px-5 py-2 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 disabled:opacity-50 h-[38px]',
          }, testando?'⏳ Buscando...':'🔍 Buscar no CF')
        ),

        // Campos credenciais quando sem config
        semConfig && h('div',{className:'flex flex-wrap gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl mb-4'},
          h('p',{className:'w-full text-xs font-medium text-amber-800 mb-1'},'⚙️ Informe as credenciais para teste:'),
          h('input',{type:'email',placeholder:'Email CF',value:cfEmail,onChange:e=>setCfEmail(e.target.value),
            className:'border border-amber-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none w-56'}),
          h('input',{type:'password',placeholder:'Senha CF',value:cfSenha,onChange:e=>setCfSenha(e.target.value),
            className:'border border-amber-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none w-44'}),
          h('input',{type:'text',placeholder:'CNPJ Transportadora (opcional)',value:cfCnpj,onChange:e=>setCfCnpj(e.target.value),
            className:'border border-amber-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none w-56'})
        ),

        // Resultado
        resultado && h('div',{className:'space-y-3'},
          resultado.ok===false
            ? h('div',{className:'p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700'},'❌ '+resultado.mensagem)
            : resultado.resultados?.map((res,i) =>
                h('div',{key:i,className:'border border-gray-100 rounded-xl overflow-hidden'},
                  // Header
                  h('div',{className:'flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100'},
                    h('div',{className:'flex items-center gap-3'},
                      h('span',{className:'font-medium text-sm text-gray-800'},res.cliente_nome||'Teste direto'),
                      res.ok && h('span',{className:'text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full font-medium'},
                        jaCarregadas+' de '+totalCF+' NFs carregadas')
                    ),
                    res.ok && h('input',{
                      type:'text', placeholder:'🔍 filtrar NFs...',
                      value:buscaCF, onChange:e=>setBuscaCF(e.target.value),
                      className:'border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-purple-400',
                    })
                  ),

                  // Lista NFs
                  res.ok && nfsCFfiltradas.length > 0
                    ? h('div',{className:'divide-y divide-gray-50'},
                        nfsCFfiltradas.map((nf,j) => {
                          const emb    = nf.embarque || nf;
                          const dest   = nf.destinatario || {};
                          const embNome = nf.embarcador?.nome||'—';
                          const status  = nf.statusEmbarque?.nome;
                          return h('div',{
                            key:j,
                            className:'px-4 py-3 hover:bg-purple-50 cursor-pointer transition-colors',
                            onClick: ()=>setNfDetalhe(nf),
                          },
                            h('div',{className:'flex items-start justify-between gap-4'},
                              h('div',{className:'flex-1 min-w-0'},
                                h('div',{className:'flex items-center gap-2 flex-wrap'},
                                  h('p',{className:'font-semibold text-sm text-gray-900'},
                                    'NF '+(emb.numero||nf.numero||'—')),
                                  h('span',{className:'text-xs text-gray-400'},'Série: '+(emb.serie||nf.serie||'—')),
                                  status && h(Badge,{txt:status,
                                    cor:status==='ENTREGUE'?'green':status==='EM TRÂNSITO'||status==='A ENTREGAR'?'amber':'gray'})
                                ),
                                h('p',{className:'text-xs text-gray-500 mt-0.5'},
                                  '🏭 '+embNome+
                                  ' · 📍 '+(dest.nome||'—')+
                                  (dest.endereco?.cidade?' · '+dest.endereco.cidade+(dest.endereco.uf?' / '+dest.endereco.uf:''):'')
                                ),
                                h('div',{className:'flex items-center gap-3 mt-1'},
                                  nf.idEmbarque && h('span',{className:'text-xs font-mono text-purple-500'},'ID: '+nf.idEmbarque),
                                  emb.valor != null && h('span',{className:'text-xs text-gray-500'},fmtMoeda(emb.valor)),
                                  emb.dataPrevisao && h('span',{className:'text-xs text-gray-500'},
                                    'Prev: '+fmtD(emb.dataPrevisao)),
                                  nf.diasAtraso > 0 && h(Badge,{txt:nf.diasAtraso+'d atraso',cor:'red'})
                                )
                              ),
                              h('span',{className:'text-xs text-purple-400 shrink-0 mt-1'},'ver detalhes →')
                            )
                          );
                        }),
                        // Carregar mais
                        temMais && !buscaCF && h('div',{className:'px-4 py-3 bg-gray-50 flex items-center justify-between border-t border-gray-100'},
                          h('span',{className:'text-xs text-gray-500'},
                            jaCarregadas+' de '+totalCF+' NFs carregadas'),
                          h('button',{
                            onClick: carregarMais, disabled: testando,
                            className:'px-4 py-2 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50',
                          }, testando?'Carregando...':'Carregar mais '+POR_PAG_CF)
                        )
                      )
                    : res.ok && h('p',{className:'px-4 py-4 text-sm text-gray-400 text-center'},
                        buscaCF?'Nenhum resultado para "'+buscaCF+'"':'Nenhuma NF neste período')
                )
              )
        )
      ),

      // ── NFs processadas ──────────────────────────────────────
      h('div',{className:'bg-white rounded-2xl border border-gray-100 shadow-sm p-5'},
        h('div',{className:'flex flex-wrap items-center gap-3 mb-4'},
          h('h3',{className:'text-sm font-semibold text-gray-700 flex-1'},
            '📄 NFs recebidas e vinculadas a corridas',
            vinculos.length>0 && h('span',{className:'ml-2 text-xs font-normal text-gray-400'},vinculos.length+' total')),
          h('input',{
            type:'text', placeholder:'🔍 NF, OS, CNPJ, cliente...',
            value:buscaVinc, onChange:e=>{setBuscaVinc(e.target.value);setPaginaVinc(0);},
            className:'border border-gray-200 rounded-xl px-3 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-purple-400',
          }),
          h('button',{onClick:carregarVinculos,className:'px-4 py-2 border border-gray-200 text-sm rounded-xl hover:border-purple-300'},'🔄')
        ),

        loadingVinc
          ? h('div',{className:'flex items-center justify-center h-28 text-gray-400 text-sm'},'⏳ Carregando...')
          : vincFiltrados.length===0
            ? h('div',{className:'flex flex-col items-center justify-center h-28 text-gray-400'},
                h('span',{className:'text-3xl mb-2'},'📭'),
                h('p',{className:'text-sm'},buscaVinc?'Nenhum resultado':'Nenhuma NF processada ainda'),
                !buscaVinc && h('p',{className:'text-xs mt-1'},'Use "Buscar no CF" acima para testar a conexão')
              )
            : h('div',null,
                h('div',{className:'overflow-x-auto'},
                  h('table',{className:'w-full text-sm'},
                    h('thead',null,
                      h('tr',{className:'bg-gray-50 border-b border-gray-100'},
                        ['Cliente','ID Embarque','NF','Série','CNPJ Emb.','OS Tutts','Status','Recebido em',''].map(col=>
                          h('th',{key:col,className:'px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide'},col)
                        )
                      )
                    ),
                    h('tbody',null,
                      vincPaginados.map((v,i)=>
                        h('tr',{key:v.id,className:(i%2===0?'hover:bg-gray-50':'bg-gray-50/50 hover:bg-gray-50')},
                          h('td',{className:'px-3 py-2.5'},
                            h('span',{className:'bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full text-xs'},v.cliente_nome||'—')),
                          h('td',{className:'px-3 py-2.5 font-mono text-xs text-gray-500'},v.id_embarque||'—'),
                          h('td',{className:'px-3 py-2.5 font-medium text-gray-800'},v.numero_nf||'—'),
                          h('td',{className:'px-3 py-2.5 text-gray-600'},v.serie_nf||'—'),
                          h('td',{className:'px-3 py-2.5 text-xs font-mono text-gray-500'},fmtCNPJ(v.cnpj_embarcador)),
                          h('td',{className:'px-3 py-2.5'},
                            v.tutts_os_numero
                              ? h('span',{className:'text-xs font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full'},v.tutts_os_numero)
                              : h('span',{className:'text-xs text-gray-400'},'—')
                          ),
                          h('td',{className:'px-3 py-2.5'},
                            h('span',{className:'text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700'},v.status||'enviado')),
                          h('td',{className:'px-3 py-2.5 text-xs text-gray-500'},fmtD(v.criado_em)),
                          h('td',{className:'px-3 py-2.5'},
                            v.solicitacao_id && h('div',{className:'space-y-1'},
                              h('button',{
                                onClick:()=>testarVinculo(v.solicitacao_id),
                                disabled:testando3===v.solicitacao_id,
                                className:'text-xs px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 whitespace-nowrap',
                              }, testando3===v.solicitacao_id?'⏳':'🔔 Testar CF'),
                              logsVinc[v.solicitacao_id] && h('div',{className:'mt-1 text-xs max-w-xs'},
                                !logsVinc[v.solicitacao_id].ok && logsVinc[v.solicitacao_id].mensagem &&
                                  h('p',{className:'bg-amber-50 border border-amber-200 text-amber-800 px-2 py-1 rounded text-xs leading-tight'},
                                    logsVinc[v.solicitacao_id].mensagem),
                                (logsVinc[v.solicitacao_id].logs||[]).map((log,i)=>
                                  h('div',{key:i,className:'px-2 py-1 rounded mt-1 '+(log.sucesso?'bg-green-100 text-green-800':'bg-red-100 text-red-700')},
                                    log.sucesso?'✅ CF recebeu! NF: '+log.numero_nf:'❌ '+(log.erro_msg||'erro')
                                  )
                                )
                              )
                            )
                          )
                        )
                      )
                    )
                  )
                ),
                pagTotalVinc>1 && h('div',{className:'flex items-center justify-between px-4 py-3 border-t border-gray-100'},
                  h('span',{className:'text-xs text-gray-500'},
                    vincFiltrados.length+' NFs · Página '+(paginaVinc+1)+' de '+pagTotalVinc),
                  h('div',{className:'flex gap-2'},
                    h('button',{onClick:()=>setPaginaVinc(p=>Math.max(0,p-1)),disabled:paginaVinc===0,
                      className:'px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40'},'← Ant'),
                    h('button',{onClick:()=>setPaginaVinc(p=>Math.min(pagTotalVinc-1,p+1)),disabled:paginaVinc>=pagTotalVinc-1,
                      className:'px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40'},'Próx →')
                  )
                )
              )
      ),

      // Modal detalhe
      nfDetalhe && h(ModalDetalheNF,{nf:nfDetalhe,onFechar:()=>setNfDetalhe(null),clientes,fetchAuth,API_URL,showToast})
    );
  }

  // ─── MODAL EMBARCADOR ──────────────────────────────────────────
  function ModalEmbarcador({ clienteId, embarcador, onSalvar, onFechar, fetchAuth, API_URL, showToast }) {
    const [form, setForm] = useState({
      cnpj_embarcador:'',nome_embarcador:'',coleta_rua:'',coleta_numero:'',
      coleta_bairro:'',coleta_cidade:'',coleta_uf:'',coleta_cep:'',
      coleta_lat:'',coleta_lng:'',coleta_nome_fantasia:'',coleta_telefone:'',
      ...embarcador,
    });
    const [salvando, setSalvando] = useState(false);
    const set = (k,v) => setForm(f=>({...f,[k]:v}));
    async function salvar() {
      if (!form.cnpj_embarcador||!form.coleta_cidade||!form.coleta_uf) {
        showToast('CNPJ, cidade e UF são obrigatórios','error'); return; }
      setSalvando(true);
      try {
        const r = await fetchAuth(API_URL+'/confirmafacil/embarcadores',{
          method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({cliente_id:clienteId,...form})});
        const d = await r.json();
        d.ok ? (showToast('✅ Salvo!','success'),onSalvar()) : showToast(d.error||'Erro','error');
      } catch(_){showToast('Erro','error');}
      finally{setSalvando(false);}
    }
    const inp=(label,campo,opts={})=>
      h('div',{className:opts.full?'col-span-2':'col-span-1'},
        h('label',{className:'block text-xs font-medium text-gray-600 mb-1'},label),
        h('input',{type:opts.type||'text',value:form[campo],onChange:e=>set(campo,e.target.value),
          placeholder:opts.ph||'',
          className:'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400'})
      );
    return h('div',{className:'fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4',
      onClick:e=>e.target===e.currentTarget&&onFechar()},
      h('div',{className:'bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto'},
        h('div',{className:'flex items-center justify-between p-5 border-b border-gray-100'},
          h('h3',{className:'text-base font-semibold text-gray-800'},embarcador?'✏️ Editar':'➕ Novo Embarcador'),
          h('button',{onClick:onFechar,className:'text-gray-400 hover:text-gray-600 text-xl leading-none'},'×')),
        h('div',{className:'p-5 grid grid-cols-2 gap-4'},
          inp('CNPJ Embarcador *','cnpj_embarcador',{full:true,ph:'00.000.000/0000-00'}),
          inp('Nome Embarcador','nome_embarcador',{full:true}),
          h('div',{className:'col-span-2'},h('p',{className:'text-xs font-semibold text-purple-700 uppercase tracking-wide mt-1 mb-1'},'📍 Endereço de Coleta')),
          inp('Nome Fantasia','coleta_nome_fantasia',{full:true}),
          inp('Rua','coleta_rua',{full:true}),
          inp('Número','coleta_numero'),inp('Bairro','coleta_bairro'),
          inp('Cidade *','coleta_cidade'),inp('UF *','coleta_uf',{ph:'SP'}),
          inp('CEP','coleta_cep'),inp('Telefone','coleta_telefone'),
          inp('Latitude','coleta_lat'),inp('Longitude','coleta_lng'),
        ),
        h('div',{className:'flex justify-end gap-3 p-5 border-t border-gray-100'},
          h('button',{onClick:onFechar,className:'px-4 py-2 text-sm text-gray-600'},'Cancelar'),
          h('button',{onClick:salvar,disabled:salvando,
            className:'px-5 py-2 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 disabled:opacity-50'},
            salvando?'Salvando...':'Salvar'))
      )
    );
  }

  // ─── ABA CONFIG ────────────────────────────────────────────────
  function AbaConfig({ fetchAuth, API_URL, showToast }) {
    const [clientes,setClientes]=[useState([])][0];const[sC,sSC]=useState([]);
    const [clienteSel,setClienteSel]=useState('');
    const [config,setConfig]=useState(null);
    const [embs,setEmbs]=useState([]);
    const [formC,setFormC]=useState({cf_email:'',cf_senha:'',cf_id_cliente:'320',cnpj_transportadora:'',polling_ativo:true,ativo:true});
    const [modalEmb,setModalEmb]=useState(null);
    const [loading,setLoading]=useState(false);
    const [testando,setTestando]=useState(false);

    useEffect(()=>{
      fetchAuth(API_URL+'/admin/solicitacao/clientes').then(r=>r.json()).then(d=>sSC(d.clientes||d||[])).catch(()=>{});
    },[]);
    useEffect(()=>{
      if(!clienteSel)return;setConfig(null);setEmbs([]);
      fetchAuth(API_URL+'/confirmafacil/config/'+clienteSel).then(r=>r.json()).then(d=>{
        if(d.config){setConfig(d.config);setFormC({cf_email:d.config.cf_email||'',cf_senha:'',
          cf_id_cliente:String(d.config.cf_id_cliente||'320'),
          cnpj_transportadora:d.config.cnpj_transportadora||'',
          polling_ativo:d.config.polling_ativo!==false,ativo:d.config.ativo!==false});}
      }).catch(()=>{});
      fetchAuth(API_URL+'/confirmafacil/embarcadores/'+clienteSel).then(r=>r.json()).then(d=>setEmbs(d.embarcadores||[])).catch(()=>{});
    },[clienteSel]);

    const setF=(k,v)=>setFormC(f=>({...f,[k]:v}));
    async function salvarConfig(){
      if(!clienteSel){showToast('Selecione um cliente','error');return;}
      if(!formC.cf_email||!formC.cf_senha||!formC.cnpj_transportadora){showToast('Email, senha e CNPJ obrigatórios','error');return;}
      setLoading(true);
      try{
        const r=await fetchAuth(API_URL+'/confirmafacil/config',{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({cliente_id:Number(clienteSel),...formC,cf_id_cliente:Number(formC.cf_id_cliente)||320})});
        const d=await r.json();
        d.ok?(showToast('✅ Salvo!','success'),setConfig(d.config)):showToast(d.error||'Erro','error');
      }catch(_){showToast('Erro','error');}finally{setLoading(false);}
    }
    async function testar(){
      if(!clienteSel)return;setTestando(true);
      try{
        const r=await fetchAuth(API_URL+'/confirmafacil/test/'+clienteSel,{method:'POST'});
        const d=await r.json();
        d.ok?showToast('✅ Credenciais válidas!','success'):showToast('❌ '+(d.mensagem||'Inválidas'),'error');
      }catch(_){showToast('Erro','error');}finally{setTestando(false);}
    }

    return h('div',{className:'space-y-5'},
      h('div',{className:'bg-white rounded-2xl border border-gray-100 shadow-sm p-5'},
        h('h3',{className:'text-sm font-semibold text-gray-700 mb-3'},'🏢 Cliente'),
        h('select',{value:clienteSel,onChange:e=>setClienteSel(e.target.value),
          className:'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400'},
          h('option',{value:''},'Selecione o cliente...'),
          sC.map(c=>h('option',{key:c.id,value:c.id},c.nome||c.empresa||c.email))
        )
      ),
      clienteSel&&h('div',{className:'bg-white rounded-2xl border border-gray-100 shadow-sm p-5'},
        h('h3',{className:'text-sm font-semibold text-gray-700 mb-4'},'🔑 Credenciais ConfirmaFácil'),
        h('div',{className:'grid grid-cols-2 gap-4'},
          ...[{l:'Email CF',c:'cf_email',t:'email',f:true},{l:'Senha CF',c:'cf_senha',t:'password',f:true},
              {l:'ID Cliente CF',c:'cf_id_cliente',t:'number'},{l:'CNPJ Transportadora',c:'cnpj_transportadora'}]
            .map(({l,c,t,f})=>h('div',{key:c,className:f?'col-span-2':'col-span-1'},
              h('label',{className:'block text-xs font-medium text-gray-600 mb-1'},l),
              h('input',{type:t||'text',value:formC[c],onChange:e=>setF(c,e.target.value),
                className:'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400'})
            )),
          h('div',{className:'col-span-2 flex gap-6'},
            h('label',{className:'flex items-center gap-2 text-sm cursor-pointer'},
              h('input',{type:'checkbox',checked:formC.ativo,onChange:e=>setF('ativo',e.target.checked),className:'accent-purple-600'}),'Ativo'),
            h('label',{className:'flex items-center gap-2 text-sm cursor-pointer'},
              h('input',{type:'checkbox',checked:formC.polling_ativo,onChange:e=>setF('polling_ativo',e.target.checked),className:'accent-purple-600'}),'Polling automático')
          )
        ),
        h('div',{className:'flex items-center gap-3 mt-4'},
          h('button',{onClick:salvarConfig,disabled:loading,className:'px-5 py-2 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 disabled:opacity-50'},loading?'Salvando...':'💾 Salvar'),
          config&&h('button',{onClick:testar,disabled:testando,className:'px-5 py-2 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 disabled:opacity-50'},testando?'Testando...':'🔌 Testar'),
          config?.ultimo_polling&&h('span',{className:'text-xs text-gray-400'},'Último polling: '+fmtD(config.ultimo_polling))
        )
      ),
      clienteSel&&config&&h('div',{className:'bg-white rounded-2xl border border-gray-100 shadow-sm p-5'},
        h('div',{className:'flex items-center justify-between mb-4'},
          h('h3',{className:'text-sm font-semibold text-gray-700'},'🏭 Embarcadores'),
          h('button',{onClick:()=>setModalEmb('novo'),className:'px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700'},'+ Novo')
        ),
        embs.length===0
          ? h('p',{className:'text-sm text-gray-400 text-center py-6'},'📭 Nenhum embarcador configurado.')
          : h('div',{className:'space-y-3'},embs.map(emb=>
              h('div',{key:emb.id,className:'border border-gray-100 rounded-xl p-4'},
                h('div',{className:'flex items-start justify-between gap-4'},
                  h('div',null,
                    h('p',{className:'font-medium text-sm text-gray-800'},emb.nome_embarcador||fmtCNPJ(emb.cnpj_embarcador)),
                    h('p',{className:'text-xs text-gray-500'},fmtCNPJ(emb.cnpj_embarcador)),
                    h('p',{className:'text-xs text-gray-600 mt-1'},'📍 '+([emb.coleta_nome_fantasia,emb.coleta_rua,emb.coleta_numero,emb.coleta_cidade,emb.coleta_uf].filter(Boolean).join(', ')||'—'))
                  ),
                  h('div',{className:'flex gap-2'},
                    h('button',{onClick:()=>setModalEmb(emb),className:'text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:border-purple-300'},'✏️'),
                    h('button',{onClick:async()=>{if(!confirm('Desativar?'))return;await fetchAuth(API_URL+'/confirmafacil/embarcadores/'+emb.id,{method:'DELETE'});setEmbs(prev=>prev.filter(e=>e.id!==emb.id));showToast('Desativado','success');},
                      className:'text-xs px-3 py-1.5 border border-red-100 rounded-lg hover:border-red-300 text-red-500'},'🗑️')
                  )
                )
              )
            ))
      ),
      modalEmb!==null&&h(ModalEmbarcador,{
        clienteId:Number(clienteSel),embarcador:modalEmb==='novo'?null:modalEmb,
        fetchAuth,API_URL,showToast,onFechar:()=>setModalEmb(null),
        onSalvar:()=>{setModalEmb(null);fetchAuth(API_URL+'/confirmafacil/embarcadores/'+clienteSel).then(r=>r.json()).then(d=>setEmbs(d.embarcadores||[]));}
      })
    );
  }

  // ─── COMPONENTE PRINCIPAL ──────────────────────────────────────
  window.ModuloConfirmaFacil = function(props) {
    const fetchAuth = props.fetchAuth;
    const API_URL   = props.API_URL;
    const showToast = props.showToast||props.ja||(()=>{});
    const [aba,setAba] = useState('nfs');
    return h('div',{className:'p-4 md:p-6 max-w-5xl mx-auto space-y-5'},
      h('div',{className:'flex items-center justify-between'},
        h('div',null,
          h('h1',{className:'text-xl font-bold text-gray-900'},'🔗 ConfirmaFácil'),
          h('p',{className:'text-sm text-gray-500 mt-0.5'},'Integração de NFs e rastreamento de entregas')
        )
      ),
      h('div',{className:'flex gap-1 bg-gray-100 p-1 rounded-xl w-fit'},
        [{id:'nfs',label:'📄 NFs Recebidas'},{id:'config',label:'⚙️ Configuração'}].map(a=>
          h('button',{key:a.id,onClick:()=>setAba(a.id),
            className:'px-4 py-2 text-sm font-medium rounded-lg transition-all '+(aba===a.id?'bg-white text-purple-700 shadow-sm':'text-gray-600 hover:text-gray-800')
          },a.label)
        )
      ),
      aba==='config'?h(AbaConfig,{fetchAuth,API_URL,showToast}):h(AbaNFs,{fetchAuth,API_URL,showToast})
    );
  };
})();
