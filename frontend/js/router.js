// js/router.js
const Router = {
    telas: ['tela-landing', 'tela-dashboard', 'tela-campanha', 'tela-ficha'],
    telaAtual: 'landing',
    
    navigate: function(telaDestino) {
        // Grava de onde estamos vindo antes de mudar
        if (this.telaAtual !== telaDestino) {
            sessionStorage.setItem('telaAnterior', this.telaAtual);
        }

        // SALVA A TELA ATUAL NA MEMÓRIA PARA O F5 NÃO TE PERDER
        sessionStorage.setItem('telaAtual', telaDestino);

        // 🔥 REGRA DE OURO: Se foi pro Dashboard ou Início, DESCONECTA DA MESA! 🔥
        if (telaDestino === 'dashboard' || telaDestino === 'landing') {
            sessionStorage.removeItem('campanhaAtiva');
            sessionStorage.removeItem('isMestreAtivo');
            sessionStorage.removeItem('campanhaNome');
            sessionStorage.removeItem('campanhaCodigo');
            
            // Transforma o Terminal em Local automaticamente
            const hist = document.getElementById('rolador-historico');
            if (hist) hist.innerHTML = '<p class="text-center text-gray-500 text-xs italic font-bold mt-4">Terminal Local Ativo.<br>Acesse por uma campanha para ativar a rede multiplayer.</p>';

            // 🔥 NOVO: FORÇA A GAVETA A FECHAR AO SAIR DA MESA! 🔥
            const sidebarLog = document.getElementById('game-log-sidebar');
            if (sidebarLog && !sidebarLog.classList.contains('translate-x-full')) {
                sidebarLog.classList.add('translate-x-full');
            }
            if (typeof window.limparRoladorLocal === 'function') window.limparRoladorLocal();
        }

        // 🔥 NOVO: CONTROLE DE VISIBILIDADE DO BOTÃO SECRETO DO MESTRE 🔥
        const containerToggleMestre = document.getElementById('container-rolagem-mestre');
        if (containerToggleMestre) {
            if (sessionStorage.getItem('isMestreAtivo') === 'true' && (telaDestino === 'campanha' || telaDestino === 'ficha')) {
                containerToggleMestre.classList.remove('hidden');
                containerToggleMestre.classList.add('flex');
            } else {
                containerToggleMestre.classList.add('hidden');
                containerToggleMestre.classList.remove('flex');
            }
        }

        this.telas.forEach(tela => {
            const el = document.getElementById(tela);
            if (el) el.classList.add('hidden');
        });

        const destino = document.getElementById(`tela-${telaDestino}`);
        if (destino) {
            destino.classList.remove('hidden');
            destino.classList.add('animate-fade-in'); 
        }

        // 🔥 O CAÇADOR DE FUNÇÕES (Garante que carrega mesmo com F5) 🔥
        let tentativas = 0;
        const cacador = setInterval(() => {
            if (telaDestino === 'dashboard') {
                if (typeof window.carregarListaPersonagens === 'function' && typeof window.carregarMinhasCampanhas === 'function') {
                    window.carregarListaPersonagens();
                    window.carregarMinhasCampanhas();
                    clearInterval(cacador); 
                }
            } else if (telaDestino === 'campanha') {
                if (typeof window.carregarLobbyCampanha === 'function') {
                    window.carregarLobbyCampanha();
                    clearInterval(cacador);
                }
            } else {
                clearInterval(cacador); 
            }

            tentativas++;
            if(tentativas > 30) clearInterval(cacador); 
        }, 100);

        // --- CONTROLES VISUAIS GLOBAIS ---
        const fabRolador = document.getElementById('fab-rolador');
        if (fabRolador) {
            if (telaDestino === 'ficha' || telaDestino === 'campanha') {
                fabRolador.classList.remove('hidden');
            } else {
                fabRolador.classList.add('hidden');
            }
        }

        const btnSave = document.getElementById('btn-save-char-nav');
        const btnDelete = document.getElementById('btn-delete-char-nav');
        
        if (btnSave) {
            if (telaDestino === 'ficha') {
                btnSave.classList.remove('hidden');
                btnSave.style.display = 'flex';
            } else {
                btnSave.classList.add('hidden');
                btnSave.style.display = 'none';
            }
        }
        
        if (btnDelete) {
            if (telaDestino === 'ficha' && sessionStorage.getItem('personagemAtivoId')) {
                btnDelete.classList.remove('hidden');
                btnDelete.style.display = 'flex';
            } else {
                btnDelete.classList.add('hidden');
                btnDelete.style.display = 'none';
            }
        }

        this.telaAtual = telaDestino;
    },

    voltar: function() {
        const telaAnterior = sessionStorage.getItem('telaAnterior') || 'dashboard';
        
        if (this.telaAtual === 'campanha') {
            this.navigate('dashboard');
        } 
        else if (this.telaAtual === 'ficha') {
            // Se veio da campanha, volta pra campanha. Se veio do dash, volta pro dash.
            this.navigate(telaAnterior);
        } else {
            this.navigate('dashboard');
        }
    },

    abrirPerfil: function() {
        if(typeof window.abrirModalPerfil === 'function') {
            window.abrirModalPerfil();
        }
    }
};

const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
`;
document.head.appendChild(style);