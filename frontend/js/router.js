const Router = {
    telas: ['tela-landing', 'tela-dashboard', 'tela-campanha', 'tela-ficha'],
    
    navigate: function(telaDestino) {
        this.telas.forEach(tela => {
            const el = document.getElementById(tela);
            if (el) el.classList.add('hidden');
        });

        const destino = document.getElementById(`tela-${telaDestino}`);
        if (destino) {
            destino.classList.remove('hidden');
            destino.classList.add('animate-fade-in'); 
        }

        if (telaDestino === 'dashboard') {
            if (typeof window.carregarListaPersonagens === 'function') window.carregarListaPersonagens();
            if (typeof window.carregarMinhasCampanhas === 'function') window.carregarMinhasCampanhas();
        }

        const fabRolador = document.getElementById('fab-rolador');
        if (fabRolador) {
            if (telaDestino === 'ficha' || telaDestino === 'campanha') {
                fabRolador.classList.remove('hidden');
            } else {
                fabRolador.classList.add('hidden');
            }
        }

        // --- CONTROLE DOS BOTÕES DA FICHA (SALVAR E EXCLUIR) ---
        const btnSave = document.getElementById('btn-save-char-nav');
        const btnDelete = document.getElementById('btn-delete-char-nav');
        
        if (btnSave) {
            if (telaDestino === 'ficha') btnSave.classList.remove('hidden');
            else btnSave.classList.add('hidden');
        }
        
        if (btnDelete) {
            // Só exibe o excluir se estiver na ficha E a ficha já estiver salva no banco!
            if (telaDestino === 'ficha' && sessionStorage.getItem('personagemAtivoId')) {
                btnDelete.classList.remove('hidden');
            } else {
                btnDelete.classList.add('hidden');
            }
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