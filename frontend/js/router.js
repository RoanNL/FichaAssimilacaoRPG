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
                    clearInterval(cacador); // Missão cumprida, desliga o caçador!
                }
            } else if (telaDestino === 'campanha') {
                if (typeof window.carregarLobbyCampanha === 'function') {
                    window.carregarLobbyCampanha();
                    clearInterval(cacador);
                }
            } else {
                clearInterval(cacador); // Se não for nem mesa nem dashboard, cancela.
            }

            tentativas++;
            if(tentativas > 30) clearInterval(cacador); // Segurança: Desiste após 3 segundos para não travar o PC
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
            this.navigate(telaAnterior);
        } else {
            this.navigate('dashboard');
        }
    },

    abrirPerfil: function() {
        alert("Abrindo Perfil do Usuário! (Substituído pelo perfil.js)");
    }
};

const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
`;
document.head.appendChild(style);