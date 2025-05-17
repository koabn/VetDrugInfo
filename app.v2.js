let tg = window.Telegram.WebApp;
let vetlekData = [];
let vidalData = [];
let drugsData = []; // объединённый массив для поиска
let currentDrug = null;
let currentSource = null; // 'vetlek' или 'vidal'
let drugsHtml = null; // для VetLek HTML

// DOM-элементы (инициализируются после DOMContentLoaded)
let searchInput, confirmationSection, drugOptions, drugInfo, drugContent, errorDiv, loadingDiv, selectAllBtn, clearBtn, categoryCheckboxes, searchButton, reportErrorBtn, backButton, drugList, resultsSection;

// Функция инициализации обработчиков категорий
function initializeCategoryHandlers() {
    console.log('Инициализация обработчиков категорий...');
    const selectAllBtn = document.getElementById('selectAllCategories');
    const clearBtn = document.getElementById('clearCategories');
    const categoryCheckboxes = document.querySelectorAll('input[name="category"]');

    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', () => {
            categoryCheckboxes.forEach(checkbox => checkbox.checked = true);
            if (currentDrug) displayFilteredDrugInfo(currentDrug);
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            categoryCheckboxes.forEach(checkbox => checkbox.checked = false);
            if (currentDrug) displayFilteredDrugInfo(currentDrug);
        });
    }

    categoryCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            if (currentDrug) displayFilteredDrugInfo(currentDrug);
        });
    });
}

// Загрузка обеих баз
async function loadAllBases() {
    try {
        showLoadingMessage('Загрузка баз препаратов...');
        const [vetlekResp, vidalResp] = await Promise.all([
            fetch('api/all_drugs.json'),
            fetch('api/drugs.json')
        ]);
        vetlekData = await vetlekResp.json();
        vidalData = await vidalResp.json();
        hideLoadingMessage();
    } catch (error) {
        hideLoadingMessage();
        showErrorMessage(`Не удалось загрузить базы: ${error.message}`);
    }
}

// Универсальный поиск по обеим базам
function searchAllDrugs(query) {
    const normalizedQuery = normalizeText(query);
    const vetlekResults = vetlekData.filter(drug => {
        if (normalizeText(drug.name).includes(normalizedQuery)) return true;
        for (const section of Object.values(drug.sections || {})) {
            if (normalizeText(section).includes(normalizedQuery)) return true;
        }
        return false;
    });
    const vidalResults = vidalData.filter(drug => {
        if (normalizeText(drug.name).includes(normalizedQuery)) return true;
        if (drug.description && normalizeText(drug.description).includes(normalizedQuery)) return true;
        if (drug.summary && normalizeText(drug.summary).includes(normalizedQuery)) return true;
        return false;
    });
    // Сопоставление по названию (ключ — нормализованное имя)
    const resultsMap = new Map();
    vetlekResults.forEach(drug => {
        resultsMap.set(normalizeText(drug.name), { vetlek: drug });
    });
    vidalResults.forEach(drug => {
        const key = normalizeText(drug.name);
        if (resultsMap.has(key)) {
            resultsMap.get(key).vidal = drug;
        } else {
            resultsMap.set(key, { vidal: drug });
        }
    });
    return Array.from(resultsMap.values());
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', async () => {
    getDomElements();
    try {
        tg.ready();
        tg.setHeaderColor('secondary_bg_color');
        tg.MainButton.hide();
        setThemeColors();
        await loadAllBases();
        initializeCategoryHandlers();
        setupEventHandlers();
        // Для начального экрана можно показать все препараты из обеих баз
        // displayFilteredDrugs(searchAllDrugs(''));
    } catch (error) {
        showErrorMessage('Не удалось инициализировать приложение');
    }
});

function setupEventHandlers() {
    if (searchInput && searchButton) {
        searchInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                startSearch();
            }
        });
        searchButton.addEventListener('click', (event) => {
            event.preventDefault();
            startSearch();
        });
    } else {
        if (!searchInput) console.error('searchInput не найден!');
        if (!searchButton) console.error('searchButton не найден!');
    }
    if (backButton) {
        backButton.addEventListener('click', goBack);
    } else {
        console.error('backButton не найден!');
    }
    if (reportErrorBtn) {
        reportErrorBtn.addEventListener('click', reportError);
    } else {
        console.error('reportErrorBtn не найден!');
    }
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            clearSearch();
        }
    });
    // Для модального окна ошибки
    const errorModalCloseBtn = safeGetElement('#errorModal .close-modal');
    if (errorModalCloseBtn) errorModalCloseBtn.addEventListener('click', closeErrorModal);
    const errorSubmitBtn = safeGetElement('#errorModal .form-submit');
    if (errorSubmitBtn) errorSubmitBtn.addEventListener('click', (e) => { e.preventDefault(); sendErrorReport(); });
    const errorModal = safeGetById('errorModal');
    if (errorModal) errorModal.addEventListener('click', (e) => { if (e.target.id === 'errorModal') closeErrorModal(); });
    const errorForm = safeGetById('errorForm');
    if (errorForm) errorForm.addEventListener('submit', (e) => { e.preventDefault(); sendErrorReport(); });

    // Скрытие предложений при клике вне блока
    if (drugOptions && searchInput) {
        document.addEventListener('click', (e) => {
            if (!drugOptions.contains(e.target) && e.target !== searchInput) {
                drugOptions.style.display = 'none';
            }
        });
    }
}

// Настраиваем тему в зависимости от темы Telegram
function setThemeColors() {
    // Получаем тему из Telegram
    const isDarkTheme = tg.colorScheme === 'dark';
    document.documentElement.classList.toggle('dark-theme', isDarkTheme);
    
    // Применяем цвета из Telegram
    document.documentElement.style.setProperty('--tg-theme-bg-color', tg.backgroundColor);
    document.documentElement.style.setProperty('--tg-theme-text-color', tg.textColor);
    document.documentElement.style.setProperty('--tg-theme-hint-color', tg.hint_color);
    document.documentElement.style.setProperty('--tg-theme-link-color', tg.linkColor);
    document.documentElement.style.setProperty('--tg-theme-button-color', tg.buttonColor);
    document.documentElement.style.setProperty('--tg-theme-button-text-color', tg.buttonTextColor);
    document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', tg.secondaryBackgroundColor);
}

// Получаем элементы интерфейса
function getDomElements() {
    searchInput = document.getElementById('searchInput');
    confirmationSection = document.getElementById('confirmation-section');
    drugOptions = document.getElementById('drug-options');
    drugInfo = document.getElementById('drug-info');
    drugContent = document.getElementById('drug-content');
    errorDiv = document.getElementById('error');
    loadingDiv = document.getElementById('loading');
    selectAllBtn = document.getElementById('selectAllCategories');
    clearBtn = document.getElementById('clearCategories');
    categoryCheckboxes = document.querySelectorAll('input[name="category"]');
    searchButton = document.querySelector('.search-button');
    reportErrorBtn = document.getElementById('reportError');
    backButton = document.getElementById('backButton');
    drugList = document.getElementById('drug-list');
    resultsSection = document.getElementById('results');
}

function safeGetElement(selector) {
    const el = document.querySelector(selector);
    if (!el) {
        console.error(`Элемент ${selector} не найден!`);
    }
    return el;
}

function safeGetById(id) {
    const el = document.getElementById(id);
    if (!el) {
        console.error(`Элемент #${id} не найден!`);
    }
    return el;
}

// Функция возврата на главный экран
function goBack() {
    // Скрываем информацию о препарате
    const drugInfo = document.getElementById('drug-info');
    if (drugInfo) {
        drugInfo.style.display = 'none';
        drugInfo.classList.remove('visible');
    }

    // Показываем результаты поиска
    const resultsSection = document.getElementById('results');
    if (resultsSection) {
        resultsSection.style.display = 'block';
        resultsSection.classList.add('visible');
    }

    // Скрываем кнопку "Назад"
    hideBackButton();
}

// Поиск по обеим базам
async function startSearch() {
    const query = searchInput.value.trim();
    if (!query) {
        showErrorMessage('Введите название препарата');
        return;
    }
    showLoadingMessage('Поиск препаратов...');
    try {
        const results = searchAllDrugs(query);
        displayFilteredDrugs(results);
        showBackButton();
    } catch (error) {
        showErrorMessage('Произошла ошибка при поиске препаратов');
    } finally {
        hideLoadingMessage();
    }
}

// Отображение результатов поиска
function displayFilteredDrugs(results) {
    const drugList = document.getElementById('drug-list');
    if (!drugList) return;
    drugList.innerHTML = '';
    if (!results || results.length === 0) {
        drugList.innerHTML = '<div class="no-results">Ничего не найдено</div>';
        return;
    }
    results.forEach((item, idx) => {
        const name = item.vetlek ? item.vetlek.name : item.vidal.name;
        const drugDiv = document.createElement('div');
        drugDiv.className = 'drug-option';
        drugDiv.innerHTML = `<h3>${name}</h3>`;
        drugDiv.addEventListener('click', () => {
            displayDrugInfoMulti(item);
        });
        drugList.appendChild(drugDiv);
    });
    resultsSection.style.display = 'block';
    resultsSection.classList.add('visible');
}

// Отображение информации о препарате с двумя источниками
function displayDrugInfoMulti(item) {
    // item: { vetlek, vidal }
    currentDrug = item.vetlek || item.vidal;
    currentSource = item.vetlek ? 'vetlek' : 'vidal';
    // ...очистка и подготовка контейнера...
    const drugInfo = document.getElementById('drug-info');
    const drugContent = document.getElementById('drug-content');
    drugInfo.style.display = 'block';
    drugContent.innerHTML = '';
    // Кнопки источников
    let sourceBtns = '';
    if (item.vetlek && item.vidal) {
        sourceBtns = `<div class="source-selector">
            <button class="source-button${currentSource==='vetlek'?' active':''}" onclick="window.switchDrugSource('vetlek')">VetLek</button>
            <button class="source-button${currentSource==='vidal'?' active':''}" onclick="window.switchDrugSource('vidal')">Vidal</button>
        </div>`;
    }
    drugContent.innerHTML = `
        <h2>${currentDrug.name}</h2>
        ${sourceBtns}
        <div id="drug-info-content"></div>
    `;
    // Сохраняем текущие данные для переключения
    window._currentDrugItem = item;
    window._currentSource = currentSource;
    renderDrugInfoContent(item, currentSource);
}

// Функция для переключения источника
window.switchDrugSource = function(source) {
    const item = window._currentDrugItem;
    window._currentSource = source;
    renderDrugInfoContent(item, source);
    // Обновить активную кнопку
    document.querySelectorAll('.source-button').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.toLowerCase() === source.toLowerCase());
    });
};

// Рендер информации о препарате по источнику
function renderDrugInfoContent(item, source) {
    const drug = source === 'vetlek' ? item.vetlek : item.vidal;
    const contentDiv = document.getElementById('drug-info-content');
    if (!drug || !contentDiv) return;
    contentDiv.innerHTML = '';
    if (source === 'vetlek') {
        // VetLek: выводим все ключевые разделы и таблицы
        const sectionTitles = {
            composition: 'Состав',
            pharmacology: 'Фармакологические свойства',
            indications: 'Показания',
            usage: 'Порядок применения',
            side_effects: 'Побочные действия',
            contraindications: 'Противопоказания',
            storage: 'Условия хранения',
            manufacturer: 'Производитель',
            general: 'Общие сведения',
        };
        for (const [key, title] of Object.entries(sectionTitles)) {
            if (drug.sections && drug.sections[key]) {
                contentDiv.innerHTML += `<h3>${title}</h3><div>${drug.sections[key]}</div>`;
            }
        }
        // Таблица дозировки
        if (drug.dosage_table && Array.isArray(drug.dosage_table)) {
            contentDiv.innerHTML += '<h3>Дозировка (таблица)</h3>' + renderDosageTable(drug.dosage_table);
        }
        // Другие таблицы
        if (drug.tables && Array.isArray(drug.tables) && drug.tables.length > 0) {
            contentDiv.innerHTML += '<h3>Другие таблицы</h3>';
            drug.tables.forEach(table => {
                contentDiv.innerHTML += renderDosageTable(table);
            });
        }
    } else if (source === 'vidal') {
        // Vidal: старый формат
        const fields = [
            { key: 'description', title: 'Описание' },
            { key: 'composition', title: 'Состав' },
            { key: 'indications', title: 'Показания' },
            { key: 'dosage', title: 'Дозировка' },
            { key: 'side_effects', title: 'Побочные эффекты' },
            { key: 'contraindications', title: 'Противопоказания' },
            { key: 'storage', title: 'Условия хранения' },
        ];
        fields.forEach(f => {
            if (drug[f.key]) {
                contentDiv.innerHTML += `<h3>${f.title}</h3><div>${drug[f.key]}</div>`;
            }
        });
    }
}

// Рендер таблицы дозировки
function renderDosageTable(table) {
    if (!Array.isArray(table) || table.length === 0) return '';
    let html = '<table class="dosage-table"><thead><tr>';
    const headers = Object.keys(table[0]);
    headers.forEach(h => { html += `<th>${h}</th>`; });
    html += '</tr></thead><tbody>';
    table.forEach(row => {
        html += '<tr>';
        headers.forEach(h => { html += `<td>${row[h] || ''}</td>`; });
        html += '</tr>';
    });
    html += '</tbody></table>';
    return html;
}

// Функция для отображения информации о препарате
async function displayDrugInfo_global(drug) {
    console.log('Отображение информации о препарате:', drug.name);
    if (!drug) return;

    // Сохраняем текущий препарат
    currentDrug = drug;
    
    // Определяем источник и тип данных
    const { source, dataType } = getDrugDataInfo(drug);
    console.log(`Источник данных: ${source}, тип данных: ${dataType}`);

    // Проверяем и получаем необходимые элементы
    const resultsSection = document.getElementById('results');
    const searchResults = document.getElementById('search-results');
    
    // Сначала удаляем старую секцию drug-info
    const oldDrugInfoSection = document.getElementById('drug-info');
    if (oldDrugInfoSection) {
        oldDrugInfoSection.remove();
    }
    
    // Создаем новую секцию
    const drugInfoSection = document.createElement('div');
    drugInfoSection.id = 'drug-info';
    drugInfoSection.className = 'drug-info-section';
    
    // Создаем заголовок с кнопками источников
    const drugHeader = document.createElement('div');
    drugHeader.className = 'drug-header';
    drugHeader.innerHTML = `
        <div class="back-button" onclick="backToSearch()">← Назад к поиску</div>
        <h2>${drug.name}</h2>
        <div class="source-selector">
            <button class="source-button active" data-source="vetlek" onclick="switchSource('vetlek')">VetLek</button>
            <button class="source-button" data-source="vidal" onclick="switchSource('vidal')">Vidal</button>
        </div>
    `;

    // Создаем контейнер для контента
    const drugInfoContent = document.createElement('div');
    drugInfoContent.className = 'drug-info-content';
    
    // Добавляем элементы в структуру
    drugInfoSection.appendChild(drugHeader);
    drugInfoSection.appendChild(drugInfoContent);
    
    // Скрываем результаты поиска
    if (resultsSection) {
        resultsSection.style.display = 'none';
        resultsSection.classList.remove('visible');
    }
    if (searchResults) {
        searchResults.style.display = 'none';
    }
    
    // Добавляем секцию в контейнер
    const container = document.querySelector('.container');
    if (container) {
        container.appendChild(drugInfoSection);
        drugInfoSection.style.display = 'block';
        drugInfoSection.classList.add('visible');
        
        // По умолчанию показываем данные из соответствующего источника
        if (source === 'vetlek') {
            await displayVetlekData();
        } else {
            displayVidalData();
        }
    }
}

// Функция для переключения источника данных
async function switchSource(source) {
    console.log('Переключение на источник:', source);
    
    // Обновляем активную кнопку
    document.querySelectorAll('.source-button').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-source') === source);
    });
    
    const { source: drugSource, dataType } = getDrugDataInfo(currentDrug);
    
    // Отображаем данные из выбранного источника
    if (source === 'vetlek') {
        if (drugSource === 'json') {
            displayJsonOnlyDrug(document.querySelector('.drug-info-content'));
        } else {
            await displayVetlekData();
        }
    } else if (source === 'vidal') {
        if (drugSource === 'json' || dataType !== 'none') {
            displayVidalData();
        } else {
            const contentContainer = document.querySelector('#drug-info .drug-info-content');
            if (contentContainer) {
                contentContainer.className = 'drug-info-content vidal-source';
                contentContainer.innerHTML = `
                    <div class="drug-content-wrapper">
                        <h1>${currentDrug.name}</h1>
                        <div class="no-data-message">
                            <p>Информация из источника Vidal недоступна для данного препарата.</p>
                        </div>
                    </div>
                `;
            }
        }
    }
}

// Функция для отображения данных только из JSON
function displayJsonOnlyDrug(container) {
    if (!currentDrug) return;
    
    console.log('Отображение данных из JSON для препарата:', currentDrug.name);
    
    // Очищаем контейнер
    container.innerHTML = '';
    container.className = 'drug-info-content json-source';
    
    // Создаем обертку для контента
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'drug-content-wrapper';
    
    // Получаем информацию о типе данных
    const { dataType } = getDrugDataInfo(currentDrug);
    
    // Формируем структуру данных для отображения
    const sections = [
        {
            title: 'Описание',
            content: currentDrug.description || currentDrug.summary,
            condition: currentDrug.description || currentDrug.summary
        },
        {
            title: 'Состав',
            content: currentDrug.composition,
            condition: currentDrug.composition,
            className: 'composition'
        },
        {
            title: 'Информация о производителе',
            content: currentDrug.manufacturer_info && Object.entries(currentDrug.manufacturer_info)
                .filter(([key, value]) => value)
                .map(([key, value]) => {
                    const label = {
                        manufacturer: 'Производитель',
                        manufacturer_country: 'Страна',
                        registration_holder: 'Держатель регистрационного удостоверения',
                        registration_holder_country: 'Страна держателя'
                    }[key];
                    return label ? `<p><strong>${label}:</strong> ${value}</p>` : '';
                }).join(''),
            condition: currentDrug.manufacturer_info
        },
        {
            title: 'Механизм действия',
            content: currentDrug.mechanism,
            condition: currentDrug.mechanism,
            className: 'mechanism'
        },
        {
            title: 'Показания к применению',
            content: currentDrug.indications,
            condition: currentDrug.indications,
            className: 'field-content'
        },
        {
            title: 'Противопоказания',
            content: currentDrug.contraindications,
            condition: currentDrug.contraindications,
            className: 'field-content'
        },
        {
            title: 'Дозировка и способ применения',
            content: currentDrug.dosage,
            condition: currentDrug.dosage,
            className: 'field-content'
        },
        {
            title: 'Побочные эффекты',
            content: currentDrug.side_effects,
            condition: currentDrug.side_effects,
            className: 'field-content'
        },
        {
            title: 'Условия хранения',
            content: currentDrug.storage,
            condition: currentDrug.storage,
            className: 'field-content'
        },
        {
            title: 'Срок годности',
            content: currentDrug.shelf_life,
            condition: currentDrug.shelf_life,
            className: 'field-content'
        }
    ];
    
    // Добавляем заголовок и латинское название
    let html = `<h1>${currentDrug.name}</h1>`;
    
    const latinNameMatch = currentDrug.name.match(/\(([^)]+)\)/);
    if (latinNameMatch) {
        html += `<p class="latin-name">${latinNameMatch[1]}</p>`;
    } else if (currentDrug.latin_name) {
        html += `<p class="latin-name">${currentDrug.latin_name}</p>`;
    }
    
    // Добавляем основную информацию
    let hasContent = false;
    sections.forEach(section => {
        if (section.condition) {
            hasContent = true;
            html += `<h2>${section.title}</h2>`;
            if (section.className) {
                html += `<div class="${section.className}">${section.content}</div>`;
            } else {
                html += section.content;
            }
        }
    });
    
    // Если данных мало, добавляем информационное сообщение
    if (!hasContent && dataType === 'minimal') {
        html += `
            <div class="minimal-info-message">
                <p>Для препарата "${currentDrug.name}" доступна только базовая информация.</p>
                <p>Для получения полной инструкции обратитесь к ветеринарному специалисту.</p>
            </div>
        `;
    }
    
    contentWrapper.innerHTML = html;
    container.appendChild(contentWrapper);
}

// Функция для отображения данных из Vidal
function displayVidalData() {
    const contentContainer = document.querySelector('#drug-info .drug-info-content');
    if (!contentContainer || !currentDrug) return;

    try {
        contentContainer.className = 'drug-info-content vidal-source';
        contentContainer.innerHTML = '';

        // Создаем структурированное отображение данных
        const sections = [
            { title: 'Общая информация', content: currentDrug.description || currentDrug.summary },
            { title: 'Состав', content: currentDrug.composition },
            { title: 'Показания к применению', content: currentDrug.indications },
            { title: 'Противопоказания', content: currentDrug.contraindications },
            { title: 'Способ применения', content: currentDrug.dosage },
            { title: 'Побочные эффекты', content: currentDrug.side_effects },
            { title: 'Условия хранения', content: currentDrug.storage }
        ];

        // Создаем обертку для контента
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'drug-content-wrapper';
        
        // Добавляем заголовок
        contentWrapper.innerHTML = `<h1>${currentDrug.name}</h1>`;
        
        // Проверяем наличие латинского названия
        const latinNameMatch = currentDrug.name.match(/\(([^)]+)\)/);
        if (latinNameMatch) {
            contentWrapper.innerHTML += `<p class="latin-name">${latinNameMatch[1]}</p>`;
        } else if (currentDrug.latin_name) {
            contentWrapper.innerHTML += `<p class="latin-name">${currentDrug.latin_name}</p>`;
        }

        // Получаем информацию о типе данных
        const { dataType } = getDrugDataInfo(currentDrug);

        // Добавляем секции с данными
        let hasContent = false;
        sections.forEach(section => {
            if (section.content) {
                hasContent = true;
                const sectionDiv = document.createElement('div');
                sectionDiv.className = 'drug-section';
                sectionDiv.innerHTML = `
                    <h3 class="section-title">${section.title}</h3>
                    <div class="section-content">${section.content}</div>
                `;
                contentWrapper.appendChild(sectionDiv);
            }
        });

        // Если данных мало, показываем соответствующее сообщение
        if (!hasContent) {
            if (dataType === 'minimal') {
                contentWrapper.innerHTML += `
                    <div class="minimal-info-message">
                        <p>Для препарата "${currentDrug.name}" доступна только базовая информация.</p>
                        <p>Для получения полной инструкции обратитесь к ветеринарному специалисту.</p>
                    </div>
                `;
            } else {
                contentWrapper.innerHTML += `
                    <div class="no-data-message">
                        <p>Информация из источника Vidal недоступна для данного препарата.</p>
                    </div>
                `;
            }
        }

        contentContainer.appendChild(contentWrapper);
    } catch (error) {
        console.error('Ошибка при отображении данных Vidal:', error);
        contentContainer.innerHTML = `
            <div class="drug-content-wrapper">
                <div class="error-message">Ошибка при загрузке данных: ${error.message}</div>
            </div>
        `;
    }
}

// Единая функция нормализации названий препаратов
function normalizeText(text) {
    if (!text) return '';
    return text.toLowerCase()
              .replace(/®/g, '')           // удаляем знак регистрации
              .replace(/&/g, 'и')          // заменяем & на и
              .replace(/\s+/g, '')         // удаляем все пробелы
              .replace(/-/g, '')           // удаляем дефисы
              .replace(/к\s*и\s*с/g, 'кис')// обработка "к&с" -> "кис"
              .replace(/[^a-zа-я0-9]/g, ''); // оставляем только буквы и цифры
}

// Функция определения источника и типа данных препарата
function getDrugDataInfo(drug) {
    if (!drug) return { source: null, dataType: 'none' };

    // Определяем источник данных
    let source = 'unknown';
    if (drug.html || drug.vetlek_id || drug.vetlek_content) {
        source = 'vetlek';
    } else if (drug.source === 'json' || drug.json_source) {
        source = 'json';
    }

    // Определяем тип данных
    let dataType = 'minimal';
    const hasDetailedInfo = Boolean(
        drug.composition || 
        drug.indications || 
        drug.mechanism || 
        drug.dosage || 
        drug.side_effects || 
        drug.contraindications
    );
    const hasBasicInfo = Boolean(
        (drug.summary && drug.summary.length > 10) || 
        (drug.description && drug.description.length > 10)
    );

    if (hasDetailedInfo) {
        dataType = 'full';
    } else if (hasBasicInfo) {
        dataType = 'basic';
    }

    return { source, dataType };
}

// Функция для отображения модального окна сообщения об ошибке
async function reportError() {
    const errorModal = document.getElementById('errorModal');
    
    // Устанавливаем имя текущего препарата
    if (currentDrug && currentDrug.name) {
        const errorDrugNameElement = document.getElementById('errorDrugName');
        if (errorDrugNameElement) {
            errorDrugNameElement.textContent = currentDrug.name;
        }
    }
    
    errorModal.style.display = 'flex';
    setTimeout(() => {
        errorModal.classList.add('visible');
    }, 10);
}

// Функция закрытия модального окна
function closeErrorModal() {
    const errorModal = document.getElementById('errorModal');
    errorModal.classList.remove('visible');
    setTimeout(() => {
        errorModal.style.display = 'none';
        document.getElementById('errorComment').value = '';
    }, 300);
}

// Функция для отправки сообщения об ошибке
async function sendErrorReport() {
    const comment = document.getElementById('errorComment').value.trim();
    if (!comment) {
        tg.showAlert('Пожалуйста, опишите проблему');
        return;
    }

    const userData = tg.initDataUnsafe;
    let errorData = {
        date: new Date().toLocaleString(),
        user: userData?.user?.username || 'Не указан',
        userId: userData?.user?.id || 'Не доступен',
        context: currentDrug ? `Препарат: ${currentDrug.name}` : 'Поиск',
        comment: comment
    };

    try {
        // Используем Telegram WebApp для отправки сообщения боту
        const drugName = currentDrug ? encodeURIComponent(currentDrug.name) : 'unknown';
        window.Telegram.WebApp.openTelegramLink(`https://t.me/vetaptekibot?start=report_${drugName}_${encodeURIComponent(comment)}`);
        
        closeErrorModal();

        // Создаем и показываем уведомление
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = 'Спасибо! Сообщение об ошибке отправлено.';
        document.body.appendChild(notification);

        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
        
    } catch (error) {
        console.error('Ошибка при отправке сообщения:', error);
        tg.showAlert('Извините, не удалось отправить сообщение об ошибке.');
    }
}

function showBackButton() {
    const backButton = document.getElementById('backButton');
    const header = document.querySelector('.app-header');
    
    // Плавно скрываем заголовок
    header.classList.add('hidden');
    
    // После начала анимации заголовка показываем кнопку
    setTimeout(() => {
        backButton.style.display = 'flex';
        requestAnimationFrame(() => {
            backButton.classList.add('visible');
        });
    }, 250);
}

function hideBackButton() {
    const backButton = document.getElementById('backButton');
    const header = document.querySelector('.app-header');
    
    // Сначала скрываем кнопку
    backButton.classList.remove('visible');
    
    // После завершения анимации кнопки показываем заголовок
    setTimeout(() => {
        backButton.style.display = 'none';
        requestAnimationFrame(() => {
            header.classList.remove('hidden');
        });
    }, 250);
}

// Добавляем обработчик клавиши Escape для закрытия модального окна
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const modal = document.getElementById('drugInfoModal');
        if (modal.style.display === 'flex') {
            modal.style.display = 'none';
        }
    }
});

// Обновляем функцию initApp, удаляя инициализацию фильтров
function initApp() {
    // Настройка базовых элементов интерфейса
    console.log('Инициализация приложения...');
    
    // Применяем тему
    setThemeColors();
    
    // Проверяем, есть ли неопределенные функции
    if (typeof loadData !== 'function') {
        console.warn('Функция loadData не определена, используем вместо нее loadDrugsData');
        window.loadData = loadDrugsData;
    }
    
    if (typeof setupSearch !== 'function') {
        console.warn('Функция setupSearch не определена, создаем заглушку');
        window.setupSearch = function() {
            console.log('Настройка поиска выполнена');
        };
    }
    
    if (typeof setupCategories !== 'function') {
        console.warn('Функция setupCategories не определена, создаем заглушку');
        window.setupCategories = function() {
            console.log('Настройка категорий выполнена');
        };
    }
    
    if (typeof displayFilteredDrugs !== 'function') {
        console.warn('Функция displayFilteredDrugs не определена, создаем заглушку');
        window.displayFilteredDrugs = function(drugs) {
            console.log(`Отображение ${drugs ? drugs.length : 0} препаратов`);
        };
    }
}

// Удаляю функции для работы с фильтрами (их содержимое закомментировано)
/*
function initMedicationFilters() {
    // Код функции удален
}

function smoothScrollTo(element) {
    // Код функции удален
}

function applyMedicationFilter(filterType) {
    // Код функции удален
}

function searchAllDrugs(filterType) {
    // Код функции удален
}

function saveActiveFilter(filterType) {
    // Код функции удален
}

function loadActiveFilter() {
    // Код функции удален
}
*/

async function loadDrugsFromHtml() {
    try {
        console.log('Загрузка данных из HTML...');
        const response = await fetch('api/all_drugs.html');
        if (!response.ok) {
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }

        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const articles = doc.querySelectorAll('article');
        
        console.log(`Найдено ${articles.length} препаратов в HTML`);
        
        return Array.from(articles).map(article => {
            return {
                id: article.id,
                name: article.querySelector('h1, h2')?.textContent.trim() || 'Без названия',
                html: article.innerHTML,
                source: 'html'
            };
        });
    } catch (error) {
        console.error('Ошибка при загрузке HTML:', error);
        return [];
    }
}

// Функция для извлечения содержимого секции
function extractSection(article, sectionTitle) {
    const headers = Array.from(article.querySelectorAll('h3, h4'));
    const header = headers.find(h => h.textContent.trim().toLowerCase().includes(sectionTitle.toLowerCase()));
    
    if (!header) return null;
    
    let content = '';
    let nextElement = header.nextElementSibling;
    
    while (nextElement && !['H3', 'H4'].includes(nextElement.tagName)) {
        content += nextElement.textContent.trim() + ' ';
        nextElement = nextElement.nextElementSibling;
    }
    
    return content.trim();
}

// Функция для создания индекса препаратов
async function createDrugsIndex(html) {
    console.log('Создание индекса препаратов...');
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const articles = doc.querySelectorAll('article');
    
    const drugsIndex = {
        drugs: []
    };
    
    articles.forEach(article => {
        // Получаем ID статьи
        const id = article.id;
        
        // Ищем название в первом параграфе с strong или b
        const titleElement = article.querySelector('p strong, p b, strong, b');
        let name = '';
        
        if (titleElement) {
            name = titleElement.textContent.trim();
        } else {
            // Если не нашли в strong/b, берем текст первого параграфа
            const firstP = article.querySelector('p');
            if (firstP) {
                name = firstP.textContent.trim();
            }
        }
        
        // Если имя найдено, добавляем в индекс
        if (name) {
            // Создаем ключевые слова из имени
            const keywords = name.toLowerCase().split(/[\s,.-]+/);
            
            // Находим позиции разделов в HTML
            const sections = {};
            const html = article.innerHTML;
            
            // Ищем основные разделы по ключевым словам
            const sectionKeywords = {
                'composition': ['состав', 'описание'],
                'indications': ['показания', 'назначение'],
                'contraindications': ['противопоказания'],
                'dosage': ['способ применения', 'дозы', 'дозировка'],
                'storage': ['условия хранения', 'хранение'],
                'manufacturer': ['производитель', 'произведено']
            };
            
            for (const [section, words] of Object.entries(sectionKeywords)) {
                for (const word of words) {
                    const index = html.toLowerCase().indexOf(word);
                    if (index !== -1) {
                        sections[section] = `start:${index}`;
                        break;
                    }
                }
            }
            
            drugsIndex.drugs.push({
                id,
                name,
                keywords,
                sections
            });
        }
    });
    
    console.log(`Создан индекс для ${drugsIndex.drugs.length} препаратов`);
    return drugsIndex;
}

function showLoadingMessage(message = 'Загрузка данных...') {
    const loadingMessage = document.querySelector('.loading-message');
    if (loadingMessage) {
        loadingMessage.textContent = message;
        loadingMessage.style.display = 'block';
    }
}

function hideLoadingMessage() {
    const loadingMessage = document.querySelector('.loading-message');
    if (loadingMessage) {
        loadingMessage.style.display = 'none';
    }
}

function showErrorMessage(message) {
    const errorMessage = document.querySelector('.error-message');
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        
        // Автоматически скрываем сообщение об ошибке через 5 секунд
        setTimeout(() => {
            hideErrorMessage();
        }, 5000);
    }
}

function hideErrorMessage() {
    const errorMessage = document.querySelector('.error-message');
    if (errorMessage) {
        errorMessage.style.display = 'none';
    }
}

function showMessage(message, type = 'info') {
    hideLoadingMessage();
    hideErrorMessage();
    
    if (type === 'error') {
        showErrorMessage(message);
    } else {
        // Можно добавить другие типы сообщений в будущем
        console.log(message);
    }
}

// Функция для очистки HTML от изображений
function cleanHtmlFromImages(html) {
    if (!html) return '';
    
    // Создаем временный div для работы с HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Удаляем все изображения
    tempDiv.querySelectorAll('img').forEach(img => img.remove());
    
    // Удаляем все ссылки на изображения
    tempDiv.querySelectorAll('a').forEach(link => {
        const href = link.getAttribute('href');
        if (href && /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(href)) {
            link.remove();
        }
    });
    
    return tempDiv.innerHTML;
}

// Функция для отображения данных из VetLek
async function displayVetlekData() {
    console.log('Начало функции displayVetlekData');
    const drugInfoSection = document.getElementById('drug-info');
    if (!drugInfoSection || !currentDrug) {
        console.error('Не найден drugInfoSection или currentDrug пустой');
        return;
    }
    console.log('currentDrug:', currentDrug);

    // Получаем или создаем контейнер для контента
    let contentContainer = drugInfoSection.querySelector('.drug-info-content');
    if (!contentContainer) {
        console.log('Создаем новый контейнер для контента');
        contentContainer = document.createElement('div');
        contentContainer.className = 'drug-info-content';
        drugInfoSection.appendChild(contentContainer);
    }

    try {
        // Если это препарат из JSON-базы, отображаем его данные
        if (currentDrug.source === "json") {
            console.log('Препарат из JSON-базы, отображаем доступные данные');
            displayJsonOnlyDrug(contentContainer);
            return;
        }

        // Загружаем HTML файл, если он еще не загружен
        if (!drugsHtml) {
            console.log('Загрузка HTML файла...');
            const response = await fetch('api/all_drugs.html');
            if (!response.ok) {
                throw new Error(`Ошибка загрузки данных VetLek: ${response.status}`);
            }
            drugsHtml = await response.text();
            console.log('HTML файл загружен');
        }

        // Создаем временный div для парсинга HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = drugsHtml;
        
        // Нормализуем название препарата для поиска
        const searchName = currentDrug.name.toLowerCase()
            .replace(/®/g, '')
            .replace(/&/g, 'и')
            .replace(/_/g, ' ')
            .replace(/к\s*и\s*с/, 'кис')
            .trim();
            
        console.log('Ищем препарат:', searchName);

        // Ищем статью по названию
        let article = null;
        const articles = tempDiv.querySelectorAll('article');
        
        for (const art of articles) {
            const title = art.querySelector('h1, h2')?.textContent?.toLowerCase() || '';
            const normalizedTitle = title.replace(/®/g, '').replace(/&/g, 'и').trim();
            
            if (normalizedTitle === searchName || 
                normalizedTitle.includes(searchName) || 
                searchName.includes(normalizedTitle)) {
                article = art;
                console.log('Найдена статья:', title);
                break;
            }
        }

        // Если статья не найдена, показываем данные из JSON
        if (!article) {
            console.log('Статья не найдена, отображаем данные из JSON');
            displayJsonOnlyDrug(contentContainer);
            return;
        }

        // Очищаем контейнер и устанавливаем класс источника
        contentContainer.innerHTML = '';
        contentContainer.className = 'drug-info-content vetlek-source';

        // Создаем обертку для контента
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'drug-content-wrapper';

        // Очищаем HTML от изображений и добавляем в обертку
        const cleanedHtml = cleanHtmlFromImages(article.innerHTML);
        
        // Добавляем заголовок и контент
        contentWrapper.innerHTML = `
            <div class="drug-json-name">
                <h1>${currentDrug.name}</h1>
            </div>
            ${cleanedHtml}
        `;

        // Добавляем обертку в контейнер
        contentContainer.appendChild(contentWrapper);

        // Показываем секцию с информацией
        drugInfoSection.style.display = 'block';
        drugInfoSection.classList.add('visible');
        console.log('Контент успешно отображен');

    } catch (error) {
        console.error('Ошибка при загрузке данных VetLek:', error);
        // В случае ошибки показываем данные из JSON
        displayJsonOnlyDrug(contentContainer);
    }
}

// Функция для проверки релевантности совпадения
function isRelevantMatch(searchName, foundTitle) {
    // Если одна строка полностью содержит другую
    if (searchName.includes(foundTitle) || foundTitle.includes(searchName)) {
        return true;
    }
    
    // Проверяем совпадение по словам
    const searchWords = searchName.split(/\s+/).filter(w => w.length > 2);
    const foundWords = foundTitle.split(/\s+/).filter(w => w.length > 2);
    
    // Если у нас мало слов для сравнения, требуем более строгое совпадение
    if (searchWords.length <= 1 || foundWords.length <= 1) {
        return searchName.includes(foundTitle) || foundTitle.includes(searchName);
    }
    
    // Считаем количество совпадающих слов
    const matchingWords = searchWords.filter(word => 
        foundWords.some(fword => fword.includes(word) || word.includes(fword))
    ).length;
    
    // Требуем совпадение не менее 50% слов
    return matchingWords >= searchWords.length * 0.5;
}
