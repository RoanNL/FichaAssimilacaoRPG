document.addEventListener('DOMContentLoaded', () => {
    const leavesContainer = document.getElementById('leaves-container');
    
    if (!leavesContainer) {
        console.warn("⚠️ Container de folhas não encontrado. Crie <div id='leaves-container'></div> no HTML.");
        return; 
    }

    const numLeaves = 40; // Quantidade de folhas simultâneas

    // Cria as folhas iniciais
    for (let i = 0; i < numLeaves; i++) {
        createLeaf();
    }

    function createLeaf() {
        const leaf = document.createElement('div');
        leaf.classList.add('leaf'); // Adiciona a classe que estilizamos no CSS

        // --- SUA LÓGICA DE ALEATORIEDADE (MANTIDA) ---

        // Posição horizontal inicial aleatória
        const startX = Math.random() * 100 + 'vw';

        // Desvio horizontal final aleatório (-20vw a +20vw)
        const endXOffset = (Math.random() * 40 - 20) + 'vw';

        // Rotação final aleatória (-360deg a +360deg)
        const rotation = (Math.random() * 720 - 360) + 'deg';

        // Duração da queda aleatória (8 a 15 segundos)
        const duration = Math.random() * 7 + 8 + 's';

        // Atraso inicial aleatório (0 a 10 segundos)
        const delay = Math.random() * 10 + 's';

        // Define as variáveis CSS que o nosso @keyframes no CSS vai ler
        leaf.style.setProperty('--start-x', startX);
        leaf.style.setProperty('--end-x-offset', endXOffset);
        leaf.style.setProperty('--rotation', rotation);
        leaf.style.animationDuration = duration;
        leaf.style.animationDelay = delay;

        // Coloca a folha na tela
        leavesContainer.appendChild(leaf);
    }
});
