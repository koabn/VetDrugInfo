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
        try {
            console.log('Начинаем загрузку данных...');
            errorDiv.style.display = 'none';
            loadingDiv.style.display = 'block';
            
            // Загружаем обе базы данных
            console.log('URL для drugs:', `${API_BASE_URL}/drugs.json`);
            console.log('URL для newdrugs:', `${API_BASE_URL}/combined/Newdrugs.json`);
            
            // Загружаем локальные данные (старая и новая базы параллельно)
            const [drugsResponse, newdrugsResponse] = await Promise.all([
                fetch(`${API_BASE_URL}/drugs.json`),
                fetch(`${API_BASE_URL}/combined/Newdrugs.json`)
            ]);
            
            // Проверяем ответ по старой базе
            if (!drugsResponse.ok) {
                console.error('Ошибка HTTP при загрузке старой базы данных:', drugsResponse.status, drugsResponse.statusText);
                throw new Error(`Ошибка при загрузке старой базы данных: HTTP ${drugsResponse.status} ${drugsResponse.statusText}`);
            }
            
            // Проверяем ответ по новой базе
            if (!newdrugsResponse.ok) {
                console.error('Ошибка HTTP при загрузке новой базы данных:', newdrugsResponse.status, newdrugsResponse.statusText);
                throw new Error(`Ошибка при загрузке новой базы данных: HTTP ${newdrugsResponse.status} ${newdrugsResponse.statusText}`);
            }
            
            console.log('Файлы получены, начинаем парсинг JSON...');
            
            // Парсим ответы в JSON
            const drugsJson = await drugsResponse.json();
            const newdrugsJson = await newdrugsResponse.json();
            
            console.log('Данные препаратов загружены успешно');
            
            // Проверяем структуру данных старой базы
            if (Array.isArray(drugsJson)) {
                drugsData = drugsJson;
                console.log('Старая база в формате массива');
            } else if (drugsJson && drugsJson.results) {
                drugsData = drugsJson.results;
                console.log('Старая база в формате {results: [...]}');
            } else {
                console.error('Неверный формат старой базы данных:', typeof drugsJson, drugsJson ? Object.keys(drugsJson) : 'null');
                throw new Error('Неверный формат старой базы данных препаратов');
            }
            
            // Проверяем структуру данных новой базы
            if (Array.isArray(newdrugsJson)) {
                newdrugsData = newdrugsJson;
                console.log('Новая база в формате массива');
            } else if (newdrugsJson && newdrugsJson.results) {
                newdrugsData = newdrugsJson.results;
                console.log('Новая база в формате {results: [...]}');
            } else {
                console.error('Неверный формат новой базы данных:', typeof newdrugsJson, newdrugsJson ? Object.keys(newdrugsJson) : 'null');
                throw new Error('Неверный формат новой базы данных препаратов');
            }
            
            console.log('Данные успешно загружены');
            console.log('Количество препаратов в старой базе:', drugsData.length);
            console.log('Количество препаратов в новой базе:', newdrugsData.length);
            
            loadingDiv.style.display = 'none';
            
            // Отображаем сообщение об успешной загрузке
            const totalDrugs = drugsData.length + newdrugsData.length;
            if (totalDrugs > 0) {
                searchInput.placeholder = `Поиск среди ${totalDrugs} препаратов...`;
            }
            
        } catch (error) {
            console.error('Ошибка при загрузке данных:', error);
            loadingDiv.style.display = 'none';
            errorDiv.textContent = 'Ошибка при загрузке данных: ' + error.toString();
            errorDiv.style.display = 'block';
            
            // Добавляем кнопку для повторной попытки
            const retryBtn = document.createElement('button');
            retryBtn.className = 'retry-button';
            retryBtn.textContent = 'Повторить загрузку';
            retryBtn.onclick = () => {
                errorDiv.style.display = 'none';
                setTimeout(loadDrugsData, 500);
            };
            errorDiv.appendChild(document.createElement('br'));
            errorDiv.appendChild(retryBtn);
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
    function searchDrugs(query) {
        if (!drugsData || !newdrugsData) {
            errorDiv.textContent = 'Данные еще не загружены';
            errorDiv.style.display = 'block';
            return;
        }
        
        console.log(`Выполняется поиск по запросу "${query}"`);
        
        const threshold = 0.7; // Порог схожести для нечеткого поиска
        query = query.toLowerCase();
        
        // Вспомогательная функция для поиска в массиве препаратов
        function searchInData(data, isNewdrugsSource = false) {
            return data.filter(drug => {
                // Проверяем, что поля существуют перед поиском
                const hasName = drug.name && typeof drug.name === 'string';
                const hasTradeName = drug.trade_names && typeof drug.trade_names === 'string';
                const hasActiveIngredients = drug.active_ingredients && Array.isArray(drug.active_ingredients);
                
                // Если нет нужных полей для поиска, пропускаем
                if (!hasName && !hasTradeName && !hasActiveIngredients) return false;
                
                // Точное совпадение
                const nameMatch = hasName && drug.name.toLowerCase().includes(query);
                const tradeMatch = hasTradeName && drug.trade_names.toLowerCase().includes(query);
                
                // Поиск по активным веществам
                let activeIngredientsMatch = false;
                if (hasActiveIngredients) {
                    activeIngredientsMatch = drug.active_ingredients.some(ingredient => 
                        ingredient.toLowerCase().includes(query)
                    );
                }
                
                if (nameMatch || tradeMatch || activeIngredientsMatch) return true;
                
                // Нечеткий поиск
                const nameSimilarity = hasName ? Math.max(
                    ...drug.name.toLowerCase().split(/\s+/).map(word => 
                        stringSimilarity(word, query)
                    )
                ) : 0;
                
                return nameSimilarity >= threshold;
            }).map(drug => ({
                ...drug,
                source: isNewdrugsSource ? 'newdrugs' : 'vidal'
            }));
        }
        
        // Ищем в обеих базах
        const newdrugsResults = searchInData(newdrugsData, true);
        const vidalResults = searchInData(drugsData, false);
        
        console.log(`Найдено ${newdrugsResults.length} препаратов в новой базе (Newdrugs)`);
        console.log(`Найдено ${vidalResults.length} препаратов в старой базе (Vidal)`);
        
        // Объединяем результаты, но делаем приоритет для новой базы
        // Создаем карту по названиям, чтобы определить дубликаты
        const drugMap = new Map();
        
        // Для нормализации названий препаратов
        function normalizeString(str) {
            return str.toLowerCase()
                .replace(/ё/g, 'е')
                .replace(/[^а-яa-z0-9]/gi, '');
        }
        
        // Сначала добавляем препараты из новой базы (они имеют приоритет)
        newdrugsResults.forEach(drug => {
            const normalizedName = normalizeString(drug.name);
            drugMap.set(normalizedName, { 
                newdrugs: drug, 
                vidal: null 
            });
        });
        
        // Затем добавляем препараты из старой базы, если их еще нет или объединяем с существующими
        vidalResults.forEach(drug => {
            const normalizedName = normalizeString(drug.name);
            if (drugMap.has(normalizedName)) {
                // Если уже есть препарат с таким названием, добавляем данные из старой базы
                drugMap.get(normalizedName).vidal = drug;
            } else {
                // Если нет, создаем новую запись
                drugMap.set(normalizedName, { 
                    newdrugs: null, 
                    vidal: drug 
                });
            }
        });
        
        // Преобразуем карту обратно в массив и придаем структуру для отображения
        const combinedResults = Array.from(drugMap.values()).map(({ newdrugs, vidal }) => {
            // Если есть данные из новой базы, используем их как основные
            if (newdrugs) {
                return {
                    ...newdrugs,
                    hasDualSources: !!vidal,  // Флаг, что есть данные и в старой базе
                    vidalData: vidal,         // Сохраняем данные из старой базы для дополнительного отображения
                    sourceLabel: 'Newdrugs.ru'  // Метка источника для отображения
                };
            } else {
                // Иначе используем данные из старой базы
                return {
                    ...vidal,
                    source: 'vidal',
                    sourceLabel: 'Vidal.ru'
                };
            }
        });
        
        console.log(`Всего уникальных препаратов: ${combinedResults.length}`);
        
        // Сортируем результаты по релевантности
        combinedResults.sort((a, b) => {
            // Приоритет для препаратов из новой базы
            if (a.source === 'newdrugs' && b.source !== 'newdrugs') return -1;
            if (a.source !== 'newdrugs' && b.source === 'newdrugs') return 1;
            
            const aName = a.name ? a.name.toLowerCase() : '';
            const bName = b.name ? b.name.toLowerCase() : '';
            
            // Если одно из названий содержит точное совпадение, ставим его выше
            const aExactMatch = aName.includes(query);
            const bExactMatch = bName.includes(query);
            
            if (aExactMatch && !bExactMatch) return -1;
            if (!aExactMatch && bExactMatch) return 1;
            
            // Сортируем по длине названия (более короткие выше)
            return aName.length - bName.length;
        });
        
        // Сбрасываем предыдущее состояние интерфейса
        errorDiv.style.display = 'none';
        
        // Удаляем старый запасной блок, если он был
        const oldFallback = document.getElementById('fallback-results');
        if (oldFallback) {
            oldFallback.style.display = 'none';
        }
        
        // Если найдено более одного препарата, показываем список выбора
        if (combinedResults.length > 1) {
            console.log('Показываем список препаратов');
            drugInfo.style.display = 'none';
            
            // Пробуем показать результаты в основном блоке
            let displaySuccess = false;
            
            try {
                confirmationSection.style.display = 'block';
                confirmationSection.classList.add('visible', 'active');
                drugOptions.style.display = 'block';
                drugOptions.classList.add('visible', 'active');
                
                // Проверяем текущие стили
                console.log('Стили после установки:', {
                    confirmationSection: {
                        display: window.getComputedStyle(confirmationSection).display,
                        visibility: window.getComputedStyle(confirmationSection).visibility,
                        opacity: window.getComputedStyle(confirmationSection).opacity
                    },
                    drugOptions: {
                        display: window.getComputedStyle(drugOptions).display,
                        visibility: window.getComputedStyle(drugOptions).visibility,
                        opacity: window.getComputedStyle(drugOptions).opacity
                    }
                });
                
                ensureVisibility(confirmationSection, 'confirmationSection');
                ensureVisibility(drugOptions, 'drugOptions');
                showDrugOptions(combinedResults);
                
                // Проверяем, видны ли элементы после отображения
                const confirmStyle = window.getComputedStyle(confirmationSection);
                const optionsStyle = window.getComputedStyle(drugOptions);
                
                console.log('Стили после showDrugOptions:', {
                    confirmationSection: {
                        display: confirmStyle.display,
                        visibility: confirmStyle.visibility,
                        opacity: confirmStyle.opacity
                    },
                    drugOptions: {
                        display: optionsStyle.display,
                        visibility: optionsStyle.visibility,
                        opacity: optionsStyle.opacity,
                        childrenCount: drugOptions.children.length
                    }
                });
                
                if (confirmStyle.display !== 'none' && optionsStyle.display !== 'none' &&
                    drugOptions.children.length > 0) {
                    displaySuccess = true;
                    console.log('Успешно отобразили результаты в основном блоке');
                }
            } catch (error) {
                console.error('Ошибка при отображении результатов в основном блоке:', error);
            }
            
            // Если не удалось отобразить в основном блоке, используем запасной вариант
            if (!displaySuccess) {
                console.log('Используем запасной вариант отображения результатов');
                const fallbackResults = createFallbackResults();
                fallbackResults.style.display = 'block';
                
                // Очищаем и заполняем запасной список
                const fallbackList = document.getElementById('fallback-drug-list');
                if (fallbackList) {
                    fallbackList.innerHTML = '';
                    
                    // Заголовок с количеством найденных препаратов
                    const resultHeader = document.createElement('div');
                    resultHeader.style.marginBottom = '15px';
                    resultHeader.style.fontWeight = 'bold';
                    resultHeader.textContent = `Найдено ${combinedResults.length} препаратов по запросу "${query}"`;
                    fallbackList.appendChild(resultHeader);
                    
                    // Добавляем препараты в список
                    combinedResults.slice(0, 20).forEach((drug, index) => {
                        const drugItem = document.createElement('div');
                        drugItem.style.padding = '10px';
                        drugItem.style.margin = '5px 0';
                        drugItem.style.backgroundColor = '#f5f5f5';
                        drugItem.style.borderRadius = '5px';
                        drugItem.style.cursor = 'pointer';
                        
                        const drugName = document.createElement('div');
                        drugName.style.fontWeight = 'bold';
                        drugName.textContent = drug.name || 'Препарат без названия';
                        drugItem.appendChild(drugName);
                        
                        if (drug.active_ingredients && drug.active_ingredients.length > 0) {
                            const ingredients = document.createElement('div');
                            ingredients.style.fontSize = '0.9em';
                            ingredients.style.color = '#666';
                            ingredients.textContent = `Действующие вещества: ${drug.active_ingredients.join(', ')}`;
                            drugItem.appendChild(ingredients);
                        }
                        
                        // Обработчик клика на препарат
                        drugItem.addEventListener('click', () => {
                            console.log('Выбран препарат из запасного списка:', drug.name);
                            currentDrug = drug;
                            displayFilteredDrugInfo(drug);
                        });
                        
                        fallbackList.appendChild(drugItem);
                    });
                    
                    // Сообщение о количестве показанных результатов
                    if (combinedResults.length > 20) {
                        const moreInfo = document.createElement('div');
                        moreInfo.style.fontStyle = 'italic';
                        moreInfo.style.color = '#666';
                        moreInfo.style.marginTop = '10px';
                        moreInfo.textContent = `Показаны первые 20 результатов из ${combinedResults.length}. Уточните запрос для более точных результатов.`;
                        fallbackList.appendChild(moreInfo);
                    }
                }
            }
        } else if (combinedResults.length === 1) {
            // Если найден только один препарат, сразу показываем его
            console.log('Найден только один препарат:', combinedResults[0].name);
            displayDrugInfo_global(combinedResults[0]);
        } else {
            // Если ничего не найдено
            errorDiv.textContent = `По запросу "${query}" ничего не найдено`;
            errorDiv.style.display = 'block';
            confirmationSection.style.display = 'none';
            drugInfo.style.display = 'none';
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
        // Получаем контейнер для опций
        const optionsContainer = document.getElementById('drug-options');
        optionsContainer.innerHTML = '';
        
        if (!results || results.length === 0) {
            const noResultsMsg = document.createElement('div');
            noResultsMsg.className = 'no-results';
            noResultsMsg.textContent = 'Препаратов не найдено. Попробуйте другой запрос.';
            optionsContainer.appendChild(noResultsMsg);
            return;
        }
        
        // Статистика по источникам
        const newdrugsCount = results.filter(drug => drug.source === 'newdrugs').length;
        const vidalCount = results.filter(drug => drug.source === 'vidal').length;
        const dualSourceCount = results.filter(drug => drug.inBothDatabases).length;
        
        // Создаем заголовок с количеством найденных препаратов и статистикой
        const header = document.createElement('div');
        header.className = 'search-results-header';
        
        const headerTitle = document.createElement('h2');
        headerTitle.textContent = `Найдено препаратов: ${results.length}`;
        header.appendChild(headerTitle);
        
        // Добавляем блок со статистикой
        const sourceStats = document.createElement('div');
        sourceStats.className = 'source-stats';
        
        // Статистика Newdrugs
        const newdrugsStats = document.createElement('div');
        newdrugsStats.className = 'stats-item';
        newdrugsStats.innerHTML = `
            <span class="stats-label">Newdrugs.ru:</span>
            <span class="stats-value">${newdrugsCount}</span>
        `;
        sourceStats.appendChild(newdrugsStats);
        
        // Статистика Vidal
        const vidalStats = document.createElement('div');
        vidalStats.className = 'stats-item';
        vidalStats.innerHTML = `
            <span class="stats-label">Vidal.ru:</span>
            <span class="stats-value">${vidalCount}</span>
        `;
        sourceStats.appendChild(vidalStats);
        
        // Статистика по препаратам в обеих базах
        const dualStats = document.createElement('div');
        dualStats.className = 'stats-item';
        dualStats.innerHTML = `
            <span class="stats-label">В обеих базах:</span>
            <span class="stats-value">${dualSourceCount}</span>
        `;
        sourceStats.appendChild(dualStats);
        
        header.appendChild(sourceStats);
        optionsContainer.appendChild(header);
        
        // Отображаем каждый препарат
        results.forEach((drug, index) => {
            const option = document.createElement('div');
            option.className = `drug-option ${drug.source === 'newdrugs' ? 'newdrugs-source' : 'vidal-source'}`;
            option.style.animationDelay = `${index * 0.05}s`;

            // Заголовок с названием и источником
            const drugHeader = document.createElement('div');
            drugHeader.className = 'drug-header';
            
            const name = document.createElement('h3');
            name.textContent = drug.name;
            drugHeader.appendChild(name);
            
            const sourceLabel = document.createElement('span');
            sourceLabel.className = 'source-label';
            sourceLabel.textContent = drug.source === 'newdrugs' ? 'Newdrugs.ru' : 'Vidal.ru';
            drugHeader.appendChild(sourceLabel);
            
            // Иконка, если препарат есть в обеих базах
            if (drug.inBothDatabases) {
                const dualSourceIcon = document.createElement('span');
                dualSourceIcon.className = 'dual-source-icon';
                dualSourceIcon.title = 'Препарат доступен в обеих базах данных';
                dualSourceIcon.textContent = '📚';
                drugHeader.appendChild(dualSourceIcon);
            }
            
            option.appendChild(drugHeader);
            
            // Кнопка для отображения подробной информации
            const viewButton = document.createElement('button');
            viewButton.textContent = 'Подробнее';
            viewButton.className = 'view-button';
            viewButton.addEventListener('click', () => {
                displayDrugInfo_global(drug);
            });
            option.appendChild(viewButton);
            
            // Основная информация (действующие вещества и показания)
            const summary = document.createElement('div');
            summary.className = 'drug-summary';
            
            if (drug.active_ingredients && drug.active_ingredients.length > 0) {
                const ingredients = document.createElement('div');
                ingredients.className = 'ingredients';
                
                const ingredientsLabel = document.createElement('span');
                ingredientsLabel.className = 'summary-label';
                ingredientsLabel.textContent = 'Действующие вещества: ';
                ingredients.appendChild(ingredientsLabel);
                
                const ingredientsText = document.createElement('span');
                ingredientsText.textContent = Array.isArray(drug.active_ingredients) 
                    ? drug.active_ingredients.join(', ') 
                    : drug.active_ingredients;
                ingredients.appendChild(ingredientsText);
                
                summary.appendChild(ingredients);
            }
            
            if (drug.indications) {
                const indications = document.createElement('div');
                indications.className = 'indications';
                
                const indicationsLabel = document.createElement('span');
                indicationsLabel.className = 'summary-label';
                indicationsLabel.textContent = 'Показания: ';
                indications.appendChild(indicationsLabel);
                
                const indicationsText = document.createElement('span');
                // Ограничиваем длину текста показаний
                const maxLength = 150;
                let indicationsContent = drug.indications;
                if (typeof indicationsContent === 'string' && indicationsContent.length > maxLength) {
                    indicationsContent = indicationsContent.substring(0, maxLength) + '...';
                }
                indicationsText.textContent = indicationsContent;
                indications.appendChild(indicationsText);
                
                summary.appendChild(indications);
            }
            
            option.appendChild(summary);
            optionsContainer.appendChild(option);
        });
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
        
        console.log('Отображение информации о препарате:', drug.name);
        
        // Получаем ссылки на элементы DOM
        const drugInfo = document.getElementById('drug-info');
        const drugContent = document.getElementById('drug-content');
        const reportErrorBtn = document.getElementById('reportError');
        
        // Показываем блок информации о препарате
        drugInfo.style.display = 'block';
        drugInfo.classList.add('visible');
        
        const resultsSection = document.getElementById('results');
        if (resultsSection) {
            resultsSection.style.display = 'block';
            resultsSection.classList.add('visible');
        }
        
        // Если drugContent не существует или если мы уже создали заголовок, не обновляем его
        if (!drugContent || drugContent.children.length > 1) {
            return;
        }
        
        // Адаптируем структуру препарата к отображению
        const adaptedDrug = adaptDrugData(drug);
        
        // Краткая информация о препарате
        const drugSummary = document.createElement('div');
        drugSummary.className = 'drug-summary';
        
        // Получаем выбранные категории
        const selectedCategories = getSelectedCategories();
        
        // Определяем порядок и категории разделов информации
        const sections = [
            // Краткое описание
            {
                name: 'description',
                title: 'Краткое описание',
                category: 'Общая информация'
            },
            // Общие сведения
            {
                name: 'general_info',
                title: 'Общие сведения',
                category: 'Общая информация'
            },
            // Состав
            {
                name: 'composition',
                title: 'Состав',
                category: 'Состав'
            },
            // Биологические свойства
            {
                name: 'biological_properties',
                title: 'Биологические свойства',
                category: 'Фармакология'
            },
            // Инструкции по применению
            {
                name: 'usage_instructions',
                title: 'Инструкции по применению',
                category: 'Применение'
            },
            // Дозировка (таблица)
            {
                name: 'dosage_html',
                title: 'Дозировка и способ применения',
                category: 'Дозировка',
                customRender: (drug) => {
                    const container = document.createElement('div');
                    if (drug.dosage_html) {
                        container.innerHTML = drug.dosage_html;
                    } else if (drug.dosage) {
                        container.textContent = drug.dosage;
                    }
                    return container;
                }
            },
            // Меры безопасности
            {
                name: 'safety_measures',
                title: 'Меры безопасности',
                category: 'Безопасность'
            },
            // Условия хранения
            {
                name: 'storage',
                title: 'Условия хранения',
                category: 'Хранение'
            },
            // Производитель
            {
                name: 'producer',
                title: 'Производитель',
                category: 'Регистрационная информация'
            },
            // Регистрационный номер
            {
                name: 'registration_number',
                title: 'Регистрационный номер',
                category: 'Регистрационная информация'
            }
        ];
        
        // Отображаем выбранные разделы или все, если категории не выбраны
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
                    
                    if (value instanceof Element) {
                        sectionDiv.appendChild(value);
                    } else {
                        const content = document.createElement('div');
                        content.className = 'section-content';
                        content.innerHTML = value.toString().replace(/\n/g, '<br>');
                        sectionDiv.appendChild(content);
                    }
                    
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
    function displayDrugInfo_global(drug, selectedCategories = []) {
        console.log('Вызов глобальной функции displayDrugInfo_global');
        
        // Получаем элементы DOM напрямую
        const confirmationSection = document.getElementById('confirmation-section');
        const drugInfo = document.getElementById('drug-info');
        const drugContent = document.getElementById('drug-content');
        
        // Сохраняем выбранный препарат в глобальную переменную
        window.currentDrug = drug;
        
        // Скрываем блок выбора и показываем блок информации
        if (confirmationSection) confirmationSection.style.display = 'none';
        if (drugInfo) drugInfo.style.display = 'block';
        
        // Если нет элемента drugContent, то не продолжаем
        if (!drugContent) {
            console.error('Элемент drug-content не найден в DOM');
            return;
        }
        
        // Очищаем содержимое
        drugContent.innerHTML = '';
        
        // Создаем заголовок с названием препарата
        const header = document.createElement('div');
        header.className = 'drug-header';
        
        const titleElement = document.createElement('h1');
        titleElement.textContent = drug.name || 'Препарат без названия';
        header.appendChild(titleElement);
        
        // Добавляем индикатор источника данных
        const sourceLabel = document.createElement('div');
        sourceLabel.className = 'source-label';
        sourceLabel.textContent = drug.source === 'newdrugs' ? 'Источник: Newdrugs.ru' : 'Источник: Vidal.ru';
        header.appendChild(sourceLabel);
        
        drugContent.appendChild(header);
        
        // Адаптируем структуру препарата для отображения
        const adaptedDrug = adaptDrugData ? adaptDrugData(drug) : drug;
        
        // Создаем краткую информацию о препарате
        const drugSummary = document.createElement('div');
        drugSummary.className = 'drug-summary';
        
        // Создаем основные разделы информации
        const sections = [
            { name: 'active_ingredients', title: 'Действующие вещества' },
            { name: 'form_type', title: 'Форма выпуска' },
            { name: 'indications', title: 'Показания к применению' },
            { name: 'contraindications', title: 'Противопоказания' },
            { name: 'dosage', title: 'Способ применения и дозы' },
            { name: 'side_effects', title: 'Побочные эффекты' },
            { name: 'composition', title: 'Состав' },
            { name: 'storage', title: 'Условия хранения' },
            { name: 'usage', title: 'Условия отпуска' },
            { name: 'producer', title: 'Производитель' }
        ];
        
        // Отображаем основную информацию
        sections.forEach(section => {
            if (adaptedDrug[section.name]) {
                const sectionElement = document.createElement('div');
                sectionElement.className = 'drug-section';
                
                const titleElement = document.createElement('div');
                titleElement.className = 'section-title';
                titleElement.textContent = section.title;
                
                const contentElement = document.createElement('div');
                contentElement.className = 'section-content';
                
                if (section.name === 'dosage' && adaptedDrug.dosage_html) {
                    contentElement.innerHTML = adaptedDrug.dosage_html;
                } else {
                    contentElement.textContent = adaptedDrug[section.name];
                }
                
                sectionElement.appendChild(titleElement);
                sectionElement.appendChild(contentElement);
                drugSummary.appendChild(sectionElement);
            }
        });
        
        drugContent.appendChild(drugSummary);
        
        // Показываем кнопку "Сообщить об ошибке"
        const reportErrorBtn = document.getElementById('reportError');
        if (reportErrorBtn) {
            reportErrorBtn.style.display = 'flex';
            reportErrorBtn.classList.add('visible');
        }
        
        console.log('Информация о препарате успешно отображена');
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
