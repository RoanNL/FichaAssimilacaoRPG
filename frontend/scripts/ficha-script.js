document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:3000';
    
    // Variável que guarda o ID do usuário apenas na memória RAM (sem localStorage)
    let usuarioLogadoId = null; 
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
                    usuarioLogadoId = dados.usuarioId;
                    
                    // Esconde a tela de login e mostra a ficha
                    authContainer.style.display = 'none';
                    appContainer.style.display = 'block';
                    
                    // Limpa os campos de senha
                    usernameInput.value = '';
                    passwordInput.value = '';

                    // AGORA SIM carregamos os personagens DESTE jogador específico!
                    carregarListaPersonagens();
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
        usuarioLogadoId = null;
        idPersonagemAtual = null;
        document.querySelector('.ficha-container').reset();
        
        appContainer.style.display = 'none';
        authContainer.style.display = 'block';
    });

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

    // 2. Coletar todos os dados (agora inclui textareas e a imagem)
    function coletarDadosFicha() {
        const dados = {};
        
        // Pega inputs e textareas de toda a área principal (ignora o login)
        const elementos = document.querySelectorAll('main.container input, main.container textarea');
        
        elementos.forEach(el => {
            if (!el.id || el.type === 'file') return; // Ignora o input de arquivo, vamos pegar o Base64 da imagem

            if (el.type === 'checkbox') {
                dados[el.id] = el.checked;
            } else {
                dados[el.id] = el.value;
            }
        });

        // Salva a foto em Base64, se houver uma carregada
        if (photoPreview && photoPreview.src) {
            dados['char-photo'] = photoPreview.src;
        }

        return dados;
    }

    // 3. Preencher a ficha ao carregar do banco
    function preencherFicha(dados) {
        // Limpa os formulários da ficha e dos detalhes
        document.querySelectorAll('form').forEach(f => {
            if (f.id !== 'auth-form') f.reset();
        });

        // Reseta a imagem para o pixel transparente padrão
        if (photoPreview) {
            photoPreview.src = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
        }

        for (const key in dados) {
            // Se for a foto, injeta no src da imagem
            if (key === 'char-photo') {
                if (photoPreview) photoPreview.src = dados[key];
                continue;
            }

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


    // ==========================================
    // SISTEMA DA FICHA (O RESTO CONTINUA IGUAL)
    // ==========================================

    function coletarDadosFicha() {
        const dados = {};
        const inputs = document.querySelectorAll('.ficha-container input');
        inputs.forEach(input => {
            if (!input.id) return;
            if (input.type === 'checkbox') {
                dados[input.id] = input.checked;
            } else {
                dados[input.id] = input.value;
            }
        });
        return dados;
    }

    function preencherFicha(dados) {
        document.querySelector('.ficha-container').reset();
        for (const key in dados) {
            const input = document.getElementById(key);
            if (input) {
                if (input.type === 'checkbox') {
                    input.checked = dados[key];
                } else {
                    input.value = dados[key];
                }
            }
        }
    }

    async function carregarListaPersonagens() {
        if (!usuarioLogadoId) return; // Proteção extra

        try {
            const resposta = await fetch(`${API_URL}/personagens/usuario/${usuarioLogadoId}`);
            personagensCarregados = await resposta.json();
            
            charSelect.innerHTML = '<option value="">-- Novo Personagem --</option>';
            personagensCarregados.forEach(char => {
                const option = document.createElement('option');
                option.value = char.id;
                option.textContent = char.nome_personagem || 'Sem Nome';
                charSelect.appendChild(option);
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
});