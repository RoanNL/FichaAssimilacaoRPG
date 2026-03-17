document.addEventListener('DOMContentLoaded', () => {
    // 1. Controle do Modal (Abrir e Fechar)
    const btnAbrirModal = document.getElementById('nav-btn-rolador');
    const modalRolador = document.getElementById('rolador-modal');
    const btnFecharModal = document.getElementById('fechar-rolador');

    if(btnAbrirModal) {
        btnAbrirModal.addEventListener('click', (e) => {
            e.preventDefault();
            // A MÁGICA: Adiciona a classe que tira a invisibilidade!
            modalRolador.classList.add('show'); 
        });
    }

    if(btnFecharModal) {
        btnFecharModal.addEventListener('click', () => {
            // Remove a classe para esconder suavemente
            modalRolador.classList.remove('show');
        });
    }

    // Fechar clicando na área escura fora da janela
    window.addEventListener('click', (event) => {
        if (event.target == modalRolador) {
            modalRolador.classList.remove('show');
        }
    });

    // 2. Lógica dos Dados
    const iconFiles = {
        sucesso: '../assets/Sucesso.png',
        pressao: '../assets/pressao.png',
        adaptacao: '../assets/Adaptacao.png',
        nada: '../assets/nada.png'
    };

    const diceTable = {
        d6: {
            1: ['nada'], 2: ['nada'], 3: ['pressao'], 4: ['pressao'],
            5: ['adaptacao', 'pressao'], 6: ['sucesso']
        },
        d10: {
            1: ['nada'], 2: ['nada'], 3: ['pressao'], 4: ['pressao'],
            5: ['adaptacao', 'pressao'], 6: ['sucesso'], 7: ['pressao', 'pressao'],
            8: ['sucesso', 'adaptacao'], 9: ['sucesso', 'adaptacao', 'pressao'],
            10: ['sucesso', 'sucesso', 'pressao']
        },
        d12: {
            1: ['nada'], 2: ['nada'], 3: ['pressao'], 4: ['pressao'],
            5: ['adaptacao', 'pressao'], 6: ['sucesso'], 7: ['pressao', 'pressao'],
            8: ['sucesso', 'adaptacao'], 9: ['sucesso', 'adaptacao', 'pressao'],
            10: ['sucesso', 'sucesso', 'pressao'],
            11: ['sucesso', 'adaptacao', 'adaptacao', 'pressao'],
            12: ['pressao', 'pressao']
        }
    };

    const inputDados = document.getElementById('rolador-input');
    const rollButton = document.getElementById('rolador-btn-rolar');
    const clearButton = document.getElementById('rolador-btn-limpar');
    const resultsDiv = document.getElementById('rolador-resultados-atuais');
    const historicoDiv = document.getElementById('rolador-historico');

    function rollDie(max) {
        return Math.floor(Math.random() * max) + 1;
    }

    function parseInput(inputString) {
        const diceRequests = [];
        const parts = inputString.trim().toLowerCase().split(/\s+/);
        for (const part of parts) {
            if (!part) continue; 
            const match = part.match(/^(\d*)d(\d+)$/); 
            if (!match) {
                alert(`Formato inválido: "${part}". Use "2d6", "1d10", etc.`);
                return null;
            }
            const quantity = parseInt(match[1] || '1', 10);
            const size = parseInt(match[2], 10);
            if (![6, 10, 12].includes(size)) {
                alert(`Dado inválido: "d${size}". Use apenas d6, d10 ou d12.`);
                return null;
            }
            diceRequests.push({ quantity, size });
        }
        return diceRequests;
    }

    function handleRoll() {
        const inputString = inputDados.value;
        const parsedDice = parseInput(inputString);
        if (!parsedDice || parsedDice.length === 0) return;

        resultsDiv.innerHTML = '';

        const rollGroup = document.createElement('div');
        rollGroup.style.borderBottom = '1px solid #ccc';
        rollGroup.style.paddingBottom = '15px';
        rollGroup.style.marginBottom = '15px';

        const header = document.createElement('h3');
        header.textContent = `Rolando: ${inputString}`;
        header.style.marginTop = '0';
        rollGroup.appendChild(header);

        const subRollsContainer = document.createElement('div');
        subRollsContainer.className = 'sub-rolls-container';
        
        const totals = { sucesso: 0, pressao: 0, adaptacao: 0, nada: 0 };
        let dieCounter = { d6: 0, d10: 0, d12: 0 }; 

        const tempoGiroLogo = 1000; // 1s de giro do logo
        const delaySuspense = 300;  // 0.3s de suspense
        const tempoTotalAntesDados = tempoGiroLogo + delaySuspense; 

        parsedDice.forEach(die => {
            const dieType = 'd' + die.size; 
            for (let i = 0; i < die.quantity; i++) {
                dieCounter[dieType]++; 
                
                const rollNumber = rollDie(die.size); // Sorteia o número antes de criar o texto

                const subRollDiv = document.createElement('div');
                subRollDiv.className = 'sub-roll';
                subRollDiv.style.position = 'relative';

                // ===============================================
                // CORREÇÃO 1: O título (Label) agora começa invisível
                const subRollHeader = document.createElement('h4');
                subRollHeader.textContent = `${dieType} #${dieCounter[dieType]} (rolou ${rollNumber})`;
                subRollHeader.style.opacity = '0';
                subRollHeader.style.transition = 'opacity 0.3s ease';
                // ===============================================

                const subRollIcons = document.createElement('div');
                subRollIcons.className = 'icons-container';
                subRollIcons.style.opacity = '0';

                // Logo do RPG
                const logoImg = document.createElement('img');
                logoImg.src = '../assets/icon.jpg'; 
                logoImg.className = 'logo-animado';
                subRollDiv.appendChild(logoImg);
                
                const icons = diceTable[dieType][rollNumber];

                icons.forEach((iconName, index) => {
                    totals[iconName]++; 
                    const img = document.createElement('img');
                    img.src = iconFiles[iconName];
                    img.alt = iconName;
                    
                    img.className = 'dado-animado'; 
                    const delayDados = tempoTotalAntesDados / 1000; 
                    img.style.animationDelay = `${delayDados + (index * 0.1)}s`; 
                    
                    subRollIcons.appendChild(img); 
                });

                // Revela os ícones e o título (Label) ao mesmo tempo após o delay
                setTimeout(() => {
                    subRollIcons.style.transition = 'opacity 0.3s ease';
                    subRollIcons.style.opacity = '1';
                    subRollHeader.style.opacity = '1'; // Revela o texto!
                }, tempoTotalAntesDados);

                subRollDiv.appendChild(subRollHeader);
                subRollDiv.appendChild(subRollIcons);
                subRollsContainer.appendChild(subRollDiv);
            }
        });

        rollGroup.appendChild(subRollsContainer);

        const summary = document.createElement('p');
        summary.className = 'rolador-summary';
        summary.textContent = `Total: ${totals.sucesso} Sucesso, ${totals.pressao} Pressão, ${totals.adaptacao} Adaptação.`;
        rollGroup.appendChild(summary);

        resultsDiv.appendChild(rollGroup);
        
        // ===============================================
        // CORREÇÃO 3: O Histórico espera a animação acabar para não dar spoiler!
        setTimeout(() => {
            const historyEntry = rollGroup.cloneNode(true);
            
            // Tira a invisibilidade do título e dos contêineres no histórico
            historyEntry.querySelectorAll('h4').forEach(h => h.style.opacity = '1');
            historyEntry.querySelectorAll('.icons-container').forEach(c => c.style.opacity = '1');
            
            // Remove os logos giratórios do histórico
            historyEntry.querySelectorAll('.logo-animado').forEach(logo => logo.remove());
            
            // Força os dados a aparecerem imediatamente no histórico sem animação
            historyEntry.querySelectorAll('.dado-animado').forEach(die => {
                die.classList.remove('dado-animado');
                die.style.opacity = '1';
                die.style.visibility = 'visible';
                die.style.transform = 'scale(1) rotate(0deg)';
            });

            historicoDiv.prepend(historyEntry);
        }, tempoTotalAntesDados);
        // ===============================================
    }

    rollButton.addEventListener('click', handleRoll);
    
    clearButton.addEventListener('click', () => {
        resultsDiv.innerHTML = '';
        historicoDiv.innerHTML = '';
        inputDados.value = '';
    });
    
    inputDados.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') handleRoll();
    });
});