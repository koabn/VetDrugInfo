let tg = window.Telegram.WebApp;

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
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
    
    let currentDrug = null;
    let drugsData = null;
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
        console.log('Начинаем загрузку данных...');
        
        try {
            // Загружаем данные из HTML файла
            const response = await fetch('api/all_drugs.html');
            if (!response.ok) {
                throw new Error(`Ошибка HTTP: ${response.status}`);
            }
            
            const html = await response.text();
            console.log('HTML файл загружен, размер:', html.length);
            
            // Создаем парсер
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Получаем все статьи
            const articles = doc.querySelectorAll('article');
            console.log('Найдено статей:', articles.length);
            
            // Преобразуем статьи в массив объектов
            drugsData = Array.from(articles).map(article => {
                // Получаем ID статьи
                const id = article.id;
                
                // Получаем название препарата (первый h1 или h2)
                const titleElement = article.querySelector('h1, h2');
                const name = titleElement ? titleElement.textContent.trim() : '';
                
                // Сохраняем HTML содержимое
                const html = article.innerHTML;
                
                return {
                    id,
                    name,
                    html
                };
            });
            
            console.log('Данные загружены успешно. Всего препаратов:', drugsData.length);
            
            // Обновляем счетчик препаратов
            const totalDrugsElement = document.getElementById('totalDrugs');
            if (totalDrugsElement) {
                totalDrugsElement.textContent = drugsData.length;
            }
            
            // Показываем уведомление об успешной загрузке
            const notification = document.createElement('div');
            notification.className = 'notification';
            notification.textContent = `Загружено ${drugsData.length} препаратов`;
            document.body.appendChild(notification);
            
            // Удаляем уведомление через 3 секунды
            setTimeout(() => {
                notification.remove();
            }, 3000);
            
        } catch (error) {
            console.error('Ошибка при загрузке данных:', error);
            const errorDiv = document.getElementById('error');
            if (errorDiv) {
                errorDiv.textContent = 'Ошибка при загрузке данных: ' + error.message;
                errorDiv.style.display = 'block';
            }
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
    function startSearch() {
        const query = searchInput.value.trim().toLowerCase();
        if (query.length >= 2) {
            console.log('Начинаем поиск по запросу:', query);
            
            // Показываем блок результатов поиска
            const resultsSection = document.getElementById('results');
            if (resultsSection) {
                console.log('Элемент results найден, устанавливаем его видимость');
                resultsSection.style.display = 'block';
                setTimeout(() => {
                    resultsSection.classList.add('visible');
                }, 10);
                
                // Проверяем видимость и стили элемента results
                ensureVisibility(resultsSection, 'resultsSection');
            } else {
                console.error('Элемент с id "results" не найден в DOM');
                
                // Проверим все элементы с классом results-section
                const resultsSectionByClass = document.querySelector('.results-section');
                if (resultsSectionByClass) {
                    console.log('Найден элемент с классом results-section, используем его');
                    resultsSectionByClass.style.display = 'block';
                    setTimeout(() => {
                        resultsSectionByClass.classList.add('visible');
                    }, 10);
                    
                    // Проверяем видимость и стили элемента
                    ensureVisibility(resultsSectionByClass, 'resultsSectionByClass');
                } else {
                    console.error('Элемент с классом results-section также не найден');
                    
                    // Выведем список всех секций на странице для диагностики
                    const allSections = document.querySelectorAll('section, div[class*="section"], div[class*="results"]');
                    console.log('Доступные секции на странице:', Array.from(allSections).map(el => ({ 
                        id: el.id, 
                        class: el.className, 
                        display: window.getComputedStyle(el).display 
                    })));
                }
            }
            
            // Запускаем поиск
            searchDrugs(query);
            showBackButton();
        } else {
            errorDiv.textContent = 'Введите минимум 2 символа для поиска';
            errorDiv.style.display = 'block';
            confirmationSection.style.display = 'none';
            drugInfo.style.display = 'none';
            hideBackButton();
        }
    }
    
    // Обработчики поиска
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            startSearch();
        }
    });
    
    searchButton.addEventListener('click', startSearch);
    
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
        console.log('Начало поиска по запросу:', query);
        
        // Проверяем, загружены ли данные
        if (!drugsData || !drugsData.length) {
            console.error('Данные препаратов не загружены');
            const errorDiv = document.getElementById('error');
            if (errorDiv) {
                errorDiv.textContent = 'Данные препаратов не загружены';
                errorDiv.style.display = 'block';
            }
            return [];
        }
        
        console.log('Всего препаратов в базе:', drugsData.length);
        
        // Функция для поиска в данных
        function searchInData(drug) {
            if (!drug || !drug.name) {
                console.log('Пропущен препарат без имени:', drug);
                return false;
            }
            
            const searchFields = {
                name: drug.name.toLowerCase(),
                html: drug.html ? drug.html.toLowerCase() : ''
            };
            
            const normalizedQuery = query.toLowerCase();
            
            // Точное совпадение в имени
            if (searchFields.name.includes(normalizedQuery)) {
                console.log('Найдено точное совпадение в имени:', drug.name);
                return true;
            }
            
            // Точное совпадение в HTML
            if (searchFields.html && searchFields.html.includes(normalizedQuery)) {
                console.log('Найдено совпадение в HTML:', drug.name);
                return true;
            }
            
            // Нечеткий поиск по имени
            const similarity = stringSimilarity(searchFields.name, normalizedQuery);
            if (similarity > 0.7) {
                console.log('Найдено нечеткое совпадение:', drug.name, 'схожесть:', similarity);
                return true;
            }
            
            return false;
        }
        
        // Поиск препаратов
        const results = drugsData.filter(searchInData);
        console.log('Найдено препаратов:', results.length);
        
        // Если есть результаты, показываем их
        if (results.length > 0) {
            console.log('Первый найденный препарат:', results[0].name);
            showDrugOptions(results);
        } else {
            console.log('Препараты не найдены');
            showDrugOptions([]);
        }
        
        return results;
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
    function displayDrugInfo_global(drug) {
        console.log('Отображение информации о препарате:', drug);
        
        const infoContainer = document.getElementById('drug-info');
        if (!infoContainer) {
            console.error('Не найден контейнер для информации о препарате');
            return;
        }
        
        // Очищаем контейнер
        infoContainer.innerHTML = '';
        
        if (!drug || !drug.html) {
            console.error('Нет данных для отображения');
            infoContainer.innerHTML = '<div class="error">Информация о препарате недоступна</div>';
            return;
        }
        
        // Создаем элемент для отображения HTML-контента
        const content = document.createElement('div');
        content.className = 'drug-content';
        content.innerHTML = drug.html;
        
        // Добавляем контент
        infoContainer.appendChild(content);
        
        // Показываем контейнер
        infoContainer.style.display = 'block';
        console.log('Информация о препарате отображена');
    }

    function displayFilteredDrugs(filteredDrugs) {
        const drugOptionsContainer = document.getElementById('drug-options');
        drugOptionsContainer.innerHTML = '';

        if (filteredDrugs.length === 0) {
            // Отображаем заглушку, если ничего не найдено
            drugOptionsContainer.innerHTML = '<div class="no-results">Препараты не найдены</div>';
            return;
        }

        // Добавляем счетчик результатов
        const resultsCounter = document.createElement('div');
        resultsCounter.className = 'results-counter';
        resultsCounter.innerHTML = `Найдено: <span class="count">${filteredDrugs.length}</span> препаратов`;
        
        // Поместим счетчик перед контейнером с препаратами
        const confirmationSection = document.getElementById('confirmation-section');
        const confirmationTitle = confirmationSection?.querySelector('.confirmation-title');
        if (confirmationSection && confirmationTitle) {
            confirmationSection.insertBefore(resultsCounter, confirmationTitle.nextSibling);
        }

        // Создаем элемент для каждого найденного препарата
        filteredDrugs.forEach(drug => {
            const drugItem = document.createElement('div');
            drugItem.className = 'drug-item';
            
            // Отображаем название препарата
            drugItem.innerHTML = `
                <div class="drug-item-header">
                    <div class="drug-name">${drug.name || 'Препарат без названия'}</div>
                </div>
                <div class="drug-item-body">
                    <div class="drug-active-ingredients">${drug.active_ingredients ? (Array.isArray(drug.active_ingredients) ? drug.active_ingredients.join(', ') : drug.active_ingredients) : 'Нет данных о действующих веществах'}</div>
                </div>
            `;

            // Добавляем обработчик событий для отображения полной информации
            drugItem.addEventListener('click', () => {
                // Показываем полную информацию о препарате, используя глобальную функцию
                displayDrugInfo_global(drug);
            });

            // Добавляем элемент в контейнер
            drugOptionsContainer.appendChild(drugItem);
        });

        // Показываем секцию с результатами
        if (confirmationSection) {
            confirmationSection.style.display = 'block';
        }
    }

    // Загружаем данные при инициализации
    loadDrugsData();

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
