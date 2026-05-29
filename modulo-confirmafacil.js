// ==================== MÓDULO CONFIRMA FÁCIL ====================
// modulo-confirmafacil.js — v2
// Abas: Config (embarcadores) + NFs Recebidas (todas) + Teste
// Admin only
// ===============================================================

(function() {
  'use strict';
  const { useState, useEffect, useRef } = React;
  const h = React.createElement;

  function fmt(v) { return v || '—'; }
  function fmtData(d) {
    if (!d) return '—';
    try { return new Date(d).toLocaleString('pt-BR'); } catch(_) { return d; }
  }
  function fmtCNPJ(v) {
    if (!v) return '';
    const n = v.replace(/\D/g,'');
    if (n.length !== 14) return v;
    return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,'$1.$2.$3/$4-$5');
  }

  function Badge({ status }) {
    const map = {
      enviado:      'bg-blue-100 text-blue-700',
      finalizado:   'bg-green-100 text-green-700',
      em_andamento: 'bg-yellow-100 text-yellow-700',
      erro:         'bg-red-100 text-red-700',
      pendente:     'bg-gray-100 text-gray-600',
    };
    return h('span', {
      className: `text-xs font-medium px-2 py-0.5 rounded-full ${map[status] || 'bg-gray-100 text-gray-500'}`
    }, status || '—');
  }

  // ─── MODAL EMBARCADOR ──────────────────────────────────────────
  function ModalEmbarcador({ clienteId, embarcador, onSalvar, onFechar, fetchAuth, API_URL, showToast }) {
    const [form, setForm] = useState({
      cnpj_embarcador:      embarcador?.cnpj_embarcador || '',
      nome_embarcador:      embarcador?.nome_embarcador || '',
      coleta_rua:           embarcador?.coleta_rua || '',
      coleta_numero:        embarcador?.coleta_numero || '',
      coleta_bairro:        embarcador?.coleta_bairro || '',
      coleta_cidade:        embarcador?.coleta_cidade || '',
      coleta_uf:            embarcador?.coleta_uf || '',
      coleta_cep:           embarcador?.coleta_cep || '',
      coleta_lat:           embarcador?.coleta_lat || '',
      coleta_lng:           embarcador?.coleta_lng || '',
      coleta_nome_fantasia: embarcador?.coleta_nome_fantasia || '',
      coleta_telefone:      embarcador?.coleta_telefone || '',
    });
    const [salvando, setSalvando] = useState(false);
    const set = (k,v) => setForm(f => ({...f,[k]:v}));

    async function salvar() {
      if (!form.cnpj_embarcador || !form.coleta_cidade || !form.coleta_uf) {
        showToast('CNPJ, cidade e UF são obrigatórios','error'); return;
      }
      setSalvando(true);
      try {
        const r = await fetchAuth(API_URL+'/confirmafacil/embarcadores', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({cliente_id: clienteId, ...form}),
        });
        const d = await r.json();
        if (d.ok) { showToast('✅ Embarcador salvo!','success'); onSalvar(); }
        else showToast(d.error||'Erro ao salvar','error');
      } catch(_) { showToast('Erro de conexão','error'); }
      finally { setSalvando(false); }
    }

    const inp = (label, campo, opts={}) =>
      h('div', { className: opts.full ? 'col-span-2' : 'col-span-1' },
        h('label', { className: 'block text-xs font-medium text-gray-600 mb-1' }, label),
        h('input', {
          type: opts.type||'text', value: form[campo],
          onChange: e => set(campo, e.target.value),
          placeholder: opts.ph||'',
          className: 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400',
        })
      );

    return h('div', {
      className: 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4',
      onClick: e => e.target===e.currentTarget && onFechar(),
    },
      h('div', { className: 'bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto' },
        h('div', { className: 'flex items-center justify-between p-5 border-b border-gray-100' },
          h('h3', { className: 'text-base font-semibold text-gray-800' },
            embarcador ? '✏️ Editar Embarcador' : '➕ Novo Embarcador'),
          h('button', { onClick: onFechar, className: 'text-gray-400 hover:text-gray-600 text-xl leading-none' }, '×')
        ),
        h('div', { className: 'p-5 grid grid-cols-2 gap-4' },
          inp('CNPJ do Embarcador *','cnpj_embarcador',{full:true,ph:'00.000.000/0000-00'}),
          inp('Nome do Embarcador','nome_embarcador',{full:true}),
          h('div',{className:'col-span-2'},
            h('p',{className:'text-xs font-semibold text-purple-700 uppercase tracking-wide mt-1 mb-2'},'📍 Endereço de Coleta')
          ),
          inp('Nome Fantasia (ponto de coleta)','coleta_nome_fantasia',{full:true}),
          inp('Rua / Logradouro','coleta_rua',{full:true}),
          inp('Número','coleta_numero'),
          inp('Bairro','coleta_bairro'),
          inp('Cidade *','coleta_cidade'),
          inp('UF *','coleta_uf',{ph:'SP'}),
          inp('CEP','coleta_cep'),
          inp('Telefone','coleta_telefone'),
          inp('Latitude','coleta_lat'),
          inp('Longitude','coleta_lng'),
        ),
        h('div', { className: 'flex justify-end gap-3 p-5 border-t border-gray-100' },
          h('button',{onClick:onFechar,className:'px-4 py-2 text-sm text-gray-600 hover:text-gray-800'},'Cancelar'),
          h('button',{
            onClick:salvar, disabled:salvando,
            className:'px-5 py-2 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 disabled:opacity-50',
          }, salvando?'Salvando...':'Salvar')
        )
      )
    );
  }

  // ─── ABA CONFIG ────────────────────────────────────────────────
  function AbaConfig({ fetchAuth, API_URL, showToast }) {
    const [clientes, setClientes]       = useState([]);
    const [clienteSel, setClienteSel]   = useState('');
    const [config, setConfig]           = useState(null);
    const [embarcadores, setEmbarcadores] = useState([]);
    const [formConfig, setFormConfig]   = useState({
      cf_email:'', cf_senha:'', cf_id_cliente:'320',
      cnpj_transportadora:'', polling_ativo:true, ativo:true,
    });
    const [modalEmb, setModalEmb] = useState(null);
    const [loading, setLoading]   = useState(false);
    const [testando, setTestando] = useState(false);

    useEffect(() => {
      fetchAuth(API_URL+'/admin/solicitacao/clientes')
        .then(r=>r.json()).then(d=>setClientes(d.clientes||d||[])).catch(()=>{});
    }, []);

    useEffect(() => {
      if (!clienteSel) return;
      setConfig(null); setEmbarcadores([]);
      fetchAuth(API_URL+'/confirmafacil/config/'+clienteSel)
        .then(r=>r.json()).then(d => {
          if (d.config) {
            setConfig(d.config);
            setFormConfig({
              cf_email: d.config.cf_email||'', cf_senha:'',
              cf_id_cliente: String(d.config.cf_id_cliente||'320'),
              cnpj_transportadora: d.config.cnpj_transportadora||'',
              polling_ativo: d.config.polling_ativo!==false,
              ativo: d.config.ativo!==false,
            });
          }
        }).catch(()=>{});
      fetchAuth(API_URL+'/confirmafacil/embarcadores/'+clienteSel)
        .then(r=>r.json()).then(d=>setEmbarcadores(d.embarcadores||[])).catch(()=>{});
    }, [clienteSel]);

    const setF = (k,v) => setFormConfig(f=>({...f,[k]:v}));

    async function salvarConfig() {
      if (!clienteSel) { showToast('Selecione um cliente','error'); return; }
      if (!formConfig.cf_email||!formConfig.cf_senha||!formConfig.cnpj_transportadora) {
        showToast('Email, senha e CNPJ são obrigatórios','error'); return;
      }
      setLoading(true);
      try {
        const r = await fetchAuth(API_URL+'/confirmafacil/config', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({cliente_id:Number(clienteSel),...formConfig,
            cf_id_cliente:Number(formConfig.cf_id_cliente)||320}),
        });
        const d = await r.json();
        if (d.ok) { showToast('✅ Configuração salva!','success'); setConfig(d.config); }
        else showToast(d.error||'Erro','error');
      } catch(_) { showToast('Erro de conexão','error'); }
      finally { setLoading(false); }
    }

    async function testar() {
      if (!clienteSel) return;
      setTestando(true);
      try {
        const r = await fetchAuth(API_URL+'/confirmafacil/test/'+clienteSel,{method:'POST'});
        const d = await r.json();
        d.ok ? showToast('✅ Credenciais válidas!','success')
             : showToast('❌ '+(d.mensagem||'Credenciais inválidas'),'error');
      } catch(_) { showToast('Erro','error'); }
      finally { setTestando(false); }
    }

    async function excluirEmb(id) {
      if (!confirm('Desativar este embarcador?')) return;
      await fetchAuth(API_URL+'/confirmafacil/embarcadores/'+id,{method:'DELETE'}).catch(()=>{});
      setEmbarcadores(prev=>prev.filter(e=>e.id!==id));
      showToast('Embarcador desativado','success');
    }

    return h('div', { className:'space-y-5' },

      // Seletor cliente
      h('div',{className:'bg-white rounded-2xl border border-gray-100 shadow-sm p-5'},
        h('h3',{className:'text-sm font-semibold text-gray-700 mb-3'},'🏢 Cliente'),
        h('select',{
          value:clienteSel, onChange:e=>setClienteSel(e.target.value),
          className:'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400',
        },
          h('option',{value:''},'Selecione o cliente...'),
          clientes.map(c=>h('option',{key:c.id,value:c.id},c.nome||c.empresa||c.email))
        )
      ),

      // Credenciais
      clienteSel && h('div',{className:'bg-white rounded-2xl border border-gray-100 shadow-sm p-5'},
        h('h3',{className:'text-sm font-semibold text-gray-700 mb-4'},'🔑 Credenciais ConfirmaFácil'),
        h('div',{className:'grid grid-cols-2 gap-4'},
          ...[
            {label:'Email CF',campo:'cf_email',type:'email',full:true},
            {label:'Senha CF',campo:'cf_senha',type:'password',full:true},
            {label:'ID Cliente CF',campo:'cf_id_cliente',type:'number'},
            {label:'CNPJ Transportadora',campo:'cnpj_transportadora'},
          ].map(({label,campo,type,full})=>
            h('div',{key:campo,className:full?'col-span-2':'col-span-1'},
              h('label',{className:'block text-xs font-medium text-gray-600 mb-1'},label),
              h('input',{
                type:type||'text', value:formConfig[campo],
                onChange:e=>setF(campo,e.target.value),
                placeholder:campo==='cf_id_cliente'?'320':'',
                className:'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400',
              })
            )
          ),
          h('div',{className:'col-span-2 flex items-center gap-6'},
            h('label',{className:'flex items-center gap-2 text-sm cursor-pointer'},
              h('input',{type:'checkbox',checked:formConfig.ativo,
                onChange:e=>setF('ativo',e.target.checked),className:'accent-purple-600'}),
              'Integração ativa'),
            h('label',{className:'flex items-center gap-2 text-sm cursor-pointer'},
              h('input',{type:'checkbox',checked:formConfig.polling_ativo,
                onChange:e=>setF('polling_ativo',e.target.checked),className:'accent-purple-600'}),
              'Polling automático')
          )
        ),
        h('div',{className:'flex items-center gap-3 mt-4'},
          h('button',{
            onClick:salvarConfig, disabled:loading,
            className:'px-5 py-2 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 disabled:opacity-50',
          }, loading?'Salvando...':'💾 Salvar Config'),
          config && h('button',{
            onClick:testar, disabled:testando,
            className:'px-5 py-2 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 disabled:opacity-50',
          }, testando?'Testando...':'🔌 Testar Credenciais'),
          config?.ultimo_polling && h('span',{className:'text-xs text-gray-400'},
            'Último polling: '+fmtData(config.ultimo_polling))
        )
      ),

      // Embarcadores
      clienteSel && config && h('div',{className:'bg-white rounded-2xl border border-gray-100 shadow-sm p-5'},
        h('div',{className:'flex items-center justify-between mb-4'},
          h('h3',{className:'text-sm font-semibold text-gray-700'},'🏭 Embarcadores e Endereços de Coleta'),
          h('button',{
            onClick:()=>setModalEmb('novo'),
            className:'px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700',
          },'+ Novo Embarcador')
        ),
        embarcadores.length===0
          ? h('div',{className:'text-center py-8 text-gray-400 text-sm'},'📭 Nenhum embarcador configurado ainda.')
          : h('div',{className:'space-y-3'},
              embarcadores.map(emb=>
                h('div',{key:emb.id,className:'border border-gray-100 rounded-xl p-4 hover:border-purple-200'},
                  h('div',{className:'flex items-start justify-between gap-4'},
                    h('div',{className:'flex-1 min-w-0'},
                      h('p',{className:'font-medium text-sm text-gray-800'},
                        emb.nome_embarcador||fmtCNPJ(emb.cnpj_embarcador)),
                      h('p',{className:'text-xs text-gray-500 mt-0.5'},fmtCNPJ(emb.cnpj_embarcador)),
                      h('p',{className:'text-xs text-gray-600 mt-1.5'},
                        '📍 '+([emb.coleta_nome_fantasia,emb.coleta_rua,emb.coleta_numero,
                          emb.coleta_cidade,emb.coleta_uf].filter(Boolean).join(', ')||'—'))
                    ),
                    h('div',{className:'flex gap-2 shrink-0'},
                      h('button',{onClick:()=>setModalEmb(emb),
                        className:'text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:border-purple-300 text-gray-600'},'✏️'),
                      h('button',{onClick:()=>excluirEmb(emb.id),
                        className:'text-xs px-3 py-1.5 border border-red-100 rounded-lg hover:border-red-300 text-red-500'},'🗑️')
                    )
                  )
                )
              )
            )
      ),

      modalEmb!==null && h(ModalEmbarcador,{
        clienteId:Number(clienteSel),
        embarcador:modalEmb==='novo'?null:modalEmb,
        fetchAuth, API_URL, showToast,
        onFechar:()=>setModalEmb(null),
        onSalvar:()=>{
          setModalEmb(null);
          fetchAuth(API_URL+'/confirmafacil/embarcadores/'+clienteSel)
            .then(r=>r.json()).then(d=>setEmbarcadores(d.embarcadores||[]));
        },
      })
    );
  }

  // ─── ABA NFs ──────────────────────────────────────────────────
  function AbaNFs({ fetchAuth, API_URL, showToast }) {
    const [vinculos, setVinculos]   = useState([]);
    const [loading, setLoading]     = useState(false);
    const [busca, setBusca]         = useState('');
    const [pagina, setPagina]       = useState(0);
    const [testando, setTestando]   = useState(false);
    const [resultado, setResultado] = useState(null);
    const [filtroDE, setFiltroDE]   = useState('');
    const [filtroATE, setFiltroATE] = useState('');
    const [cfEmail, setCfEmail]     = useState('contato@tutts.com.br');
    const [cfSenha, setCfSenha]     = useState('Confirma@2026');
    const [cfCnpj, setCfCnpj]       = useState('');
    const [semConfig, setSemConfig] = useState(false);
    const POR_PAG = 25;

    useEffect(() => { carregarVinculos(); }, []);

    async function carregarVinculos() {
      setLoading(true);
      try {
        const r = await fetchAuth(API_URL+'/confirmafacil/nfs');
        const d = await r.json();
        setVinculos(d.vinculos||[]);
      } catch(_) { showToast('Erro ao carregar','error'); }
      finally { setLoading(false); }
    }

    async function buscarNoCF() {
      setTestando(true); setResultado(null);
      try {
        const body = {};
        if (filtroDE) body.de = filtroDE.replace('T',' ');
        if (filtroATE) body.ate = filtroATE.replace('T',' ');
        // Passa credenciais direto se não tiver cliente configurado
        if (cfEmail && cfSenha) { body.cf_email = cfEmail; body.cf_senha = cfSenha; }
        if (cfCnpj) body.cnpj_transportadora = cfCnpj;

        const r = await fetchAuth(API_URL+'/confirmafacil/buscar-nfs', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify(body),
        });
        const d = await r.json();
        setResultado(d);
        if (d.ok) {
          const total = d.resultados?.reduce((s,r)=>s+(r.nfs?.length||0),0)||0;
          showToast('🔍 Encontradas '+total+' NF(s) no CF','success');
          setSemConfig(false);
        } else {
          showToast(d.mensagem||'Erro ao buscar','error');
          if (d.mensagem?.includes('configurado')) setSemConfig(true);
        }
      } catch(e) { showToast('Erro: '+e.message,'error'); }
      finally { setTestando(false); }
    }

    const filtrados = vinculos.filter(v =>
      !busca ||
      v.numero_nf?.toLowerCase().includes(busca.toLowerCase()) ||
      v.cnpj_embarcador?.includes(busca) ||
      String(v.id_embarque||'').includes(busca) ||
      v.cliente_nome?.toLowerCase().includes(busca.toLowerCase()) ||
      v.tutts_os_numero?.includes(busca)
    );
    const pagTotal = Math.ceil(filtrados.length/POR_PAG);
    const paginados = filtrados.slice(pagina*POR_PAG,(pagina+1)*POR_PAG);

    return h('div',{className:'space-y-4'},

      // Painel de busca no CF
      h('div',{className:'bg-white rounded-2xl border border-gray-100 shadow-sm p-5'},
        h('h3',{className:'text-sm font-semibold text-gray-700 mb-3'},'🔍 Buscar NFs no ConfirmaFácil agora'),
        h('p',{className:'text-xs text-gray-500 mb-4'},
          'Consulta a API do CF diretamente — sem criar corridas. Use pra testar a conexão e ver quais NFs estão disponíveis.'),
        h('div',{className:'flex flex-wrap items-end gap-3'},
          h('div',null,
            h('label',{className:'block text-xs font-medium text-gray-600 mb-1'},'De'),
            h('input',{
              type:'datetime-local', value:filtroDE,
              onChange:e=>setFiltroDE(e.target.value),
              className:'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400',
            })
          ),
          h('div',null,
            h('label',{className:'block text-xs font-medium text-gray-600 mb-1'},'Até'),
            h('input',{
              type:'datetime-local', value:filtroATE,
              onChange:e=>setFiltroATE(e.target.value),
              className:'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400',
            })
          ),
          semConfig && h('div',{className:'flex flex-col gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs w-full'},
            h('p',{className:'font-medium text-amber-800 mb-1'},'⚙️ Nenhum cliente configurado — informe as credenciais para testar:'),
            h('div',{className:'flex flex-wrap gap-2'},
              h('input',{type:'email',placeholder:'Email CF',value:cfEmail,
                onChange:e=>setCfEmail(e.target.value),
                className:'border border-amber-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none w-56'}),
              h('input',{type:'password',placeholder:'Senha CF',value:cfSenha,
                onChange:e=>setCfSenha(e.target.value),
                className:'border border-amber-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none w-44'}),
              h('input',{type:'text',placeholder:'CNPJ Transportadora (opcional)',value:cfCnpj,
                onChange:e=>setCfCnpj(e.target.value),
                className:'border border-amber-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none w-56'})
            )
          ),
          h('button',{
            onClick:buscarNoCF, disabled:testando,
            className:'px-5 py-2 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 disabled:opacity-50 h-[38px]',
          }, testando?'⏳ Buscando...':'🔍 Buscar no CF')
        ),

        // Resultado da busca
        resultado && h('div',{className:'mt-4 space-y-3'},
          resultado.ok===false
            ? h('div',{className:'p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700'},
                '❌ '+resultado.mensagem)
            : resultado.resultados?.map((r,i)=>
                h('div',{key:i,className:'border rounded-xl overflow-hidden'},
                  // Header do cliente
                  h('div',{className:`flex items-center justify-between px-4 py-2.5 ${r.ok?'bg-green-50':'bg-red-50'}`},
                    h('span',{className:'text-sm font-medium text-gray-700'},
                      r.cliente_nome||'Cliente '+r.cliente_id),
                    r.ok
                      ? h('span',{className:'text-xs text-green-700 font-medium'},
                          `✅ ${r.total||r.nfs?.length||0} NF(s) encontradas`)
                      : h('span',{className:'text-xs text-red-600'},'❌ '+r.erro)
                  ),
                  // Lista de NFs
                  r.ok && r.nfs?.length > 0 && h('div',{className:'divide-y divide-gray-50 max-h-64 overflow-y-auto'},
                    r.nfs.slice(0,50).map((nf,j)=>
                      h('div',{key:j,className:'px-4 py-2.5 hover:bg-gray-50 flex items-center justify-between gap-4'},
                        h('div',null,
                          h('p',{className:'text-sm font-medium text-gray-800'},
                            'NF '+fmt(nf.numero||nf.embarque?.numero)),
                          h('p',{className:'text-xs text-gray-500'},
                            'Série: '+(nf.serie||'—')+
                            ' · Emb: '+(nf.embarcador?.nome||fmtCNPJ(nf.embarcador?.cnpj)||'—')+
                            ' · Dest: '+(nf.destinatario?.nome||'—'))
                        ),
                        h('span',{className:'text-xs font-mono text-gray-400 shrink-0'},
                          'ID: '+(nf.idEmbarque||nf.id||'—'))
                      )
                    ),
                    r.nfs.length>50 && h('p',{className:'px-4 py-2 text-xs text-gray-400 text-center'},
                      `+ ${r.nfs.length-50} mais...`)
                  ),
                  r.ok && (!r.nfs||r.nfs.length===0) && h('p',{
                    className:'px-4 py-3 text-sm text-gray-400 text-center'
                  },'Nenhuma NF neste período')
                )
              )
        )
      ),

      // NFs já processadas
      h('div',{className:'bg-white rounded-2xl border border-gray-100 shadow-sm p-5'},
        h('div',{className:'flex flex-wrap items-center gap-3 mb-4'},
          h('h3',{className:'text-sm font-semibold text-gray-700 flex-1'},
            '📄 NFs recebidas e processadas',
            vinculos.length>0 && h('span',{className:'ml-2 text-xs font-normal text-gray-400'},
              vinculos.length+' total')),
          h('input',{
            type:'text', placeholder:'🔍 NF, OS, CNPJ, cliente...',
            value:busca, onChange:e=>{setBusca(e.target.value);setPagina(0);},
            className:'border border-gray-200 rounded-xl px-3 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-purple-400',
          }),
          h('button',{
            onClick:carregarVinculos,
            className:'px-4 py-2 border border-gray-200 text-sm rounded-xl hover:border-purple-300',
          },'🔄')
        ),

        loading
          ? h('div',{className:'flex items-center justify-center h-32 text-gray-400 text-sm'},'⏳ Carregando...')
          : filtrados.length===0
            ? h('div',{className:'flex flex-col items-center justify-center h-32 text-gray-400'},
                h('span',{className:'text-3xl mb-2'},'📭'),
                h('p',{className:'text-sm'},busca?'Nenhum resultado':'Nenhuma NF processada ainda'),
                !busca && h('p',{className:'text-xs mt-1'},'Use "Buscar no CF" acima para testar a conexão')
              )
            : h('div',null,
                h('div',{className:'overflow-x-auto'},
                  h('table',{className:'w-full text-sm'},
                    h('thead',null,
                      h('tr',{className:'bg-gray-50 border-b border-gray-100'},
                        ['Cliente','ID Embarque','NF','Série','CNPJ Emb.','OS Tutts','Status','Recebido em'].map(col=>
                          h('th',{key:col,className:'px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide'},col)
                        )
                      )
                    ),
                    h('tbody',null,
                      paginados.map((v,i)=>
                        h('tr',{key:v.id,className:i%2===0?'hover:bg-gray-50':'bg-gray-50/50 hover:bg-gray-50'},
                          h('td',{className:'px-3 py-2.5 text-xs text-gray-600'},
                            h('span',{className:'bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full text-xs'},
                              v.cliente_nome||'—')),
                          h('td',{className:'px-3 py-2.5 font-mono text-xs text-gray-500'},v.id_embarque||'—'),
                          h('td',{className:'px-3 py-2.5 font-medium text-gray-800'},v.numero_nf||'—'),
                          h('td',{className:'px-3 py-2.5 text-gray-600'},v.serie_nf||'—'),
                          h('td',{className:'px-3 py-2.5 text-xs font-mono text-gray-500'},fmtCNPJ(v.cnpj_embarcador)),
                          h('td',{className:'px-3 py-2.5'},
                            v.tutts_os_numero
                              ? h('span',{className:'text-xs font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full'},
                                  v.tutts_os_numero)
                              : h('span',{className:'text-xs text-gray-400'},'—')
                          ),
                          h('td',{className:'px-3 py-2.5'},h(Badge,{status:v.status||'enviado'})),
                          h('td',{className:'px-3 py-2.5 text-xs text-gray-500'},fmtData(v.criado_em))
                        )
                      )
                    )
                  )
                ),
                pagTotal>1 && h('div',{className:'flex items-center justify-between px-4 py-3 border-t border-gray-100'},
                  h('span',{className:'text-xs text-gray-500'},
                    `${filtrados.length} NFs · Página ${pagina+1} de ${pagTotal}`),
                  h('div',{className:'flex gap-2'},
                    h('button',{
                      onClick:()=>setPagina(p=>Math.max(0,p-1)), disabled:pagina===0,
                      className:'px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40',
                    },'← Ant'),
                    h('button',{
                      onClick:()=>setPagina(p=>Math.min(pagTotal-1,p+1)), disabled:pagina>=pagTotal-1,
                      className:'px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40',
                    },'Próx →')
                  )
                )
              )
      )
    );
  }

  // ─── COMPONENTE PRINCIPAL ──────────────────────────────────────
  window.ModuloConfirmaFacil = function(props) {
    const fetchAuth = props.fetchAuth;
    const API_URL   = props.API_URL;
    const showToast = props.showToast || props.ja || (()=>{});
    const [aba, setAba] = useState('nfs');

    return h('div',{className:'p-4 md:p-6 max-w-5xl mx-auto space-y-5'},
      h('div',{className:'flex items-center justify-between'},
        h('div',null,
          h('h1',{className:'text-xl font-bold text-gray-900'},'🔗 ConfirmaFácil'),
          h('p',{className:'text-sm text-gray-500 mt-0.5'},'Integração de NFs e rastreamento de entregas')
        )
      ),
      h('div',{className:'flex gap-1 bg-gray-100 p-1 rounded-xl w-fit'},
        [{id:'nfs',label:'📄 NFs Recebidas'},{id:'config',label:'⚙️ Configuração'}].map(a=>
          h('button',{
            key:a.id, onClick:()=>setAba(a.id),
            className:`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              aba===a.id?'bg-white text-purple-700 shadow-sm':'text-gray-600 hover:text-gray-800'
            }`,
          },a.label)
        )
      ),
      aba==='config'
        ? h(AbaConfig,{fetchAuth,API_URL,showToast})
        : h(AbaNFs,  {fetchAuth,API_URL,showToast})
    );
  };

})();
