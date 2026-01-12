// ============================================
// TUTTS THEME SYSTEM v1.0
// Modo Escuro + Feedback Visual Aprimorado
// ============================================

(function() {
    'use strict';
    
    // ==================== CONFIGURAÇÃO ====================
    const THEME_KEY = 'tutts_theme';
    const TRANSITION_DURATION = 300;
    
    // ==================== PALETA DE CORES ====================
    const DARK_THEME = {
        // Backgrounds
        '--bg-primary': '#0f172a',
        '--bg-secondary': '#1e293b',
        '--bg-tertiary': '#334155',
        '--bg-card': '#1e293b',
        '--bg-hover': '#334155',
        '--bg-input': '#1e293b',
        
        // Textos
        '--text-primary': '#f1f5f9',
        '--text-secondary': '#94a3b8',
        '--text-muted': '#64748b',
        
        // Bordas
        '--border-primary': '#334155',
        '--border-secondary': '#475569',
        
        // Header/Sidebar
        '--header-bg': '#0f172a',
        '--sidebar-bg': 'linear-gradient(to bottom, #1e1b4b, #312e81, #1e1b4b)',
        
        // Cards e componentes
        '--card-shadow': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
        
        // Status colors (mantém as mesmas)
        '--success': '#22c55e',
        '--warning': '#eab308',
        '--error': '#ef4444',
        '--info': '#3b82f6'
    };
    
    const LIGHT_THEME = {
        '--bg-primary': '#f3f4f6',
        '--bg-secondary': '#ffffff',
        '--bg-tertiary': '#e5e7eb',
        '--bg-card': '#ffffff',
        '--bg-hover': '#f9fafb',
        '--bg-input': '#ffffff',
        
        '--text-primary': '#111827',
        '--text-secondary': '#4b5563',
        '--text-muted': '#9ca3af',
        
        '--border-primary': '#e5e7eb',
        '--border-secondary': '#d1d5db',
        
        '--header-bg': 'linear-gradient(to right, #312e81, #581c87)',
        '--sidebar-bg': 'linear-gradient(to bottom, #581c87, #4338ca, #581c87)',
        
        '--card-shadow': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        
        '--success': '#22c55e',
        '--warning': '#eab308',
        '--error': '#ef4444',
        '--info': '#3b82f6'
    };
    
    // ==================== SISTEMA DE TEMA ====================
    const ThemeSystem = {
        currentTheme: 'light',
        
        init() {
            // Carregar tema salvo ou detectar preferência do sistema
            const saved = localStorage.getItem(THEME_KEY);
            if (saved) {
                this.currentTheme = saved;
            } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                this.currentTheme = 'dark';
            }
            
            this.apply(this.currentTheme, false);
            this.createToggleButton();
            this.watchSystemPreference();
            
            console.log(`🎨 Theme System iniciado: ${this.currentTheme}`);
        },
        
        apply(theme, animate = true) {
            const root = document.documentElement;
            const colors = theme === 'dark' ? DARK_THEME : LIGHT_THEME;
            
            if (animate) {
                root.style.transition = `background-color ${TRANSITION_DURATION}ms ease, color ${TRANSITION_DURATION}ms ease`;
            }
            
            // Aplicar variáveis CSS
            Object.entries(colors).forEach(([key, value]) => {
                root.style.setProperty(key, value);
            });
            
            // Aplicar classe no body
            document.body.classList.remove('theme-light', 'theme-dark');
            document.body.classList.add(`theme-${theme}`);
            
            // Atualizar meta theme-color
            const metaTheme = document.querySelector('meta[name="theme-color"]');
            if (metaTheme) {
                metaTheme.setAttribute('content', theme === 'dark' ? '#0f172a' : '#7c3aed');
            }
            
            this.currentTheme = theme;
            localStorage.setItem(THEME_KEY, theme);
            
            // Atualizar botão toggle
            this.updateToggleButton();
            
            // Disparar evento customizado
            window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
        },
        
        toggle() {
            const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
            this.apply(newTheme, true);
            
            // Feedback visual
            FeedbackSystem.flash(document.body, newTheme === 'dark' ? '#1e293b' : '#f3f4f6');
        },
        
        createToggleButton() {
            // Aguardar o header carregar
            const waitForHeader = setInterval(() => {
                const header = document.querySelector('header');
                if (!header) return;
                
                clearInterval(waitForHeader);
                
                // Verificar se já existe
                if (document.getElementById('theme-toggle-btn')) return;
                
                const btn = document.createElement('button');
                btn.id = 'theme-toggle-btn';
                btn.className = 'theme-toggle-btn';
                btn.title = 'Alternar tema claro/escuro';
                btn.innerHTML = this.currentTheme === 'dark' ? '☀️' : '🌙';
                btn.onclick = () => this.toggle();
                
                // Inserir antes do botão de logout
                const headerRight = header.querySelector('.flex.items-center.gap-3:last-child') || 
                                   header.querySelector('[class*="gap-3"]:last-child');
                if (headerRight) {
                    headerRight.insertBefore(btn, headerRight.firstChild);
                }
            }, 500);
        },
        
        updateToggleButton() {
            const btn = document.getElementById('theme-toggle-btn');
            if (btn) {
                btn.innerHTML = this.currentTheme === 'dark' ? '☀️' : '🌙';
                btn.classList.add('theme-toggle-animate');
                setTimeout(() => btn.classList.remove('theme-toggle-animate'), 300);
            }
        },
        
        watchSystemPreference() {
            if (window.matchMedia) {
                window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                    // Só aplicar se não tiver preferência salva
                    if (!localStorage.getItem(THEME_KEY)) {
                        this.apply(e.matches ? 'dark' : 'light', true);
                    }
                });
            }
        }
    };
    
    // ==================== SISTEMA DE FEEDBACK VISUAL ====================
    const FeedbackSystem = {
        init() {
            this.observeDataChanges();
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
            
            row.classList.add('row-highlight');
            this.flash(row, colors[type] || colors.update, 1000);
        },
        
        // Checkmark animado
        showCheckmark(container, message = 'Salvo!') {
            const check = document.createElement('div');
            check.className = 'animated-checkmark';
            check.innerHTML = `
                <svg viewBox="0 0 52 52">
                    <circle cx="26" cy="26" r="25" fill="none" stroke="#22c55e" stroke-width="2"/>
                    <path fill="none" stroke="#22c55e" stroke-width="3" d="M14 27l7 7 16-16"/>
                </svg>
                <span>${message}</span>
            `;
            
            if (container) {
                container.appendChild(check);
            } else {
                document.body.appendChild(check);
            }
            
            setTimeout(() => check.classList.add('show'), 10);
            setTimeout(() => {
                check.classList.remove('show');
                setTimeout(() => check.remove(), 300);
            }, 2000);
        },
        
        // Barra de progresso para operações longas
        createProgressBar(container, message = 'Processando...') {
            const bar = document.createElement('div');
            bar.className = 'progress-bar-container';
            bar.innerHTML = `
                <div class="progress-bar-text">${message}</div>
                <div class="progress-bar-track">
                    <div class="progress-bar-fill" style="width: 0%"></div>
                </div>
                <div class="progress-bar-percent">0%</div>
            `;
            
            if (container) {
                container.appendChild(bar);
            } else {
                document.body.appendChild(bar);
            }
            
            return {
                update: (percent, text) => {
                    const fill = bar.querySelector('.progress-bar-fill');
                    const percentEl = bar.querySelector('.progress-bar-percent');
                    const textEl = bar.querySelector('.progress-bar-text');
                    
                    if (fill) fill.style.width = `${percent}%`;
                    if (percentEl) percentEl.textContent = `${Math.round(percent)}%`;
                    if (text && textEl) textEl.textContent = text;
                },
                complete: (message = 'Concluído!') => {
                    bar.classList.add('complete');
                    const textEl = bar.querySelector('.progress-bar-text');
                    if (textEl) textEl.textContent = message;
                    setTimeout(() => bar.remove(), 2000);
                },
                remove: () => bar.remove()
            };
        },
        
        // Observer para detectar mudanças em tabelas
        observeDataChanges() {
            // Usar MutationObserver para detectar linhas adicionadas em tabelas
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeName === 'TR' && node.parentNode?.nodeName === 'TBODY') {
                            this.highlightRow(node, 'new');
                        }
                    });
                });
            });
            
            // Observar tabelas quando existirem
            const watchTables = setInterval(() => {
                const tables = document.querySelectorAll('table tbody');
                if (tables.length > 0) {
                    tables.forEach((tbody) => {
                        if (!tbody.dataset.observed) {
                            observer.observe(tbody, { childList: true });
                            tbody.dataset.observed = 'true';
                        }
                    });
                }
            }, 2000);
        },
        
        // Animação de transição de aba
        animateTabTransition(outgoing, incoming) {
            if (outgoing) {
                outgoing.classList.add('tab-exit');
            }
            if (incoming) {
                incoming.classList.add('tab-enter');
                setTimeout(() => incoming.classList.remove('tab-enter'), 300);
            }
        }
    };
    
    // ==================== ESTILOS CSS ====================
    const injectStyles = () => {
        const style = document.createElement('style');
        style.id = 'tutts-theme-styles';
        style.textContent = `
            /* ==================== VARIÁVEIS CSS ==================== */
            :root {
                --transition-fast: 150ms;
                --transition-normal: 300ms;
                --transition-slow: 500ms;
            }
            
            /* ==================== MODO ESCURO - OVERRIDES ==================== */
            .theme-dark {
                color-scheme: dark;
            }
            
            .theme-dark body,
            .theme-dark .bg-gray-100,
            .theme-dark .bg-gray-50 {
                background-color: var(--bg-primary) !important;
            }
            
            .theme-dark .bg-white {
                background-color: var(--bg-card) !important;
            }
            
            .theme-dark .bg-gray-50,
            .theme-dark .hover\\:bg-gray-50:hover {
                background-color: var(--bg-secondary) !important;
            }
            
            .theme-dark .text-gray-900,
            .theme-dark .text-gray-800,
            .theme-dark .text-gray-700 {
                color: var(--text-primary) !important;
            }
            
            .theme-dark .text-gray-600,
            .theme-dark .text-gray-500 {
                color: var(--text-secondary) !important;
            }
            
            .theme-dark .text-gray-400,
            .theme-dark .text-gray-300 {
                color: var(--text-muted) !important;
            }
            
            .theme-dark .border-gray-200,
            .theme-dark .border-gray-300,
            .theme-dark .divide-gray-200 > * {
                border-color: var(--border-primary) !important;
            }
            
            .theme-dark input,
            .theme-dark select,
            .theme-dark textarea {
                background-color: var(--bg-input) !important;
                border-color: var(--border-primary) !important;
                color: var(--text-primary) !important;
            }
            
            .theme-dark input::placeholder,
            .theme-dark textarea::placeholder {
                color: var(--text-muted) !important;
            }
            
            .theme-dark table {
                background-color: var(--bg-card) !important;
            }
            
            .theme-dark thead {
                background-color: var(--bg-tertiary) !important;
            }
            
            .theme-dark tbody tr:hover {
                background-color: var(--bg-hover) !important;
            }
            
            .theme-dark .shadow,
            .theme-dark .shadow-lg,
            .theme-dark .shadow-xl {
                box-shadow: var(--card-shadow) !important;
            }
            
            /* Modal no modo escuro */
            .theme-dark .fixed.inset-0.bg-black {
                background-color: rgba(0, 0, 0, 0.7) !important;
            }
            
            .theme-dark .rounded-xl.bg-white,
            .theme-dark .rounded-2xl.bg-white,
            .theme-dark .rounded-lg.bg-white {
                background-color: var(--bg-card) !important;
            }
            
            /* Scrollbar no modo escuro */
            .theme-dark ::-webkit-scrollbar {
                width: 8px;
                height: 8px;
            }
            
            .theme-dark ::-webkit-scrollbar-track {
                background: var(--bg-secondary);
            }
            
            .theme-dark ::-webkit-scrollbar-thumb {
                background: var(--border-secondary);
                border-radius: 4px;
            }
            
            .theme-dark ::-webkit-scrollbar-thumb:hover {
                background: #64748b;
            }
            
            /* ==================== BOTÃO TOGGLE TEMA ==================== */
            .theme-toggle-btn {
                padding: 8px 12px;
                border-radius: 8px;
                background: rgba(255, 255, 255, 0.1);
                border: none;
                cursor: pointer;
                font-size: 18px;
                transition: all var(--transition-fast) ease;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .theme-toggle-btn:hover {
                background: rgba(255, 255, 255, 0.2);
                transform: scale(1.05);
            }
            
            .theme-toggle-animate {
                animation: toggleSpin 0.3s ease;
            }
            
            @keyframes toggleSpin {
                0% { transform: rotate(0deg) scale(1); }
                50% { transform: rotate(180deg) scale(1.2); }
                100% { transform: rotate(360deg) scale(1); }
            }
            
            /* ==================== ANIMAÇÕES DE FEEDBACK ==================== */
            
            /* Highlight de linha */
            .row-highlight {
                position: relative;
            }
            
            .row-highlight::after {
                content: '';
                position: absolute;
                left: 0;
                top: 0;
                width: 4px;
                height: 100%;
                background: linear-gradient(to bottom, #fbbf24, #f59e0b);
                animation: highlightPulse 1s ease-out;
            }
            
            @keyframes highlightPulse {
                0% { opacity: 1; }
                100% { opacity: 0; }
            }
            
            /* Checkmark animado */
            .animated-checkmark {
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
            
            .animated-checkmark.show {
                transform: translate(-50%, -50%) scale(1);
                opacity: 1;
            }
            
            .animated-checkmark svg {
                width: 60px;
                height: 60px;
            }
            
            .animated-checkmark circle {
                stroke-dasharray: 166;
                stroke-dashoffset: 166;
                animation: checkCircle 0.6s ease forwards;
            }
            
            .animated-checkmark path {
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
            
            .animated-checkmark span {
                font-size: 16px;
                font-weight: 600;
                color: #22c55e;
            }
            
            .theme-dark .animated-checkmark {
                background: var(--bg-card);
            }
            
            /* Barra de progresso */
            .progress-bar-container {
                position: fixed;
                bottom: 24px;
                left: 50%;
                transform: translateX(-50%);
                background: white;
                padding: 16px 24px;
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
                min-width: 300px;
                z-index: 10000;
                animation: slideUp 0.3s ease;
            }
            
            .theme-dark .progress-bar-container {
                background: var(--bg-card);
            }
            
            @keyframes slideUp {
                from {
                    transform: translateX(-50%) translateY(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(-50%) translateY(0);
                    opacity: 1;
                }
            }
            
            .progress-bar-text {
                font-size: 14px;
                font-weight: 500;
                color: #374151;
                margin-bottom: 8px;
            }
            
            .theme-dark .progress-bar-text {
                color: var(--text-primary);
            }
            
            .progress-bar-track {
                height: 8px;
                background: #e5e7eb;
                border-radius: 4px;
                overflow: hidden;
            }
            
            .theme-dark .progress-bar-track {
                background: var(--bg-tertiary);
            }
            
            .progress-bar-fill {
                height: 100%;
                background: linear-gradient(90deg, #7c3aed, #a855f7);
                border-radius: 4px;
                transition: width 0.3s ease;
                position: relative;
            }
            
            .progress-bar-fill::after {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(
                    90deg,
                    transparent,
                    rgba(255, 255, 255, 0.3),
                    transparent
                );
                animation: shimmer 1.5s infinite;
            }
            
            @keyframes shimmer {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
            }
            
            .progress-bar-percent {
                font-size: 12px;
                color: #6b7280;
                text-align: right;
                margin-top: 4px;
            }
            
            .progress-bar-container.complete .progress-bar-fill {
                background: linear-gradient(90deg, #22c55e, #4ade80);
            }
            
            /* Transição de abas */
            .tab-enter {
                animation: tabEnter 0.3s ease;
            }
            
            .tab-exit {
                animation: tabExit 0.2s ease;
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
            
            @keyframes tabExit {
                from {
                    opacity: 1;
                    transform: translateY(0);
                }
                to {
                    opacity: 0;
                    transform: translateY(-10px);
                }
            }
            
            /* ==================== LOADING SCREEN MODO ESCURO ==================== */
            .theme-dark #loading-screen {
                background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
            }
            
            /* ==================== ROW COLORS DARK MODE ==================== */
            .theme-dark .row-green {
                background-color: rgba(34, 197, 94, 0.15) !important;
                border-left-color: #22c55e !important;
            }
            
            .theme-dark .row-blue {
                background-color: rgba(59, 130, 246, 0.15) !important;
                border-left-color: #3b82f6 !important;
            }
            
            .theme-dark .row-red {
                background-color: rgba(239, 68, 68, 0.15) !important;
                border-left-color: #ef4444 !important;
            }
            
            /* ==================== TRANSIÇÃO GLOBAL ==================== */
            *, *::before, *::after {
                transition: background-color var(--transition-normal) ease,
                            border-color var(--transition-normal) ease,
                            color var(--transition-fast) ease;
            }
            
            /* Exceção para animações específicas */
            .animate-spin,
            .animate-pulse,
            [class*="animate-"] {
                transition: none;
            }
        `;
        
        document.head.appendChild(style);
    };
    
    // ==================== INICIALIZAÇÃO ====================
    const init = () => {
        injectStyles();
        ThemeSystem.init();
        FeedbackSystem.init();
        
        // Expor funções globalmente para uso no React
        window.TuttsTheme = ThemeSystem;
        window.TuttsFeedback = FeedbackSystem;
    };
    
    // Iniciar quando o DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();
