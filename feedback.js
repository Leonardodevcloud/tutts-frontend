// ============================================
// TUTTS FEEDBACK SYSTEM v1.0
// Animações e Feedback Visual Aprimorado
// ============================================

(function() {
    'use strict';
    
    // ==================== SISTEMA DE FEEDBACK VISUAL ====================
    const FeedbackSystem = {
        init() {
            this.injectStyles();
            this.observeDataChanges();
            this.observeTabChanges();
            console.log('✨ Feedback System iniciado');
        },
        
        // Flash de cor em elemento (para dados atualizados)
        flash(element, color = '#fef08a', duration = 500) {
            if (!element) return;
            
            const original = element.style.backgroundColor;
            element.style.transition = `background-color ${duration/2}ms ease`;
            element.style.backgroundColor = color;
            
            setTimeout(() => {
                element.style.backgroundColor = original;
                setTimeout(() => {
                    element.style.transition = '';
                }, duration/2);
            }, duration/2);
        },
        
        // Highlight para linhas de tabela atualizadas
        highlightRow(row, type = 'update') {
            if (!row) return;
            
            const colors = {
                update: '#fef9c3',  // Amarelo claro
                success: '#dcfce7', // Verde claro
                error: '#fee2e2',   // Vermelho claro
                new: '#dbeafe'      // Azul claro
            };
            
            row.classList.add('feedback-highlight');
            this.flash(row, colors[type] || colors.update, 1000);
            
            // Remover classe após animação
            setTimeout(() => {
                row.classList.remove('feedback-highlight');
            }, 1500);
        },
        
        // Checkmark animado de sucesso
        showCheckmark(container, message = 'Salvo!') {
            const check = document.createElement('div');
            check.className = 'feedback-checkmark';
            check.innerHTML = `
                <svg viewBox="0 0 52 52">
                    <circle cx="26" cy="26" r="25" fill="none" stroke="#22c55e" stroke-width="2"/>
                    <path fill="none" stroke="#22c55e" stroke-width="3" d="M14 27l7 7 16-16"/>
                </svg>
                <span>${message}</span>
            `;
            
            if (container) {
                container.style.position = 'relative';
                container.appendChild(check);
            } else {
                document.body.appendChild(check);
            }
            
            // Animar entrada
            setTimeout(() => check.classList.add('show'), 10);
            
            // Remover após 2 segundos
            setTimeout(() => {
                check.classList.remove('show');
                setTimeout(() => check.remove(), 300);
            }, 2000);
        },
        
        // Barra de progresso para operações longas (upload de planilhas, etc)
        createProgressBar(container, message = 'Processando...') {
            const wrapper = document.createElement('div');
            wrapper.className = 'feedback-progress-wrapper';
            wrapper.innerHTML = `
                <div class="feedback-progress-content">
                    <div class="feedback-progress-text">${message}</div>
                    <div class="feedback-progress-track">
                        <div class="feedback-progress-fill" style="width: 0%"></div>
                    </div>
                    <div class="feedback-progress-percent">0%</div>
                </div>
            `;
            
            if (container) {
                container.appendChild(wrapper);
            } else {
                document.body.appendChild(wrapper);
            }
            
            // Animar entrada
            setTimeout(() => wrapper.classList.add('show'), 10);
            
            return {
                update: (percent, text) => {
                    const fill = wrapper.querySelector('.feedback-progress-fill');
                    const percentEl = wrapper.querySelector('.feedback-progress-percent');
                    const textEl = wrapper.querySelector('.feedback-progress-text');
                    
                    if (fill) fill.style.width = `${Math.min(100, Math.max(0, percent))}%`;
                    if (percentEl) percentEl.textContent = `${Math.round(percent)}%`;
                    if (text && textEl) textEl.textContent = text;
                },
                complete: (message = 'Concluído!') => {
                    wrapper.classList.add('complete');
                    const textEl = wrapper.querySelector('.feedback-progress-text');
                    const fill = wrapper.querySelector('.feedback-progress-fill');
                    if (textEl) textEl.textContent = message;
                    if (fill) fill.style.width = '100%';
                    
                    setTimeout(() => {
                        wrapper.classList.remove('show');
                        setTimeout(() => wrapper.remove(), 300);
                    }, 1500);
                },
                error: (message = 'Erro!') => {
                    wrapper.classList.add('error');
                    const textEl = wrapper.querySelector('.feedback-progress-text');
                    if (textEl) textEl.textContent = message;
                    
                    setTimeout(() => {
                        wrapper.classList.remove('show');
                        setTimeout(() => wrapper.remove(), 300);
                    }, 2000);
                },
                remove: () => {
                    wrapper.classList.remove('show');
                    setTimeout(() => wrapper.remove(), 300);
                }
            };
        },
        
        // Observer para detectar mudanças em tabelas (novas linhas)
        observeDataChanges() {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        // Highlight em novas linhas de tabela
                        if (node.nodeName === 'TR' && node.parentNode?.nodeName === 'TBODY') {
                            setTimeout(() => this.highlightRow(node, 'new'), 100);
                        }
                    });
                });
            });
            
            // Observar tabelas quando existirem
            const watchTables = () => {
                const tables = document.querySelectorAll('table tbody');
                tables.forEach((tbody) => {
                    if (!tbody.dataset.feedbackObserved) {
                        observer.observe(tbody, { childList: true });
                        tbody.dataset.feedbackObserved = 'true';
                    }
                });
            };
            
            // Verificar periodicamente por novas tabelas
            setInterval(watchTables, 2000);
            watchTables();
        },
        
        // Observer para transições de aba
        observeTabChanges() {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeType === 1 && node.classList) {
                                // Animar conteúdo novo de aba
                                if (node.classList.contains('p-4') || 
                                    node.classList.contains('p-6') ||
                                    node.querySelector?.('table')) {
                                    node.classList.add('feedback-tab-enter');
                                    setTimeout(() => node.classList.remove('feedback-tab-enter'), 300);
                                }
                            }
                        });
                    }
                });
            });
            
            // Observar o container principal
            const watchMain = setInterval(() => {
                const main = document.querySelector('main') || document.querySelector('#root > div > div');
                if (main && !main.dataset.tabObserved) {
                    observer.observe(main, { childList: true, subtree: true });
                    main.dataset.tabObserved = 'true';
                }
            }, 1000);
        },
        
        // Injetar estilos CSS
        injectStyles() {
            if (document.getElementById('feedback-styles')) return;
            
            const style = document.createElement('style');
            style.id = 'feedback-styles';
            style.textContent = `
                /* ==================== FEEDBACK VISUAL STYLES ==================== */
                
                /* Highlight de linha */
                .feedback-highlight {
                    position: relative;
                }
                
                .feedback-highlight::before {
                    content: '';
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 4px;
                    height: 100%;
                    background: linear-gradient(to bottom, #fbbf24, #f59e0b);
                    animation: feedbackPulse 1s ease-out forwards;
                    border-radius: 2px;
                }
                
                @keyframes feedbackPulse {
                    0% { opacity: 1; transform: scaleY(1); }
                    100% { opacity: 0; transform: scaleY(0.8); }
                }
                
                /* Checkmark animado */
                .feedback-checkmark {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%) scale(0);
                    background: white;
                    padding: 24px 32px;
                    border-radius: 16px;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 12px;
                    z-index: 10000;
                    opacity: 0;
                    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                
                .feedback-checkmark.show {
                    transform: translate(-50%, -50%) scale(1);
                    opacity: 1;
                }
                
                .feedback-checkmark svg {
                    width: 64px;
                    height: 64px;
                }
                
                .feedback-checkmark circle {
                    stroke-dasharray: 166;
                    stroke-dashoffset: 166;
                    animation: checkCircle 0.6s ease forwards;
                }
                
                .feedback-checkmark path {
                    stroke-dasharray: 48;
                    stroke-dashoffset: 48;
                    animation: checkPath 0.4s 0.3s ease forwards;
                }
                
                @keyframes checkCircle {
                    to { stroke-dashoffset: 0; }
                }
                
                @keyframes checkPath {
                    to { stroke-dashoffset: 0; }
                }
                
                .feedback-checkmark span {
                    font-size: 18px;
                    font-weight: 600;
                    color: #22c55e;
                    font-family: system-ui, -apple-system, sans-serif;
                }
                
                /* Barra de progresso */
                .feedback-progress-wrapper {
                    position: fixed;
                    bottom: 24px;
                    left: 50%;
                    transform: translateX(-50%) translateY(100%);
                    opacity: 0;
                    transition: all 0.3s ease;
                    z-index: 10000;
                }
                
                .feedback-progress-wrapper.show {
                    transform: translateX(-50%) translateY(0);
                    opacity: 1;
                }
                
                .feedback-progress-content {
                    background: white;
                    padding: 16px 24px;
                    border-radius: 12px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
                    min-width: 320px;
                }
                
                .feedback-progress-text {
                    font-size: 14px;
                    font-weight: 500;
                    color: #374151;
                    margin-bottom: 10px;
                    font-family: system-ui, -apple-system, sans-serif;
                }
                
                .feedback-progress-track {
                    height: 8px;
                    background: #e5e7eb;
                    border-radius: 4px;
                    overflow: hidden;
                }
                
                .feedback-progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #7c3aed, #a855f7);
                    border-radius: 4px;
                    transition: width 0.3s ease;
                    position: relative;
                }
                
                .feedback-progress-fill::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(
                        90deg,
                        transparent,
                        rgba(255, 255, 255, 0.4),
                        transparent
                    );
                    animation: shimmer 1.5s infinite;
                }
                
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                
                .feedback-progress-percent {
                    font-size: 12px;
                    color: #6b7280;
                    text-align: right;
                    margin-top: 6px;
                    font-family: system-ui, -apple-system, sans-serif;
                }
                
                .feedback-progress-wrapper.complete .feedback-progress-fill {
                    background: linear-gradient(90deg, #22c55e, #4ade80);
                }
                
                .feedback-progress-wrapper.complete .feedback-progress-text {
                    color: #22c55e;
                }
                
                .feedback-progress-wrapper.error .feedback-progress-fill {
                    background: linear-gradient(90deg, #ef4444, #f87171);
                }
                
                .feedback-progress-wrapper.error .feedback-progress-text {
                    color: #ef4444;
                }
                
                /* Transição de aba */
                .feedback-tab-enter {
                    animation: tabEnter 0.3s ease;
                }
                
                @keyframes tabEnter {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                /* Pulso suave para elementos atualizados */
                .feedback-updated {
                    animation: softPulse 0.5s ease;
                }
                
                @keyframes softPulse {
                    0% { box-shadow: 0 0 0 0 rgba(124, 58, 237, 0.4); }
                    70% { box-shadow: 0 0 0 10px rgba(124, 58, 237, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(124, 58, 237, 0); }
                }
            `;
            
            document.head.appendChild(style);
        }
    };
    
    // ==================== INICIALIZAÇÃO ====================
    const init = () => {
        FeedbackSystem.init();
        
        // Expor globalmente para uso no código React
        window.TuttsFeedback = {
            flash: (el, color, duration) => FeedbackSystem.flash(el, color, duration),
            highlightRow: (row, type) => FeedbackSystem.highlightRow(row, type),
            showCheckmark: (container, message) => FeedbackSystem.showCheckmark(container, message),
            createProgressBar: (container, message) => FeedbackSystem.createProgressBar(container, message)
        };
    };
    
    // Iniciar quando o DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();
