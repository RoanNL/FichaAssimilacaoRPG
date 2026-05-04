// js/router.js

const Router = {
    telas: ['tela-landing', 'tela-dashboard', 'tela-campanha', 'tela-ficha'],
    
    // Função para navegar entre as telas
    navigate: function(telaDestino) {
        // Esconde todas as telas
        this.telas.forEach(tela => {
            const el = document.getElementById(tela);
            if (el) el.classList.add('hidden');
        });

        // Mostra a tela desejada
        const destino = document.getElementById(`tela-${telaDestino}`);
        if (destino) {
            destino.classList.remove('hidden');
            // Efeito suave de entrada
            destino.classList.add('animate-fade-in'); 
        }

        // ========================================================
        // 🔥 A MÁGICA DA ATUALIZAÇÃO (Gatilhos de Tela) 🔥
        // ========================================================
        if (telaDestino === 'dashboard') {
            // Toda vez que abrir a tela "Jogar", puxa os dados do servidor!
            if (typeof window.carregarListaPersonagens === 'function') {
                window.carregarListaPersonagens();
            }
            if (typeof window.carregarMinhasCampanhas === 'function') {
                window.carregarMinhasCampanhas();
            }
        }

        // --- CONTROLE DA BOLA FLUTUANTE (FAB) ---
        const fabRolador = document.getElementById('fab-rolador');
        if (fabRolador) {
            // Mostrar apenas na Ficha e na Campanha
            if (telaDestino === 'ficha' || telaDestino === 'campanha') {
                fabRolador.classList.remove('hidden');
            } else {
                fabRolador.classList.add('hidden');
            }
        }
    },

    // Função para a foto de perfil (Modal Lateral que faremos depois)
    abrirPerfil: function() {
        alert("Abrindo Perfil do Usuário! (Aqui implementaremos o Modal Lateral)");
    }
};

// Adicionando uma classe simples de Fade In dinamicamente no CSS para transições suaves
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
`;
document.head.appendChild(style);