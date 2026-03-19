document.addEventListener('DOMContentLoaded', () => {
    const leavesContainer = document.getElementById('leaves-container');
    const numLeaves = 25; // Quantidade de folhas (ajuste se quiser mais/menos)

    if (!leavesContainer) return; // Sai se o container não existir

    for (let i = 0; i < numLeaves; i++) {
        createLeaf();
    }

    function createLeaf() {
        const leaf = document.createElement('div');
        leaf.classList.add('leaf');

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

        // Define as variáveis CSS para a animação
        leaf.style.setProperty('--start-x', startX);
        leaf.style.setProperty('--end-x-offset', endXOffset);
        leaf.style.setProperty('--rotation', rotation);
        leaf.style.animationDuration = duration;
        leaf.style.animationDelay = delay;

        leavesContainer.appendChild(leaf);
    }
});