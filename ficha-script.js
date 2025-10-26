document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Seleção dos Elementos ---
    const fichaForm = document.querySelector('.ficha-container');
    const nomeInput = document.getElementById('nome');
    
    const saveButton = document.getElementById('btn-save-char');
    const loadButton = document.getElementById('btn-load-char');
    const deleteButton = document.getElementById('btn-delete-char');
    const charSelect = document.getElementById('char-select');
    
    // NOVOS ELEMENTOS
    const exportButton = document.getElementById('btn-export-char');
    const importInput = document.getElementById('btn-import-char'); // Este é o <input type="file">

    const STORAGE_KEY = 'assim-rpg-chars'; 

    // --- 2. Funções Principais ---

    function populateCharacterList() {
        const allChars = getSavedCharacters();
        charSelect.options.length = 1; 
        for (const charName in allChars) {
            const option = document.createElement('option');
            option.value = charName;
            option.textContent = charName;
            charSelect.appendChild(option);
        }
    }

    function saveCharacter() {
        const charName = nomeInput.value.trim();
        if (!charName) {
            alert('Por favor, preencha o campo "Nome" para salvar o personagem.');
            return;
        }

        const allChars = getSavedCharacters();
        // MODIFICAÇÃO IMPORTANTE (da etapa anterior):
        // Pega os dados JÁ EXISTENTES para não apagar os dados da página "Detalhes"
        const charData = allChars[charName] || {};

        const inputs = fichaForm.querySelectorAll('input, textarea');
        inputs.forEach(el => {
            if (el.id) {
                if (el.type === 'checkbox') {
                    charData[el.id] = el.checked;
                } else {
                    charData[el.id] = el.value;
                }
            }
        });

        allChars[charName] = charData;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allChars));
        alert(`Personagem "${charName}" salvo com sucesso!`);
        populateCharacterList();
    }

    function loadCharacter() {
        const charName = charSelect.value;
        const allChars = getSavedCharacters();
        
        if (!charName || !allChars[charName]) {
            // Se "Nenhum" for selecionado ou o char não existir, limpa a ficha
            fichaForm.reset(); // Limpa todos os campos
            // 'reset()' não funciona em checkboxes "checked" por padrão, então forçamos
            const checkedInputs = fichaForm.querySelectorAll('input[type="checkbox"]');
            checkedInputs.forEach(cb => cb.checked = false);
            // E remarcamos os instintos
            document.getElementById('inf-1').checked = true;
            document.getElementById('per-1').checked = true;
            document.getElementById('pot-1').checked = true;
            document.getElementById('rea-1').checked = true;
            document.getElementById('res-1').checked = true;
            document.getElementById('sag-1').checked = true;
            return;
        }

        const charData = allChars[charName];

        for (const id in charData) {
            const el = document.getElementById(id);
            if (el) {
                if (el.type === 'checkbox') {
                    el.checked = charData[id];
                } else {
                    el.value = charData[id];
                }
            }
        }
        // alert(`Personagem "${charName}" carregado!`); // Opcional
    }

    function deleteCharacter() {
        const charName = charSelect.value;
        if (!charName) {
            alert('Selecione um personagem para excluir.');
            return;
        }
        if (!confirm(`Tem certeza que deseja excluir o personagem "${charName}"? Esta ação não pode ser desfeita.`)) {
            return;
        }
        const allChars = getSavedCharacters();
        delete allChars[charName];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allChars));
        alert(`Personagem "${charName}" excluído.`);
        populateCharacterList();
        loadCharacter(); // Limpa os campos
    }

    // --- 3. NOVAS FUNÇÕES: EXPORTAR E IMPORTAR ---

    /**
     * Exporta o personagem selecionado como um arquivo .json
     */
    function exportCharacter() {
        const charName = charSelect.value;
        if (!charName) {
            alert('Selecione um personagem para exportar.');
            return;
        }

        const allChars = getSavedCharacters();
        const charData = allChars[charName];

        if (!charData) {
            alert('Erro: Personagem não encontrado para exportar.');
            return;
        }

        // Criamos um objeto que contém o nome E os dados
        const exportData = {
            name: charName,
            data: charData
        };

        const jsonString = JSON.stringify(exportData, null, 2); // 'null, 2' formata o JSON
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        // Cria um link de download falso e clica nele
        const a = document.createElement('a');
        a.href = url;
        a.download = `${charName}.json`; // Nome do arquivo
        document.body.appendChild(a);
        a.click();
        
        // Limpa
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Importa um personagem de um arquivo .json
     */
    function importCharacter(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Verifica se é um arquivo .json
        if (file.type !== 'application/json') {
            alert('Tipo de arquivo inválido. Por favor, selecione um arquivo .json');
            return;
        }

        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const jsonString = e.target.result;
                const importData = JSON.parse(jsonString);

                // Validação simples do arquivo
                if (!importData.name || !importData.data) {
                    throw new Error('Formato de arquivo inválido. O JSON deve conter "name" e "data".');
                }

                const charName = importData.name;
                const charData = importData.data;
                const allChars = getSavedCharacters();

                // Verifica se já existe
                if (allChars[charName]) {
                    if (!confirm(`Um personagem com o nome "${charName}" já existe. Deseja sobrescrevê-lo?`)) {
                        event.target.value = null; // Limpa o input
                        return;
                    }
                }

                // Adiciona o novo personagem
                allChars[charName] = charData;
                localStorage.setItem(STORAGE_KEY, JSON.stringify(allChars));

                alert(`Personagem "${charName}" importado com sucesso!`);
                populateCharacterList(); // Atualiza a lista
                
                // Carrega o personagem importado
                charSelect.value = charName;
                loadCharacter();

            } catch (error) {
                alert(`Erro ao importar o arquivo: ${error.message}`);
            }
            // Limpa o input de arquivo para permitir importar o mesmo arquivo de novo
            event.target.value = null; 
        };

        reader.readAsText(file);
    }

    // --- 4. Funções Auxiliares ---
    function getSavedCharacters() {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : {};
    }

    // --- 5. Inicialização ---
    saveButton.addEventListener('click', saveCharacter);
    loadButton.addEventListener('click', loadCharacter);
    deleteButton.addEventListener('click', deleteCharacter);
    charSelect.addEventListener('change', loadCharacter); // Carrega ao selecionar

    // NOVOS EVENTOS
    exportButton.addEventListener('click', exportCharacter);
    importInput.addEventListener('change', importCharacter);

    populateCharacterList();
});