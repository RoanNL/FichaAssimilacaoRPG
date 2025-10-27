document.addEventListener('DOMContentLoaded', () => {

    // --- 0. Helper: Debounce Function ---
    // Atrasa a execução de uma função até que Xms tenham passado desde a última chamada
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // --- 1. Seleção dos Elementos ---
    const fichaForm = document.querySelector('.ficha-container'); // O formulário principal
    const nomeInput = document.getElementById('nome');
    
    const saveButton = document.getElementById('btn-save-char');
    const loadButton = document.getElementById('btn-load-char');
    const deleteButton = document.getElementById('btn-delete-char');
    const charSelect = document.getElementById('char-select');
    
    const exportButton = document.getElementById('btn-export-char');
    const importInput = document.getElementById('btn-import-char'); 

    const STORAGE_KEY = 'assim-rpg-chars'; 

    // --- 2. Funções Principais (Salvar Manual, Carregar, Excluir, Popular Lista) ---
    // (Estas funções permanecem IGUAIS às da sua versão anterior)
    function populateCharacterList() { /* ...código igual ... */ 
        const allChars = getSavedCharacters();
        charSelect.options.length = 1; 
        for (const charName in allChars) {
            const option = document.createElement('option');
            option.value = charName;
            option.textContent = charName;
            charSelect.appendChild(option);
        }
    }
    function saveCharacter() { /* ...código igual ... */ 
        const charName = nomeInput.value.trim();
        if (!charName) {
            alert('Por favor, preencha o campo "Nome" para salvar o personagem.');
            return;
        }
        const allChars = getSavedCharacters();
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
        alert(`Personagem "${charName}" salvo com sucesso!`); // Mantém o feedback no save manual
        populateCharacterList(); 
    }
    function loadCharacter() { /* ...código igual ... */ 
        const charName = charSelect.value;
        const allChars = getSavedCharacters();
        
        if (!charName || !allChars[charName]) {
            fichaForm.reset(); 
            const checkedInputs = fichaForm.querySelectorAll('input[type="checkbox"]');
            checkedInputs.forEach(cb => cb.checked = false);
            // Remarca os instintos (assumindo que fichaForm contém eles)
            try {
                document.getElementById('inf-1').checked = true;
                document.getElementById('per-1').checked = true;
                document.getElementById('pot-1').checked = true;
                document.getElementById('rea-1').checked = true;
                document.getElementById('res-1').checked = true;
                document.getElementById('sag-1').checked = true;
            } catch (e) { console.error("Erro ao remarcar instintos:", e); }
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
    }
    function deleteCharacter() { /* ...código igual ... */ 
        const charName = charSelect.value;
        if (!charName) { alert('Selecione um personagem para excluir.'); return; }
        if (!confirm(`Tem certeza que deseja excluir "${charName}"?`)) return;
        const allChars = getSavedCharacters();
        delete allChars[charName];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allChars));
        alert(`"${charName}" excluído.`);
        populateCharacterList();
        loadCharacter(); 
    }

    // --- 3. Funções Exportar/Importar ---
    // (Estas funções permanecem IGUAIS às da sua versão anterior)
    function exportCharacter() { /* ...código igual ... */ 
        const charName = charSelect.value;
        if (!charName) { alert('Selecione um personagem para exportar.'); return; }
        const allChars = getSavedCharacters();
        const charData = allChars[charName];
        if (!charData) { alert('Erro: Personagem não encontrado.'); return; }
        const exportData = { name: charName, data: charData };
        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${charName}.json`; 
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    function importCharacter(event) { /* ...código igual ... */ 
        const file = event.target.files[0];
        if (!file) return;
        if (file.type !== 'application/json') { alert('Arquivo inválido. Selecione um .json'); return; }
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importData = JSON.parse(e.target.result);
                if (!importData.name || !importData.data) throw new Error('Formato inválido.');
                const charName = importData.name;
                const charData = importData.data;
                const allChars = getSavedCharacters();
                if (allChars[charName] && !confirm(`"${charName}" já existe. Sobrescrever?`)) {
                    event.target.value = null; return;
                }
                allChars[charName] = charData;
                localStorage.setItem(STORAGE_KEY, JSON.stringify(allChars));
                alert(`"${charName}" importado!`);
                populateCharacterList(); 
                charSelect.value = charName;
                loadCharacter();
            } catch (error) { alert(`Erro ao importar: ${error.message}`); }
            event.target.value = null; 
        };
        reader.readAsText(file);
    }

    // --- 4. Função Auxiliar ---
    function getSavedCharacters() {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : {};
    }

    // --- 5. LÓGICA DO AUTO-SAVE ---

    /**
     * Salva automaticamente os dados da ficha atual no localStorage.
     * SEM feedback visual (alert) para não incomodar o usuário.
     */
    function autoSaveCharacter() {
        const charName = charSelect.value;
        // SÓ salva se um personagem estiver selecionado
        if (!charName) { 
            console.log("Auto-save skipped: No character selected.");
            return; 
        }

        console.log(`Auto-saving character: ${charName}`); // Log para debug

        const allChars = getSavedCharacters();
        // Garante que o personagem existe no objeto (mesmo que vazio)
        // Pega os dados existentes para MERGE (importante!)
        const charData = allChars[charName] || {}; 

        // Re-seleciona os inputs DENTRO desta função para garantir que pegue o valor mais recente
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

        // Salva os dados atualizados do personagem de volta no objeto principal
        allChars[charName] = charData;
        // Salva tudo no localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allChars));
        
        // Opcional: Adicionar um feedback visual sutil aqui (ex: mudar a cor de um ícone)
        // console.log(`Auto-saved ${charName} at ${new Date().toLocaleTimeString()}`);
    }

    // Cria a versão "debounced" da função de auto-save (espera 1.5 segundos após a última alteração)
    const debouncedAutoSave = debounce(autoSaveCharacter, 1500);

    // --- 6. Inicialização e Event Listeners ---
    
    // Listeners dos botões manuais
    saveButton.addEventListener('click', saveCharacter);
    loadButton.addEventListener('click', loadCharacter);
    deleteButton.addEventListener('click', deleteCharacter);
    charSelect.addEventListener('change', loadCharacter); 
    exportButton.addEventListener('click', exportCharacter);
    importInput.addEventListener('change', importCharacter);

    // Listener para o AUTO-SAVE (escuta por mudanças DENTRO do formulário)
    fichaForm.addEventListener('input', (event) => {
        // Verifica se o que mudou foi um input ou textarea que queremos salvar
        if (event.target.matches('input, textarea')) {
            debouncedAutoSave(); // Chama a versão com atraso
        }
    });
    // Adiciona listener para 'change' especificamente para checkboxes, 
    // pois 'input' pode não disparar em todos os navegadores para eles
    fichaForm.addEventListener('change', (event) => {
        if (event.target.matches('input[type="checkbox"]')) {
             debouncedAutoSave();
        }
    });


    // Carrega a lista de personagens inicial
    populateCharacterList();
});