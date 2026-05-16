// ============================================================
// MÓDULO CONTROLE DE MÁQUINAS - FRONTEND v1
// Tela admin Central: ver motoboys com restrição por máquina
// e liberar saque pontual (1 saque) sem restituir a máquina.
// Padrão: Vanilla JS + React via CDN (sem JSX)
// ============================================================

(function () {
  const e = React.createElement;

  function ModuloControleMaquinas({ usuario, apiUrl, showToast, fetchAuth: fetchAuthExterno }) {
    const _fetch = React.useRef(fetchAuthExterno || (typeof window !== 'undefined' && window.fetchAuth) || fetch);
    const _api = React.useRef(apiUrl || (typeof window !== 'undefined' && window.API_URL) || '');
    React.useEffect(() => { if (fetchAuthExterno) _fetch.current = fetchAuthExterno; }, [fetchAuthExterno]);

    const [aba, setAba] = React.useState('restricoes');
    const [carregando, setCarregando] = React.useState(false);
    const [restricoes, setRestricoes] = React.useState([]);
    const [stats, setStats] = React.useState({ total: 0, bloqueados: 0, liberados_hoje: 0 });
    const [historico, setHistorico] = React.useState([]);
    const [modalLiberar, setModalLiberar] = React.useState(null);
    const [processando, setProcessando] = React.useState(false);

    const toast = (msg, tipo) => {
      if (typeof showToast === 'function') showToast(msg, tipo);
    };

    // ── Carregamento ────────────────────────────────────────────────
    const carregarRestricoes = React.useCallback(async () => {
      setCarregando(true);
      try {
        const r = await _fetch.current(`${_api.current}/admin/maquinas/restricoes`);
        if (r.ok) {
          const d = await r.json();
          setRestricoes(d.restricoes || []);
          setStats({
            total: d.total || 0,
            bloqueados: d.bloqueados || 0,
            liberados_hoje: d.liberados_hoje || 0,
          });
        } else {
          toast('Erro ao carregar restrições', 'error');
        }
      } catch (err) {
        toast('Erro de conexão', 'error');
      }
      setCarregando(false);
    }, []);

    const carregarHistorico = React.useCallback(async () => {
      setCarregando(true);
      try {
        const r = await _fetch.current(`${_api.current}/admin/maquinas/liberacoes?limit=200`);
        if (r.ok) {
          const d = await r.json();
          setHistorico(d.liberacoes || []);
        }
      } catch (err) {
        toast('Erro ao carregar histórico', 'error');
      }
      setCarregando(false);
    }, []);

    React.useEffect(() => {
      if (aba === 'restricoes') carregarRestricoes();
      if (aba === 'historico') carregarHistorico();
    }, [aba, carregarRestricoes, carregarHistorico]);

    // Auto-refresh das restrições a cada 30s
    React.useEffect(() => {
      if (aba !== 'restricoes') return;
      const iv = setInterval(carregarRestricoes, 30000);
      return () => clearInterval(iv);
    }, [aba, carregarRestricoes]);

    // ── Ações ───────────────────────────────────────────────────────
    const confirmarLiberacao = async () => {
      if (!modalLiberar) return;
      setProcessando(true);
      try {
        const r = await _fetch.current(
          `${_api.current}/admin/maquinas/restricoes/${modalLiberar.movimentacao_id}/liberar`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }
        );
        const d = await r.json();
        if (r.ok) {
          toast(`✅ Saque liberado para ${modalLiberar.motoboy_nome}`, 'success');
          setModalLiberar(null);
          await carregarRestricoes();
        } else {
          toast(d.error || 'Erro ao liberar', 'error');
        }
      } catch (err) {
        toast('Erro de conexão', 'error');
      }
      setProcessando(false);
    };

    const cancelarLiberacao = async (mov) => {
      try {
        const r = await _fetch.current(
          `${_api.current}/admin/maquinas/restricoes/${mov.movimentacao_id}/liberar`,
          { method: 'DELETE' }
        );
        const d = await r.json();
        if (r.ok) {
          toast('Liberação cancelada', 'success');
          await carregarRestricoes();
        } else {
          toast(d.error || 'Erro ao cancelar', 'error');
        }
      } catch (err) {
        toast('Erro de conexão', 'error');
      }
    };

    // ── Helpers ─────────────────────────────────────────────────────
    const iniciais = (nome) => (nome || '').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
    const fmtData = (iso) => {
      if (!iso) return '—';
      const d = new Date(iso);
      return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    };
    const fmtTempo = (mins) => {
      const m = Math.floor(mins || 0);
      if (m < 60) return `${m}min`;
      return `${Math.floor(m / 60)}h ${m % 60}min`;
    };

    // ── Render: card de stat ────────────────────────────────────────
    const statCard = (label, valor, cor) =>
      e('div', { style: { background: '#F1EFE8', borderRadius: '8px', padding: '12px 14px' } },
        e('div', { style: { fontSize: '10px', color: '#5F5E5A', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '2px' } }, label),
        e('div', { style: { fontSize: '26px', fontWeight: 500, lineHeight: 1.1, color: cor || '#2C2C2A' } }, valor)
      );

    // ── Render principal ────────────────────────────────────────────
    return e('div', { style: { maxWidth: '1100px', margin: '0 auto', padding: '20px 16px' } },
      // Header
      e('div', { style: { marginBottom: '16px' } },
        e('h2', { style: { fontSize: '20px', fontWeight: 700, color: '#1f2937', margin: 0 } }, '🔓 Controle de Máquinas'),
        e('p', { style: { fontSize: '13px', color: '#6b7280', margin: '4px 0 0' } },
          'Motoboys com saque bloqueado por estarem com máquina da loja em mãos')
      ),

      // Abas
      e('div', { style: { display: 'flex', gap: '8px', marginBottom: '16px' } },
        e('button', {
          onClick: () => setAba('restricoes'),
          style: {
            padding: '7px 14px', fontSize: '13px', borderRadius: '8px', border: 0, cursor: 'pointer',
            background: aba === 'restricoes' ? '#534AB7' : '#F1EFE8',
            color: aba === 'restricoes' ? '#fff' : '#5F5E5A',
            fontWeight: aba === 'restricoes' ? 500 : 400,
          }
        }, 'Restrições ativas'),
        e('button', {
          onClick: () => setAba('historico'),
          style: {
            padding: '7px 14px', fontSize: '13px', borderRadius: '8px', border: 0, cursor: 'pointer',
            background: aba === 'historico' ? '#534AB7' : '#F1EFE8',
            color: aba === 'historico' ? '#fff' : '#5F5E5A',
            fontWeight: aba === 'historico' ? 500 : 400,
          }
        }, 'Histórico de liberações')
      ),

      // ─── ABA RESTRIÇÕES ───
      aba === 'restricoes' && e(React.Fragment, null,
        e('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' } },
          statCard('Com máquina', stats.total),
          statCard('Bloqueados', stats.bloqueados, '#791F1F'),
          statCard('Liberados hoje', stats.liberados_hoje, '#0F6E56')
        ),

        carregando && restricoes.length === 0
          ? e('p', { style: { textAlign: 'center', color: '#6b7280', fontSize: '13px', padding: '24px' } }, 'Carregando...')
          : restricoes.length === 0
            ? e('div', { style: { background: '#fff', border: '1px dashed #d1d5db', borderRadius: '8px', padding: '32px', textAlign: 'center', color: '#6b7280', fontSize: '13px' } },
                'Nenhum motoboy com máquina em campo no momento.')
            : restricoes.map(r => e('div', {
                key: r.movimentacao_id,
                style: {
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '11px 14px', marginBottom: '7px',
                  background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px',
                }
              },
                e('div', {
                  style: {
                    width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 500, fontSize: '12px',
                    background: r.liberado ? '#9FE1CB' : '#F7C1C1',
                    color: r.liberado ? '#04342C' : '#791F1F',
                  }
                }, iniciais(r.motoboy_nome)),
                e('div', { style: { flex: 1, minWidth: 0 } },
                  e('div', { style: { fontSize: '13px', fontWeight: 500, color: '#1f2937' } }, r.motoboy_nome),
                  e('div', { style: { fontSize: '11px', color: '#6b7280', marginTop: '2px' } },
                    e('span', { style: { fontFamily: 'monospace' } },
                      `${r.identificador} ${r.marca}${r.observacao ? ' (' + r.observacao + ')' : ''} · ${r.cliente_nome}`),
                    e('span', null, `  ·  desde ${fmtData(r.despachada_em)} (${fmtTempo(r.minutos_em_campo)})`)
                  )
                ),
                r.liberado
                  ? e('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                      e('span', { style: { fontSize: '10px', padding: '3px 9px', borderRadius: '999px', background: '#9FE1CB', color: '#04342C', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.3px' } }, 'Liberado'),
                      e('div', { style: { fontSize: '11px', color: '#0F6E56', textAlign: 'right' } },
                        e('div', null, 'por ', e('span', { style: { fontWeight: 500 } }, r.liberado_por_nome || 'admin')),
                        e('div', { style: { color: '#888780' } }, fmtData(r.liberado_em))
                      ),
                      e('button', {
                        onClick: () => cancelarLiberacao(r),
                        title: 'Cancelar liberação',
                        style: { background: 'transparent', border: '1px solid #d1d5db', color: '#6b7280', borderRadius: '6px', height: '28px', padding: '0 8px', fontSize: '11px', cursor: 'pointer' }
                      }, 'Desfazer')
                    )
                  : e('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                      e('span', { style: { fontSize: '10px', padding: '3px 9px', borderRadius: '999px', background: '#F7C1C1', color: '#791F1F', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.3px' } }, 'Bloqueado'),
                      e('button', {
                        onClick: () => setModalLiberar(r),
                        style: { background: '#534AB7', color: '#fff', border: 0, height: '32px', padding: '0 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }
                      }, 'Liberar saque')
                    )
              ))
      ),

      // ─── ABA HISTÓRICO ───
      aba === 'historico' && e(React.Fragment, null,
        carregando && historico.length === 0
          ? e('p', { style: { textAlign: 'center', color: '#6b7280', fontSize: '13px', padding: '24px' } }, 'Carregando...')
          : historico.length === 0
            ? e('div', { style: { background: '#fff', border: '1px dashed #d1d5db', borderRadius: '8px', padding: '32px', textAlign: 'center', color: '#6b7280', fontSize: '13px' } },
                'Nenhuma liberação registrada ainda.')
            : e('div', { style: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' } },
                e('table', { style: { width: '100%', fontSize: '13px', borderCollapse: 'collapse' } },
                  e('thead', null,
                    e('tr', { style: { background: '#F1EFE8' } },
                      ['Quando', 'Motoboy', 'Máquina', 'Loja', 'Liberado por', 'Status'].map((h, i) =>
                        e('th', { key: i, style: { textAlign: 'left', fontSize: '10px', color: '#5F5E5A', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: 500, padding: '8px 10px' } }, h))
                    )
                  ),
                  e('tbody', null,
                    historico.map(h => e('tr', { key: h.id, style: { borderTop: '1px solid #f3f4f6' } },
                      e('td', { style: { padding: '9px 10px', fontSize: '12px', whiteSpace: 'nowrap' } }, fmtData(h.created_at)),
                      e('td', { style: { padding: '9px 10px', fontSize: '12px' } }, h.motoboy_nome),
                      e('td', { style: { padding: '9px 10px', fontSize: '12px', fontFamily: 'monospace' } }, `${h.identificador} ${h.marca}`),
                      e('td', { style: { padding: '9px 10px', fontSize: '12px' } }, h.cliente_nome),
                      e('td', { style: { padding: '9px 10px', fontSize: '12px' } }, h.liberado_por_nome || '—'),
                      e('td', { style: { padding: '9px 10px' } },
                        h.consumida
                          ? e('span', { style: { fontSize: '10px', padding: '2px 8px', borderRadius: '999px', background: '#D3D1C7', color: '#444441', fontWeight: 500, textTransform: 'uppercase' } }, 'Usado')
                          : e('span', { style: { fontSize: '10px', padding: '2px 8px', borderRadius: '999px', background: '#FAC775', color: '#633806', fontWeight: 500, textTransform: 'uppercase' } }, 'Aguardando')
                      )
                    ))
                  )
                )
              )
      ),

      // ─── MODAL LIBERAR ───
      modalLiberar && e('div', {
        onClick: () => !processando && setModalLiberar(null),
        style: {
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(20,18,30,0.55)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 99999, padding: '16px', boxSizing: 'border-box',
        }
      },
        e('div', {
          onClick: (ev) => ev.stopPropagation(),
          style: { background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '400px', overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }
        },
          e('div', { style: { background: '#EEEDFE', padding: '16px 20px 14px', borderBottom: '1px solid #CECBF6' } },
            e('div', { style: { width: '42px', height: '42px', borderRadius: '50%', background: '#CECBF6', color: '#3C3489', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', marginBottom: '8px' } }, '🔓'),
            e('p', { style: { fontSize: '16px', fontWeight: 500, color: '#26215C', margin: 0 } }, 'Liberar saque do motoboy')
          ),
          e('div', { style: { padding: '16px 20px' } },
            e('p', { style: { fontSize: '13px', color: '#111', lineHeight: 1.6, margin: '0 0 14px' } },
              'Você vai liberar ', e('b', { style: { fontWeight: 500 } }, 'um saque emergencial'),
              ' para ', e('b', { style: { fontWeight: 500 } }, modalLiberar.motoboy_nome),
              ', mesmo ele estando com máquina da loja em mãos.'),
            e('div', { style: { background: '#F1EFE8', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px' } },
              [
                ['Motoboy', modalLiberar.motoboy_nome],
                ['Máquina', `${modalLiberar.identificador} ${modalLiberar.marca}`],
                ['Loja', modalLiberar.cliente_nome],
                ['Em campo desde', fmtData(modalLiberar.despachada_em)],
              ].map(([l, v], i, arr) => e('div', {
                key: i,
                style: { display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '12px', borderBottom: i < arr.length - 1 ? '1px solid #D3D1C7' : 'none' }
              },
                e('span', { style: { color: '#5F5E5A', textTransform: 'uppercase', letterSpacing: '0.3px', fontSize: '11px' } }, l),
                e('span', { style: { fontWeight: 500 } }, v)
              ))
            ),
            e('div', { style: { background: '#FAEEDA', borderRadius: '8px', padding: '9px 12px', fontSize: '11px', color: '#633806', lineHeight: 1.5, marginBottom: '14px', display: 'flex', gap: '7px' } },
              e('span', null, '⚠️'),
              e('span', null, 'A liberação vale para ', e('b', { style: { fontWeight: 500 } }, 'um único saque'), '. Após o motoboy sacar, a restrição volta automaticamente. A máquina continua em campo na loja.')
            ),
            e('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: '8px' } },
              e('button', {
                onClick: () => setModalLiberar(null),
                disabled: processando,
                style: { background: 'transparent', border: '1px solid #d1d5db', color: '#6b7280', height: '34px', padding: '0 14px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }
              }, 'Cancelar'),
              e('button', {
                onClick: confirmarLiberacao,
                disabled: processando,
                style: { background: '#534AB7', border: 0, color: '#fff', height: '34px', padding: '0 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', opacity: processando ? 0.6 : 1 }
              }, processando ? '...' : 'Confirmar liberação')
            )
          )
        )
      )
    );
  }

  if (typeof window !== 'undefined') {
    window.ModuloControleMaquinas = ModuloControleMaquinas;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ModuloControleMaquinas };
  }

  console.log('✅ ModuloControleMaquinas v1.0 carregado');
})();
