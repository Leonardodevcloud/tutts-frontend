/**
 * ModuloGratuidadesV2.js
 * ─────────────────────────────────────────────────────────────────────────
 * Submódulo do Financeiro — redesign da tela de gratuidades.
 *
 * Features:
 *   - 4 KPIs no topo (ativas, expiradas_mes, valor_ativo, total_mes)
 *   - Abas: Ativas | Expiradas | Todas (com contador via KPI)
 *   - Filtros: busca, cadastrado por, motivo, período
 *   - Paginação clássica 20/pág
 *   - Modal de cadastro com chips de motivos pré-definidos + CAPS LOCK automático
 *   - Sub-modal de gerenciar motivos pré-definidos (CRUD inline)
 *
 * Carregamento:
 *   <script src="ModuloGratuidadesV2.js?v=20260512_GRATV2"></script>
 *   window.ModuloGratuidadesV2.renderizar(containerEl, { apiUrl, token, fetchApi })
 *
 * Dependências esperadas no global:
 *   - React + ReactDOM via CDN
 *   - showToast(msg, tipo) — opcional, fallback alert
 *   - confirmar(msg) — opcional, fallback confirm
 */

(function (global) {
  'use strict';

  const { useState, useEffect, useCallback, useRef, useMemo } = React;

  // ───────────────────────────────────────────────────────────────────────
  // Helpers
  // ───────────────────────────────────────────────────────────────────────
  const fmt = {
    moeda: (v) => 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', {
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    }),
    data: (iso) => {
      if (!iso) return '—';
      const d = new Date(iso);
      const pad = (n) => String(n).padStart(2, '0');
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    },
  };

  const toast = (msg, tipo) => {
    if (typeof global.showToast === 'function') return global.showToast(msg, tipo);
    if (tipo === 'erro') return alert('Erro: ' + msg);
    return alert(msg);
  };

  const confirmar = (msg) => {
    if (typeof global.confirmar === 'function') return global.confirmar(msg);
    return Promise.resolve(window.confirm(msg));
  };

  // Tema (alinhado com paleta do Tutts — roxo #7c3aed)
  const cores = {
    primary: '#7c3aed',
    primarySoft: '#ede9fe',
    primaryDark: '#5b21b6',
    success: '#10b981',
    successSoft: '#d1fae5',
    warning: '#f59e0b',
    warningSoft: '#fef3c7',
    danger: '#ef4444',
    dangerSoft: '#fee2e2',
    gray: '#6b7280',
    graySoft: '#f3f4f6',
    border: '#e5e7eb',
    text: '#111827',
    textMuted: '#6b7280',
  };

  // ───────────────────────────────────────────────────────────────────────
  // Hook genérico de API (estabiliza fetchApi via useRef)
  // ───────────────────────────────────────────────────────────────────────
  function useApi({ apiUrl, token, fetchApi }) {
    const fetchRef = useRef(fetchApi);
    useEffect(() => { fetchRef.current = fetchApi; }, [fetchApi]);

    return useCallback(async (path, opts = {}) => {
      const url = `${apiUrl}${path}`;
      if (fetchRef.current) {
        return fetchRef.current(url, opts);
      }
      // Fallback se fetchApi não foi injetado
      const headers = Object.assign({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      }, opts.headers || {});
      const r = await fetch(url, { ...opts, headers, credentials: 'include' });
      if (!r.ok) {
        let detalhe = `HTTP ${r.status}`;
        try { const j = await r.json(); if (j.error) detalhe = j.error; } catch (_) {}
        throw new Error(detalhe);
      }
      return r.status === 204 ? null : r.json();
    }, [apiUrl, token]);
  }

  // ───────────────────────────────────────────────────────────────────────
  // Componentes atômicos
  // ───────────────────────────────────────────────────────────────────────

  function KpiCard({ label, valor, sub, cor }) {
    return React.createElement('div', {
      style: {
        background: cores.graySoft,
        borderRadius: 10,
        padding: '14px 16px',
      },
    },
      React.createElement('p', { style: { fontSize: 12, color: cores.textMuted, margin: '0 0 4px' } }, label),
      React.createElement('p', {
        style: { fontSize: 22, fontWeight: 600, margin: 0, color: cor || cores.text, lineHeight: 1.1 },
      }, valor),
      sub && React.createElement('p', {
        style: { fontSize: 11, color: cores.textMuted, margin: '3px 0 0' },
      }, sub)
    );
  }

  function StatusBadge({ status }) {
    const map = {
      ativa: { txt: 'ativa', bg: cores.successSoft, fg: '#065f46' },
      parcial: { txt: 'parcial', bg: cores.warningSoft, fg: '#92400e' },
      expirada: { txt: 'expirada', bg: cores.graySoft, fg: cores.gray },
      removida: { txt: 'removida', bg: cores.dangerSoft, fg: '#991b1b' },
    };
    const m = map[status] || map.expirada;
    return React.createElement('span', {
      style: {
        display: 'inline-block',
        padding: '3px 10px',
        background: m.bg,
        color: m.fg,
        borderRadius: 10,
        fontSize: 11,
        fontWeight: 600,
      },
    }, m.txt);
  }

  // Input com CAPS LOCK automático (visual + commit em UPPER)
  function CapsInput({ value, onChange, placeholder, style, autoFocus }) {
    return React.createElement('input', {
      type: 'text',
      value: value || '',
      onChange: (e) => onChange(e.target.value.toUpperCase()),
      placeholder,
      autoFocus,
      style: Object.assign({
        width: '100%',
        height: 36,
        padding: '0 12px',
        border: `1px solid ${cores.border}`,
        borderRadius: 8,
        fontSize: 13,
        fontFamily: 'inherit',
        textTransform: 'uppercase',
        boxSizing: 'border-box',
      }, style || {}),
    });
  }

  // ───────────────────────────────────────────────────────────────────────
  // Modal genérico
  // ───────────────────────────────────────────────────────────────────────
  function Modal({ aberto, onClose, titulo, icone, children, largura }) {
    if (!aberto) return null;
    return React.createElement('div', {
      style: {
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.45)',
        zIndex: 10000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      },
      onClick: onClose,
    },
      React.createElement('div', {
        style: {
          background: '#fff', borderRadius: 12,
          width: largura || 520, maxWidth: '100%', maxHeight: '90vh',
          overflow: 'auto',
        },
        onClick: (e) => e.stopPropagation(),
      },
        React.createElement('div', {
          style: {
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 20px', borderBottom: `1px solid ${cores.border}`,
          },
        },
          React.createElement('h3', {
            style: { fontSize: 16, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 8 },
          }, icone && React.createElement('span', { style: { color: cores.primary } }, icone), titulo),
          React.createElement('button', {
            onClick: onClose, 'aria-label': 'Fechar',
            style: { border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 22, color: cores.textMuted, lineHeight: 1 },
          }, '×')
        ),
        React.createElement('div', { style: { padding: 20 } }, children)
      )
    );
  }

  // ───────────────────────────────────────────────────────────────────────
  // Sub-modal: Gerenciar motivos pré-definidos
  // ───────────────────────────────────────────────────────────────────────
  function ModalGerenciarMotivos({ aberto, onClose, api, onSalvo }) {
    const [motivos, setMotivos] = useState([]);
    const [carregando, setCarregando] = useState(false);
    const [novoMotivo, setNovoMotivo] = useState('');
    const [editandoId, setEditandoId] = useState(null);
    const [textoEdit, setTextoEdit] = useState('');

    const carregar = useCallback(async () => {
      setCarregando(true);
      try {
        const dados = await api('/financial/gratuities/motivos');
        setMotivos(dados);
      } catch (e) {
        toast(e.message, 'erro');
      } finally {
        setCarregando(false);
      }
    }, [api]);

    useEffect(() => {
      if (aberto) carregar();
    }, [aberto, carregar]);

    const adicionar = async () => {
      const m = (novoMotivo || '').trim().toUpperCase();
      if (!m) return;
      try {
        await api('/financial/gratuities/motivos', {
          method: 'POST',
          body: JSON.stringify({ motivo: m }),
        });
        setNovoMotivo('');
        await carregar();
        if (onSalvo) onSalvo();
      } catch (e) {
        toast(e.message, 'erro');
      }
    };

    const salvarEdicao = async (id) => {
      const novo = (textoEdit || '').trim().toUpperCase();
      if (!novo) return;
      try {
        await api(`/financial/gratuities/motivos/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ motivo: novo }),
        });
        setEditandoId(null);
        setTextoEdit('');
        await carregar();
        if (onSalvo) onSalvo();
      } catch (e) {
        toast(e.message, 'erro');
      }
    };

    const excluir = async (m) => {
      const ok = await confirmar(`Remover motivo "${m.motivo}"?`);
      if (!ok) return;
      try {
        await api(`/financial/gratuities/motivos/${m.id}`, { method: 'DELETE' });
        await carregar();
        if (onSalvo) onSalvo();
      } catch (e) {
        toast(e.message, 'erro');
      }
    };

    return React.createElement(Modal, {
      aberto, onClose, largura: 460,
      titulo: 'Gerenciar motivos', icone: '⚙',
    },
      React.createElement('p', {
        style: { fontSize: 13, color: cores.textMuted, margin: '0 0 12px' },
      }, 'Os motivos aparecem como sugestões no cadastro. Todas as alterações são auditadas.'),

      // Lista
      React.createElement('div', {
        style: {
          background: cores.graySoft, borderRadius: 8, padding: 6,
          marginBottom: 14, maxHeight: 260, overflowY: 'auto',
        },
      },
        carregando
          ? React.createElement('p', { style: { textAlign: 'center', padding: 20, color: cores.textMuted, fontSize: 13 } }, 'Carregando…')
          : motivos.length === 0
            ? React.createElement('p', { style: { textAlign: 'center', padding: 20, color: cores.textMuted, fontSize: 13 } }, 'Nenhum motivo cadastrado ainda.')
            : motivos.map((m) =>
              React.createElement('div', {
                key: m.id,
                style: {
                  display: 'flex', alignItems: 'center',
                  background: '#fff', borderRadius: 6, padding: '8px 10px',
                  marginBottom: 4, gap: 8,
                },
              },
                editandoId === m.id
                  ? React.createElement('input', {
                    type: 'text', value: textoEdit, autoFocus: true,
                    onChange: (e) => setTextoEdit(e.target.value.toUpperCase()),
                    onKeyDown: (e) => { if (e.key === 'Enter') salvarEdicao(m.id); },
                    style: {
                      flex: 1, height: 28, padding: '0 8px',
                      border: `1px solid ${cores.primary}`, borderRadius: 6,
                      fontSize: 13, textTransform: 'uppercase',
                    },
                  })
                  : React.createElement('span', {
                    style: { flex: 1, fontWeight: 500, fontSize: 13 },
                  }, m.motivo),
                React.createElement('span', {
                  style: { fontSize: 11, color: cores.textMuted },
                }, `${m.contador_uso} uso${m.contador_uso === 1 ? '' : 's'}`),
                editandoId === m.id
                  ? React.createElement('button', {
                    onClick: () => salvarEdicao(m.id),
                    title: 'Salvar',
                    style: btnIcon(cores.successSoft, '#065f46'),
                  }, '✓')
                  : React.createElement('button', {
                    onClick: () => { setEditandoId(m.id); setTextoEdit(m.motivo); },
                    title: 'Editar',
                    style: btnIcon('#fff', cores.gray),
                  }, '✎'),
                React.createElement('button', {
                  onClick: () => excluir(m),
                  title: 'Excluir',
                  style: btnIcon(cores.dangerSoft, '#991b1b'),
                }, '×')
              )
            )
      ),

      // Adicionar novo
      React.createElement('p', {
        style: { fontSize: 12, fontWeight: 600, color: cores.textMuted, margin: '0 0 6px' },
      }, 'Novo motivo'),
      React.createElement('div', { style: { display: 'flex', gap: 8 } },
        React.createElement(CapsInput, {
          value: novoMotivo,
          onChange: setNovoMotivo,
          placeholder: 'DIGITE O NOVO MOTIVO',
        }),
        React.createElement('button', {
          onClick: adicionar,
          style: btnPrimary(),
        }, '+ Adicionar')
      ),
      React.createElement('p', {
        style: { fontSize: 11, color: cores.textMuted, margin: '6px 0 0' },
      }, '↑ Convertido pra caixa alta automaticamente'),

      React.createElement('div', {
        style: { display: 'flex', justifyContent: 'flex-end', marginTop: 16, paddingTop: 14, borderTop: `1px solid ${cores.border}` },
      },
        React.createElement('button', { onClick: onClose, style: btnSecondary() }, 'Fechar')
      )
    );
  }

  function btnIcon(bg, fg) {
    return {
      width: 26, height: 26,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: bg, color: fg,
      border: 'none', borderRadius: 6,
      fontSize: 14, fontWeight: 600,
      cursor: 'pointer',
    };
  }
  function btnPrimary() {
    return {
      height: 36, padding: '0 16px',
      background: cores.primary, color: '#fff',
      border: 'none', borderRadius: 8,
      fontSize: 13, fontWeight: 500, cursor: 'pointer',
      whiteSpace: 'nowrap',
    };
  }
  function btnSecondary() {
    return {
      height: 36, padding: '0 16px',
      background: '#fff', color: cores.text,
      border: `1px solid ${cores.border}`, borderRadius: 8,
      fontSize: 13, fontWeight: 500, cursor: 'pointer',
    };
  }

  // ───────────────────────────────────────────────────────────────────────
  // Modal: Cadastrar gratuidade
  // ───────────────────────────────────────────────────────────────────────
  function ModalCadastrar({ aberto, onClose, api, motivos, onCriado, onAbrirGerenciar }) {
    const [codigo, setCodigo] = useState('');
    const [nome, setNome] = useState('');
    const [qtd, setQtd] = useState('1');
    const [valor, setValor] = useState('');
    const [motivo, setMotivo] = useState('');
    const [salvando, setSalvando] = useState(false);

    useEffect(() => {
      if (aberto) {
        setCodigo(''); setNome(''); setQtd('1'); setValor(''); setMotivo('');
      }
    }, [aberto]);

    const valorNum = parseFloat(String(valor).replace(',', '.')) || 0;
    const qtdNum = parseInt(qtd, 10) || 0;
    const total = valorNum * qtdNum;

    const submeter = async () => {
      if (!codigo.trim()) { toast('Código é obrigatório'); return; }
      if (qtdNum <= 0) { toast('Quantidade inválida'); return; }
      if (valorNum <= 0) { toast('Valor inválido'); return; }

      setSalvando(true);
      try {
        await api('/financial/gratuities', {
          method: 'POST',
          body: JSON.stringify({
            userCod: codigo.trim(),
            userName: nome.trim() || null,
            quantity: qtdNum,
            value: valorNum,
            reason: motivo ? motivo.trim().toUpperCase() : null,
            createdBy: null, // backend pega do req.user
          }),
        });
        toast('Gratuidade cadastrada ✓');
        if (onCriado) onCriado();
        onClose();
      } catch (e) {
        toast(e.message, 'erro');
      } finally {
        setSalvando(false);
      }
    };

    return React.createElement(Modal, {
      aberto, onClose, titulo: 'Cadastrar gratuidade', icone: '+', largura: 540,
    },
      // Grid de campos
      React.createElement('div', {
        style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 },
      },
        // Código
        campo('Código *',
          React.createElement('input', {
            type: 'text', value: codigo,
            onChange: (e) => setCodigo(e.target.value),
            placeholder: 'Código do profissional',
            style: inputStyle(),
          })
        ),
        // Nome
        campo('Nome',
          React.createElement('input', {
            type: 'text', value: nome,
            onChange: (e) => setNome(e.target.value),
            placeholder: 'Nome do usuário',
            style: inputStyle(),
          })
        ),
        // Quantidade
        campo('Quantidade *',
          React.createElement('input', {
            type: 'number', min: '1', value: qtd,
            onChange: (e) => setQtd(e.target.value),
            style: inputStyle(),
          })
        ),
        // Valor
        campo('Valor unitário (R$) *',
          React.createElement('input', {
            type: 'text', value: valor,
            onChange: (e) => setValor(e.target.value),
            placeholder: '0,00',
            style: inputStyle(),
          })
        ),
        // Total (computado)
        React.createElement('div', { style: { gridColumn: '1 / -1' } },
          campo('Total',
            React.createElement('div', {
              style: {
                height: 36, padding: '0 12px',
                background: cores.graySoft, borderRadius: 8,
                display: 'flex', alignItems: 'center',
                fontSize: 14, fontWeight: 600, color: cores.primaryDark,
              },
            }, fmt.moeda(total))
          )
        )
      ),

      // Motivo: chips + input + "Gerenciar"
      React.createElement('div', { style: { marginBottom: 14 } },
        React.createElement('div', {
          style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
        },
          React.createElement('label', {
            style: { fontSize: 12, fontWeight: 600, color: cores.textMuted },
          }, 'Motivo'),
          React.createElement('button', {
            onClick: onAbrirGerenciar,
            style: {
              background: 'transparent', border: 'none',
              color: cores.primary, fontSize: 12, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500,
            },
          }, '⚙ Gerenciar motivos')
        ),
        React.createElement('div', {
          style: {
            border: `1px solid ${cores.border}`,
            background: cores.graySoft,
            borderRadius: 8, padding: 10,
          },
        },
          // Chips
          motivos.length > 0 && React.createElement('div', {
            style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
          },
            motivos.map((m) =>
              React.createElement('button', {
                key: m.id,
                onClick: () => setMotivo(m.motivo),
                style: {
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '5px 11px',
                  background: motivo === m.motivo ? cores.primarySoft : '#fff',
                  color: motivo === m.motivo ? cores.primaryDark : cores.textMuted,
                  border: motivo === m.motivo ? 'none' : `1px solid ${cores.border}`,
                  borderRadius: 14, fontSize: 12, cursor: 'pointer',
                  fontWeight: motivo === m.motivo ? 600 : 400,
                },
              }, m.motivo, motivo === m.motivo && ' ✓')
            )
          ),
          React.createElement(CapsInput, {
            value: motivo,
            onChange: setMotivo,
            placeholder: 'OU DIGITE UM MOTIVO NOVO…',
            style: { background: '#fff' },
          }),
          React.createElement('p', {
            style: { fontSize: 11, color: cores.textMuted, margin: '6px 0 0' },
          }, '↑ Texto é convertido pra caixa alta automaticamente')
        )
      ),

      // Ações
      React.createElement('div', {
        style: {
          display: 'flex', justifyContent: 'flex-end', gap: 8,
          paddingTop: 14, borderTop: `1px solid ${cores.border}`,
        },
      },
        React.createElement('button', { onClick: onClose, style: btnSecondary(), disabled: salvando }, 'Cancelar'),
        React.createElement('button', { onClick: submeter, style: btnPrimary(), disabled: salvando },
          salvando ? 'Salvando…' : '+ Adicionar')
      )
    );
  }

  function campo(label, control) {
    return React.createElement('div', null,
      React.createElement('label', {
        style: { display: 'block', fontSize: 12, fontWeight: 600, color: cores.textMuted, marginBottom: 4 },
      }, label),
      control
    );
  }
  function inputStyle() {
    return {
      width: '100%', height: 36, padding: '0 12px',
      border: `1px solid ${cores.border}`, borderRadius: 8,
      fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box',
    };
  }

  // ───────────────────────────────────────────────────────────────────────
  // Componente principal — Tela de listagem
  // ───────────────────────────────────────────────────────────────────────
  function TelaGratuidades({ apiUrl, token, fetchApi }) {
    const api = useApi({ apiUrl, token, fetchApi });

    // Estado da listagem
    const [aba, setAba] = useState('ativa'); // 'ativa' | 'expirada' | 'todas'
    const [busca, setBusca] = useState('');
    const [createdBy, setCreatedBy] = useState('');
    const [motivoFiltro, setMotivoFiltro] = useState('');
    const [periodo, setPeriodo] = useState('30d');
    const [page, setPage] = useState(1);
    const [pageSize] = useState(20);

    const [dados, setDados] = useState([]);
    const [paginacao, setPaginacao] = useState({ total: 0, totalPaginas: 1 });
    const [carregando, setCarregando] = useState(false);

    const [kpis, setKpis] = useState({ ativas: 0, expiradas_mes: 0, valor_ativo: 0, total_mes: 0 });
    const [motivos, setMotivos] = useState([]);
    const [criadores, setCriadores] = useState([]);

    const [modalCadastro, setModalCadastro] = useState(false);
    const [modalMotivos, setModalMotivos] = useState(false);

    // Debounce da busca pra não bombardear o backend
    const buscaDebounce = useRef(null);
    const [buscaEfetiva, setBuscaEfetiva] = useState('');
    useEffect(() => {
      if (buscaDebounce.current) clearTimeout(buscaDebounce.current);
      buscaDebounce.current = setTimeout(() => setBuscaEfetiva(busca), 300);
      return () => buscaDebounce.current && clearTimeout(buscaDebounce.current);
    }, [busca]);

    const carregarKpis = useCallback(async () => {
      try {
        const k = await api('/financial/gratuities/kpis');
        setKpis(k);
      } catch (e) {
        console.error('KPIs:', e);
      }
    }, [api]);

    const carregarMotivos = useCallback(async () => {
      try {
        const m = await api('/financial/gratuities/motivos');
        setMotivos(m);
      } catch (e) {
        console.error('Motivos:', e);
      }
    }, [api]);

    const carregarCriadores = useCallback(async () => {
      try {
        const c = await api('/financial/gratuities/created-by');
        setCriadores(c);
      } catch (e) {
        console.error('Criadores:', e);
      }
    }, [api]);

    const carregarLista = useCallback(async () => {
      setCarregando(true);
      try {
        const qs = new URLSearchParams();
        qs.set('status', aba);
        if (createdBy) qs.set('createdBy', createdBy);
        if (motivoFiltro) qs.set('motivo', motivoFiltro);
        if (buscaEfetiva) qs.set('busca', buscaEfetiva);
        if (periodo) qs.set('periodo', periodo);
        qs.set('page', String(page));
        qs.set('pageSize', String(pageSize));

        const r = await api(`/financial/gratuities/listar?${qs.toString()}`);
        setDados(r.dados || []);
        setPaginacao(r.paginacao || { total: 0, totalPaginas: 1 });
      } catch (e) {
        toast(e.message, 'erro');
        setDados([]);
      } finally {
        setCarregando(false);
      }
    }, [api, aba, createdBy, motivoFiltro, buscaEfetiva, periodo, page, pageSize]);

    // Reset da página quando filtros mudam
    useEffect(() => { setPage(1); }, [aba, createdBy, motivoFiltro, buscaEfetiva, periodo]);

    useEffect(() => { carregarLista(); }, [carregarLista]);
    useEffect(() => { carregarKpis(); carregarMotivos(); carregarCriadores(); }, [carregarKpis, carregarMotivos, carregarCriadores]);

    const excluir = async (g) => {
      const ok = await confirmar(`Remover gratuidade do código ${g.user_cod}?`);
      if (!ok) return;
      try {
        await api(`/financial/gratuities/${g.id}`, { method: 'DELETE' });
        toast('Removida ✓');
        carregarLista();
        carregarKpis();
      } catch (e) {
        toast(e.message, 'erro');
      }
    };

    const apósMudancaMotivos = () => {
      carregarMotivos();
    };

    // ─── Render ─────────────────────────────────────────────────────────
    return React.createElement('div', { style: { padding: 16, fontFamily: 'system-ui, -apple-system, sans-serif', color: cores.text } },

      // KPIs
      React.createElement('div', {
        style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 14 },
      },
        React.createElement(KpiCard, { label: 'Ativas', valor: kpis.ativas, sub: 'a vencer este mês', cor: '#065f46' }),
        React.createElement(KpiCard, { label: 'Expiradas (mês)', valor: kpis.expiradas_mes, sub: 'já consumidas' }),
        React.createElement(KpiCard, { label: 'Valor ativo', valor: fmt.moeda(kpis.valor_ativo), sub: 'soma das restantes' }),
        React.createElement(KpiCard, { label: 'Total cadastrado', valor: fmt.moeda(kpis.total_mes), sub: 'acumulado no mês' })
      ),

      // Header com botão de cadastrar
      React.createElement('div', {
        style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
      },
        React.createElement('h2', { style: { fontSize: 18, fontWeight: 600, margin: 0 } }, 'Gratuidades'),
        React.createElement('button', { onClick: () => setModalCadastro(true), style: btnPrimary() }, '+ Cadastrar gratuidade')
      ),

      // Card da tabela
      React.createElement('div', {
        style: {
          background: '#fff', border: `1px solid ${cores.border}`,
          borderRadius: 12, overflow: 'hidden',
        },
      },
        // Abas
        React.createElement('div', {
          style: { display: 'flex', gap: 0, padding: '8px 12px 0', borderBottom: `1px solid ${cores.border}`, background: cores.graySoft },
        },
          [
            { id: 'ativa', label: 'Ativas', count: kpis.ativas },
            { id: 'expirada', label: 'Expiradas', count: kpis.expiradas_mes },
            { id: 'todas', label: 'Todas', count: null },
          ].map((t) =>
            React.createElement('button', {
              key: t.id,
              onClick: () => setAba(t.id),
              style: {
                padding: '10px 16px',
                background: 'transparent', border: 'none',
                borderBottom: `2px solid ${aba === t.id ? cores.primary : 'transparent'}`,
                color: aba === t.id ? cores.text : cores.textMuted,
                fontWeight: aba === t.id ? 600 : 400, fontSize: 13,
                cursor: 'pointer', marginBottom: -1,
                display: 'flex', alignItems: 'center', gap: 6,
              },
            },
              t.label,
              t.count != null && React.createElement('span', {
                style: {
                  background: aba === t.id ? cores.primarySoft : '#fff',
                  color: aba === t.id ? cores.primaryDark : cores.textMuted,
                  border: aba === t.id ? 'none' : `1px solid ${cores.border}`,
                  fontSize: 11, padding: '1px 7px', borderRadius: 10, fontWeight: 600,
                },
              }, t.count)
            )
          )
        ),

        // Toolbar de filtros
        React.createElement('div', {
          style: {
            display: 'flex', gap: 8, padding: '12px 14px', flexWrap: 'wrap',
            alignItems: 'center', borderBottom: `1px solid ${cores.border}`,
          },
        },
          React.createElement('div', { style: { flex: 1, minWidth: 200, position: 'relative' } },
            React.createElement('span', {
              style: { position: 'absolute', left: 10, top: 9, color: cores.textMuted, fontSize: 14 },
            }, '🔍'),
            React.createElement('input', {
              type: 'text', value: busca,
              onChange: (e) => setBusca(e.target.value),
              placeholder: 'Buscar por código, nome ou motivo…',
              style: Object.assign(inputStyle(), { paddingLeft: 32 }),
            })
          ),
          React.createElement('select', {
            value: createdBy, onChange: (e) => setCreatedBy(e.target.value),
            style: selectStyle(),
          },
            React.createElement('option', { value: '' }, 'Cadastrado por: todos'),
            criadores.map((c) =>
              React.createElement('option', { key: c, value: c }, c)
            )
          ),
          React.createElement('select', {
            value: motivoFiltro, onChange: (e) => setMotivoFiltro(e.target.value),
            style: selectStyle(),
          },
            React.createElement('option', { value: '' }, 'Motivo: todos'),
            motivos.map((m) =>
              React.createElement('option', { key: m.id, value: m.motivo }, m.motivo)
            )
          ),
          React.createElement('select', {
            value: periodo, onChange: (e) => setPeriodo(e.target.value),
            style: Object.assign(selectStyle(), { minWidth: 140 }),
          },
            React.createElement('option', { value: '' }, 'Período: tudo'),
            React.createElement('option', { value: 'hoje' }, 'Hoje'),
            React.createElement('option', { value: 'semana' }, 'Esta semana'),
            React.createElement('option', { value: 'mes' }, 'Este mês'),
            React.createElement('option', { value: '30d' }, 'Últimos 30 dias')
          )
        ),

        // Tabela
        React.createElement('div', { style: { overflowX: 'auto' } },
          React.createElement('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 13 } },
            React.createElement('thead', null,
              React.createElement('tr', null,
                ['Código', 'Nome', 'Qtd', 'Rest.', 'Valor', 'Motivo', 'Cadastrado por', 'Status', 'Ação'].map((h, i) =>
                  React.createElement('th', {
                    key: h,
                    style: {
                      textAlign: i === 2 || i === 3 || i === 7 ? 'center' : i === 4 || i === 8 ? 'right' : 'left',
                      padding: '10px 14px', fontWeight: 600, color: cores.textMuted,
                      fontSize: 12, background: cores.graySoft, borderBottom: `1px solid ${cores.border}`,
                    },
                  }, h)
                )
              )
            ),
            React.createElement('tbody', null,
              carregando
                ? React.createElement('tr', null,
                  React.createElement('td', {
                    colSpan: 9,
                    style: { padding: 30, textAlign: 'center', color: cores.textMuted },
                  }, 'Carregando…')
                )
                : dados.length === 0
                  ? React.createElement('tr', null,
                    React.createElement('td', {
                      colSpan: 9,
                      style: { padding: 30, textAlign: 'center', color: cores.textMuted },
                    }, 'Nenhuma gratuidade encontrada com esses filtros.')
                  )
                  : dados.map((g, idx) =>
                    React.createElement('tr', {
                      key: g.id,
                      style: {
                        background: idx % 2 === 0 ? '#fff' : '#fafafa',
                      },
                    },
                      td(g.user_cod, { fontFamily: 'monospace', color: cores.textMuted, fontSize: 12 }),
                      td(g.user_name || '—', { fontWeight: 500 }),
                      td(g.quantity, { textAlign: 'center' }),
                      td(g.remaining, { textAlign: 'center', fontWeight: 600, color: g.remaining === 0 ? cores.textMuted : cores.text }),
                      td(fmt.moeda(g.value), { textAlign: 'right' }),
                      td(g.reason || '—', { color: g.reason ? cores.text : cores.textMuted }),
                      React.createElement('td', { style: tdBase() },
                        React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 2 } },
                          React.createElement('span', { style: { fontSize: 13 } }, g.created_by || '—'),
                          React.createElement('span', { style: { fontSize: 11, color: cores.textMuted } }, fmt.data(g.created_at))
                        )
                      ),
                      React.createElement('td', { style: Object.assign(tdBase(), { textAlign: 'center' }) },
                        React.createElement(StatusBadge, { status: g.status_ui })
                      ),
                      React.createElement('td', { style: Object.assign(tdBase(), { textAlign: 'right' }) },
                        React.createElement('button', {
                          onClick: () => excluir(g),
                          style: {
                            padding: '5px 10px', background: cores.dangerSoft, color: '#991b1b',
                            border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                          },
                          disabled: g.status_ui === 'removida',
                        }, '🗑 Excluir')
                      )
                    )
                  )
            )
          )
        ),

        // Paginação
        paginacao.total > 0 && React.createElement('div', {
          style: {
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px', borderTop: `1px solid ${cores.border}`,
            fontSize: 12, color: cores.textMuted,
          },
        },
          React.createElement('span', null,
            `Mostrando ${((page - 1) * pageSize) + 1}–${Math.min(page * pageSize, paginacao.total)} de ${paginacao.total}`
          ),
          React.createElement('div', { style: { display: 'flex', gap: 4 } },
            React.createElement('button', {
              onClick: () => setPage(Math.max(1, page - 1)),
              disabled: page <= 1,
              style: pagerBtn(false),
            }, '‹'),
            pagerNumeros(page, paginacao.totalPaginas).map((n, i) =>
              n === '…'
                ? React.createElement('span', { key: `e${i}`, style: { padding: '0 8px', alignSelf: 'center' } }, '…')
                : React.createElement('button', {
                  key: n, onClick: () => setPage(n),
                  style: pagerBtn(n === page),
                }, n)
            ),
            React.createElement('button', {
              onClick: () => setPage(Math.min(paginacao.totalPaginas, page + 1)),
              disabled: page >= paginacao.totalPaginas,
              style: pagerBtn(false),
            }, '›')
          )
        )
      ),

      // Modais
      React.createElement(ModalCadastrar, {
        aberto: modalCadastro,
        onClose: () => setModalCadastro(false),
        api, motivos,
        onAbrirGerenciar: () => setModalMotivos(true),
        onCriado: () => { carregarLista(); carregarKpis(); carregarCriadores(); },
      }),
      React.createElement(ModalGerenciarMotivos, {
        aberto: modalMotivos,
        onClose: () => setModalMotivos(false),
        api,
        onSalvo: apósMudancaMotivos,
      })
    );
  }

  function tdBase() {
    return { padding: '11px 14px', borderBottom: `1px solid ${cores.border}`, verticalAlign: 'middle' };
  }
  function td(conteudo, extra = {}) {
    return React.createElement('td', { style: Object.assign(tdBase(), extra) }, conteudo);
  }
  function selectStyle() {
    return {
      height: 36, padding: '0 32px 0 12px',
      border: `1px solid ${cores.border}`, borderRadius: 8,
      background: '#fff', fontSize: 13, minWidth: 160,
      appearance: 'none',
      backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'><polyline points='6 9 12 15 18 9'/></svg>")`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'right 10px center',
      cursor: 'pointer',
    };
  }
  function pagerBtn(ativo) {
    return {
      minWidth: 28, height: 28, padding: '0 8px',
      border: ativo ? 'none' : `1px solid ${cores.border}`,
      background: ativo ? cores.primarySoft : '#fff',
      color: ativo ? cores.primaryDark : cores.textMuted,
      fontSize: 12, fontWeight: ativo ? 600 : 400,
      borderRadius: 6, cursor: 'pointer',
    };
  }
  // Devolve 1..5 + … + último, ou só 1..N se N <= 7
  function pagerNumeros(curr, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (curr <= 4) return [1, 2, 3, 4, 5, '…', total];
    if (curr >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total];
    return [1, '…', curr - 1, curr, curr + 1, '…', total];
  }

  // ───────────────────────────────────────────────────────────────────────
  // API pública do módulo
  // ───────────────────────────────────────────────────────────────────────
  function renderizar(container, { apiUrl, token, fetchApi }) {
    if (!container) {
      console.error('[ModuloGratuidadesV2] container inválido');
      return;
    }
    const root = ReactDOM.createRoot
      ? ReactDOM.createRoot(container)
      : null;
    if (root) {
      root.render(React.createElement(TelaGratuidades, { apiUrl, token, fetchApi }));
      return { unmount: () => root.unmount() };
    }
    // Fallback React 17
    ReactDOM.render(React.createElement(TelaGratuidades, { apiUrl, token, fetchApi }), container);
    return { unmount: () => ReactDOM.unmountComponentAtNode(container) };
  }

  global.ModuloGratuidadesV2 = { renderizar, _versao: '2026-05-12' };

})(typeof window !== 'undefined' ? window : globalThis);
