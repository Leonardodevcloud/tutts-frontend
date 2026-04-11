// modulo-rastreio-clientes.js — v1.0
// 2 abas: Histórico + Configuração. Tema #7c3aed. Padrão Tutts.
(function () {
  const h = React.createElement;
  const API = '/api/rastreio-clientes';

  async function api(path, opts = {}) {
    const csrf = document.cookie.match(/csrf-token=([^;]+)/)?.[1] || '';
    const r = await fetch(API + path, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf, ...(opts.headers||{}) },
      ...opts,
    });
    if (!r.ok) throw new Error((await r.json().catch(()=>({}))).erro || 'erro');
    return r.json();
  }

  const STATUS_COR = {
    enviado:    { bg:'#d1fae5', fg:'#065f46', label:'Enviado' },
    pendente:   { bg:'#fef3c7', fg:'#92400e', label:'Pendente' },
    processando:{ bg:'#fef3c7', fg:'#92400e', label:'Processando' },
    falhou:     { bg:'#fee2e2', fg:'#991b1b', label:'Falhou' },
    ignorado:   { bg:'#e5e7eb', fg:'#374151', label:'Ignorado' },
  };

  function ModuloRastreioClientes() {
    const [tab, setTab] = React.useState('historico');
    const [hist, setHist] = React.useState([]);
    const [clientes, setClientes] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [filtros, setFiltros] = React.useState({ data:'', cliente:'', status:'' });
    const [editing, setEditing] = React.useState(null);

    async function carregarHist() {
      setLoading(true);
      try {
        const q = new URLSearchParams(Object.entries(filtros).filter(([,v])=>v)).toString();
        const r = await api('/historico' + (q?'?'+q:''));
        setHist(r.capturas || []);
      } catch(e){ console.error(e); }
      finally{ setLoading(false); }
    }
    async function carregarClientes() {
      try { const r = await api('/config'); setClientes(r.clientes || []); }
      catch(e){ console.error(e); }
    }
    async function reenviar(id) {
      if (!confirm('Reenfileirar essa OS?')) return;
      try { await api('/historico/'+id+'/reenviar',{method:'POST'}); await carregarHist(); }
      catch(e){ alert('Erro: '+e.message); }
    }
    async function salvarCliente(c) {
      try {
        const body = JSON.stringify({
          ...c,
          termos_filtro: c.termos_filtro_str ? c.termos_filtro_str.split('\n').map(s=>s.trim()).filter(Boolean) : null,
        });
        if (c.id) await api('/config/'+c.id,{method:'PUT',body});
        else      await api('/config',{method:'POST',body});
        setEditing(null); await carregarClientes();
      } catch(e){ alert('Erro: '+e.message); }
    }
    async function removerCliente(id) {
      if (!confirm('Remover cliente do rastreio?')) return;
      try { await api('/config/'+id,{method:'DELETE'}); await carregarClientes(); }
      catch(e){ alert('Erro: '+e.message); }
    }

    React.useEffect(() => { carregarClientes(); }, []);
    React.useEffect(() => { if(tab==='historico') carregarHist(); }, [tab, filtros]);
    React.useEffect(() => {
      if (tab !== 'historico') return;
      const t = setInterval(carregarHist, 30000);
      return () => clearInterval(t);
    }, [tab, filtros]);

    const card = { background:'#fff', borderRadius:8, padding:16, boxShadow:'0 1px 3px rgba(0,0,0,.08)' };
    const btnPrim = { background:'#7c3aed', color:'#fff', padding:'8px 16px', border:'none', borderRadius:6, cursor:'pointer', fontWeight:600 };
    const tabBtn = (active) => ({ padding:'12px 24px', border:'none', background:active?'#7c3aed':'transparent', color:active?'#fff':'#6b7280', cursor:'pointer', fontWeight:600, borderRadius:'6px 6px 0 0' });

    return h('div',{style:{padding:24,background:'#f9fafb',minHeight:'100vh'}},
      h('div',{style:{marginBottom:24}},
        h('h1',{style:{fontSize:28,fontWeight:700,color:'#1f2937',margin:0}},'📡 Rastreio Clientes'),
        h('p',{style:{color:'#6b7280',marginTop:4}},'Gestão do detector automático de OS para envio de rastreio')
      ),
      h('div',{style:{borderBottom:'2px solid #e5e7eb',marginBottom:16}},
        h('button',{style:tabBtn(tab==='historico'),onClick:()=>setTab('historico')},'📋 Histórico'),
        h('button',{style:tabBtn(tab==='config'),onClick:()=>setTab('config')},'⚙️ Configuração')
      ),

      tab==='historico' && h('div',null,
        h('div',{style:{...card,marginBottom:16,display:'flex',gap:12,flexWrap:'wrap'}},
          h('input',{type:'date',value:filtros.data,onChange:e=>setFiltros({...filtros,data:e.target.value}),style:{padding:8,border:'1px solid #d1d5db',borderRadius:6}}),
          h('select',{value:filtros.cliente,onChange:e=>setFiltros({...filtros,cliente:e.target.value}),style:{padding:8,border:'1px solid #d1d5db',borderRadius:6}},
            h('option',{value:''},'Todos os clientes'),
            ...clientes.map(c=>h('option',{key:c.cliente_cod,value:c.cliente_cod},c.nome_exibicao))
          ),
          h('select',{value:filtros.status,onChange:e=>setFiltros({...filtros,status:e.target.value}),style:{padding:8,border:'1px solid #d1d5db',borderRadius:6}},
            h('option',{value:''},'Todos os status'),
            ...Object.keys(STATUS_COR).map(s=>h('option',{key:s,value:s},STATUS_COR[s].label))
          ),
          h('button',{style:btnPrim,onClick:carregarHist},'🔄 Atualizar')
        ),
        h('div',{style:card},
          loading ? h('p',null,'Carregando...') :
          hist.length===0 ? h('p',{style:{color:'#6b7280',textAlign:'center',padding:32}},'Nenhuma captura encontrada') :
          h('table',{style:{width:'100%',borderCollapse:'collapse',fontSize:14}},
            h('thead',null,h('tr',{style:{borderBottom:'2px solid #e5e7eb',textAlign:'left'}},
              ['OS','Cliente','Motoboy','Status','Tentativas','Criado','Enviado','Ações'].map(c=>h('th',{key:c,style:{padding:10,fontWeight:600,color:'#374151'}},c))
            )),
            h('tbody',null,hist.map(r => {
              const cli = clientes.find(c=>c.cliente_cod===r.cliente_cod);
              const sc = STATUS_COR[r.status]||STATUS_COR.ignorado;
              return h('tr',{key:r.id,style:{borderBottom:'1px solid #f3f4f6'}},
                h('td',{style:{padding:10,fontFamily:'monospace'}},r.os_numero),
                h('td',{style:{padding:10}},(cli?.nome_exibicao||r.cliente_cod)),
                h('td',{style:{padding:10}},r.profissional||'-'),
                h('td',{style:{padding:10}},h('span',{style:{background:sc.bg,color:sc.fg,padding:'3px 10px',borderRadius:12,fontSize:12,fontWeight:600}},sc.label)),
                h('td',{style:{padding:10,textAlign:'center'}},r.tentativas||0),
                h('td',{style:{padding:10,fontSize:12,color:'#6b7280'}},r.criado_em ? new Date(r.criado_em).toLocaleString('pt-BR',{timeZone:'America/Bahia'}) : '-'),
                h('td',{style:{padding:10,fontSize:12,color:'#6b7280'}},r.enviado_em ? new Date(r.enviado_em).toLocaleString('pt-BR',{timeZone:'America/Bahia'}) : '-'),
                h('td',{style:{padding:10}},
                  r.status==='falhou' && h('button',{onClick:()=>reenviar(r.id),style:{background:'#7c3aed',color:'#fff',border:'none',padding:'4px 10px',borderRadius:4,cursor:'pointer',fontSize:12}},'Reenviar'),
                  r.erro_msg && h('span',{title:r.erro_msg,style:{marginLeft:8,cursor:'help'}},'⚠️')
                )
              );
            }))
          )
        )
      ),

      tab==='config' && h('div',null,
        h('div',{style:{marginBottom:16}},
          h('button',{style:btnPrim,onClick:()=>setEditing({cliente_cod:'',nome_exibicao:'',evolution_group_id:'',ativo:true,termos_filtro_str:'',observacoes:''})},'+ Novo cliente')
        ),
        h('div',{style:card},
          clientes.length===0 ? h('p',{style:{color:'#6b7280',padding:16}},'Nenhum cliente cadastrado') :
          h('table',{style:{width:'100%',borderCollapse:'collapse',fontSize:14}},
            h('thead',null,h('tr',{style:{borderBottom:'2px solid #e5e7eb',textAlign:'left'}},
              ['Cód','Nome','Grupo WhatsApp','Filtro','Status','Ações'].map(c=>h('th',{key:c,style:{padding:10,fontWeight:600,color:'#374151'}},c))
            )),
            h('tbody',null,clientes.map(c => h('tr',{key:c.id,style:{borderBottom:'1px solid #f3f4f6'}},
              h('td',{style:{padding:10,fontFamily:'monospace',fontWeight:600}},c.cliente_cod),
              h('td',{style:{padding:10}},c.nome_exibicao),
              h('td',{style:{padding:10,fontSize:12,fontFamily:'monospace',color:'#6b7280'}},(c.evolution_group_id||'').substring(0,28)+'…'),
              h('td',{style:{padding:10,fontSize:12}},(c.termos_filtro?.length||0)+' termo(s)'),
              h('td',{style:{padding:10}},h('span',{style:{background:c.ativo?'#d1fae5':'#e5e7eb',color:c.ativo?'#065f46':'#374151',padding:'3px 10px',borderRadius:12,fontSize:12,fontWeight:600}},c.ativo?'Ativo':'Inativo')),
              h('td',{style:{padding:10}},
                h('button',{onClick:()=>setEditing({...c,termos_filtro_str:(c.termos_filtro||[]).join('\n')}),style:{background:'#7c3aed',color:'#fff',border:'none',padding:'4px 10px',borderRadius:4,cursor:'pointer',fontSize:12,marginRight:6}},'Editar'),
                h('button',{onClick:()=>removerCliente(c.id),style:{background:'#ef4444',color:'#fff',border:'none',padding:'4px 10px',borderRadius:4,cursor:'pointer',fontSize:12}},'Remover')
              )
            )))
          )
        ),
        editing && h('div',{style:{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000},onClick:e=>{if(e.target===e.currentTarget)setEditing(null);}},
          h('div',{style:{...card,width:480,maxHeight:'90vh',overflow:'auto'}},
            h('h2',{style:{margin:'0 0 16px 0',fontSize:20}},editing.id?'Editar cliente':'Novo cliente'),
            ['cliente_cod','nome_exibicao','evolution_group_id'].map(f =>
              h('div',{key:f,style:{marginBottom:12}},
                h('label',{style:{display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:4}},f.replace(/_/g,' ')),
                h('input',{value:editing[f]||'',disabled:f==='cliente_cod'&&!!editing.id,onChange:e=>setEditing({...editing,[f]:e.target.value}),style:{width:'100%',padding:8,border:'1px solid #d1d5db',borderRadius:6,fontSize:14}})
              )
            ),
            h('div',{style:{marginBottom:12}},
              h('label',{style:{display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:4}},'termos filtro (1 por linha, vazio = sem filtro)'),
              h('textarea',{value:editing.termos_filtro_str||'',onChange:e=>setEditing({...editing,termos_filtro_str:e.target.value}),rows:4,style:{width:'100%',padding:8,border:'1px solid #d1d5db',borderRadius:6,fontFamily:'monospace',fontSize:13}})
            ),
            h('div',{style:{marginBottom:12}},
              h('label',{style:{display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:4}},'observações'),
              h('textarea',{value:editing.observacoes||'',onChange:e=>setEditing({...editing,observacoes:e.target.value}),rows:2,style:{width:'100%',padding:8,border:'1px solid #d1d5db',borderRadius:6,fontSize:14}})
            ),
            h('label',{style:{display:'flex',alignItems:'center',gap:8,marginBottom:16}},
              h('input',{type:'checkbox',checked:editing.ativo!==false,onChange:e=>setEditing({...editing,ativo:e.target.checked})}),
              h('span',null,'Ativo')
            ),
            h('div',{style:{display:'flex',gap:8,justifyContent:'flex-end'}},
              h('button',{onClick:()=>setEditing(null),style:{padding:'8px 16px',border:'1px solid #d1d5db',background:'#fff',borderRadius:6,cursor:'pointer'}},'Cancelar'),
              h('button',{onClick:()=>salvarCliente(editing),style:btnPrim},'Salvar')
            )
          )
        )
      )
    );
  }

  window.ModuloRastreioClientes = ModuloRastreioClientes;
  console.log('[ModuloRastreioClientes] v1.0 carregado');
})();
