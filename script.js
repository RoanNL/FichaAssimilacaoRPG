document.addEventListener('DOMContentLoaded', () => {

    // 1. Mapeamento de Ícones
    const iconFiles = {
        sucesso: 'assets/Sucesso.png',
        pressao: 'assets/pressao.png',
        adaptacao: 'assets/Adaptacao.png',
        nada: 'assets/nada.png'
    };

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

    // 4. Função para rolar um dado
    function rollDie(max) {
        return Math.floor(Math.random() * max) + 1;
    }

    // 5. Função para parsear o input
    function parseInput(inputString) {
        // ... (função parseInput sem alterações) ...
        const diceRequests = [];
        const parts = inputString.trim().toLowerCase().split(/\s+/);
        for (const part of parts) {
            if (!part) continue;
            const match = part.match(/^(\d*)d(\d+)$/);
            if (!match) { alert(`Formato inválido: "${part}"`); return null; }
            const quantity = parseInt(match[1] || '1', 10);
            const size = parseInt(match[2], 10);
            if (![6, 10, 12].includes(size)) { alert(`Dado inválido: "d${size}"`); return null; }
            diceRequests.push({ quantity, size });
        }
        return diceRequests;
    }

    // 6. FUNÇÃO PRINCIPAL (MODIFICADA)
    function handleRoll() {
        const inputString = inputDados.value;
        const parsedDice = parseInput(inputString);
        if (!parsedDice || parsedDice.length === 0) return;

        resultsDiv.innerHTML = ''; // Limpa resultados

        const rollGroup = document.createElement('div');
        rollGroup.className = 'roll-group';
        const header = document.createElement('h3');
        header.textContent = `Rolando: ${inputString}`;
        rollGroup.appendChild(header);
        const subRollsContainer = document.createElement('div');
        subRollsContainer.className = 'sub-rolls-container';
        
        const totals = { sucesso: 0, pressao: 0, adaptacao: 0, nada: 0 };
        let dieCounter = { d6: 0, d10: 0, d12: 0 };
        const elementsToReveal = []; // Guarda refs dos elementos

        parsedDice.forEach(die => {
            const dieType = 'd' + die.size;
            for (let i = 0; i < die.quantity; i++) {
                dieCounter[dieType]++;
                const rollNumber = rollDie(die.size);
                const icons = diceTable[dieType][rollNumber];

                const subRollDiv = document.createElement('div');
                subRollDiv.className = 'sub-roll';

                // --- CRIA O HEADER (escondido) ---
                const subRollHeader = document.createElement('h4');
                subRollHeader.textContent = `${dieType} #${dieCounter[dieType]} (rolou ${rollNumber})`;
                subRollHeader.classList.add('hidden'); // ESCONDIDO
                subRollDiv.appendChild(subRollHeader);

                // --- CRIA O SPINNER (visível) ---
                const spinnerDiv = document.createElement('div');
                spinnerDiv.className = 'card-spinner';
                const spinnerImg = document.createElement('img');
                spinnerImg.src = 'assets/icon.jpg';
                spinnerImg.alt = 'Girando...';
                spinnerDiv.appendChild(spinnerImg);
                subRollDiv.appendChild(spinnerDiv);

                // --- CRIA O CONTAINER DE ÍCONES (escondido) ---
                const subRollIcons = document.createElement('div');
                subRollIcons.className = 'icons-container hidden'; // ESCONDIDO
                icons.forEach(iconName => {
                    totals[iconName]++;
                    const img = document.createElement('img');
                    img.src = iconFiles[iconName];
                    img.alt = iconName;
                    subRollIcons.appendChild(img);
                });
                subRollDiv.appendChild(subRollIcons);
                subRollsContainer.appendChild(subRollDiv);

                // Guarda a referência de TODOS os elementos para o setTimeout
                elementsToReveal.push({
                    header: subRollHeader, // Header adicionado aqui
                    spinner: spinnerDiv,
                    icons: subRollIcons
                });
            }
        });

        rollGroup.appendChild(subRollsContainer);
        const summary = document.createElement('p');
        summary.className = 'summary hidden'; // Escondido
        summary.textContent = `Resultado Total: ${totals.sucesso} Sucesso, ${totals.pressao} Pressão, ${totals.adaptacao} Adaptação.`;
        rollGroup.appendChild(summary);
        resultsDiv.appendChild(rollGroup);

        // Clona para o histórico ANTES do timeout
        const historyEntry = rollGroup.cloneNode(true);
        addRollToHistory(historyEntry);

        // --- O ATRASO DE 1 SEGUNDO ---
        setTimeout(() => {
            // Revela header/ícones e esconde spinner nos RESULTADOS ATUAIS
            elementsToReveal.forEach(el => {
                el.header.classList.remove('hidden'); // Revela header
                el.spinner.classList.add('hidden');
                el.icons.classList.remove('hidden');
            });
            summary.classList.remove('hidden'); // Revela sumário

            // --- ATUALIZA A CÓPIA DO HISTÓRICO ---
            // Encontra os elementos dentro da cópia do histórico e atualiza
            historyEntry.querySelectorAll('h4').forEach(h => h.classList.remove('hidden'));
            historyEntry.querySelectorAll('.card-spinner').forEach(s => s.classList.add('hidden'));
            historyEntry.querySelectorAll('.icons-container').forEach(i => i.classList.remove('hidden'));
            historyEntry.querySelector('.summary').classList.remove('hidden');

        }, 1200); // 1 segundo
    }

    // 7. Função para adicionar ao histórico
    function addRollToHistory(rollGroupElement) {
        historicoDiv.prepend(rollGroupElement);
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