let tg = window.Telegram.WebApp;

// Инициализация приложения
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Загружаем данные при старте
        const data = await loadDrugsData();
        if (!data) {
            console.error('Не удалось загрузить данные при инициализации');
            return;
        }
        
        // Настраиваем обработчики событий
        const searchInput = document.getElementById('searchInput');
        const searchButton = document.querySelector('.search-button');
        
        if (!searchInput || !searchButton) {
            showErrorMessage('Ошибка инициализации: не найдены элементы поиска');
            return;
        }
        
        // Поиск при нажатии Enter
        searchInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                startSearch();
            }
        });
        
        // Поиск при клике на кнопку
        searchButton.addEventListener('click', (event) => {
            event.preventDefault();
            startSearch();
        });
        
        // Настраиваем кнопку "Назад"
        const backButton = document.getElementById('backButton');
        if (backButton) {
            backButton.addEventListener('click', goBack);
        }
        
        // Инициализируем обработчики для категорий
        initializeCategoryHandlers();
        
        console.log('Приложение успешно инициализировано');
    } catch (error) {
        console.error('Ошибка при инициализации приложения:', error);
        showErrorMessage('Не удалось инициализировать приложение');
    }
});

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM загружен, инициализация приложения...');
    
    // Сообщаем Telegram, что приложение готово
    tg.ready();
    
    // Логирование данных WebApp
    console.log('Telegram WebApp данные:', {
        version: tg.version,
        platform: tg.platform
    });
    
    // Настраиваем основной цвет и тему
    tg.setHeaderColor('secondary_bg_color');
    tg.MainButton.hide();
    
    // Определяем базовый URL для API
    const API_BASE_URL = 'https://koabn.github.io/VetDrugInfo/api';
    
    // Получаем элементы интерфейса
    const searchInput = document.getElementById('searchInput');
    const confirmationSection = document.getElementById('confirmation-section');
    const drugOptions = document.getElementById('drug-options');
    const drugInfo = document.getElementById('drug-info');
    const drugContent = document.getElementById('drug-content');
    const errorDiv = document.getElementById('error');
    const loadingDiv = document.getElementById('loading');
    const selectAllBtn = document.getElementById('selectAllCategories');
    const clearBtn = document.getElementById('clearCategories');
    const categoryCheckboxes = document.querySelectorAll('input[name="category"]');
    const searchButton = document.querySelector('.search-button');
    const reportErrorBtn = document.getElementById('reportError');
    const backButton = document.getElementById('backButton');
    const drugList = document.getElementById('drug-list');
    const resultsSection = document.getElementById('results');
    
    console.log('Поиск элементов интерфейса:');
    console.log('- searchInput:', searchInput);
    console.log('- searchButton:', searchButton);
    console.log('- drugInfo:', drugInfo);
    console.log('- errorDiv:', errorDiv);
    console.log('- confirmationSection:', confirmationSection);
    console.log('- backButton:', backButton);
    console.log('- drugList:', drugList);
    console.log('- resultsSection:', resultsSection);

    if (!searchInput || !searchButton) {
        console.error('Не найдены элементы формы поиска!');
        return;
    }
    
    let currentDrug = null;
    let drugsData = [];
    let newdrugsData = null; // Новая основная база данных (ранее vetlekData)
    
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
    
    // Применяем тему
    setThemeColors();
    
    // Загружаем данные при старте
    async function loadDrugsData() {
        try {
            showLoadingMessage('Загрузка базы препаратов...');
            
            const response = await fetch('api/drugs_index.json');
            if (!response.ok) {
                throw new Error(`Ошибка HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            if (!Array.isArray(data)) {
                throw new Error('Некорректный формат данных');
            }
            
            drugsData = data;
            console.log(`Загружено ${drugsData.length} препаратов`);
            hideLoadingMessage();
            return drugsData;
        } catch (error) {
            console.error('Ошибка при загрузке данных:', error);
            hideLoadingMessage();
            showErrorMessage(`Не удалось загрузить базу препаратов: ${error.message}`);
            return null;
        }
    }
    
    // Обработчики для кнопок управления категориями
    selectAllBtn.addEventListener('click', () => {
        categoryCheckboxes.forEach(checkbox => checkbox.checked = true);
        if (currentDrug) displayFilteredDrugInfo(currentDrug);
    });
    
    clearBtn.addEventListener('click', () => {
        categoryCheckboxes.forEach(checkbox => checkbox.checked = false);
        if (currentDrug) displayFilteredDrugInfo(currentDrug);
    });
    
    // Обработчик изменения категорий
    categoryCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            if (currentDrug) displayFilteredDrugInfo(currentDrug);
        });
    });
    
    // Получение выбранных категорий из блока фильтров
    function getSelectedCategories() {
        const checkboxes = document.querySelectorAll('input[name="category"]:checked');
        return Array.from(checkboxes).map(checkbox => checkbox.value);
    }
    
    // Функция возврата на главный экран
    function goBack() {
        clearSearch();
        searchInput.value = '';
        hideBackButton();
    }

    // Добавляем обработчик для кнопки возврата
    backButton.addEventListener('click', goBack);

    // Обновляем функцию startSearch
    async function startSearch() {
        console.log('Начало поиска...');
        const query = searchInput.value.trim();
        
        if (!query) {
            console.log('Пустой поисковый запрос');
            showErrorMessage('Введите название препарата');
            return;
        }

        console.log('Поисковый запрос:', query);
        showLoadingMessage('Поиск препаратов...');
        
        try {
            // Проверяем, загружены ли данные
            if (!drugsData || drugsData.length === 0) {
                console.log('Данные не загружены, пытаемся загрузить...');
                await loadDrugsData();
            }

            console.log('Количество препаратов в базе:', drugsData.length);

            // Выполняем поиск
            const results = await searchDrugs(query);
            console.log('Найдено результатов:', results.length);
            
            // Показываем результаты
            if (results.length > 0) {
                console.log('Отображаем результаты поиска');
                displayFilteredDrugs(results);
                showBackButton();
            } else {
                console.log('Результаты не найдены');
                displayFilteredDrugs([]); // Показываем сообщение "Препараты не найдены"
            }
            
        } catch (error) {
            console.error('Ошибка при поиске:', error);
            showErrorMessage('Произошла ошибка при поиске препаратов');
        } finally {
            hideLoadingMessage();
        }
    }
    
    // Обновляем обработчики событий
    searchButton.addEventListener('click', () => {
        console.log('Клик по кнопке поиска');
        startSearch();
    });

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            console.log('Нажата клавиша Enter в поле поиска');
            e.preventDefault();
            startSearch();
        }
    });
    
    // Функция расчета расстояния Левенштейна для нечеткого поиска
    function levenshteinDistance(str1, str2) {
        const m = str1.length;
        const n = str2.length;
        const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

        for (let i = 0; i <= m; i++) {
            dp[i][0] = i;
        }
        for (let j = 0; j <= n; j++) {
            dp[0][j] = j;
        }

        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (str1[i - 1] === str2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    dp[i][j] = Math.min(
                        dp[i - 1][j - 1] + 1,  // замена
                        dp[i - 1][j] + 1,      // удаление
                        dp[i][j - 1] + 1       // вставка
                    );
                }
            }
        }
        return dp[m][n];
    }

    // Функция проверки схожести строк
    function stringSimilarity(str1, str2) {
        const maxLength = Math.max(str1.length, str2.length);
        if (maxLength === 0) return 1.0;
        const distance = levenshteinDistance(str1, str2);
        return 1 - distance / maxLength;
    }

    // Оптимизация функции поиска для улучшения отображения данных из обоих источников
    async function searchDrugs(query) {
        console.log('Начало поиска препаратов...');
        
        if (!drugsData || !Array.isArray(drugsData) || drugsData.length === 0) {
            console.error('База данных препаратов не загружена или пуста');
            return [];
        }

        console.log(`Поиск по запросу "${query}" в ${drugsData.length} препаратах`);
        showLoadingMessage('Поиск препаратов...');

        try {
            // Нормализуем поисковый запрос
            const normalizedQuery = query.toLowerCase().trim();
            console.log('Нормализованный запрос:', normalizedQuery);
            
            // Ищем совпадения
            const results = drugsData.filter(drug => {
                // Проверяем точное совпадение по ID
                if (drug.id && drug.id.toLowerCase() === normalizedQuery) {
                    return true;
                }

                // Проверяем частичное совпадение в названии
                if (drug.name && drug.name.toLowerCase().includes(normalizedQuery)) {
                    return true;
                }

                // Проверяем частичное совпадение в описании
                if (drug.summary && drug.summary.toLowerCase().includes(normalizedQuery)) {
                    return true;
                }

                return false;
            });

            console.log(`Найдено ${results.length} результатов`);
            return results;
        } catch (error) {
            console.error('Ошибка при поиске:', error);
            return [];
        } finally {
            hideLoadingMessage();
        }
    }
    
    // Обновляем функцию clearSearch
    function clearSearch() {
        searchInput.value = '';
        const resultsSection = document.getElementById('results');
        resultsSection.classList.remove('visible');
        setTimeout(() => {
            resultsSection.style.display = 'none';
        }, 300);
        confirmationSection.style.display = 'none';
        drugInfo.style.display = 'none';
        errorDiv.style.display = 'none';
        reportErrorBtn.style.display = 'none';
        hideBackButton();
        
        // Сбрасываем видимость фильтров
        document.querySelector('.categories-section').style.display = 'block';
    }

    // Добавляем обработчик для очистки поиска при нажатии Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            clearSearch();
        }
    });
    
    // Функция для создания запасного блока результатов
    function createFallbackResults() {
        console.log('Создаем запасной блок результатов');
        
        // Проверяем, нет ли уже созданного запасного блока
        if (document.getElementById('fallback-results')) {
            return document.getElementById('fallback-results');
        }
        
        // Создаем блок
        const fallbackResults = document.createElement('div');
        fallbackResults.id = 'fallback-results';
        fallbackResults.style.marginTop = '20px';
        fallbackResults.style.padding = '15px';
        fallbackResults.style.border = '1px solid #ddd';
        fallbackResults.style.borderRadius = '8px';
        fallbackResults.style.backgroundColor = '#f9f9f9';
        
        // Заголовок
        const fallbackHeader = document.createElement('h3');
        fallbackHeader.textContent = 'Результаты поиска';
        fallbackHeader.style.marginTop = '0';
        fallbackResults.appendChild(fallbackHeader);
        
        // Контейнер для списка препаратов
        const fallbackList = document.createElement('div');
        fallbackList.id = 'fallback-drug-list';
        fallbackResults.appendChild(fallbackList);
        
        // Добавляем в DOM после поля поиска
        const searchSection = document.querySelector('.search-section');
        if (searchSection) {
            searchSection.after(fallbackResults);
        } else {
            // Если не нашли секцию поиска, добавляем в body
            document.body.appendChild(fallbackResults);
        }
        
        return fallbackResults;
    }

    // Функция показа списка препаратов
    function showDrugOptions(results) {
        console.log('Отображение результатов поиска:', results.length);
        
        const drugOptionsContainer = document.getElementById('drug-options');
        if (!drugOptionsContainer) {
            console.error('Не найден контейнер для результатов поиска');
            return;
        }
        
        // Очищаем контейнер
        drugOptionsContainer.innerHTML = '';
        
        if (results.length === 0) {
            console.log('Нет результатов для отображения');
            drugOptionsContainer.innerHTML = '<div class="no-results">Ничего не найдено</div>';
            return;
        }
        
        // Создаем заголовок с количеством найденных препаратов
        const header = document.createElement('div');
        header.className = 'search-results-header';
        header.innerHTML = `<h2>Найдено препаратов: ${results.length}</h2>`;
        drugOptionsContainer.appendChild(header);
        
        // Добавляем каждый результат
        results.forEach((drug, index) => {
            console.log(`Добавляем препарат ${index + 1}:`, drug.name);
            
            const drugOption = document.createElement('div');
            drugOption.className = 'drug-option';
            
            // Создаем заголовок с названием препарата
            const title = document.createElement('h3');
            title.className = 'drug-name';
            title.textContent = drug.name;
            
            // Добавляем обработчик клика
            drugOption.addEventListener('click', () => {
                console.log('Выбран препарат:', drug.name);
                displayDrugInfo_global(drug);
            });
            
            // Собираем элемент
            drugOption.appendChild(title);
            drugOptionsContainer.appendChild(drugOption);
        });
        
        // Показываем контейнер
        drugOptionsContainer.style.display = 'block';
        console.log('Результаты поиска отображены');
    }
    
    // Функция для адаптации структуры препарата из разных источников
    function adaptDrugData(drug) {
        if (!drug) return {};
        
        const adaptedDrug = { ...drug };
        
        // Определяем источник данных по наличию характерных полей
        const isNewFormat = drug.hasOwnProperty('shortDescription') || drug.hasOwnProperty('generalInfo');
        
        if (isNewFormat) {
            // Адаптация полей из нового формата
            adaptedDrug.description = drug.shortDescription || '';
            adaptedDrug.producer = drug.manufacturer || '';
            adaptedDrug.registration_number = drug.registrationNumber || '';
            
            // Обработка общих сведений
            if (drug.generalInfo) {
                adaptedDrug.general_info = drug.generalInfo;
            }
            
            // Обработка состава
            if (drug.composition) {
                adaptedDrug.composition = drug.composition;
            }
            
            // Обработка таблицы дозировок
            if (drug.dosageTable && Array.isArray(drug.dosageTable)) {
                // Создаем HTML-таблицу из данных
                let tableHtml = '<table class="dosage-table">';
                tableHtml += '<tr><th>Вид животных</th><th>Порядок применения</th><th>Нормы ввода</th></tr>';
                
                drug.dosageTable.forEach(row => {
                    tableHtml += `<tr>
                        <td>${row.animal || ''}</td>
                        <td>${row.usage || ''}</td>
                        <td>${row.dosage || ''}</td>
                    </tr>`;
                });
                
                tableHtml += '</table>';
                
                adaptedDrug.dosage_html = tableHtml;
                adaptedDrug.dosage_data = drug.dosageTable;
            }
            
            // Обработка условий хранения
            if (drug.storage) {
                adaptedDrug.storage = drug.storage;
            }
            
            // Обработка биологических свойств
            if (drug.biologicalProperties) {
                adaptedDrug.biological_properties = drug.biologicalProperties;
            }
            
            // Обработка инструкций по применению
            if (drug.usageInstructions) {
                adaptedDrug.usage_instructions = drug.usageInstructions;
            }
            
            // Обработка мер безопасности
            if (drug.safetyMeasures) {
                adaptedDrug.safety_measures = drug.safetyMeasures;
            }
        } else {
            // Старая логика для данных из Vidal
            if (drug.manufacturer_info) {
                adaptedDrug.producer = drug.manufacturer_info.manufacturer;
                adaptedDrug.producer_country = drug.manufacturer_info.manufacturer_country;
                adaptedDrug.registration_holder = drug.manufacturer_info.registration_holder;
                adaptedDrug.registration_holder_country = drug.manufacturer_info.registration_holder_country;
            }
            
            if (drug.prescription_required) {
                adaptedDrug.usage = 'По рецепту';
            } else if (drug.usage === undefined) {
                adaptedDrug.usage = 'Без рецепта';
        }
        
        // Преобразуем активные ингредиенты в строку, если это массив
        if (Array.isArray(drug.active_ingredients)) {
            adaptedDrug.active_ingredients_text = drug.active_ingredients.join(', ');
        } else {
            adaptedDrug.active_ingredients_text = drug.active_ingredients || '';
            }
        }
        
        return adaptedDrug;
    }

    // Обновляем функцию displayFilteredDrugInfo для лучшей обработки данных из разных источников
    function displayFilteredDrugInfo(drug) {
        if (!drug) {
            console.error('Нет данных о препарате для отображения');
            return;
        }
        
        console.log('Отображение информации о препарате:', drug);
        
        const drugInfo = document.getElementById('drug-info');
        const drugContent = document.getElementById('drug-content');
        const reportErrorBtn = document.getElementById('reportError');
        
        drugInfo.style.display = 'block';
        drugContent.innerHTML = '';
        
        // Адаптируем структуру препарата
        const adaptedDrug = adaptDrugData(drug);
        console.log('Адаптированные данные:', adaptedDrug);
        
        // Получаем выбранные категории
        const selectedCategories = getSelectedCategories();
        
        // Определяем секции для отображения
        const sections = [
            {
                name: 'shortDescription',
                title: 'Краткое описание',
                category: 'Общая информация'
            },
            {
                name: 'generalInfo',
                title: 'Общие сведения',
                category: 'Общая информация'
            },
            {
                name: 'manufacturer',
                title: 'Производитель',
                category: 'Общая информация'
            },
            {
                name: 'registrationNumber',
                title: 'Регистрационный номер',
                category: 'Регистрационная информация'
            },
            {
                name: 'composition',
                title: 'Состав',
                category: 'Состав'
            },
            {
                name: 'biologicalProperties',
                title: 'Биологические свойства',
                category: 'Фармакология'
            },
            {
                name: 'usageInstructions',
                title: 'Инструкции по применению',
                category: 'Применение'
            },
            {
                name: 'dosageTable',
                title: 'Дозировка',
                category: 'Дозировка',
                customRender: (drug) => {
                    if (!drug.dosageTable || !Array.isArray(drug.dosageTable)) return null;
                    
                    const table = document.createElement('table');
                    table.className = 'dosage-table';
                    
                    // Создаем заголовок таблицы
                    const thead = document.createElement('thead');
                    const headerRow = document.createElement('tr');
                    ['Вид животных', 'Порядок применения', 'Нормы ввода'].forEach(text => {
                        const th = document.createElement('th');
                        th.textContent = text;
                        headerRow.appendChild(th);
                    });
                    thead.appendChild(headerRow);
                    table.appendChild(thead);
                    
                    // Создаем тело таблицы
                    const tbody = document.createElement('tbody');
                    drug.dosageTable.forEach(row => {
                        const tr = document.createElement('tr');
                        ['animal', 'usage', 'dosage'].forEach(key => {
                            const td = document.createElement('td');
                            td.textContent = row[key] || '';
                            tr.appendChild(td);
                        });
                        tbody.appendChild(tr);
                    });
                    table.appendChild(tbody);
                    
                    return table;
                }
            },
            {
                name: 'safetyMeasures',
                title: 'Меры безопасности',
                category: 'Безопасность'
            },
            {
                name: 'storage',
                title: 'Условия хранения',
                category: 'Хранение'
            }
        ];
        
        // Отображаем выбранные разделы
        sections.forEach(section => {
            if (selectedCategories.length === 0 || selectedCategories.includes(section.category)) {
                let value;
                if (section.customRender) {
                    value = section.customRender(adaptedDrug);
                } else {
                    value = adaptedDrug[section.name];
                }
                
                if (value) {
                    const sectionDiv = document.createElement('div');
                    sectionDiv.className = 'drug-section';
                    
                    const title = document.createElement('h3');
                    title.textContent = section.title;
                    sectionDiv.appendChild(title);
                    
                    const content = document.createElement('div');
                    content.className = 'section-content';
                    
                    if (value instanceof Element) {
                        content.appendChild(value);
                    } else if (typeof value === 'string') {
                        content.innerHTML = value.replace(/\n/g, '<br>');
                    } else {
                        content.textContent = JSON.stringify(value, null, 2);
                    }
                    
                    sectionDiv.appendChild(content);
                    drugContent.appendChild(sectionDiv);
                }
            }
        });
        
        // Показываем кнопку для сообщения об ошибке
        if (reportErrorBtn) {
            reportErrorBtn.style.display = 'block';
        }
    }

    // Глобальная функция-обертка для displayDrugInfo
    async function displayDrugInfo_global(drug) {
        try {
            showLoadingMessage('Загрузка информации о препарате...');
            
            // Загружаем HTML файл, если он еще не загружен
            if (!window.drugsHtml) {
                const response = await fetch('api/all_drugs.html');
                if (!response.ok) {
                    throw new Error('Не удалось загрузить данные препаратов');
                }
                window.drugsHtml = await response.text();
            }
            
            // Создаем временный div для парсинга HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = window.drugsHtml;
            
            // Находим статью с нужным ID
            const article = tempDiv.querySelector(`article#${drug.id}`);
            if (!article) {
                throw new Error('Препарат не найден');
            }
            
            // Отображаем информацию
            const drugInfoContainer = document.getElementById('drug-info');
            drugInfoContainer.innerHTML = article.innerHTML;
            
            // Показываем контейнер
            drugInfoContainer.style.display = 'block';
            
            hideLoadingMessage();
        } catch (error) {
            console.error('Ошибка при отображении информации о препарате:', error);
            showErrorMessage('Не удалось загрузить информацию о препарате');
            hideLoadingMessage();
        }
    }

    function displayFilteredDrugs(filteredDrugs) {
        console.log('Отображение результатов поиска...');
        const resultsSection = document.getElementById('results');
        const drugList = document.getElementById('drug-list');
        
        if (!resultsSection || !drugList) {
            console.error('Не найдены элементы для отображения результатов');
            return;
        }
        
        // Очищаем предыдущие результаты
        drugList.innerHTML = '';
        
        if (!Array.isArray(filteredDrugs)) {
            console.error('Некорректный формат данных результатов:', filteredDrugs);
            return;
        }
        
        console.log(`Отображение ${filteredDrugs.length} результатов`);
        
        if (filteredDrugs.length === 0) {
            // Показываем сообщение, что ничего не найдено
            drugList.innerHTML = '<div class="no-results">Препараты не найдены</div>';
            resultsSection.style.display = 'block';
            resultsSection.classList.add('visible');
            return;
        }
        
        // Создаем элементы для каждого препарата
        filteredDrugs.forEach(drug => {
            console.log('Создание элемента для препарата:', drug.name);
            
            const drugElement = document.createElement('div');
            drugElement.className = 'drug-item';
            
            // Создаем заголовок препарата
            const header = document.createElement('div');
            header.className = 'drug-item-header';
            
            const nameElement = document.createElement('h3');
            nameElement.className = 'drug-name';
            nameElement.textContent = drug.name;
            header.appendChild(nameElement);
            
            drugElement.appendChild(header);
            
            // Добавляем описание, если есть
            if (drug.summary) {
                const description = document.createElement('div');
                description.className = 'drug-item-body';
                description.textContent = drug.summary;
                drugElement.appendChild(description);
            }
            
            // Добавляем обработчик клика
            drugElement.addEventListener('click', () => {
                console.log('Клик по препарату:', drug.name);
                displayDrugInfo_global(drug);
            });
            
            drugList.appendChild(drugElement);
        });
        
        // Показываем секцию с результатами
        resultsSection.style.display = 'block';
        resultsSection.classList.add('visible');
        console.log('Результаты успешно отображены');
    }

    // Загружаем данные при инициализации
    loadDrugsData().then(success => {
        console.log('Загрузка данных завершена:', success ? 'успешно' : 'с ошибкой');
    });

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

    // Добавляем обработчики для модального окна
    const errorModalCloseBtn = document.querySelector('#errorModal .close-modal');
    errorModalCloseBtn?.addEventListener('click', closeErrorModal);
    
    const errorSubmitBtn = document.querySelector('#errorModal .form-submit');
    errorSubmitBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        sendErrorReport();
    });
    
    document.getElementById('errorModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'errorModal') {
            closeErrorModal();
        }
    });

    // Добавляем обработчик отправки формы
    document.getElementById('errorForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        sendErrorReport();
    });

    // Добавляем обработчик для кнопки сообщения об ошибке
    if (reportErrorBtn) {
        reportErrorBtn.addEventListener('click', reportError);
    } else {
        console.error('Кнопка reportError не найдена в DOM');
    }

    // Вспомогательная функция для проверки видимости элементов
    function ensureVisibility(element, message = '') {
        if (!element) return;
        
        // Проверяем текущие стили элемента
        const computedStyle = window.getComputedStyle(element);
        console.log(`${message} Стили элемента:`, {
            display: computedStyle.display,
            visibility: computedStyle.visibility,
            opacity: computedStyle.opacity,
            height: computedStyle.height
        });
        
        // Исправляем потенциальные проблемы с видимостью
        if (computedStyle.display === 'none') {
            console.log(`${message} Исправляем display: none`);
            element.style.display = 'block';
        }
        
        if (computedStyle.visibility === 'hidden') {
            console.log(`${message} Исправляем visibility: hidden`);
            element.style.visibility = 'visible';
        }
        
        if (parseFloat(computedStyle.opacity) === 0) {
            console.log(`${message} Исправляем opacity: 0`);
            element.style.opacity = '1';
        }
        
        if (computedStyle.height === '0px') {
            console.log(`${message} Исправляем height: 0px`);
            element.style.height = 'auto';
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

    // Инициализация приложения при загрузке документа
    document.addEventListener('DOMContentLoaded', function() {
        initApp();
        
        // Показываем индикатор загрузки
        const loadingIndicator = document.createElement('div');
        loadingIndicator.id = 'loadingIndicator';
        loadingIndicator.style.position = 'fixed';
        loadingIndicator.style.top = '50%';
        loadingIndicator.style.left = '50%';
        loadingIndicator.style.transform = 'translate(-50%, -50%)';
        loadingIndicator.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        loadingIndicator.style.color = 'white';
        loadingIndicator.style.padding = '20px';
        loadingIndicator.style.borderRadius = '10px';
        loadingIndicator.style.zIndex = '2000';
        loadingIndicator.style.textAlign = 'center';
        loadingIndicator.innerHTML = `
            <div>Загрузка базы данных...</div>
            <div style="margin-top: 10px;">Пожалуйста, подождите</div>
        `;
        document.body.appendChild(loadingIndicator);
        
        // Загружаем данные
        loadData()
            .then(() => {
                // Скрываем индикатор загрузки и инициализируем поиск
                document.getElementById('loadingIndicator').remove();
                setupSearch();
                setupCategories();
                
                // Для начальной загрузки показываем все препараты
                displayFilteredDrugs(drugsData);
            })
            .catch(error => {
                console.error('Ошибка при загрузке данных:', error);
                // Показываем сообщение об ошибке
                document.getElementById('loadingIndicator').innerHTML = `
                    <div>Ошибка при загрузке базы данных</div>
                    <div style="margin-top: 10px;">${error.message}</div>
                    <button style="margin-top: 15px; padding: 8px 16px; background: var(--tg-theme-button-color); color: white; border: none; border-radius: 8px;" onclick="location.reload()">Попробовать снова</button>
                `;
            });
    });

    // Добавляем обработчик ввода для поиска с подсказками
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        
        // Очищаем предыдущий таймаут
        clearTimeout(searchTimeout);
        
        // Если запрос пустой, скрываем блок предложений
        if (!query) {
            drugOptions.style.display = 'none';
            return;
        }
        
        // При вводе поиск не выполняется автоматически
        // Комментируем код автоматического поиска
        /*
        // Устанавливаем таймаут для предотвращения частых запросов
        searchTimeout = setTimeout(() => {
            // Используем локальные данные вместо запроса к API
            if (drugsData && drugsData.length > 0) {
                const lowerQuery = query.toLowerCase();
                const results = drugsData.filter(drug => {
                    // Проверяем наличие названия препарата
                    const hasName = drug.name && typeof drug.name === 'string';
                    if (hasName && drug.name.toLowerCase().includes(lowerQuery)) {
                        return true;
                    }
                    
                    // Проверяем наличие активных веществ
                    if (drug.active_ingredients && Array.isArray(drug.active_ingredients)) {
                        return drug.active_ingredients.some(ingredient => 
                            ingredient.toLowerCase().includes(lowerQuery)
                        );
                    }
                    
                    return false;
                }).slice(0, 20); // Ограничиваем 20 результатами
                
                if (results.length > 0) {
                    // Показываем блок предложений
                    drugOptions.style.display = 'block';
                    // Отображаем найденные препараты
                    showDrugOptions(results);
                } else {
                    // Если ничего не найдено, скрываем блок
                    drugOptions.style.display = 'none';
                }
            } else {
                console.warn('Данные препаратов не загружены');
                drugOptions.style.display = 'none';
            }
        }, 300); // Задержка в 300 мс
        */
    });

    // Скрытие предложений при клике вне блока
    document.addEventListener('click', (e) => {
        if (!drugOptions.contains(e.target) && e.target !== searchInput) {
            drugOptions.style.display = 'none';
        }
    });
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
