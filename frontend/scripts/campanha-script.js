document.addEventListener('DOMContentLoaded', () => {
    // Mesma API do seu render!
    const API_URL = 'https://assimilacao-backend-api.onrender.com'; 
    
    // Controles do Modal
    const btnAbrirCampanhas = document.getElementById('nav-btn-campanhas');
    const modalCampanhas = document.getElementById('campanhas-modal');
    const btnFecharCampanhas = document.getElementById('fechar-campanhas');
    
    const listaCampanhas = document.getElementById('lista-campanhas');
    const btnCriarCampanha = document.getElementById('btn-criar-campanha');
    const nomeCampanhaInput = document.getElementById('nova-campanha-nome');
    const btnEntrarCampanha = document.getElementById('btn-entrar-campanha');
    const codigoConviteInput = document.getElementById('codigo-convite-input');
    const charSelectCampanha = document.getElementById('char-select-campanha');

    // Abre a janela de campanhas
    if(btnAbrirCampanhas) {
        btnAbrirCampanhas.addEventListener('click', (e) => {
            e.preventDefault();
            const usuarioLogadoId = sessionStorage.getItem('usuarioId');
            if(!usuarioLogadoId) return alert("Faça login primeiro!");
            
            modalCampanhas.classList.add('show');
            carregarMinhasCampanhas(usuarioLogadoId);
            preencherSelectPersonagens();
        });
    }

    if(btnFecharCampanhas) {
        btnFecharCampanhas.addEventListener('click', () => modalCampanhas.classList.remove('show'));
    }

    // 1. Busca as campanhas do Banco de Dados
    async function carregarMinhasCampanhas(userId) {
        listaCampanhas.innerHTML = '<p style="color: #666; font-style: italic;">Buscando conexões...</p>';
        try {
            const resposta = await fetch(`${API_URL}/campanhas/usuario/${userId}`);
            const campanhas = await resposta.json();

            if(campanhas.length === 0) {
                listaCampanhas.innerHTML = '<p style="color: #888;">Você ainda não participa de nenhuma campanha.</p>';
                return;
            }

            listaCampanhas.innerHTML = '';
            campanhas.forEach(camp => {
                const card = document.createElement('div');
                card.className = 'campanha-card';
                
                const badge = camp.is_mestre 
                    ? `<span class="badge-mestre">👑 Mestre (Código: ${camp.codigo_convite})</span>` 
                    : `<span class="badge-jogador">⚔️ Jogador</span>`;

                card.innerHTML = `
                    <div class="campanha-info">
                        <h4>${camp.nome}</h4>
                        ${badge}
                    </div>
                    <button class="btn-jogar" data-id="${camp.id}" data-mestre="${camp.is_mestre}">Entrar</button>
                `;
                listaCampanhas.appendChild(card);
            });

                document.querySelectorAll('.btn-jogar').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const idCampanha = e.target.getAttribute('data-id');
                    const isMestre = e.target.getAttribute('data-mestre') === '1';
                    
                    // Salva na memória
                    sessionStorage.setItem('campanhaAtiva', idCampanha);
                    sessionStorage.setItem('isMestreAtivo', isMestre);
                    
                    // === A MÁGICA DE ENTRAR NA SALA ===
                    if (window.meuSocket) {
                        window.meuSocket.emit('entrar-na-campanha', idCampanha);
                    }
                    
                    const papel = isMestre ? 'Mestre' : 'Jogador';
                    alert(`Conectado como ${papel}! Suas rolagens agora pertencem a esta mesa.`);
                    modalCampanhas.classList.remove('show');
                });
            });

        } catch (erro) {
            listaCampanhas.innerHTML = '<p style="color: #a04040;">Erro ao carregar campanhas.</p>';
        }
    }

    // Puxa os personagens da galeria principal para o select de entrada
    function preencherSelectPersonagens() {
        const selectPrincipal = document.getElementById('char-select');
        if(selectPrincipal && charSelectCampanha) {
            charSelectCampanha.innerHTML = '<option value="">-- Selecione seu Personagem --</option>';
            // Copia as opções do select que já está carregado
            Array.from(selectPrincipal.options).forEach(opt => {
                if(opt.value !== "") {
                    const novaOpt = document.createElement('option');
                    novaOpt.value = opt.value;
                    novaOpt.textContent = opt.textContent;
                    charSelectCampanha.appendChild(novaOpt);
                }
            });
        }
    }

    // 2. Criar Nova Campanha (Mestre)
    btnCriarCampanha.addEventListener('click', async () => {
        const nome = nomeCampanhaInput.value.trim();
        const mestre_id = sessionStorage.getItem('usuarioId');
        
        if(!nome) return alert("Digite um nome para a campanha!");

        btnCriarCampanha.textContent = "Criando...";
        try {
            const resposta = await fetch(`${API_URL}/campanhas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, mestre_id })
            });
            const dados = await resposta.json();
            
            if(resposta.ok) {
                alert(`Campanha criada!\nEnvie este código para seus jogadores: ${dados.codigo}`);
                nomeCampanhaInput.value = '';
                carregarMinhasCampanhas(mestre_id);
            } else {
                alert(dados.erro);
            }
        } catch (erro) {
            alert("Erro de conexão.");
        } finally {
            btnCriarCampanha.textContent = "Fundar Campanha";
        }
    });

    // 3. Entrar em Campanha Existente (Jogador)
    btnEntrarCampanha.addEventListener('click', async () => {
        const codigo_convite = codigoConviteInput.value.trim().toUpperCase();
        const personagem_id = charSelectCampanha.value;
        const usuario_id = sessionStorage.getItem('usuarioId');

        if(!codigo_convite) return alert("Digite o código de convite!");
        if(!personagem_id) return alert("Você precisa selecionar um personagem para entrar na mesa!");

        btnEntrarCampanha.textContent = "Entrando...";
        try {
            const resposta = await fetch(`${API_URL}/campanhas/entrar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ codigo_convite, usuario_id, personagem_id })
            });
            const dados = await resposta.json();
            
            if(resposta.ok) {
                alert(dados.mensagem);
                codigoConviteInput.value = '';
                carregarMinhasCampanhas(usuario_id);
            } else {
                alert(dados.erro);
            }
        } catch (erro) {
            alert("Erro de conexão.");
        } finally {
            btnEntrarCampanha.textContent = "Entrar na Mesa";
        }
    });
});