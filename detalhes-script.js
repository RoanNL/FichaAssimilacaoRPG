document.addEventListener('DOMContentLoaded', () => {

    // --- 0. Helper: Debounce Function ---
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
    const detalhesForm = document.querySelector('.detalhes-container'); // O formulário desta página
    const saveButton = document.getElementById('btn-save-char');
    const loadButton = document.getElementById('btn-load-char');
    const deleteButton = document.getElementById('btn-delete-char');
    const charSelect = document.getElementById('char-select');
    const exportButton = document.getElementById('btn-export-char');
    const importInput = document.getElementById('btn-import-char');

    // Campos desta página
    const photoInput = document.getElementById('char-photo-input');
    const photoPreview = document.getElementById('char-photo-preview');
    const charDescricao = document.getElementById('char-descricao');
    const charHabilidades = document.getElementById('char-habilidades');
    const charHistoria = document.getElementById('char-historia');

    const STORAGE_KEY = 'assim-rpg-chars'; 
    let currentPhotoData = null; 

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
        const charName = charSelect.value;
        if (!charName) { alert('Selecione um personagem para salvar.'); return; }
        const allChars = getSavedCharacters();
        const charData = allChars[charName] || {};
        charData['char-descricao'] = charDescricao.value;
        charData['char-habilidades'] = charHabilidades.value;
        charData['char-historia'] = charHistoria.value;
        if (currentPhotoData) charData['char-photo'] = currentPhotoData;
        allChars[charName] = charData;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allChars));
        alert(`Detalhes de "${charName}" salvos!`); // Feedback no save manual
    }
    function loadCharacter() { /* ...código igual ... */ 
        const charName = charSelect.value;
        if (!charName) {
            charDescricao.value = '';
            charHabilidades.value = '';
            charHistoria.value = '';
            photoPreview.src = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='; 
            currentPhotoData = null;
            return;
        }
        const allChars = getSavedCharacters();
        const charData = allChars[charName];
        if (!charData) { alert('Erro: Personagem não encontrado.'); return; }
        charDescricao.value = charData['char-descricao'] || '';
        charHabilidades.value = charData['char-habilidades'] || '';
        charHistoria.value = charData['char-historia'] || '';
        if (charData['char-photo']) {
            photoPreview.src = charData['char-photo'];
            currentPhotoData = charData['char-photo']; 
        } else {
            photoPreview.src = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
            currentPhotoData = null;
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

    // --- 4. Funções Auxiliares ---
    function getSavedCharacters() {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : {};
    }
    function handlePhotoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            currentPhotoData = e.target.result; // Armazena ANTES de mostrar
            photoPreview.src = currentPhotoData;
            debouncedAutoSave(); // CHAMA O AUTO-SAVE APÓS CARREGAR A FOTO
        };
        reader.readAsDataURL(file);
    }

     // --- 5. LÓGICA DO AUTO-SAVE (PARA DETALHES) ---

    function autoSaveCharacter() {
        const charName = charSelect.value;
        if (!charName) { 
             console.log("Auto-save skipped: No character selected.");
            return; 
        }

        console.log(`Auto-saving details for: ${charName}`); // Log para debug

        const allChars = getSavedCharacters();
        const charData = allChars[charName] || {}; 

        // Salva os campos específicos desta página
        charData['char-descricao'] = charDescricao.value;
        charData['char-habilidades'] = charHabilidades.value;
        charData['char-historia'] = charHistoria.value;
        // A foto é salva no 'currentPhotoData' pelo handlePhotoUpload e pega aqui
        if (currentPhotoData) {
            charData['char-photo'] = currentPhotoData;
        }
        
        allChars[charName] = charData;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allChars));
        // console.log(`Auto-saved details for ${charName} at ${new Date().toLocaleTimeString()}`);
    }

    // Cria a versão "debounced"
    const debouncedAutoSave = debounce(autoSaveCharacter, 1500);


    // --- 6. Inicialização e Event Listeners ---
    saveButton.addEventListener('click', saveCharacter);
    loadButton.addEventListener('click', loadCharacter);
    deleteButton.addEventListener('click', deleteCharacter);
    charSelect.addEventListener('change', loadCharacter); 
    exportButton.addEventListener('click', exportCharacter);
    importInput.addEventListener('change', importCharacter);

    // Listener para o upload da foto (chama o auto-save internamente)
    photoInput.addEventListener('change', handlePhotoUpload); 

    // Listener para o AUTO-SAVE (escuta por digitação nos textareas)
    detalhesForm.addEventListener('input', (event) => {
        if (event.target.matches('textarea')) {
            debouncedAutoSave();
        }
    });

    populateCharacterList();

    // --- Lógica do Modal da Foto (sem alterações) ---
    const modal = document.getElementById('photo-modal');
    const modalImg = document.getElementById('modal-image');
    const previewImg = document.getElementById('char-photo-preview');
    const closeBtn = document.getElementById('modal-close-button');
    if (modal && modalImg && previewImg && closeBtn) { // Verifica se elementos existem
        previewImg.onclick = function() {
            if (previewImg.src && !previewImg.src.startsWith('data:image/gif')) { 
                modal.classList.add('show');
                modalImg.src = this.src;
            }
        }
        closeBtn.onclick = function() { modal.classList.remove('show'); }
        modal.onclick = function(event) {
            if (event.target === modal) { modal.classList.remove('show'); }
        }
    } else {
        console.error("Elementos do modal não encontrados!");
    }

}); // Fim do 'DOMContentLoaded'