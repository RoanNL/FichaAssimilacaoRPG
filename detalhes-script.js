document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Seleção dos Elementos ---
    const saveButton = document.getElementById('btn-save-char');
    const loadButton = document.getElementById('btn-load-char');
    const deleteButton = document.getElementById('btn-delete-char');
    const charSelect = document.getElementById('char-select');

    // NOVOS ELEMENTOS
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
        const charName = charSelect.value;
        if (!charName) {
            alert('Por favor, selecione um personagem para salvar os detalhes.');
            return;
        }
        const allChars = getSavedCharacters();
        const charData = allChars[charName] || {};

        // Adiciona/atualiza os dados DESTA página
        charData['char-descricao'] = charDescricao.value;
        charData['char-habilidades'] = charHabilidades.value;
        charData['char-historia'] = charHistoria.value;
        
        if (currentPhotoData) {
            charData['char-photo'] = currentPhotoData;
        }
        
        allChars[charName] = charData;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allChars));
        alert(`Detalhes de "${charName}" salvos com sucesso!`);
    }

    function loadCharacter() {
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

        if (!charData) {
            alert('Erro: Personagem não encontrado.');
            return;
        }

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

    // --- 3. NOVAS FUNÇÕES: EXPORTAR E IMPORTAR (IDÊNTICAS AO 'ficha-script.js') ---

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

    function importCharacter(event) {
        const file = event.target.files[0];
        if (!file) return;
        if (file.type !== 'application/json') {
            alert('Tipo de arquivo inválido. Por favor, selecione um arquivo .json');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const jsonString = e.target.result;
                const importData = JSON.parse(jsonString);
                if (!importData.name || !importData.data) {
                    throw new Error('Formato de arquivo inválido. O JSON deve conter "name" e "data".');
                }
                const charName = importData.name;
                const charData = importData.data;
                const allChars = getSavedCharacters();
                if (allChars[charName]) {
                    if (!confirm(`Um personagem com o nome "${charName}" já existe. Deseja sobrescrevê-lo?`)) {
                        event.target.value = null;
                        return;
                    }
                }
                allChars[charName] = charData;
                localStorage.setItem(STORAGE_KEY, JSON.stringify(allChars));
                alert(`Personagem "${charName}" importado com sucesso!`);
                populateCharacterList();
                charSelect.value = charName;
                loadCharacter(); // Carrega os detalhes do personagem importado
            } catch (error) {
                alert(`Erro ao importar o arquivo: ${error.message}`);
            }
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
            const base64String = e.target.result;
            photoPreview.src = base64String;
            currentPhotoData = base64String;
        };
        reader.readAsDataURL(file);
    }

    // --- 5. Inicialização ---
    saveButton.addEventListener('click', saveCharacter);
    loadButton.addEventListener('click', loadCharacter);
    deleteButton.addEventListener('click', deleteCharacter);
    photoInput.addEventListener('change', handlePhotoUpload);
    charSelect.addEventListener('change', loadCharacter);

    // NOVOS EVENTOS
    exportButton.addEventListener('click', exportCharacter);
    importInput.addEventListener('change', importCharacter);

    populateCharacterList();
    // --- 5. LÓGICA DO MODAL DA FOTO ---
    
    const modal = document.getElementById('photo-modal');
    const modalImg = document.getElementById('modal-image');
    const previewImg = document.getElementById('char-photo-preview');
    const closeBtn = document.getElementById('modal-close-button');

    // Abre o modal quando a imagem de preview é clicada
    previewImg.onclick = function() {
        // Só abre se a imagem não for a padrão (vazia)
        if (previewImg.src && !previewImg.src.startsWith('data:image/gif')) { 
            modal.classList.add('show');
            modalImg.src = this.src;
        }
    }

    // Fecha o modal quando o botão (X) é clicado
    closeBtn.onclick = function() {
        modal.classList.remove('show');
    }

    // Fecha o modal quando se clica fora da imagem (no overlay)
    modal.onclick = function(event) {
        if (event.target === modal) { // Verifica se o clique foi no fundo
            modal.classList.remove('show');
        }
    }

}); // Fim do 'DOMContentLoaded'
