document.addEventListener('DOMContentLoaded', () => {
    // API!
    const API_URL = 'https://fichaassimilacaorpg.onrender.com';

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
    if (btnAbrirCampanhas) {
        btnAbrirCampanhas.addEventListener('click', (e) => {
            e.preventDefault();
            const usuarioLogadoId = sessionStorage.getItem('usuarioId');
            if (!usuarioLogadoId) return mostrarNotificacao("Faça login primeiro!");

            modalCampanhas.classList.add('show');
            carregarMinhasCampanhas(usuarioLogadoId);
            preencherSelectPersonagens();
        });
    }

    if (btnFecharCampanhas) {
        btnFecharCampanhas.addEventListener('click', () => modalCampanhas.classList.remove('show'));
    }

    // Busca as campanhas do Banco de Dados
    async function carregarMinhasCampanhas(userId) {
        listaCampanhas.innerHTML = '<p style="color: #666; font-style: italic;">Buscando conexões...</p>';
        try {
            const resposta = await fetch(`${API_URL}/campanhas/usuario/${userId}`);
            const campanhas = await resposta.json();

            if (campanhas.length === 0) {
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

                const btnExcluir = camp.is_mestre
                    ? `<button class="btn-excluir-campanha" data-id="${camp.id}" style="background-color: #8b0000; color: white; border: none; padding: 10px; border-radius: 5px; cursor: pointer; margin-top: 5px; font-weight: bold; font-family: 'Special Elite', monospace;">Apagar Mesa</button>`
                    : '';

                card.innerHTML = `
                    <div class="campanha-info">
                        <h4>${camp.nome}</h4>
                        ${badge}
                    </div>
                    <div style="display: flex; flex-direction: column;">
                        <button class="btn-jogar" data-id="${camp.id}" data-mestre="${camp.is_mestre}">Entrar</button>
                        ${btnExcluir}
                    </div>
                `;
                listaCampanhas.appendChild(card);
            });

            document.querySelectorAll('.btn-jogar').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const idCampanha = e.target.getAttribute('data-id');
                    
                    const rawMestre = e.target.getAttribute('data-mestre');
                    const isMestre = rawMestre === 'true' || rawMestre === true || rawMestre === '1';

                    // Salva na memória
                    sessionStorage.setItem('campanhaAtiva', idCampanha);
                    sessionStorage.setItem('isMestreAtivo', isMestre);

                    const socketAtivo = typeof socket !== 'undefined' ? socket : (window.socket || window.meuSocket);
                    
                    if (socketAtivo) {
                        socketAtivo.emit('entrar-na-campanha', {
                            campanhaId: idCampanha,
                            usuarioId: sessionStorage.getItem('usuarioId')
                        });
                    } else {
                        console.error("⚠️ Socket não encontrado! O multiplayer não vai funcionar.");
                    }

                    const papel = isMestre ? 'Mestre' : 'Jogador';
                    mostrarNotificacao(`Conectado como ${papel}! Suas rolagens agora pertencem a esta mesa.`);
                    
                    modalCampanhas.classList.remove('show');
                    window.location.reload();
                });
            });

        } catch (erro) {
            listaCampanhas.innerHTML = '<p style="color: #a04040;">Erro ao carregar campanhas.</p>';
        }

        document.querySelectorAll('.btn-excluir-campanha').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const idCampanha = e.target.getAttribute('data-id');
                    const usuarioLogadoId = sessionStorage.getItem('usuarioId');

                    const confirmacao = confirm('🔥 ALERTA CRÍTICO 🔥\n\nTem certeza que deseja APAGAR esta mesa? Todos os jogadores serão expulsos e o histórico será perdido. Isso NÃO tem volta!');

                    if (confirmacao) {
                        e.target.textContent = "Apagando...";
                        try {
                            const resposta = await fetch(`${API_URL}/campanhas/${idCampanha}`, {
                                method: 'DELETE',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'usuario-id': usuarioLogadoId 
                                }
                            });
                            
                            const dados = await resposta.json();
                            
                            if (resposta.ok) {
                                mostrarNotificacao(dados.mensagem, 'sucesso');
                                carregarMinhasCampanhas(usuarioLogadoId); 
                            } else {
                                mostrarNotificacao(dados.erro, 'erro');
                            }
                        } catch (err) {
                            mostrarNotificacao("Erro ao excluir mesa.", 'erro');
                        }
                    }
                });
            });
    }

    // Puxa os personagens da galeria principal para o select de entrada
    function preencherSelectPersonagens() {
        const selectPrincipal = document.getElementById('char-select');
        if (selectPrincipal && charSelectCampanha) {
            charSelectCampanha.innerHTML = '<option value="">-- Selecione seu Personagem --</option>';
            // Copia as opções do select que já está carregado
            Array.from(selectPrincipal.options).forEach(opt => {
                if (opt.value !== "") {
                    const novaOpt = document.createElement('option');
                    novaOpt.value = opt.value;
                    novaOpt.textContent = opt.textContent;
                    charSelectCampanha.appendChild(novaOpt);
                }
            });
        }
    }

    // Criar Nova Campanha (Mestre)
    btnCriarCampanha.addEventListener('click', async () => {
        const nome = nomeCampanhaInput.value.trim();
        const mestre_id = sessionStorage.getItem('usuarioId');

        if (!nome) return mostrarNotificacao("Digite um nome para a campanha!", 'erro');

        btnCriarCampanha.textContent = "Criando...";
        try {
            const resposta = await fetch(`${API_URL}/campanhas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, mestre_id })
            });
            const dados = await resposta.json();

            if (resposta.ok) {
                mostrarNotificacao(`Campanha criada!\nEnvie este código para seus jogadores: ${dados.codigo}`, 'sucesso');
                nomeCampanhaInput.value = '';
                carregarMinhasCampanhas(mestre_id);
            } else {
                mostrarNotificacao(dados.erro, 'erro');
            }
        } catch (erro) {
            mostrarNotificacao("Erro de conexão.", 'erro');
        } finally {
            btnCriarCampanha.textContent = "Fundar Campanha";
        }
    });

    // Entrar em Campanha Existente (Jogador)
    btnEntrarCampanha.addEventListener('click', async () => {
        const codigo_convite = codigoConviteInput.value.trim().toUpperCase();
        const personagem_id = charSelectCampanha.value;
        const usuario_id = sessionStorage.getItem('usuarioId');

        if (!codigo_convite) return mostrarNotificacao("Digite o código de convite!", 'aviso');
        if (!personagem_id) return mostrarNotificacao("Você precisa selecionar um personagem para entrar na mesa!", 'aviso');

        btnEntrarCampanha.textContent = "Entrando...";
        try {
            const resposta = await fetch(`${API_URL}/campanhas/entrar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ codigo_convite, usuario_id, personagem_id })
            });
            const dados = await resposta.json();

            if (resposta.ok) {
                mostrarNotificacao(dados.mensagem, 'sucesso');
                codigoConviteInput.value = '';
                carregarMinhasCampanhas(usuario_id);
            } else {
                mostrarNotificacao(dados.erro, 'erro');
            }
        } catch (erro) {
            mostrarNotificacao("Erro de conexão.", 'erro');
        } finally {
            btnEntrarCampanha.textContent = "Entrar na Mesa";
        }
    });
});