document.addEventListener('DOMContentLoaded', () => {

    // 1. Mapeamento de Ícones
    const iconFiles = {
        sucesso: '../assets/Sucesso.png',
        pressao: '../assets/pressao.png',
        adaptacao: '../assets/Adaptacao.png',
        nada: '../assets/nada.png'
    };

    // 2. Tabela de Resultados
    const diceTable = {
        d6: {
            1: ['nada'], 2: ['nada'], 3: ['pressao'], 4: ['pressao'],
            5: ['adaptacao', 'pressao'], 6: ['sucesso']
        },
        d10: {
            1: ['nada'], 2: ['nada'], 3: ['pressao'], 4: ['pressao'],
            5: ['adaptacao', 'pressao'], 6: ['sucesso'], 7: ['sucesso', 'sucesso'],
            8: ['sucesso', 'adaptacao'], 9: ['sucesso', 'adaptacao', 'pressao'],
            10: ['sucesso', 'sucesso', 'pressao']
        },
        d12: {
            1: ['nada'], 2: ['nada'], 3: ['pressao'], 4: ['pressao'],
            5: ['adaptacao', 'pressao'], 6: ['sucesso'], 7: ['sucesso', 'sucesso'],
            8: ['sucesso', 'adaptacao'], 9: ['sucesso', 'adaptacao', 'pressao'],
            10: ['sucesso', 'sucesso', 'pressao'],
            11: ['sucesso', 'adaptacao', 'adaptacao', 'pressao'],
            12: ['pressao', 'pressao']
        }
    };

    // 3. Seleção dos Elementos do HTML
    const inputDados = document.getElementById('input-dados');
    const rollButton = document.getElementById('btn-rolar');
    const clearButton = document.getElementById('btn-limpar');
    const resultsDiv = document.getElementById('resultados-atuais');
    const historicoDiv = document.getElementById('historico-rolagens');

    // 4. Função para rolar um dado (ex: 1 a 6)
    function rollDie(max) {
        return Math.floor(Math.random() * max) + 1;
    }

    // 5. Função para "parsear" (interpretar) o texto do input
    function parseInput(inputString) {
        const diceRequests = [];
        const parts = inputString.trim().toLowerCase().split(/\s+/);

        for (const part of parts) {
            if (!part) continue; 
            const match = part.match(/^(\d*)d(\d+)$/); 
            
            if (!match) {
                alert(`Formato de dado inválido: "${part}".\nUse "d6", "2d10", etc.`);
                return null;
            }

            const quantity = parseInt(match[1] || '1', 10);
            const size = parseInt(match[2], 10);

            if (![6, 10, 12].includes(size)) {
                alert(`Tamanho de dado inválido: "d${size}".\nUse apenas d6, d10 ou d12.`);
                return null;
            }

            diceRequests.push({ quantity, size });
        }
        return diceRequests;
    }

    // 6. Função principal que rola os dados
    function handleRoll() {
        const inputString = inputDados.value;
        const parsedDice = parseInput(inputString);

        if (!parsedDice || parsedDice.length === 0) {
            return;
        }

        resultsDiv.innerHTML = ''; // Limpa resultado atual

        // Cria o "grupo de rolagem" principal (para o histórico)
        const rollGroup = document.createElement('div');
        rollGroup.className = 'roll-group';

        const header = document.createElement('h3');
        header.textContent = `Rolando: ${inputString}`;
        rollGroup.appendChild(header);

        // Container para os cards individuais (d10 #1, d12 #1, etc.)
        const subRollsContainer = document.createElement('div');
        subRollsContainer.className = 'sub-rolls-container';
        
        // Objeto para contar os totais de *toda* a rolagem
        const totals = { sucesso: 0, pressao: 0, adaptacao: 0, nada: 0 };
        let dieCounter = { d6: 0, d10: 0, d12: 0 }; // Contador para o # de cada dado

        // Itera sobre cada grupo de dado (ex: "2d6", depois "1d10")
        parsedDice.forEach(die => {
            const dieType = 'd' + die.size; // "d6", "d10", etc.
            
            // Rola a quantidade de dados (ex: 2 vezes para "2d6")
            for (let i = 0; i < die.quantity; i++) {
                
                // --- A CADA ROLAGEM INDIVIDUAL ---
                
                dieCounter[dieType]++; // Incrementa o contador (d12 #1, d12 #2...)
                
                // 1. Cria o card individual
                const subRollDiv = document.createElement('div');
                subRollDiv.className = 'sub-roll'; // Este é o card branco da sua imagem

                // 2. Cria os elementos internos
                const subRollHeader = document.createElement('h4');
                const subRollIcons = document.createElement('div');
                subRollIcons.className = 'icons-container';
                
                // 3. Rola o dado
                const rollNumber = rollDie(die.size);
                const icons = diceTable[dieType][rollNumber];

                // 4. Adiciona os ícones deste dado
                icons.forEach(iconName => {
                    totals[iconName]++; // Adiciona ao total GERAL
                    
                    const img = document.createElement('img');
                    img.src = iconFiles[iconName];
                    img.alt = iconName;
                    subRollIcons.appendChild(img); // Adiciona ao card individual
                });

                // 5. Define o texto do header (ex: "d12 #1 (rolou 4)")
                const headerText = `${dieType} #${dieCounter[dieType]} (rolou ${rollNumber})`;
                subRollHeader.textContent = headerText;

                // 6. Monta o card
                subRollDiv.appendChild(subRollHeader);
                subRollDiv.appendChild(subRollIcons);
                
                // 7. Adiciona o card ao container
                subRollsContainer.appendChild(subRollDiv);
            }
        });

        // Adiciona o container de sub-grupos ao grupo principal
        rollGroup.appendChild(subRollsContainer);

        // Cria o sumário TOTAL
        const summary = document.createElement('p');
        summary.className = 'summary';
        summary.textContent = `Resultado Total: ${totals.sucesso} Sucesso, ${totals.pressao} Pressão, ${totals.adaptacao} Adaptação.`;
        rollGroup.appendChild(summary);

        // Adiciona o grupo de rolagem aos resultados atuais
        resultsDiv.appendChild(rollGroup);

        // Adiciona uma CÓPIA ao histórico
        addRollToHistory(rollGroup);
    }

    // 7. Função para adicionar ao histórico
    function addRollToHistory(rollGroupElement) {
        const historyEntry = rollGroupElement.cloneNode(true);
        historicoDiv.prepend(historyEntry); // Adiciona no topo
    }

    // 8. Função para limpar tudo
    function clearAll() {
        resultsDiv.innerHTML = '';
        historicoDiv.innerHTML = '';
        inputDados.value = '';
    }

    // 9. Adiciona os "escutadores de evento"
    rollButton.addEventListener('click', handleRoll);
    clearButton.addEventListener('click', clearAll);
    inputDados.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            handleRoll();
        }
    });
});