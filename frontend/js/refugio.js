document.addEventListener('DOMContentLoaded', () => {

    // Referências do DOM
    const modalRefugios = document.getElementById('modal-meus-refugios');
    const areaLista = document.getElementById('area-lista-refugios');
    const areaForm = document.getElementById('area-form-refugio');
    const gridRefugios = document.getElementById('grid-meus-refugios');
    const formRefugio = document.getElementById('form-refugio-detalhes');
    
    // Botões
    const btnNovoRefugio = document.getElementById('btn-novo-refugio-modal');
    const btnVoltarLista = document.getElementById('btn-voltar-lista-refugios');
    const tituloForm = document.getElementById('titulo-form-refugio');

    // Variável global para guardar os dados
    let refugiosCarregados = [];

    // ==========================================
    // 1. ABRIR MODAL GLOBAL (Ligado ao botão do Header)
    // ==========================================
    window.abrirGerenciadorRefugios = function() {
        if(modalRefugios) {
            modalRefugios.classList.add('show');
            alternarTelas(true); // Mostra a lista
            carregarMeusRefugios();
        }
    };

    function alternarTelas(mostrarLista) {
        if(mostrarLista) {
            areaLista.classList.remove('hidden');
            areaForm.classList.add('hidden');
        } else {
            areaLista.classList.add('hidden');
            areaForm.classList.remove('hidden');
        }
    }

    // ==========================================
    // 2. BUSCAR E RENDERIZAR REFÚGIOS DO BANCO (COM SISTEMA DE CRISE)
    // ==========================================
    async function carregarMeusRefugios() {
        gridRefugios.innerHTML = '<p class="text-gray-500 italic col-span-full text-center py-4 animate-pulse">Explorando o terreno...</p>';

        try {
            const resposta = await fetch(`${window.API_URL}/api/refugios`, {
                headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
            });
            
            if (!resposta.ok) throw new Error("Erro ao buscar refugios");
            refugiosCarregados = await resposta.json();

            gridRefugios.innerHTML = '';

            if (refugiosCarregados.length === 0) {
                gridRefugios.innerHTML = '<p class="text-gray-500 italic col-span-full text-center py-4 border border-dashed border-gray-300 dark:border-gray-700 rounded">Você ainda não estabeleceu nenhum refúgio.</p>';
                return;
            }

            refugiosCarregados.forEach(ref => {
                const card = document.createElement('div');
                
                // 🔥 LÓGICA DE CRISE AUTOMÁTICA 🔥
                const isSuperlotado = ref.popAtual > (ref.popMax || 1);
                const isFome = ref.alimento <= 0;
                const isSedento = ref.agua <= 0 && !ref.temFonteAgua;
                const isPanico = ref.moral <= 0;
                const isIndefeso = ref.defesa <= 0;

                const emCrise = isSuperlotado || isFome || isSedento || isPanico || isIndefeso;

                // Estilo Condicional do Card
                card.className = emCrise 
                    ? 'bg-red-50 dark:bg-[#2a1313] border-2 border-rpg-red p-4 rounded-lg shadow-[0_0_15px_rgba(220,38,38,0.4)] hover:shadow-[0_0_20px_rgba(220,38,38,0.6)] transition-all flex flex-col justify-between group relative overflow-visible'
                    : 'bg-white dark:bg-[#242424] border border-gray-300 dark:border-gray-700 p-4 rounded-lg shadow-sm hover:border-rpg-green transition-all flex flex-col justify-between group relative overflow-visible';

                // Etiqueta Visual de Crise no canto do Card
                const badgeCrise = emCrise
                    ? `<div class="absolute -top-3 -right-3 bg-red-700 text-white text-[10px] font-black px-3 py-1 rounded-full border-2 border-red-900 shadow-lg transform rotate-12 flex items-center gap-1 animate-pulse z-10 uppercase tracking-widest"><i data-lucide="flame" class="w-3 h-3"></i> Crise!</div>`
                    : '';

                // Lista os motivos da crise para o jogador se desesperar
                let motivosHtml = '';
                if (emCrise) {
                    let motivos = [];
                    if (isSuperlotado) motivos.push('Superlotação');
                    if (isFome) motivos.push('Fome');
                    if (isSedento) motivos.push('Sede');
                    if (isPanico) motivos.push('Pânico');
                    if (isIndefeso) motivos.push('Brecha na Defesa');
                    motivosHtml = `<p class="text-red-600 dark:text-red-400 font-bold text-[10px] uppercase mb-2 flex items-center gap-1 animate-pulse"><i data-lucide="alert-triangle" class="w-3 h-3"></i> ${motivos.join(' • ')}</p>`;
                }
                
                // Calcula a porcentagem de lotação da base
                const porcentagemPop = Math.min(100, Math.max(0, (ref.popAtual / (ref.popMax || 1)) * 100));
                let corBarra = 'bg-rpg-green';
                if (porcentagemPop >= 80) corBarra = 'bg-orange-500';
                if (porcentagemPop > 100) corBarra = 'bg-rpg-red';

                const iconeAguaHtml = ref.temFonteAgua 
                    ? `<span class="font-bold text-sm text-blue-500">∞</span>` 
                    : `<span class="font-bold text-sm ${isSedento ? 'text-red-500 animate-pulse' : 'text-black dark:text-white'}">${ref.agua}</span>`;

                card.innerHTML = `
                    ${badgeCrise}
                    <div>
                        <h4 class="text-lg font-black text-gray-800 dark:text-white m-0 truncate border-b border-gray-200 dark:border-gray-700 pb-1 mb-2">
                            <i data-lucide="${emCrise ? 'skull' : 'tent'}" class="w-4 h-4 ${emCrise ? 'text-rpg-red animate-pulse' : 'text-rpg-green'} inline"></i> ${window.escaparHTML(ref.nome)}
                        </h4>
                        
                        ${motivosHtml}
                        
                        <!-- Mini Tabela de Status -->
                        <div class="grid grid-cols-4 gap-1 text-center mb-3">
                            <div class="bg-gray-100 dark:bg-[#1a1a1a] rounded p-1 border ${isIndefeso ? 'border-red-500' : 'border-transparent'}" title="Defesa"><span class="block text-[10px] text-gray-500 font-bold uppercase">🛡️</span><span class="font-bold text-sm ${isIndefeso ? 'text-red-500 animate-pulse' : 'text-black dark:text-white'}">${ref.defesa}</span></div>
                            <div class="bg-gray-100 dark:bg-[#1a1a1a] rounded p-1 border ${isPanico ? 'border-red-500' : 'border-transparent'}" title="Moral"><span class="block text-[10px] text-gray-500 font-bold uppercase">😊</span><span class="font-bold text-sm ${isPanico ? 'text-red-500 animate-pulse' : 'text-black dark:text-white'}">${ref.moral}</span></div>
                            <div class="bg-gray-100 dark:bg-[#1a1a1a] rounded p-1 border ${isSedento ? 'border-red-500' : 'border-transparent'}" title="Água"><span class="block text-[10px] text-gray-500 font-bold uppercase">💧</span>${iconeAguaHtml}</div>
                            <div class="bg-gray-100 dark:bg-[#1a1a1a] rounded p-1 border ${isFome ? 'border-red-500' : 'border-transparent'}" title="Alimento"><span class="block text-[10px] text-gray-500 font-bold uppercase">🥩</span><span class="font-bold text-sm ${isFome ? 'text-red-500 animate-pulse' : 'text-black dark:text-white'}">${ref.alimento}</span></div>
                        </div>

                        <!-- Barra de População -->
                        <div class="mb-3">
                            <div class="flex justify-between text-xs font-bold text-gray-500 mb-1">
                                <span>População</span>
                                <span class="${isSuperlotado ? 'text-red-500 animate-pulse font-black' : ''}">${ref.popAtual} / ${ref.popMax}</span>
                            </div>
                            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                <div class="${corBarra} h-1.5 rounded-full" style="width: ${porcentagemPop}%"></div>
                            </div>
                        </div>
                    </div>

                    <div class="flex gap-2 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <button class="btn-editar-ref flex-1 bg-gray-800 hover:bg-black dark:bg-gray-200 dark:hover:bg-white text-white dark:text-black font-bold py-1.5 rounded text-xs uppercase font-rpg transition-colors flex justify-center items-center gap-1 shadow-sm" data-id="${ref.id}">
                            <i data-lucide="edit" class="w-3 h-3"></i> Editar
                        </button>
                        <button class="btn-deletar-ref w-8 bg-rpg-red hover:bg-red-800 text-white font-bold py-1.5 rounded text-xs transition-colors flex justify-center items-center shadow-sm" data-id="${ref.id}" data-nome="${window.escaparHTML(ref.nome)}">
                            <i data-lucide="trash-2" class="w-3 h-3"></i>
                        </button>
                    </div>
                `;
                gridRefugios.appendChild(card);
            });

            if(window.lucide) lucide.createIcons();

            // Ativa botões de Editar
            document.querySelectorAll('.btn-editar-ref').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.currentTarget.getAttribute('data-id');
                    const refugioSelecionado = refugiosCarregados.find(r => r.id === id);
                    if(refugioSelecionado) preencherFormulario(refugioSelecionado);
                });
            });

            // Ativa botões de Excluir (Agora abrindo o Modal Customizado!
            document.querySelectorAll('.btn-deletar-ref').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.currentTarget.getAttribute('data-id');
                    const nomeStr = e.currentTarget.getAttribute('data-nome');
                    prepararDestruicaoRefugio(id, nomeStr.trim().toLowerCase());
                });
            });

        } catch (erro) {
            gridRefugios.innerHTML = '<p class="text-rpg-red col-span-full text-center py-4">Erro ao acessar os registros de refúgio.</p>';
        }
    }

    // ==========================================
    // 3. NAVEGAÇÃO E PREENCHIMENTO DO FORMULÁRIO
    // ==========================================
    if (btnVoltarLista) btnVoltarLista.addEventListener('click', () => alternarTelas(true));
    
    if (btnNovoRefugio) {
        btnNovoRefugio.addEventListener('click', () => {
            formRefugio.reset();
            document.getElementById('ref-id').value = '';
            tituloForm.textContent = 'Novo Refúgio';
            alternarTelas(false);
        });
    }

    function preencherFormulario(ref) {
        document.getElementById('ref-id').value = ref.id;
        document.getElementById('ref-nome').value = ref.nome;
        document.getElementById('ref-pop-atual').value = ref.popAtual;
        document.getElementById('ref-pop-max').value = ref.popMax;
        document.getElementById('ref-defesa').value = ref.defesa;
        document.getElementById('ref-moral').value = ref.moral;
        document.getElementById('ref-mobilidade').value = ref.mobilidade;
        document.getElementById('ref-beligerancia').value = ref.beligerancia;
        document.getElementById('ref-agua').value = ref.agua;
        document.getElementById('ref-fonte').checked = ref.temFonteAgua;
        document.getElementById('ref-alimento').value = ref.alimento;
        document.getElementById('ref-madeira').value = ref.madeira;
        
        tituloForm.textContent = 'Editar Refúgio';
        alternarTelas(false);
    }

    // ==========================================
    // 4. SALVAR NO BANCO
    // ==========================================
    if (formRefugio) {
        formRefugio.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnSubmit = document.getElementById('btn-salvar-refugio-form');
            const originalText = btnSubmit.innerHTML;
            btnSubmit.innerHTML = '<i data-lucide="loader" class="w-5 h-5 animate-spin"></i> Salvando...';
            btnSubmit.disabled = true;

            const payload = {
                id: document.getElementById('ref-id').value,
                nome: document.getElementById('ref-nome').value.trim(),
                popAtual: parseInt(document.getElementById('ref-pop-atual').value) || 0,
                popMax: parseInt(document.getElementById('ref-pop-max').value) || 0,
                defesa: parseInt(document.getElementById('ref-defesa').value) || 0,
                moral: parseInt(document.getElementById('ref-moral').value) || 0,
                mobilidade: parseInt(document.getElementById('ref-mobilidade').value) || 0,
                beligerancia: parseInt(document.getElementById('ref-beligerancia').value) || 0,
                agua: parseInt(document.getElementById('ref-agua').value) || 0,
                temFonteAgua: document.getElementById('ref-fonte').checked,
                alimento: parseInt(document.getElementById('ref-alimento').value) || 0,
                madeira: parseInt(document.getElementById('ref-madeira').value) || 0
            };

            if(!payload.id) payload.id = Date.now().toString();

            try {
                const res = await fetch(`${window.API_URL}/api/refugios/salvar`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${sessionStorage.getItem('token')}` 
                    },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                
                if(res.ok) {
                    window.mostrarNotificacao(data.mensagem, 'sucesso');
                    alternarTelas(true);
                    carregarMeusRefugios();
                } else {
                    window.mostrarNotificacao(data.erro, 'erro');
                }
            } catch(err) {
                window.mostrarNotificacao('Erro de conexão.', 'erro');
            } finally {
                btnSubmit.innerHTML = originalText;
                btnSubmit.disabled = false;
                if(window.lucide) lucide.createIcons();
            }
        });
    }

    // ==========================================
    // 5. MODAL DE DESTRUIR REFÚGIO (SEGURANÇA MÁXIMA)
    // ==========================================
    const modalDeleteRefugio = document.getElementById('delete-refugio-modal');
    const inputDeleteRefugio = document.getElementById('delete-refugio-input');
    const btnConfirmDeleteRefugio = document.getElementById('btn-confirm-delete-refugio');
    const btnCancelDeleteRefugio = document.getElementById('btn-cancel-delete-refugio');
    const targetNameRefugio = document.getElementById('delete-refugio-target-name');

    let refugioParaDeletarId = null;
    let nomeRefugioLimpo = '';

    function prepararDestruicaoRefugio(id, nome) {
        refugioParaDeletarId = id;
        nomeRefugioLimpo = nome;

        if(targetNameRefugio) targetNameRefugio.textContent = nomeRefugioLimpo;
        if(inputDeleteRefugio) inputDeleteRefugio.value = '';
        if(btnConfirmDeleteRefugio) {
            btnConfirmDeleteRefugio.disabled = true;
            // 🔥 O ERRO ESTAVA AQUI! AGORA ESTÁ COM A VARIÁVEL CERTA 🔥
            btnConfirmDeleteRefugio.classList.add('opacity-50', 'cursor-not-allowed'); 
            btnConfirmDeleteRefugio.classList.remove('hover:bg-red-900');
        }
        if(modalDeleteRefugio) modalDeleteRefugio.classList.add('show');
    }

    if (inputDeleteRefugio) {
        inputDeleteRefugio.addEventListener('input', (e) => {
            if (e.target.value.trim().toLowerCase() === nomeRefugioLimpo) {
                btnConfirmDeleteRefugio.disabled = false;
                btnConfirmDeleteRefugio.classList.remove('opacity-50', 'cursor-not-allowed');
                btnConfirmDeleteRefugio.classList.add('hover:bg-red-900');
            } else {
                btnConfirmDeleteRefugio.disabled = true;
                btnConfirmDeleteRefugio.classList.add('opacity-50', 'cursor-not-allowed');
                btnConfirmDeleteRefugio.classList.remove('hover:bg-red-900');
            }
        });
    }

    if (btnCancelDeleteRefugio) {
        btnCancelDeleteRefugio.addEventListener('click', () => {
            modalDeleteRefugio.classList.remove('show');
        });
    }

    if (btnConfirmDeleteRefugio) {
        btnConfirmDeleteRefugio.addEventListener('click', async () => {
            if (!refugioParaDeletarId) return;
            
            const iconeOriginal = btnConfirmDeleteRefugio.innerHTML;
            btnConfirmDeleteRefugio.innerHTML = "Destruindo...";
            btnConfirmDeleteRefugio.disabled = true;

            try {
                const res = await fetch(`${window.API_URL}/api/refugios/deletar/${refugioParaDeletarId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
                });
                const data = await res.json();
                
                if(res.ok) {
                    window.mostrarNotificacao(data.mensagem, 'sucesso');
                    carregarMeusRefugios();
                } else {
                    window.mostrarNotificacao(data.erro, 'erro');
                }
            } catch(err) {
                window.mostrarNotificacao('Erro de conexão.', 'erro');
            } finally {
                modalDeleteRefugio.classList.remove('show');
                btnConfirmDeleteRefugio.innerHTML = iconeOriginal;
                btnConfirmDeleteRefugio.disabled = false;
                if(window.lucide) lucide.createIcons();
            }
        });
    }
});