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
            
            console.log('URL для drugs:', `${API_BASE_URL}/drugs.json`);
            // Загружаем локальные данные
            const drugsResponse = await fetch(`${API_BASE_URL}/drugs.json`);
            
            if (!drugsResponse.ok) {
                console.error('Ошибка HTTP при загрузке данных:', drugsResponse.status, drugsResponse.statusText);
                throw new Error(`Ошибка при загрузке данных: HTTP ${drugsResponse.status} ${drugsResponse.statusText}`);
            }
            
            console.log('Файл получен, начинаем парсинг JSON...');
            const drugsJson = await drugsResponse.json();
            console.log('Данные препаратов загружены успешно');
            
            // Проверяем структуру данных
            if (Array.isArray(drugsJson)) {
                drugsData = drugsJson;
                console.log('Данные в формате массива');
            } else if (drugsJson && drugsJson.results) {
                drugsData = drugsJson.results;
                console.log('Данные в формате {results: [...]}');
            } else {
                console.error('Неверный формат данных:', typeof drugsJson, drugsJson ? Object.keys(drugsJson) : 'null');
                throw new Error('Неверный формат данных препаратов');
            }
            
            console.log('Данные успешно загружены');
            console.log('Количество препаратов:', drugsData.length);
            loadingDiv.style.display = 'none';
            
            // Отображаем сообщение об успешной загрузке
            if (drugsData.length > 0) {
                searchInput.placeholder = `Поиск среди ${drugsData.length} препаратов...`;
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

    // Функция поиска препаратов с поддержкой новой структуры
    function searchDrugs(query) {
        if (!drugsData) {
            errorDiv.textContent = 'Данные еще не загружены';
            errorDiv.style.display = 'block';
            return;
        }
        
        console.log(`Выполняется поиск по запросу "${query}"`);
        
        const threshold = 0.7; // Порог схожести для нечеткого поиска
        query = query.toLowerCase();
        
        // Поиск по препаратам с учетом схожести
        const drugResults = drugsData.filter(drug => {
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
        });
        
        console.log(`Найдено ${drugResults.length} препаратов`);
        
        // Логирование элементов перед отображением
        console.log('Элементы DOM перед отображением:', {
            confirmationSection: {
                element: confirmationSection,
                display: confirmationSection ? window.getComputedStyle(confirmationSection).display : 'unknown',
                visibility: confirmationSection ? window.getComputedStyle(confirmationSection).visibility : 'unknown'
            },
            drugOptions: {
                element: drugOptions,
                display: drugOptions ? window.getComputedStyle(drugOptions).display : 'unknown',
                visibility: drugOptions ? window.getComputedStyle(drugOptions).visibility : 'unknown'
            },
            results: {
                element: document.getElementById('results'),
                display: document.getElementById('results') ? window.getComputedStyle(document.getElementById('results')).display : 'unknown',
                visibility: document.getElementById('results') ? window.getComputedStyle(document.getElementById('results')).visibility : 'unknown'
            }
        });
        
        // Сортируем результаты по релевантности
        drugResults.sort((a, b) => {
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
        if (drugResults.length > 1) {
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
                showDrugOptions(drugResults);
                
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
                    resultHeader.textContent = `Найдено ${drugResults.length} препаратов по запросу "${query}"`;
                    fallbackList.appendChild(resultHeader);
                    
                    // Добавляем препараты в список
                    drugResults.slice(0, 20).forEach((drug, index) => {
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
                    if (drugResults.length > 20) {
                        const moreInfo = document.createElement('div');
                        moreInfo.style.fontStyle = 'italic';
                        moreInfo.style.color = '#666';
                        moreInfo.style.marginTop = '10px';
                        moreInfo.textContent = `Показаны первые 20 результатов из ${drugResults.length}. Уточните запрос для более точных результатов.`;
                        fallbackList.appendChild(moreInfo);
                    }
                }
            }
        } 
        // Если найден ровно один препарат, показываем информацию о нем
        else if (drugResults.length === 1) {
            console.log('Найден один препарат, показываем информацию');
            currentDrug = drugResults[0];
            const selectedCategories = getSelectedCategories();
            confirmationSection.style.display = 'none';
            displayFilteredDrugInfo(currentDrug);
        } 
        // Если ничего не найдено, показываем сообщение об ошибке
        else {
            console.log('Препараты не найдены');
            confirmationSection.style.display = 'none';
            drugInfo.style.display = 'none';
            errorDiv.textContent = 'Препараты не найдены. Попробуйте изменить запрос.';
            errorDiv.style.display = 'block';
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

    // Обновленная функция для показа списка найденных препаратов
    function showDrugOptions(results) {
        console.log('Отображение списка найденных препаратов:', results.length);
        
        // Проверяем наличие контейнеров для отображения
        if (!confirmationSection) {
            console.error('Элемент confirmationSection не найден в DOM');
            return;
        }
        
        if (!drugOptions) {
            console.error('Элемент drugOptions не найден в DOM');
            return;
        }
        
        // Показываем блок выбора препаратов
        confirmationSection.style.display = 'block';
        confirmationSection.classList.add('visible', 'active');
        drugOptions.innerHTML = '';
        drugOptions.style.display = 'block';
        drugOptions.classList.add('visible', 'active');
        
        console.log('Установлены классы для отображения:', {
            confirmationSection: confirmationSection.className,
            drugOptions: drugOptions.className
        });
        
        // Добавим заголовок для ясности
        const headerText = document.createElement('div');
        headerText.className = 'confirmation-header';
        headerText.textContent = `Найдено ${results.length} препаратов. Выберите один из списка:`;
        drugOptions.appendChild(headerText);
        
        // Создаем список препаратов
        let optionsAdded = 0;
        
        results.slice(0, 20).forEach((drug, index) => { // Ограничиваем 20 результатами
            console.log(`Препарат ${index + 1}:`, drug.name);
            
            const option = document.createElement('div');
            option.className = 'drug-option';
            
            const optionName = document.createElement('div');
            optionName.className = 'drug-option-name';
            optionName.textContent = drug.name || 'Препарат без названия';
            option.appendChild(optionName);
            
            // Добавляем дополнительную информацию
            const addInfo = [];
            
            // Действующие вещества
            if (drug.active_ingredients && drug.active_ingredients.length > 0) {
                addInfo.push(`Действующие вещества: ${drug.active_ingredients.join(', ')}`);
            }
            
            // Форма выпуска
            if (drug.form_type) {
                addInfo.push(`Форма выпуска: ${drug.form_type}`);
            }
            
            // Производитель
            if (drug.manufacturer_info && drug.manufacturer_info.manufacturer) {
                addInfo.push(`Производитель: ${drug.manufacturer_info.manufacturer}`);
            }
            
            // Добавляем дополнительную информацию в опцию
            if (addInfo.length > 0) {
                const optionDetails = document.createElement('div');
                optionDetails.className = 'drug-option-details';
                optionDetails.innerHTML = addInfo.join('<br>');
                option.appendChild(optionDetails);
            }
            
            // Обработчик клика
            option.addEventListener('click', function() {
                console.log('Выбран препарат:', drug.name);
                currentDrug = drug;
                confirmationSection.style.display = 'none';
                
                // Показываем секцию с информацией о препарате
                drugInfo.style.display = 'block';
                drugInfo.classList.add('visible');
                const resultsSection = document.getElementById('results');
                if (resultsSection) {
                    resultsSection.style.display = 'block';
                    resultsSection.classList.add('visible');
                }
                
                displayFilteredDrugInfo(drug);
                
                // Прокручиваем страницу к информации о препарате
                drugInfo.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
            
            drugOptions.appendChild(option);
            optionsAdded++;
        });
        
        console.log(`Добавлено ${optionsAdded} опций в список`);
        
        // Если результатов много, показываем сообщение
        if (results.length > 20) {
            const moreResults = document.createElement('div');
            moreResults.className = 'more-results';
            moreResults.textContent = `Показаны первые 20 результатов из ${results.length}. Уточните запрос для более точных результатов.`;
            drugOptions.appendChild(moreResults);
        }
        
        // Через небольшую задержку проверяем видимость элементов
        setTimeout(() => {
            const computedConfirmStyle = window.getComputedStyle(confirmationSection);
            const computedOptionsStyle = window.getComputedStyle(drugOptions);
            
            console.log('Проверка стилей через таймаут:', {
                confirmationSection: {
                    display: computedConfirmStyle.display,
                    visibility: computedConfirmStyle.visibility,
                    opacity: computedConfirmStyle.opacity
                },
                drugOptions: {
                    display: computedOptionsStyle.display,
                    visibility: computedOptionsStyle.visibility,
                    opacity: computedOptionsStyle.opacity
                }
            });
            
            // Если элементы все еще не видны, добавляем класс force-visible
            if (computedConfirmStyle.display === 'none' || computedOptionsStyle.display === 'none') {
                console.log('Элементы всё еще не видны, применяем дополнительные классы');
                confirmationSection.classList.add('force-visible');
                drugOptions.classList.add('force-visible');
            }
        }, 100);
    }
    
    // Функция отображения отфильтрованной информации о препарате
    function displayFilteredDrugInfo(drug) {
        if (!drug) {
            console.error('Нет данных о препарате для отображения');
            return;
        }
        
        console.log('Отображение информации о препарате:', drug.name);
        
        // Показываем блок информации о препарате
        drugInfo.style.display = 'block';
        drugInfo.classList.add('visible');
        
        const resultsSection = document.getElementById('results');
        if (resultsSection) {
            resultsSection.style.display = 'block';
            resultsSection.classList.add('visible');
        }
        
        drugContent.innerHTML = '';
        
        // Заголовок с названием препарата
        const drugHeader = document.createElement('div');
        drugHeader.className = 'drug-header';
        
        const drugTitle = document.createElement('h2');
        drugTitle.className = 'drug-title';
        drugTitle.textContent = drug.name || 'Препарат без названия';
        drugHeader.appendChild(drugTitle);
        
        // Кнопка "Подробнее"
        const detailsButton = document.createElement('button');
        detailsButton.className = 'details-button';
        detailsButton.textContent = 'Подробная информация';
        detailsButton.addEventListener('click', () => {
            displayDrugInfo(drug, getSelectedCategories());
        });
        drugHeader.appendChild(detailsButton);
        
        drugContent.appendChild(drugHeader);
        
        // Адаптируем структуру препарата к отображению
        const adaptedDrug = adaptDrugData(drug);
        
        // Краткая информация о препарате
        const drugSummary = document.createElement('div');
        drugSummary.className = 'drug-summary';
        
        // Получаем выбранные категории
        const selectedCategories = getSelectedCategories();
        
        // Определяем порядок и категории разделов информации
        const sections = [
            // Активные вещества (с особой обработкой для массива)
            {
                name: 'active_ingredients',
                title: 'Действующие вещества',
                category: 'Состав',
                customFormat: (value) => Array.isArray(value) ? value.join(', ') : value
            },
            // Форма выпуска
            {
                name: 'form_type',
                title: 'Форма выпуска',
                category: 'Дозировка'
            },
            // Показания к применению
            {
                name: 'indications',
                title: 'Показания к применению',
                category: 'Показания'
            },
            // Противопоказания
            {
                name: 'contraindications',
                title: 'Противопоказания',
                category: 'Противопоказания'
            },
            // Способ применения и дозы
            {
                name: 'dosage',
                title: 'Способ применения и дозы',
                category: 'Дозировка'
            },
            // Побочные эффекты
            {
                name: 'side_effects',
                title: 'Побочные эффекты',
                category: 'Побочные эффекты'
            },
            // Состав
            {
                name: 'composition',
                title: 'Состав',
                category: 'Состав'
            },
            // Условия хранения
            {
                name: 'storage',
                title: 'Условия хранения',
                category: 'Хранение'
            },
            // Срок годности
            {
                name: 'shelf_life',
                title: 'Срок годности',
                category: 'Хранение'
            },
            // Условия отпуска
            {
                name: 'usage',
                title: 'Условия отпуска',
                category: 'Условия отпуска',
                customFormat: formatUsageWithIcon
            },
            // Производитель
            {
                name: 'producer',
                title: 'Производитель',
                category: 'Регистрационная информация'
            },
            // Страна производства
            {
                name: 'producer_country',
                title: 'Страна производства',
                category: 'Регистрационная информация'
            }
        ];
        
        // Отображаем выбранные разделы или все, если категории не выбраны
        sections.forEach(section => {
            if (selectedCategories.length === 0 || selectedCategories.includes(section.category)) {
                const value = adaptedDrug[section.name];
                
                if (value && (typeof value === 'string' ? value.trim() : true)) {
                    const sectionElement = document.createElement('div');
                    sectionElement.className = 'drug-section';
                    
                    const titleElement = document.createElement('div');
                    titleElement.className = 'section-title';
                    titleElement.textContent = section.title;
                    
                    const contentElement = document.createElement('div');
                    contentElement.className = 'section-content';
                    
                    if (section.customFormat) {
                        // Если есть функция форматирования, используем ее
                        let formattedContent;
                        
                        // Для условий отпуска передаем дополнительную информацию о препарате
                        if (section.name === 'usage') {
                            formattedContent = section.customFormat(value, drug);
                        } else {
                            formattedContent = section.customFormat(value);
                        }
                        
                        if (typeof formattedContent === 'string') {
                            contentElement.textContent = formattedContent;
                        } else if (formattedContent instanceof HTMLElement) {
                            contentElement.appendChild(formattedContent);
                        } else if (formattedContent instanceof DocumentFragment) {
                            contentElement.appendChild(formattedContent);
                        }
                    } else {
                        contentElement.textContent = value;
                    }
                    
                    sectionElement.appendChild(titleElement);
                    sectionElement.appendChild(contentElement);
                    drugSummary.appendChild(sectionElement);
                }
            }
        });
        
        // Добавляем краткую информацию в содержимое
        drugContent.appendChild(drugSummary);
        
        // Показываем кнопку "Сообщить об ошибке"
        if (reportErrorBtn) {
            reportErrorBtn.style.display = 'flex';
            reportErrorBtn.classList.add('visible');
        }
        
        console.log('Информация о препарате успешно отображена');
    }
    
    // Функция для форматирования условий отпуска с иконкой
    function formatUsageWithIcon(usageText, drugInfo) {
        if (!usageText) return '';
        
        const container = document.createElement('div');
        container.className = 'usage-container';
        
        const textLower = usageText.toLowerCase();
        
        // Создаем иконку в зависимости от текста условий отпуска
        const iconSpan = document.createElement('span');
        iconSpan.className = 'usage-icon';
        
        let iconClass = '';
        let baseTitle = '';
        let isInjection = textLower.includes('укол') || textLower.includes('инъекц') || textLower.includes('шприц');
        let isTablet = textLower.includes('таблет') || textLower.includes('капсул');
        let isLiquid = textLower.includes('сироп') || textLower.includes('суспенз') || textLower.includes('раствор');
        let isExternal = textLower.includes('наружн') || textLower.includes('мазь') || textLower.includes('крем') || textLower.includes('гель');
        
        // Определяем форму выпуска из информации о препарате, если текст не содержит явного указания
        if (drugInfo) {
            if (!isInjection && !isTablet && !isLiquid && !isExternal) {
                const formType = drugInfo.form_type ? drugInfo.form_type.toLowerCase() : '';
                
                isInjection = formType.includes('укол') || formType.includes('инъекц') || formType.includes('шприц');
                isTablet = formType.includes('таблет') || formType.includes('капсул');
                isLiquid = formType.includes('сироп') || formType.includes('суспенз') || formType.includes('раствор') || 
                           formType.includes('капли') || formType.includes('жидк');
                isExternal = formType.includes('наружн') || formType.includes('мазь') || formType.includes('крем') || 
                             formType.includes('гель') || formType.includes('местн');
            }
        }
        
        // Определяем, нужен ли рецепт более точно
        const { isPrescription, reason } = analyzePrescriptionStatus(usageText, drugInfo);
        
        if (isPrescription) {
            baseTitle = 'Отпускается по рецепту';
            iconClass = 'prescription-container';
            
            // Базовая иконка для рецептурного отпуска
            let svgContent = `
                <svg viewBox="0 0 24 24" width="24" height="24" class="prescription-icon">
                    <path d="M9 12h6m-6-4h6m-6 8h3m2-12h5a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h5m3 0v4m-3-4v4"/>
                </svg>
            `;
            
            // Заменяем иконку в зависимости от формы препарата
            if (isInjection) {
                svgContent = `
                    <svg viewBox="0 0 24 24" width="24" height="24" class="injection-icon">
                        <path d="M6 18L18 6m-9 9l3-3m-5-5l3-3m2 8l3-3m2 2l1-1m-5-5l3 3"/>
                        <path d="M15 9L9 15"/>
                    </svg>
                `;
                baseTitle = 'Инъекционный препарат (по рецепту)';
                iconClass = 'injection-container';
            } else if (isTablet) {
                svgContent = `
                    <svg viewBox="0 0 24 24" width="24" height="24" class="tablet-icon">
                        <circle cx="12" cy="12" r="7"/>
                        <path d="M12 9v6"/>
                        <path d="M9 12h6"/>
                    </svg>
                `;
                baseTitle = 'Таблетки (по рецепту)';
                iconClass = 'tablet-container';
            } else if (isLiquid) {
                svgContent = `
                    <svg viewBox="0 0 24 24" width="24" height="24" class="liquid-icon">
                        <path d="M12 2v6l-3 6v6a2 2 0 002 2h2a2 2 0 002-2v-6l-3-6V2"/>
                        <path d="M10 14h4"/>
                    </svg>
                `;
                baseTitle = 'Жидкая форма (по рецепту)';
                iconClass = 'liquid-container';
            } else if (isExternal) {
                svgContent = `
                    <svg viewBox="0 0 24 24" width="24" height="24" class="external-icon">
                        <path d="M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                        <path d="M12 7c2 0 4 1 4 3s-1 3-4 3-4-1-4-3 2-3 4-3z"/>
                        <path d="M8 16h8"/>
                    </svg>
                `;
                baseTitle = 'Наружное применение (по рецепту)';
                iconClass = 'external-container';
            }
            
            iconSpan.innerHTML = svgContent;
            iconSpan.title = baseTitle;
            iconSpan.classList.add(iconClass.replace('-container', '-icon-container'));
            
        } else {
            baseTitle = 'Отпускается без рецепта';
            iconClass = 'no-prescription-container';
            
            // Базовая иконка для безрецептурного отпуска
            let svgContent = `
                <svg viewBox="0 0 24 24" width="24" height="24" class="no-prescription-icon">
                    <path d="M12 4v4m-2 4h4m-4 4v4m8-16v16M4 12h16"/>
                </svg>
            `;
            
            // Заменяем иконку в зависимости от формы препарата
            if (isInjection) {
                svgContent = `
                    <svg viewBox="0 0 24 24" width="24" height="24" class="injection-icon">
                        <path d="M6 18L18 6m-9 9l3-3m-5-5l3-3m2 8l3-3m2 2l1-1m-5-5l3 3"/>
                        <path d="M15 9L9 15"/>
                    </svg>
                `;
                baseTitle = 'Инъекционный препарат (без рецепта)';
                iconClass = 'injection-container';
            } else if (isTablet) {
                svgContent = `
                    <svg viewBox="0 0 24 24" width="24" height="24" class="tablet-icon">
                        <circle cx="12" cy="12" r="7"/>
                        <path d="M12 9v6"/>
                        <path d="M9 12h6"/>
                    </svg>
                `;
                baseTitle = 'Таблетки (без рецепта)';
                iconClass = 'tablet-container';
            } else if (isLiquid) {
                svgContent = `
                    <svg viewBox="0 0 24 24" width="24" height="24" class="liquid-icon">
                        <path d="M12 2v6l-3 6v6a2 2 0 002 2h2a2 2 0 002-2v-6l-3-6V2"/>
                        <path d="M10 14h4"/>
                    </svg>
                `;
                baseTitle = 'Жидкая форма (без рецепта)';
                iconClass = 'liquid-container';
            } else if (isExternal) {
                svgContent = `
                    <svg viewBox="0 0 24 24" width="24" height="24" class="external-icon">
                        <path d="M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                        <path d="M12 7c2 0 4 1 4 3s-1 3-4 3-4-1-4-3 2-3 4-3z"/>
                        <path d="M8 16h8"/>
                    </svg>
                `;
                baseTitle = 'Наружное применение (без рецепта)';
                iconClass = 'external-container';
            }
            
            iconSpan.innerHTML = svgContent;
            iconSpan.title = baseTitle;
            iconSpan.classList.add(iconClass.replace('-container', '-icon-container'));
        }
        
        // Добавляем класс для совместимости со старыми браузерами
        container.classList.add(iconClass);
        
        // Создаем текстовый элемент
        const textSpan = document.createElement('span');
        textSpan.className = 'usage-text';
        textSpan.textContent = usageText;
        
        // Для отладки добавим скрытый элемент с информацией о распознавании
        if (tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.is_bot) {
            const debugInfo = document.createElement('div');
            debugInfo.style.fontSize = '10px';
            debugInfo.style.color = '#999';
            debugInfo.style.marginTop = '4px';
            debugInfo.innerHTML = `DEBUG: isPrescription=${isPrescription}, reason=${reason}`;
            container.appendChild(debugInfo);
        }
        
        container.appendChild(iconSpan);
        container.appendChild(textSpan);
        
        return container;
    }
    
    // Функция для анализа рецептурного статуса препарата
    function analyzePrescriptionStatus(text, drugInfo) {
        if (!text) return { isPrescription: false, reason: 'no_text' };
        
        const textLower = text.toLowerCase();
        
        // Явные указания на безрецептурный отпуск
        const noPrescriptionPatterns = [
            'без рецепта', 
            'безрецептурный', 
            'безрецептурн',
            'отпускается без рецепта',
            'без рецепта врача',
            'отпуск без рецепта'
        ];
        
        // Явные указания на рецептурный отпуск
        const prescriptionPatterns = [
            'по рецепту',
            'рецептурный',
            'по рецепту врача',
            'отпускается по рецепту',
            'только по рецепту'
        ];
        
        // Используем информацию о типе препарата, если она доступна
        if (drugInfo) {
            // Проверяем, есть ли специальные маркеры рецептурного отпуска
            if (drugInfo.is_prescription === true) {
                return { isPrescription: true, reason: 'drug_info_prescription' };
            }
            
            if (drugInfo.is_prescription === false) {
                return { isPrescription: false, reason: 'drug_info_no_prescription' };
            }
            
            // Проверяем название на наличие маркеров сильнодействующих препаратов
            const drugName = drugInfo.name ? drugInfo.name.toLowerCase() : '';
            const prescriptionNameMarkers = ['антибиотик', 'наркотическ', 'психотроп', 'кодеин'];
            
            for (const marker of prescriptionNameMarkers) {
                if (drugName.includes(marker)) {
                    return { isPrescription: true, reason: `prescription_name_marker: ${marker}` };
                }
            }
        }
        
        // Проверяем сначала явные указания на безрецептурный отпуск
        for (const pattern of noPrescriptionPatterns) {
            if (textLower.includes(pattern)) {
                return { isPrescription: false, reason: `explicit_no_prescription: ${pattern}` };
            }
        }
        
        // Затем проверяем явные указания на рецептурный отпуск
        for (const pattern of prescriptionPatterns) {
            if (textLower.includes(pattern)) {
                return { isPrescription: true, reason: `explicit_prescription: ${pattern}` };
            }
        }
        
        // Если слово "рецепт" встречается в тексте, но нет явных указаний на безрецептурный
        // отпуск, то считаем, что препарат рецептурный
        if (textLower.includes('рецепт')) {
            return { isPrescription: true, reason: 'implicit_prescription' };
        }
        
        // По умолчанию считаем, что препарат безрецептурный
        return { isPrescription: false, reason: 'default_no_prescription' };
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

    // Загружаем данные при инициализации
    loadDrugsData();

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
    const confirmationTitle = confirmationSection.querySelector('.confirmation-title');
    confirmationSection.insertBefore(resultsCounter, confirmationTitle.nextSibling);

    // Создаем элемент для каждого найденного препарата
    filteredDrugs.forEach(drug => {
        const drugItem = document.createElement('div');
        drugItem.className = 'drug-item';
        
        // Анализируем тип препарата и добавляем соответствующие классы
        const drugTypes = analyzeDrugType(drug);
        drugTypes.forEach(type => {
            drugItem.classList.add(type);
        });
        
        // Определяем иконку в зависимости от типа
        let drugTypeIcon = '';
        if (drugTypes.includes('injection')) {
            drugTypeIcon = `<svg class="drug-type-icon injection-icon" viewBox="0 0 24 24" width="18" height="18">
                <path d="M18 2l4 4-4.5 4.5-3-3L13 9l3 3-8 8-3-3 8-8-1.5-1.5-1.5 1.5-3-3L13 1.5z"/>
                <path d="M3.59 13.41l7 7A2 2 0 0 0 15 17l-7-7a2 2 0 0 0-4.41 3.41z"/>
            </svg>`;
        } else if (drugTypes.includes('tablet')) {
            drugTypeIcon = `<svg class="drug-type-icon tablet-icon" viewBox="0 0 24 24" width="18" height="18">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" />
                <line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" stroke-width="2" />
            </svg>`;
        } else if (drugTypes.includes('liquid')) {
            drugTypeIcon = `<svg class="drug-type-icon liquid-icon" viewBox="0 0 24 24" width="18" height="18">
                <path d="M12,3c0,0-6,9-6,13c0,3.3,2.7,6,6,6s6-2.7,6-6C18,12,12,3,12,3z" />
                <path d="M10 14 L14 14" stroke="white" stroke-width="1.5" />
                <path d="M10 17 L14 17" stroke="white" stroke-width="1.5" />
            </svg>`;
        } else if (drugTypes.includes('external')) {
            drugTypeIcon = `<svg class="drug-type-icon external-icon" viewBox="0 0 24 24" width="18" height="18">
                <path d="M7,3h10c1.1,0,2,0.9,2,2v14c0,1.1-0.9,2-2,2H7c-1.1,0-2-0.9-2-2V5C5,3.9,5.9,3,7,3z" />
                <path d="M7 8 L17 8" stroke="white" stroke-width="1.5" />
                <path d="M7 12 L17 12" stroke="white" stroke-width="1.5" />
                <path d="M7 16 L13 16" stroke="white" stroke-width="1.5" />
            </svg>`;
        }
        
        // Определяем иконку в зависимости от рецептурного статуса
        let prescriptionIcon = '';
        if (drugTypes.includes('prescription')) {
            prescriptionIcon = `<svg class="prescription-status-icon prescription-icon" viewBox="0 0 24 24" width="18" height="18">
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/>
                <path d="M12 6a1 1 0 0 0-1 1v5a1 1 0 0 0 .293.707l3 3a1 1 0 0 0 1.414-1.414L13 11.586V7a1 1 0 0 0-1-1z"/>
            </svg>`;
        } else {
            prescriptionIcon = `<svg class="prescription-status-icon otc-icon" viewBox="0 0 24 24" width="18" height="18">
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/>
                <path d="M12 6a1 1 0 0 0-1 1v4H7a1 1 0 0 0 0 2h4v4a1 1 0 0 0 2 0v-4h4a1 1 0 0 0 0-2h-4V7a1 1 0 0 0-1-1z"/>
            </svg>`;
        }
        
        // Отображаем название препарата с иконками
        drugItem.innerHTML = `
            <div class="drug-item-header">
                <div class="drug-icons">
                    ${prescriptionIcon}
                    ${drugTypeIcon}
                </div>
                <div class="drug-name">${drug.name || 'Препарат без названия'}</div>
            </div>
            <div class="drug-item-body">
                <div class="drug-active-ingredients">${drug.active_ingredients ? (Array.isArray(drug.active_ingredients) ? drug.active_ingredients.join(', ') : drug.active_ingredients) : 'Нет данных о действующих веществах'}</div>
            </div>
        `;

        // Добавляем обработчик событий для отображения полной информации
        drugItem.addEventListener('click', () => {
            // Показываем полную информацию о препарате
            displayDrugInfo(drug, getSelectedCategories());
        });

        // Добавляем элемент в контейнер
        drugOptionsContainer.appendChild(drugItem);
    });

    // Показываем секцию с результатами
    document.getElementById('confirmation-section').style.display = 'block';
}

// Обновляем функцию displayDrugInfo для модального окна
function displayDrugInfo(drug, selectedCategories) {
    const modal = document.getElementById('drugInfoModal');
    const modalTitle = document.getElementById('drugInfoTitle');
    const modalBody = document.getElementById('drugInfoContent');
    
    // Анализируем тип препарата
    const drugTypes = analyzeDrugType(drug);
    
    // Создаем заголовок с иконками типа препарата
    let titleWithIcons = '';
    
    // Определяем иконку в зависимости от рецептурного статуса
    if (drugTypes.includes('prescription')) {
        titleWithIcons += `<svg class="prescription-status-icon prescription-icon modal-icon" viewBox="0 0 24 24" width="24" height="24">
            <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/>
            <path d="M12 6a1 1 0 0 0-1 1v5a1 1 0 0 0 .293.707l3 3a1 1 0 0 0 1.414-1.414L13 11.586V7a1 1 0 0 0-1-1z"/>
        </svg>`;
    } else {
        titleWithIcons += `<svg class="prescription-status-icon otc-icon modal-icon" viewBox="0 0 24 24" width="24" height="24">
            <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/>
            <path d="M12 6a1 1 0 0 0-1 1v4H7a1 1 0 0 0 0 2h4v4a1 1 0 0 0 2 0v-4h4a1 1 0 0 0 0-2h-4V7a1 1 0 0 0-1-1z"/>
        </svg>`;
    }
    
    // Добавляем иконку типа препарата
    if (drugTypes.includes('injection')) {
        titleWithIcons += `<svg class="drug-type-icon injection-icon modal-icon" viewBox="0 0 24 24" width="24" height="24">
            <path d="M18 2l4 4-4.5 4.5-3-3L13 9l3 3-8 8-3-3 8-8-1.5-1.5-1.5 1.5-3-3L13 1.5z"/>
            <path d="M3.59 13.41l7 7A2 2 0 0 0 15 17l-7-7a2 2 0 0 0-4.41 3.41z"/>
        </svg>`;
    } else if (drugTypes.includes('tablet')) {
        titleWithIcons += `<svg class="drug-type-icon tablet-icon modal-icon" viewBox="0 0 24 24" width="24" height="24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" />
            <line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" stroke-width="2" />
        </svg>`;
    } else if (drugTypes.includes('liquid')) {
        titleWithIcons += `<svg class="drug-type-icon liquid-icon modal-icon" viewBox="0 0 24 24" width="24" height="24">
            <path d="M12,3c0,0-6,9-6,13c0,3.3,2.7,6,6,6s6-2.7,6-6C18,12,12,3,12,3z" />
            <path d="M10 14 L14 14" stroke="white" stroke-width="1.5" />
            <path d="M10 17 L14 17" stroke="white" stroke-width="1.5" />
        </svg>`;
    } else if (drugTypes.includes('external')) {
        titleWithIcons += `<svg class="drug-type-icon external-icon modal-icon" viewBox="0 0 24 24" width="24" height="24">
            <path d="M7,3h10c1.1,0,2,0.9,2,2v14c0,1.1-0.9,2-2,2H7c-1.1,0-2-0.9-2-2V5C5,3.9,5.9,3,7,3z" />
            <path d="M7 8 L17 8" stroke="white" stroke-width="1.5" />
            <path d="M7 12 L17 12" stroke="white" stroke-width="1.5" />
            <path d="M7 16 L13 16" stroke="white" stroke-width="1.5" />
        </svg>`;
    }
    
    titleWithIcons += `<span class="modal-title-text">${drug.name || 'Препарат без названия'}</span>`;
    
    modalTitle.innerHTML = titleWithIcons;
    modalBody.innerHTML = '';
    
    // Далее идет существующий код функции...
    
    // Адаптируем структуру препарата к отображению
    const adaptedDrug = adaptDrugData(drug);
    
    // Определяем порядок разделов информации
    const sections = [
        { 
            name: 'active_ingredients', 
            title: 'Действующие вещества', 
            category: 'Состав',
            customFormat: (value) => Array.isArray(value) ? value.join(', ') : value
        },
        { 
            name: 'trade_names', 
            title: 'Торговые наименования', 
            category: 'Фармакотерапевтическая группа' 
        },
        { 
            name: 'indications', 
            title: 'Показания к применению', 
            category: 'Показания' 
        },
        { 
            name: 'side_effects', 
            title: 'Побочные эффекты', 
            category: 'Побочные эффекты' 
        },
        { 
            name: 'contraindications', 
            title: 'Противопоказания', 
            category: 'Противопоказания' 
        },
        { 
            name: 'composition', 
            title: 'Состав', 
            category: 'Состав' 
        },
        { 
            name: 'dosage', 
            title: 'Способ применения и дозы', 
            category: 'Дозировка' 
        },
        { 
            name: 'mechanism', 
            title: 'Фармакотерапевтическая группа', 
            category: 'Фармакотерапевтическая группа' 
        },
        { 
            name: 'producer', 
            title: 'Производитель', 
            category: 'Регистрационная информация' 
        },
        { 
            name: 'producer_country', 
            title: 'Страна производства', 
            category: 'Регистрационная информация' 
        },
        { 
            name: 'registration_number', 
            title: 'Регистрационный номер', 
            category: 'Регистрационная информация' 
        },
        { 
            name: 'registration_date', 
            title: 'Дата регистрации', 
            category: 'Регистрационная информация' 
        },
        { 
            name: 'registration_holder', 
            title: 'Держатель регистрационного удостоверения', 
            category: 'Регистрационная информация' 
        },
        { 
            name: 'registration_holder_country', 
            title: 'Страна держателя рег. удостоверения', 
            category: 'Регистрационная информация' 
        },
        { 
            name: 'registration_expiry', 
            title: 'Срок действия регистрации', 
            category: 'Регистрационная информация' 
        },
        { 
            name: 'storage', 
            title: 'Условия хранения', 
            category: 'Хранение' 
        },
        { 
            name: 'shelf_life', 
            title: 'Срок годности', 
            category: 'Хранение' 
        },
        { 
            name: 'form_type', 
            title: 'Форма выпуска', 
            category: 'Дозировка' 
        },
        { 
            name: 'usage', 
            title: 'Условия отпуска', 
            category: 'Условия отпуска',
            customFormat: formatUsageWithIcon
        },
        { 
            name: 'protection_period', 
            title: 'Период защитного действия', 
            category: 'Дозировка' 
        }
    ];
    
    // Показываем информацию в соответствии с выбранными категориями или все, если категории не выбраны
    sections.forEach(section => {
        // Если категории не выбраны или выбрана категория данного раздела, показываем информацию
        if (selectedCategories.length === 0 || selectedCategories.includes(section.category)) {
            const value = adaptedDrug[section.name];
            
            if (value && (typeof value === 'string' ? value.trim() : true)) {
                const sectionElement = document.createElement('div');
                sectionElement.className = 'drug-info-section';
                
                const titleElement = document.createElement('div');
                titleElement.className = 'drug-info-title';
                titleElement.textContent = section.title;
                
                const contentElement = document.createElement('div');
                contentElement.className = 'drug-info-content';
                
                if (section.customFormat) {
                    // Если есть функция форматирования, используем ее
                    let formattedContent;
                    
                    // Для условий отпуска передаем дополнительную информацию о препарате
                    if (section.name === 'usage') {
                        formattedContent = section.customFormat(value, drug);
                    } else {
                        formattedContent = section.customFormat(value);
                    }
                    
                    if (typeof formattedContent === 'string') {
                        contentElement.textContent = formattedContent;
                    } else if (formattedContent instanceof HTMLElement) {
                        contentElement.appendChild(formattedContent);
                    } else if (formattedContent instanceof DocumentFragment) {
                        contentElement.appendChild(formattedContent);
                    }
                } else {
                    contentElement.textContent = value;
                }
                
                sectionElement.appendChild(titleElement);
                sectionElement.appendChild(contentElement);
                modalBody.appendChild(sectionElement);
            }
        }
    });
    
    // Добавляем кнопку сообщить об ошибке
    const reportButtonContainer = document.createElement('div');
    reportButtonContainer.style.textAlign = 'center';
    reportButtonContainer.style.marginTop = '20px';
    
    const reportButton = document.createElement('button');
    reportButton.className = 'btn';
    reportButton.textContent = 'Сообщить об ошибке';
    reportButton.onclick = () => {
        // Открываем окно сообщения об ошибке
        reportError();
        // Закрываем модальное окно с информацией
        modal.style.display = 'none';
    };
    
    reportButtonContainer.appendChild(reportButton);
    modalBody.appendChild(reportButtonContainer);
    
    // Показываем модальное окно
    modal.style.display = 'flex';
    
    // Добавляем обработчик для закрытия модального окна
    const closeButton = modal.querySelector('.close-modal');
    closeButton.onclick = () => {
        modal.style.display = 'none';
    };
    
    // Закрытие по клику вне модального окна
    modal.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
}

// Функция для адаптации структуры препарата
function adaptDrugData(drug) {
    if (!drug) return {};
    
    const adaptedDrug = { ...drug };
    
    // Извлекаем данные из вложенного объекта manufacturer_info
    if (drug.manufacturer_info) {
        adaptedDrug.producer = drug.manufacturer_info.manufacturer;
        adaptedDrug.producer_country = drug.manufacturer_info.manufacturer_country;
        adaptedDrug.registration_holder = drug.manufacturer_info.registration_holder;
        adaptedDrug.registration_holder_country = drug.manufacturer_info.registration_holder_country;
    }
    
    // Преобразуем активные ингредиенты в строку, если это массив
    if (Array.isArray(drug.active_ingredients)) {
        adaptedDrug.active_ingredients = drug.active_ingredients;
    }
    
    return adaptedDrug;
}

// Инициализация приложения
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

    // Инициализируем фильтры типов препаратов
    initMedicationFilters();
}

// Функция для анализа типа препарата и добавления соответствующих классов для фильтрации
function analyzeDrugType(drug) {
    let drugTypes = [];
    const usageText = drug.usage || '';
    const drugName = drug.name || '';
    const formType = drug.form_type || '';
    const composition = drug.composition || '';
    const indications = drug.indications || '';
    const contraindications = drug.contraindications || '';
    const dosage = drug.dosage || '';
    
    // Определяем, является ли препарат рецептурным или безрецептурным
    const isPrescription = analyzePrescriptionStatus(usageText, drug);
    drugTypes.push(isPrescription ? 'prescription' : 'otc');
    
    // Проверяем, является ли препарат инъекционным
    const isInjection = /\b(укол|инъекц|внутримышечн|внутривенн|парентерал|шприц)\b/i.test(usageText + ' ' + formType + ' ' + dosage);
    if (isInjection) {
        drugTypes.push('injection');
    }
    
    // Проверяем, является ли препарат таблеткой или капсулой
    const isTablet = /\b(таблет|капсул|драже|пилюл)\b/i.test(formType + ' ' + dosage);
    if (isTablet) {
        drugTypes.push('tablet');
    }
    
    // Проверяем, является ли препарат жидкостью (сироп, раствор и т.д.)
    const isLiquid = /\b(сироп|раствор|капл|суспенз|эмульс|настой|отвар|эликсир|микстур)\b/i.test(formType + ' ' + dosage);
    if (isLiquid) {
        drugTypes.push('liquid');
    }
    
    // Проверяем, является ли препарат для наружного применения
    const isExternal = /\b(мазь|крем|гель|паст|присып|примоч|наруж|местн|трансдерм|пластыр|втир|втер|накожн)\b/i.test(formType + ' ' + usageText + ' ' + dosage);
    if (isExternal) {
        drugTypes.push('external');
    }
    
    return drugTypes;
}

// Функция для сохранения активного фильтра в локальное хранилище
function saveActiveFilter(filterType) {
    try {
        localStorage.setItem('activeDrugFilter', filterType);
    } catch (e) {
        console.error('Ошибка при сохранении фильтра:', e);
    }
}

// Функция для загрузки активного фильтра из локального хранилища
function loadActiveFilter() {
    try {
        return localStorage.getItem('activeDrugFilter') || 'all';
    } catch (e) {
        console.error('Ошибка при загрузке фильтра:', e);
        return 'all';
    }
}

// Обновленная функция для инициализации фильтров типов препаратов
function initMedicationFilters() {
    const filterButtons = document.querySelectorAll('.filter-button');
    
    // Загружаем сохраненный фильтр
    let activeFilter = loadActiveFilter();
    
    // Активируем сохраненный фильтр
    filterButtons.forEach(button => {
        if (button.getAttribute('data-filter') === activeFilter) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
        
        button.addEventListener('click', function() {
            const drugOptionsContainer = document.getElementById('drug-options');
            const isResultsVisible = drugOptionsContainer.children.length > 0 && document.getElementById('confirmation-section').style.display !== 'none';
            
            // Удаляем класс active у всех кнопок
            filterButtons.forEach(btn => btn.classList.remove('active'));
            
            // Добавляем класс active к нажатой кнопке
            this.classList.add('active');
            
            // Получаем значение фильтра
            activeFilter = this.getAttribute('data-filter');
            
            // Сохраняем выбранный фильтр
            saveActiveFilter(activeFilter);
            
            // Если результаты поиска еще не отображаются, делаем поиск по всем препаратам
            if (!isResultsVisible) {
                // Загружаем все препараты и фильтруем их
                searchAllDrugs(activeFilter);
            } else {
                // Применяем фильтр к отображаемым препаратам
                applyMedicationFilter(activeFilter);
            }
        });
    });
}

// Функция для плавного скролла к элементу
function smoothScrollTo(element) {
    if (!element) return;
    
    const rect = element.getBoundingClientRect();
    const isVisible = (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
    
    if (!isVisible) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// Обновленная функция для применения фильтра к списку препаратов
function applyMedicationFilter(filterType) {
    const drugItems = document.querySelectorAll('.drug-item');
    let visibleCount = 0;
    
    drugItems.forEach(item => {
        if (filterType === 'all') {
            item.style.display = 'block';
            visibleCount++;
        } else {
            // Проверяем, содержит ли препарат нужный тип
            if (item.classList.contains(filterType)) {
                item.style.display = 'block';
                visibleCount++;
            } else {
                item.style.display = 'none';
            }
        }
    });
    
    // Обновляем счетчик результатов
    const resultsCounter = document.querySelector('.results-counter');
    if (resultsCounter) {
        resultsCounter.innerHTML = `Найдено: <span class="count">${visibleCount}</span> препаратов`;
    }
    
    // Плавно прокручиваем к началу списка
    const drugOptionsContainer = document.getElementById('drug-options');
    if (drugOptionsContainer) {
        smoothScrollTo(drugOptionsContainer.parentElement);
    }
}

// Функция для поиска всех препаратов и фильтрации по типу
async function searchAllDrugs(filterType) {
    try {
        // Показываем индикатор загрузки
        document.getElementById('loading').style.display = 'block';
        
        // Получаем данные о препаратах
        await loadDrugsData();
        
        // Берем все препараты
        const allDrugs = window.drugsData || [];
        
        if (allDrugs.length === 0) {
            throw new Error('Не удалось загрузить данные о препаратах');
        }
        
        // Отсортируем препараты по алфавиту
        const sortedDrugs = [...allDrugs].sort((a, b) => {
            const nameA = (a.name || '').toLowerCase();
            const nameB = (b.name || '').toLowerCase();
            return nameA.localeCompare(nameB);
        });
        
        // Отображаем результаты
        displayFilteredDrugs(sortedDrugs);
        
        // Скрываем индикатор загрузки
        document.getElementById('loading').style.display = 'none';
        
        // Показываем кнопку "Назад"
        showBackButton();
        
        // Применяем фильтр
        if (filterType !== 'all') {
            applyMedicationFilter(filterType);
        }
        
    } catch (error) {
        console.error('Ошибка при поиске всех препаратов:', error);
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').textContent = 'Ошибка при загрузке данных. Пожалуйста, попробуйте позже.';
        document.getElementById('error').style.display = 'block';
    }
}
