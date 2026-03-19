document.addEventListener('DOMContentLoaded', () => {

    // === 1. CONEXÃO MULTIPLAYER (SOCKET.IO) ===
    const socket = io('https://fichaassimilacaorpg.onrender.com');

    // Compartilhamos o socket com os outros scripts para eles poderem usar
    window.meuSocket = socket;

    socket.on('connect', () => {
        const campanhaAtiva = sessionStorage.getItem('campanhaAtiva');
        const usuarioId = sessionStorage.getItem('usuarioId');
        
        if (campanhaAtiva && usuarioId) {
            // Volta a entrar na sala silenciosamente após o F5
            socket.emit('entrar-na-campanha', { 
                campanhaId: campanhaAtiva, 
                usuarioId: usuarioId 
            });
        }
    });

    // === O NOVO ESCUDO DO MESTRE INTELIGENTE ===
    socket.on('nova-rolagem', (pacoteDeDados) => {
        const isMestre = sessionStorage.getItem('isMestreAtivo') === 'true';

        renderizarRolagem(pacoteDeDados);
        
        const modalRolador = document.getElementById('rolador-modal');
        if (modalRolador && !modalRolador.classList.contains('show')) {

        }

        socket.on('mesa-encerrada', () => {
        alert("🚨 O Mestre encerrou esta campanha permanentemente! Você está sendo desconectado.");
        
        // Limpa a memória da mesa
        sessionStorage.removeItem('campanhaAtiva');
        sessionStorage.removeItem('isMestreAtivo');
        
        // Dá um F5 forçado para limpar a tela e voltar pro Lobby
        window.location.reload();
    });
    });
    // ==========================================

    // 2. Controle do Modal (Abrir e Fechar)
    const btnAbrirModal = document.getElementById('nav-btn-rolador');
    const modalRolador = document.getElementById('rolador-modal');
    const btnFecharModal = document.getElementById('fechar-rolador');

    if (btnAbrirModal) {
        btnAbrirModal.addEventListener('click', (e) => {
            e.preventDefault();
            modalRolador.classList.add('show');
        });
    }

    if (btnFecharModal) {
        btnFecharModal.addEventListener('click', () => {
            modalRolador.classList.remove('show');
        });
    }

    window.addEventListener('click', (event) => {
        if (event.target == modalRolador) {
            modalRolador.classList.remove('show');
        }
    });

    // 3. Lógica dos Dados
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

    // === A MATEMÁTICA: Só calcula e monta o pacote ===
    function handleRoll() {
        const inputString = inputDados.value;
        const parsedDice = parseInput(inputString);
        if (!parsedDice || parsedDice.length === 0) return;

        const campanhaAtiva = sessionStorage.getItem('campanhaAtiva');
        
        // CORREÇÃO: Pega o nome do personagem OU o nome da conta corretos
        let nomeRolador = 'Operador Misterioso';
        const inputNome = document.getElementById('nome');

        if (inputNome && inputNome.value.trim() !== '') {
            nomeRolador = inputNome.value.trim();
        } else if (sessionStorage.getItem('usuarioNome') && sessionStorage.getItem('usuarioNome') !== 'undefined') {
            nomeRolador = sessionStorage.getItem('usuarioNome'); // Chave correta!
        }

        // O pacote blindado que vai trafegar pela internet
        const pacoteDeDados = {
            nome: nomeRolador,
            input: inputString,
            campanhaId: campanhaAtiva,
            resultados: [],
            totais: { sucesso: 0, pressao: 0, adaptacao: 0, nada: 0 }
        };

        let dieCounter = { d6: 0, d10: 0, d12: 0 };

        parsedDice.forEach(die => {
            const dieType = 'd' + die.size;
            for (let i = 0; i < die.quantity; i++) {
                dieCounter[dieType]++;
                const rollNumber = rollDie(die.size);
                const icons = diceTable[dieType][rollNumber];

                icons.forEach(iconName => pacoteDeDados.totais[iconName]++);

                pacoteDeDados.resultados.push({
                    tipo: dieType,
                    numero: dieCounter[dieType],
                    faceMecanica: rollNumber,
                    icones: icons
                });
            }
        });

        // 1. Desenha na minha tela
        renderizarRolagem(pacoteDeDados);

        // 2. Envia para os outros SOMENTE se eu estiver numa mesa
        if (campanhaAtiva) {
            socket.emit('rolar-dados', pacoteDeDados);
        }
    }

    // === O DESENHISTA: Só pega um pacote e desenha na tela com animações ===
    function renderizarRolagem(pacote) {
        resultsDiv.innerHTML = '';

        const rollGroup = document.createElement('div');
        rollGroup.style.borderBottom = '1px solid #ccc';
        rollGroup.style.paddingBottom = '15px';
        rollGroup.style.marginBottom = '15px';

        const header = document.createElement('h3');
        // CORREÇÃO: Usa 'pacote.nome' em vez do antigo 'pacote.jogador'
        header.textContent = `${pacote.nome} rolou: ${pacote.input}`;
        header.style.marginTop = '0';

        // Destaca em azul se a rolagem for de outro jogador
        const meuNomeLocal = sessionStorage.getItem('usuarioNome');
        const meuPersonagemLocal = document.getElementById('nome') ? document.getElementById('nome').value.trim() : '';
        
        if (pacote.nome !== meuNomeLocal && pacote.nome !== meuPersonagemLocal) {
            header.style.color = 'var(--color-assim-blue)';
        }

        rollGroup.appendChild(header);

        const subRollsContainer = document.createElement('div');
        subRollsContainer.className = 'sub-rolls-container';

        const tempoGiroLogo = 1000;
        const delaySuspense = 300;
        const tempoTotalAntesDados = tempoGiroLogo + delaySuspense;

        pacote.resultados.forEach(dado => {
            const subRollDiv = document.createElement('div');
            subRollDiv.className = 'sub-roll';
            subRollDiv.style.position = 'relative';

            const subRollHeader = document.createElement('h4');
            subRollHeader.textContent = `${dado.tipo} #${dado.numero} (rolou ${dado.faceMecanica})`;
            subRollHeader.style.opacity = '0';
            subRollHeader.style.transition = 'opacity 0.3s ease';

            const subRollIcons = document.createElement('div');
            subRollIcons.className = 'icons-container';
            subRollIcons.style.opacity = '0';

            const logoImg = document.createElement('img');
            logoImg.src = 'assets/icon.jpg';
            logoImg.className = 'logo-animado';
            subRollDiv.appendChild(logoImg);

            dado.icones.forEach((iconName, index) => {
                const img = document.createElement('img');
                img.src = iconFiles[iconName];
                img.alt = iconName;
                img.className = 'dado-animado';

                const delayDados = tempoTotalAntesDados / 1000;
                img.style.animationDelay = `${delayDados + (index * 0.1)}s`;

                subRollIcons.appendChild(img);
            });

            setTimeout(() => {
                subRollIcons.style.transition = 'opacity 0.3s ease';
                subRollIcons.style.opacity = '1';
                subRollHeader.style.opacity = '1';
            }, tempoTotalAntesDados);

            subRollDiv.appendChild(subRollHeader);
            subRollDiv.appendChild(subRollIcons);
            subRollsContainer.appendChild(subRollDiv);
        });

        rollGroup.appendChild(subRollsContainer);

        const summary = document.createElement('p');
        summary.className = 'rolador-summary';
        summary.textContent = `Total: ${pacote.totais.sucesso} Sucesso, ${pacote.totais.pressao} Pressão, ${pacote.totais.adaptacao} Adaptação.`;
        rollGroup.appendChild(summary);

        resultsDiv.appendChild(rollGroup);

        setTimeout(() => {
            const historyEntry = rollGroup.cloneNode(true);

            historyEntry.querySelectorAll('h4').forEach(h => h.style.opacity = '1');
            historyEntry.querySelectorAll('.icons-container').forEach(c => c.style.opacity = '1');
            historyEntry.querySelectorAll('.logo-animado').forEach(logo => logo.remove());
            historyEntry.querySelectorAll('.dado-animado').forEach(die => {
                die.classList.remove('dado-animado');
                die.style.opacity = '1';
                die.style.visibility = 'visible';
                die.style.transform = 'scale(1) rotate(0deg)';
            });

            historicoDiv.prepend(historyEntry);
        }, tempoTotalAntesDados);
    }

    rollButton.addEventListener('click', handleRoll);

    clearButton.addEventListener('click', () => {
        resultsDiv.innerHTML = '';
        historicoDiv.innerHTML = '';
        inputDados.value = '';
        if (inputFiltroHistorico) inputFiltroHistorico.value = '';
    });

    inputDados.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') handleRoll();
    });

    // ==========================================
    // VERSÃO 1.6: FILTRO DE HISTÓRICO DE ROLAGENS
    // ==========================================
    const inputFiltroHistorico = document.getElementById('filtro-historico');

    if (inputFiltroHistorico) {
        inputFiltroHistorico.addEventListener('input', (e) => {
            const termoBusca = e.target.value.toLowerCase().trim();
            const rolagensSalvas = historicoDiv.children;

            Array.from(rolagensSalvas).forEach(caixaDeRolagem => {
                const tituloRolagem = caixaDeRolagem.querySelector('h3');

                if (tituloRolagem) {
                    const textoDoTitulo = tituloRolagem.textContent.toLowerCase();
                    if (textoDoTitulo.includes(termoBusca)) {
                        caixaDeRolagem.style.display = 'block'; 
                    } else {
                        caixaDeRolagem.style.display = 'none';  
                    }
                }
            });
        });
    }
});