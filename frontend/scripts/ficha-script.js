document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'https://assimilacao-backend-api.onrender.com';
    
    // Variável que guarda o ID do usuário apenas na memória RAM 
    let token = sessionStorage.getItem('token')
    let usuarioLogadoId = sessionStorage.getItem('usuarioId');
    let nomeOperador = sessionStorage.getItem('nomeUsuario'); 
    let isLoginMode = true;

    // Elementos de Autenticação
    const authContainer = document.getElementById('auth-container');
    const appContainer = document.getElementById('app-container');
    const authForm = document.getElementById('auth-form');
    const authTitle = document.getElementById('auth-title');
    const authSubmitBtn = document.getElementById('auth-submit-btn');
    const authToggleLink = document.getElementById('auth-toggle-link');
    const authToggleText = document.getElementById('auth-toggle-text');
    const authMensagem = document.getElementById('auth-mensagem');
    const usernameInput = document.getElementById('auth-username');
    const passwordInput = document.getElementById('auth-password');
    const btnSair = document.getElementById('btn-sair');

    // Elementos da Ficha
    const charSelect = document.getElementById('char-select');
    const btnLoad = document.getElementById('btn-load-char');
    const btnSave = document.getElementById('btn-save-char');
    const btnDelete = document.getElementById('btn-delete-char');
    const nomeInput = document.getElementById('nome');

    let personagensCarregados = []; 
    let idPersonagemAtual = null;

    // === CONTROLES DA GALERIA ===
    const btnAbrirGaleria = document.getElementById('btn-abrir-galeria');
    const modalGaleria = document.getElementById('galeria-modal');
    const btnFecharGaleria = document.getElementById('fechar-galeria');
    const inputBuscaGaleria = document.getElementById('busca-personagem');

    if(btnAbrirGaleria) {
        btnAbrirGaleria.addEventListener('click', (e) => {
            e.preventDefault();
            modalGaleria.classList.add('show');
        });
    }

    if(btnFecharGaleria) {
        btnFecharGaleria.addEventListener('click', () => {
            modalGaleria.classList.remove('show');
        });
    }

    // Fechar clicando fora da janela
    window.addEventListener('click', (event) => {
        if (event.target == modalGaleria) {
            modalGaleria.classList.remove('show');
        }
    });

    // Filtro de Busca
    if(inputBuscaGaleria) {
        inputBuscaGaleria.addEventListener('input', (e) => {
            const termo = e.target.value.toLowerCase();
            document.querySelectorAll('.char-card').forEach(card => {
                if (card.dataset.nome) {
                    card.style.display = card.dataset.nome.includes(termo) ? 'flex' : 'none';
                }
            });
        });
    }

    //Função de verificação de sessão
    function verificarSessao() {
        if (token && usuarioLogadoId) {
            // Esconde login e mostra a ficha imediatamente
            authContainer.style.display = 'none';
            appContainer.style.display = 'block';
            
            // Atualiza o nome na navbar
            const nomeUsuarioLogado = document.getElementById('nome-usuario-logado');
            if (nomeUsuarioLogado) nomeUsuarioLogado.textContent = `Bem-vindo, ${nomeOperador}`;
            
            // Carrega os personagens
            carregarListaPersonagens();
        }
    }
    verificarSessao();

    // ==========================================
    // SISTEMA DE LOGIN E CRIAÇÃO DE CONTA
    // ==========================================

    // Alternar entre Login e Cadastro
    authToggleLink.addEventListener('click', () => {
        isLoginMode = !isLoginMode;
        authMensagem.textContent = '';
        
        if (isLoginMode) {
            authTitle.textContent = 'Acesso Restrito';
            authSubmitBtn.textContent = 'Entrar no Sistema';
            authToggleText.innerHTML = 'Não possui credenciais? <span id="auth-toggle-link" style="color: #a04040; cursor: pointer; text-decoration: underline; font-weight: bold;">Criar nova conta</span>';
        } else {
            authTitle.textContent = 'Novo Registro de Operador';
            authSubmitBtn.textContent = 'Registrar Conta';
            authToggleText.innerHTML = 'Já possui cadastro? <span id="auth-toggle-link" style="color: #a04040; cursor: pointer; text-decoration: underline; font-weight: bold;">Fazer Login</span>';
        }
        document.getElementById('auth-toggle-link').addEventListener('click', () => authToggleLink.click());
    });

    // Enviar formulário de Login/Registro
    authForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const nome_usuario = usernameInput.value.trim();
        const senha = passwordInput.value.trim();
        const endpoint = isLoginMode ? '/login' : '/registro';
        
        try {
            authSubmitBtn.disabled = true;
            authSubmitBtn.textContent = 'Aguarde...';

            const resposta = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome_usuario, senha })
            });

            const dados = await resposta.json();

            if (!resposta.ok) {
                authMensagem.textContent = dados.erro;
                authMensagem.style.color = '#a04040';
            } else {
                if (isLoginMode) {
                    // SUCESSO NO LOGIN!
                    
                    // Salva os dados no SessionStorage
                    sessionStorage.setItem('token', dados.token);
                    sessionStorage.setItem('usuarioId', dados.usuarioId);
                    sessionStorage.setItem('nomeUsuario', dados.nome_usuario);
                    
                    // Atualiza as variáveis do script
                    token = dados.token;
                    usuarioLogadoId = dados.usuarioId;
                    nomeOperador = dados.nome_usuario;
                    
                    // Atualiza a tela
                    authContainer.style.display = 'none';
                    appContainer.style.display = 'block';
                    
                    const nomeUsuarioLogado = document.getElementById('nome-usuario-logado');
                    if (nomeUsuarioLogado) nomeUsuarioLogado.textContent = `Bem-vindo, ${nomeOperador}`;
                    
                    usernameInput.value = '';
                    passwordInput.value = '';

                    carregarListaPersonagens();

                    const modalGaleria = document.getElementById('galeria-modal');
                    if(modalGaleria) modalGaleria.classList.add('show');
                } else {
                    // SUCESSO NO CADASTRO!
                    authMensagem.textContent = 'Conta criada com sucesso! Faça login.';
                    authMensagem.style.color = 'green';
                    authToggleLink.click(); // Volta pro modo login
                }
            }
        } catch (erro) {
            authMensagem.textContent = 'Erro de conexão com o servidor SQL.';
        } finally {
            authSubmitBtn.disabled = false;
            authSubmitBtn.textContent = isLoginMode ? 'Entrar no Sistema' : 'Registrar Conta';
        }
    });

    // Desconectar (Limpar memória)
    btnSair.addEventListener('click', (e) => {
        e.preventDefault();

        sessionStorage.clear();

        token = null;
        usuarioLogadoId = null;
        nomeOperador = null;
        idPersonagemAtual = null;

        document.querySelectorAll('form').forEach(f => {
            if(f.id !== 'auth-form') f.reset();
        });

        if (photoPreview) photoPreview.src = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
        
        appContainer.style.display = 'none';
        authContainer.style.display = 'block';
    });

    // ==========================================
    // PODERES DO MESTRE: INSPECIONAR FICHAS DA MESA
    // ==========================================
    const btnFichasMesa = document.getElementById('btn-fichas-mesa');
    
    // Um radarzinho que checa a cada 1 segundo se você virou Mestre de alguma mesa
    setInterval(() => {
        const isMestre = sessionStorage.getItem('isMestreAtivo') === 'true';
        if (btnFichasMesa) {
            btnFichasMesa.style.display = isMestre ? 'inline-block' : 'none';
        }
    }, 1000);

    if (btnFichasMesa) {
        btnFichasMesa.addEventListener('click', async (e) => {
            e.preventDefault();
            const campanhaId = sessionStorage.getItem('campanhaAtiva');
            if (!campanhaId) return alert('Você não está em nenhuma mesa ativa!');

            btnFichasMesa.textContent = "Buscando...";
            try {
                const resposta = await fetch(`${API_URL}/campanhas/${campanhaId}/personagens`);
                const personagensMesa = await resposta.json();
                
                // === A BLINDAGEM ===
                if (!resposta.ok) {
                    throw new Error(personagensMesa.erro || "Erro desconhecido no servidor.");
                }
                // ===================
                
                const gridPersonagens = document.getElementById('grid-personagens');
                gridPersonagens.innerHTML = ''; // Limpa a galeria para mostrar a mesa
                
                if (personagensMesa.length === 0) {
                    gridPersonagens.innerHTML = '<p style="color: white; padding: 20px;">Nenhum jogador colocou um personagem nesta mesa ainda.</p>';
                } else {
                    // Povoa a galeria com os personagens dos SEUS jogadores
                    personagensMesa.forEach(char => {
                        const dados = char.dados_personagem || {};
                        const fotoBase64 = dados['char-photo'];
                        const ocupacao = dados['ocupacao'] || 'Desconhecido';
                        const placeholderInterno = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='110' height='130'%3E%3Crect width='110' height='130' fill='%23111'/%3E%3Ctext x='50%25' y='50%25' font-size='40' fill='%23555' dominant-baseline='middle' text-anchor='middle'%3E?%3C/text%3E%3C/svg%3E";
                        const imgSrc = (fotoBase64 && !fotoBase64.includes('R0lGODlhAQAB')) ? fotoBase64 : placeholderInterno;

                        const card = document.createElement('div');
                        card.className = 'char-card';
                        card.innerHTML = `
                            <img src="${imgSrc}" class="char-card-img" alt="Foto">
                            <div class="char-card-info">
                                <h3 class="char-card-nome">${char.nome_personagem || 'Sem Nome'}</h3>
                                <p class="char-card-detalhe">${ocupacao}</p>
                                <p class="char-card-detalhe" style="color: #4CAF50; margin-top: 5px; font-weight: bold;">👤 Jogador: ${char.nome_jogador}</p>
                                <button class="btn-acessar-ficha btn-inspecionar" data-dados='${JSON.stringify(dados).replace(/'/g, "&#39;")}'>Inspecionar</button>
                            </div>
                        `;
                        gridPersonagens.appendChild(card);
                    });
                    
                    // Ação de carregar a ficha do jogador na tela do Mestre
                    document.querySelectorAll('.btn-inspecionar').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            const dadosString = e.target.getAttribute('data-dados');
                            const dadosJson = JSON.parse(dadosString);
                            
                            preencherFicha(dadosJson); // Joga os dados na tela
                            
                            // TRUQUE DE SEGURANÇA: Limpamos o ID para o Mestre não salvar por cima sem querer!
                            idPersonagemAtual = null; 
                            
                            document.getElementById('galeria-modal').classList.remove('show');
                            alert("Ficha do jogador carregada no Modo Inspeção! (Apenas visualização)");
                        });
                    });
                }
                
                // Abre a janela da galeria adaptada
                document.getElementById('galeria-modal').classList.add('show');
                
            } catch (erro) {
                console.error(erro);
                alert("Erro ao buscar as fichas da mesa.");
            } finally {
                btnFichasMesa.innerHTML = "👑 Fichas da Mesa";
            }
        });
    }

    // ==========================================
    // SISTEMA DA FICHA E DETALHES
    // ==========================================

    // 1. Lógica para carregar a imagem e converter para Base64
    const photoInput = document.getElementById('char-photo-input');
    const photoPreview = document.getElementById('char-photo-preview');

    if (photoInput && photoPreview) {
        photoInput.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    // Coloca a imagem convertida em texto (Base64) na tag src
                    photoPreview.src = e.target.result; 
                }
                reader.readAsDataURL(file);
            }
        });
    }

    // Coletar todos os dados (agora inclui textareas e a imagem)
    function coletarDadosFicha() {
        const dados = {};
        
        // Pega TODOS os inputs e textareas de dentro do <main> inteiro!
        const elementos = document.querySelectorAll('.ficha-container input, .detalhes-container input, .detalhes-container textarea');
        
        elementos.forEach(el => {
            if (!el.id || el.type === 'file') return; // Ignora o input de arquivo

            if (el.type === 'checkbox') {
                dados[el.id] = el.checked;
            } else {
                dados[el.id] = el.value;
            }
        });

        // Salva a foto em Base64, se houver uma carregada (ignora o pixel transparente padrão)
        const photoPreview = document.getElementById('char-photo-preview');
        if (photoPreview && photoPreview.src && !photoPreview.src.includes('R0lGODlhAQABAAD')) {
            dados['char-photo'] = photoPreview.src;
        }

        return dados;
    }

    // Preencher a ficha ao carregar do banco
    function preencherFicha(dados) {
        // Limpa TODOS os formulários (exceto o de login)
        document.querySelectorAll('form').forEach(f => {
            if (f.id !== 'auth-form') f.reset();
        });

        // Reseta a imagem para o pixel transparente padrão
        const photoPreview = document.getElementById('char-photo-preview');
        if (photoPreview) {
            photoPreview.src = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
        }

        for (const key in dados) {
            // Se for a foto, injeta no src da imagem
            if (key === 'char-photo') {
                if (photoPreview) photoPreview.src = dados[key];
                continue;
            }

            // Para todos os outros inputs e textareas
            const el = document.getElementById(key);
            if (el) {
                if (el.type === 'checkbox') {
                    el.checked = dados[key];
                } else {
                    el.value = dados[key];
                }
            }
        }
    }


    async function carregarListaPersonagens() {
        if (!usuarioLogadoId) return;

        try {
            const resposta = await fetch(`${API_URL}/personagens/usuario/${usuarioLogadoId}`);
            personagensCarregados = await resposta.json();
            
            // 1. Atualiza o Select antigo (mantemos para segurança/referência)
            charSelect.innerHTML = '<option value="">-- Novo Personagem --</option>';
            
            // 2. Prepara a Galeria Visual
            const gridPersonagens = document.getElementById('grid-personagens');
            if(gridPersonagens) gridPersonagens.innerHTML = '';

            // Cria o botão gigante de "Novo Personagem" na Galeria
            if(gridPersonagens) {
                const cardNovo = document.createElement('div');
                cardNovo.className = 'char-card';
                cardNovo.style.cursor = 'pointer';
                cardNovo.innerHTML = `
                    <div class="char-card-img" style="display: flex; align-items: center; justify-content: center; font-size: 3em; color: #555;">+</div>
                    <div class="char-card-info">
                        <h3 class="char-card-nome" style="color: #4CAF50;">Criar Novo</h3>
                        <p class="char-card-detalhe">Ficha em branco</p>
                    </div>
                `;
                cardNovo.addEventListener('click', () => {
                    document.querySelectorAll('form').forEach(f => {
                        if (f.id !== 'auth-form') f.reset();
                    });
                    const photoPreview = document.getElementById('char-photo-preview');
                    if (photoPreview) photoPreview.src = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
                    idPersonagemAtual = null;
                    charSelect.value = "";
                    modalGaleria.classList.remove('show');
                });
                gridPersonagens.appendChild(cardNovo);
            }

            // 3. Povoa a Galeria com os personagens do banco
            personagensCarregados.forEach(char => {
                const option = document.createElement('option');
                option.value = char.id;
                option.textContent = char.nome_personagem || 'Sem Nome';
                charSelect.appendChild(option);

                if(gridPersonagens) {
                    const dados = char.dados_personagem || {};
                    
                    // Extrai a foto e a ocupação direto do pacote JSON salvo
                    const fotoBase64 = dados['char-photo'];
                    const ocupacao = dados['ocupacao'] || 'Desconhecido';
                    
                    // Se não tiver foto, usamos uma imagem neutra (placeholder)
                    const placeholderInterno = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='110' height='130'%3E%3Crect width='110' height='130' fill='%23111'/%3E%3Ctext x='50%25' y='50%25' font-size='40' fill='%23555' dominant-baseline='middle' text-anchor='middle'%3E?%3C/text%3E%3C/svg%3E";
                    const imgSrc = (fotoBase64 && !fotoBase64.includes('R0lGODlhAQAB')) 
                                    ? fotoBase64 
                                    : placeholderInterno;

                    const card = document.createElement('div');
                    card.className = 'char-card';
                    card.dataset.nome = (char.nome_personagem || 'sem nome').toLowerCase(); // Para a busca

                    card.innerHTML = `
                        <img src="${imgSrc}" class="char-card-img" alt="Foto de ${char.nome_personagem}">
                        <div class="char-card-info">
                            <h3 class="char-card-nome">${char.nome_personagem || 'Sem Nome'}</h3>
                            <p class="char-card-detalhe">${ocupacao}</p>
                            <button class="btn-acessar-ficha" data-id="${char.id}">Acessar Ficha</button>
                        </div>
                    `;
                    gridPersonagens.appendChild(card);
                }
            });

            // Adiciona a ação mágica nos botões "Acessar Ficha" recém-criados
            document.querySelectorAll('.btn-acessar-ficha').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const idSelecionado = e.target.getAttribute('data-id');
                    
                    // Sincroniza o select antigo
                    charSelect.value = idSelecionado;
                    
                    // Puxa e preenche a ficha
                    const personagem = personagensCarregados.find(p => p.id == idSelecionado);
                    if (personagem && personagem.dados_personagem) {
                        preencherFicha(personagem.dados_personagem);
                        idPersonagemAtual = personagem.id;
                    }
                    
                    // Fecha a galeria
                    modalGaleria.classList.remove('show');
                });
            });

        } catch (erro) {
            console.error('Erro ao buscar lista:', erro);
        }
    }

    btnSave.addEventListener('click', async () => {
        if (!usuarioLogadoId) return alert('Você precisa estar logado!');

        const dadosFicha = coletarDadosFicha();
        const nomePersonagem = nomeInput.value || 'Cobaia Desconhecida';

        const payload = {
            id: idPersonagemAtual,
            nome_personagem: nomePersonagem,
            dados_personagem: dadosFicha,
            utilizador_id: usuarioLogadoId
        };

        btnSave.textContent = 'Salvando...';

        try {
            const resposta = await fetch(`${API_URL}/personagens`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const resultado = await resposta.json();
            alert(resultado.mensagem);
            
            await carregarListaPersonagens();
            if (resultado.id) {
                idPersonagemAtual = resultado.id;
                charSelect.value = idPersonagemAtual;
            }
        } catch (erro) {
            alert('Erro ao salvar no banco de dados.');
        } finally {
            btnSave.textContent = 'Salvar';
        }
    });

    btnLoad.addEventListener('click', () => {
        const idSelecionado = charSelect.value;
        if (!idSelecionado) {
            document.querySelector('.ficha-container').reset();
            idPersonagemAtual = null;
            return;
        }

        const personagem = personagensCarregados.find(p => p.id == idSelecionado);
        if (personagem && personagem.dados_personagem) {
            preencherFicha(personagem.dados_personagem);
            idPersonagemAtual = personagem.id;
        }
    });

    btnDelete.addEventListener('click', async () => {
        if (!idPersonagemAtual) return alert('Selecione um personagem para excluir.');

        const confirmacao = confirm('Tem certeza que deseja apagar esta ficha permanentemente?');
        if (!confirmacao) return;

        try {
            await fetch(`${API_URL}/personagens/${idPersonagemAtual}`, { method: 'DELETE' });
            alert('Ficha deletada com sucesso.');
            
            document.querySelector('.ficha-container').reset();
            idPersonagemAtual = null;
            await carregarListaPersonagens();
        } catch (erro) {
            console.error('Erro ao deletar:', erro);
        }
    });


    // ==========================================
    // VERSÃO 1.6: CONTROLE DE TEMA (DARK MODE)
    // ==========================================
    const btnToggleTema = document.getElementById('btn-toggle-tema');
    const corpoDoSite = document.body;

    // 1. Checa a memória para ver se o jogador já prefere o tema escuro
    const temaSalvo = localStorage.getItem('tema-rpg-assimilacao');
    
    if (temaSalvo === 'dark') {
        corpoDoSite.classList.add('dark');
        if (btnToggleTema) btnToggleTema.textContent = '☀️ Tema Claro';
    }

    // 2. A Mágica do Clique
    if (btnToggleTema) {
        btnToggleTema.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Liga/Desliga a classe theme-dark no <body>
            corpoDoSite.classList.toggle('dark');
            
            // Verifica se a classe está lá agora para atualizar o botão e salvar na memória
            if (corpoDoSite.classList.contains('dark')) {
                localStorage.setItem('tema-rpg-assimilacao', 'dark');
                btnToggleTema.textContent = '☀️ Tema Claro';
            } else {
                localStorage.setItem('tema-rpg-assimilacao', 'light');
                btnToggleTema.textContent = '🌙 Tema Escuro';
            }
        });
    }

    // ==========================================
    // PODERES DO MESTRE: GERENCIAR JOGADORES (V1.6)
    // ==========================================
    const btnGerenciarJogadores = document.getElementById('btn-gerenciar-jogadores');
    const modalGerenciarJogadores = document.getElementById('gerenciar-jogadores-modal');
    const btnFecharGerenciar = document.getElementById('fechar-gerenciar-jogadores');

    // Radar: Mostra o botão junto com o "Fichas da Mesa"
    setInterval(() => {
        const isMestre = sessionStorage.getItem('isMestreAtivo') === 'true';
        if (btnGerenciarJogadores) {
            btnGerenciarJogadores.style.display = isMestre ? 'inline-block' : 'none';
        }
    }, 1000);

    if (btnFecharGerenciar) {
        btnFecharGerenciar.addEventListener('click', () => modalGerenciarJogadores.classList.remove('show'));
    }

    if (btnGerenciarJogadores) {
        btnGerenciarJogadores.addEventListener('click', async (e) => {
            e.preventDefault();
            const campanhaId = sessionStorage.getItem('campanhaAtiva');
            if (!campanhaId) return alert('Você não está em nenhuma mesa ativa!');

            btnGerenciarJogadores.textContent = "Buscando...";
            try {
                // 1. Busca os jogadores no Back-end
                const resposta = await fetch(`${API_URL}/campanhas/${campanhaId}/jogadores`);
                const jogadores = await resposta.json();
                
                const gridJogadores = document.getElementById('grid-jogadores-mesa');
                gridJogadores.innerHTML = ''; 
                
                if (jogadores.length === 0) {
                    gridJogadores.innerHTML = '<p style="color: var(--color-text-medium);">Nenhum jogador na mesa ainda.</p>';
                } else {
                    // 2. Desenha os cards na tela
                    jogadores.forEach(jog => {
                        const card = document.createElement('div');
                        card.className = 'jogador-card-mestre';
                        card.innerHTML = `
                            <h4>${jog.nome_personagem || 'Desconhecido'}</h4>
                            <button class="btn-remover-jogador" data-usuario="${jog.usuario_id}">Remover</button>
                        `;
                        gridJogadores.appendChild(card);
                    });

                    // 3. Adiciona a função da Guilhotina (Botão Remover)
                    document.querySelectorAll('.btn-remover-jogador').forEach(btn => {
                        btn.addEventListener('click', async (event) => {
                            const usuarioIdRemover = event.target.getAttribute('data-usuario');
                            
                            if(confirm("Tem certeza que deseja remover este jogador da campanha?")) {
                                try {
                                    const delRes = await fetch(`${API_URL}/campanhas/${campanhaId}/membros/${usuarioIdRemover}`, {
                                        method: 'DELETE'
                                    });
                                    if(delRes.ok) {
                                        // Some com o card visualmente na mesma hora, sem precisar recarregar a página!
                                        event.target.closest('.jogador-card-mestre').remove(); 
                                    } else {
                                        alert("Erro ao remover jogador.");
                                    }
                                } catch (err) {
                                    alert("Erro de conexão.");
                                }
                            }
                        });
                    });
                }
                
                // Abre a janela
                modalGerenciarJogadores.classList.add('show');
            } catch (erro) {
                console.error(erro);
                alert("Erro ao buscar jogadores.");
            } finally {
                btnGerenciarJogadores.innerHTML = "👥 Jogadores";
            }
        });
    }
});