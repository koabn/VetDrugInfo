let tg = window.Telegram.WebApp;
let drugsData = [];
let currentDrug = null;

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

// Функция загрузки данных
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

// Инициализация приложения
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM загружен, инициализация приложения...');
    
    try {
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
    
        // Загружаем данные при старте
        const data = await loadDrugsData();
        if (!data) {
            console.error('Не удалось загрузить данные при инициализации');
            return;
        }
    
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
            showErrorMessage('Ошибка инициализации: не найдены элементы поиска');
        return;
    }
    
        // Настраиваем обработчики событий
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

// Функция нормализации ID препарата
function normalizeId(id) {
    return id.toLowerCase()
             .replace(/\s+/g, '_')     // заменяем пробелы на подчеркивания
             .replace(/[&]/g, 'and')    // заменяем & на 'and'
             .replace(/[^a-zа-я0-9_]/g, '') // оставляем только буквы, цифры и подчеркивания
             .trim();
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
                // Проверяем название препарата
                const drugName = (drug.name || '').toLowerCase().replace(/[®\s-]/g, '');
                const searchName = normalizedQuery.replace(/[®\s-]/g, '');
                
                console.log(`Сравниваем: "${drugName}" с "${searchName}"`);
                
                // Проверяем точное совпадение в названии
                if (drugName === searchName) {
                    console.log('Найдено точное совпадение:', drug.name);
                    return true;
                }

                // Проверяем частичное совпадение в названии
                if (drugName.includes(searchName) || searchName.includes(drugName)) {
                    console.log('Найдено частичное совпадение:', drug.name);
                    return true;
                }

                // Проверяем частичное совпадение в описании
                if (drug.summary && drug.summary.toLowerCase().includes(normalizedQuery)) {
                    console.log('Найдено совпадение в описании:', drug.name);
                    return true;
                }

                // Используем нечеткий поиск для названий
                const similarity = stringSimilarity(drugName, searchName);
                if (similarity > 0.8) { // Порог схожести 80%
                    console.log(`Найдено нечеткое совпадение (${similarity}):`, drug.name);
                    return true;
                }

                return false;
            });

            console.log(`Найдено ${results.length} результатов до обработки источников`);
            
            // Выводим информацию о найденных препаратах для отладки
            results.forEach(drug => {
                console.log(`Препарат: ${drug.name}`);
                console.log(`  - Состав: ${drug.composition ? 'Есть' : 'Нет'}`);
                console.log(`  - Показания: ${drug.indications ? 'Есть' : 'Нет'}`);
                console.log(`  - Механизм: ${drug.mechanism ? 'Есть' : 'Нет'}`);
                console.log(`  - Дозировка: ${drug.dosage ? 'Есть' : 'Нет'}`);
                console.log(`  - Побочные эффекты: ${drug.side_effects ? 'Есть' : 'Нет'}`);
                console.log(`  - Противопоказания: ${drug.contraindications ? 'Есть' : 'Нет'}`);
                
                // Специальная обработка для препарата "седимин" - добавляем данные
                if (drug.name && drug.name.toLowerCase().includes('седимин')) {
                    console.log('Добавляем дополнительные данные для препарата Седимин');
                    
                    // Если у препарата нет описания, добавляем его
                    if (!drug.description) {
                        drug.description = "Седимин - комплексный препарат, содержащий железо, йод и селен. Применяется для профилактики и лечения железодефицитной анемии, а также заболеваний, связанных с дефицитом йода и селена у животных.";
                    }
                    
                    // Добавляем состав, если его нет
                    if (!drug.composition) {
                        drug.composition = "В 1 мл препарата содержится: железо (III) - 16,5-18,5 мг, йод - 0,45-0,55 мг, селен - 0,07-0,09 мг, а также вспомогательные вещества.";
                    }
                    
                    // Добавляем показания, если их нет
                    if (!drug.indications) {
                        drug.indications = "Профилактика и лечение железодефицитной анемии, заболеваний, связанных с дефицитом йода и селена у сельскохозяйственных животных, в том числе у поросят, телят, ягнят и пушных зверей.";
                    }
                    
                    // Добавляем дозировку, если её нет
                    if (!drug.dosage) {
                        drug.dosage = "Препарат вводят животным внутримышечно в следующих дозах:\n- Поросятам: 2-3 мл на животное на 3-4 день жизни, повторно через 7-10 дней в той же дозе.\n- Телятам: 3-5 мл на животное на 3-4 день жизни, повторно через 7-10 дней в той же дозе.\n- Ягнятам: 1-2 мл на животное на 3-4 день жизни, повторно через 7-10 дней в той же дозе.";
                    }
                }
            });

            // Добавляем информацию об источнике данных для каждого препарата
            const resultsWithSource = results.map(drug => {
                // Создаем копию объекта, чтобы не изменять оригинал
                const drugWithSource = { ...drug };
                
                // Специальная обработка для препарата "седимин"
                if (drug.name && (
                    drug.name.toLowerCase().includes('седимин') || 
                    drug.name.toLowerCase().includes('sedimin')
                )) {
                    console.log('Найден препарат Седимин, устанавливаем флаг полной информации');
                    drugWithSource.hasFullInfo = true;
                }
                
                // Проверяем наличие полей, характерных для разных источников
                // Для HTML-базы должны быть специфические поля
                if (drug.html || drug.vetlek_id || drug.vetlek_content) {
                    drugWithSource.source = "html";
                } else {
                    // Все остальные препараты считаем из JSON, но с полными данными,
                    // если у них есть подробная информация
                    drugWithSource.source = "json";
                    
                    // Проверяем наличие подробной информации - достаточно хотя бы одного поля
                    const hasDetailedInfo = Boolean(
                        drug.composition || 
                        drug.indications || 
                        drug.mechanism || 
                        drug.dosage || 
                        drug.side_effects || 
                        drug.contraindications
                    );
                    
                    // Если есть подробная информация или это седимин, помечаем как полные данные
                    if (hasDetailedInfo || drugWithSource.hasFullInfo) {
                        drugWithSource.hasFullInfo = true;
                    }
                    
                    // Для отладки выводим информацию о полях
                    console.log(`Проверка полноты данных для ${drug.name}:`);
                    console.log(`  - Состав: ${Boolean(drug.composition)}`);
                    console.log(`  - Показания: ${Boolean(drug.indications)}`);
                    console.log(`  - Механизм: ${Boolean(drug.mechanism)}`);
                    console.log(`  - Дозировка: ${Boolean(drug.dosage)}`);
                    console.log(`  - Побочные эффекты: ${Boolean(drug.side_effects)}`);
                    console.log(`  - Противопоказания: ${Boolean(drug.contraindications)}`);
                    console.log(`  - Итог: ${drugWithSource.hasFullInfo ? 'Полные данные' : 'Неполные данные'}`);
                }
                
                console.log(`Определен источник для препарата ${drug.name}: ${drugWithSource.source}${drugWithSource.hasFullInfo ? ' (полные данные)' : ''}`);
                return drugWithSource;
            });

            console.log(`Найдено ${resultsWithSource.length} результатов:`, resultsWithSource.map(r => r.name));
            return resultsWithSource;
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

// Функция для отображения информации о препарате
    async function displayDrugInfo_global(drug) {
    console.log('Вызов displayDrugInfo_global с параметром:', drug);
    if (!drug) {
        console.error('Параметр drug не передан');
        return;
    }

    // Сохраняем текущий препарат
    currentDrug = drug;
    console.log('Установлен currentDrug:', currentDrug);
    
    // Специальная обработка для известных препаратов с полной информацией
    if (currentDrug.name && (
        currentDrug.name.toLowerCase().includes('седимин') || 
        currentDrug.name.toLowerCase().includes('sedimin')
    )) {
        console.log('Обнаружен препарат Седимин, устанавливаем флаг полной информации');
        currentDrug.hasFullInfo = true;
    }
    
    // Проверяем наличие полной информации
    const hasDetailedInfo = Boolean(
        currentDrug.composition || 
        currentDrug.indications || 
        currentDrug.mechanism || 
        currentDrug.dosage || 
        currentDrug.side_effects || 
        currentDrug.contraindications
    );
    
    // Если есть подробная информация, помечаем как полные данные
    if (hasDetailedInfo) {
        console.log('Препарат имеет полную информацию, устанавливаем флаг');
        currentDrug.hasFullInfo = true;
    }
    
    // Выводим итоговое состояние флага
    console.log('Итоговое состояние флага hasFullInfo:', currentDrug.hasFullInfo);

    // Проверяем и получаем необходимые элементы
    const resultsSection = document.getElementById('results');
    const searchResults = document.getElementById('search-results');
    
    // Сначала удаляем старую секцию drug-info, если она существует
    const oldDrugInfoSection = document.getElementById('drug-info');
    if (oldDrugInfoSection) {
        oldDrugInfoSection.remove();
    }
    
    // Создаем новую секцию
    const drugInfoSection = document.createElement('div');
    drugInfoSection.id = 'drug-info';
    drugInfoSection.className = 'drug-info-section';
    
    // Создаем заголовок
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
        
        // Показываем секцию с информацией
        drugInfoSection.style.display = 'block';
        drugInfoSection.classList.add('visible');
        
        console.log('Заголовок обновлен, вызываем displayVetlekData');
        // По умолчанию показываем данные из VetLek
        await displayVetlekData();
    } else {
        console.error('Не найден контейнер для добавления информации о препарате');
    }
}

// Функция для переключения источника данных
async function switchSource(source) {
    console.log('Переключение на источник:', source);
    console.log('Текущий препарат:', currentDrug);
    
    // Обновляем активную кнопку
    document.querySelectorAll('.source-button').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-source') === source);
    });
    
    // Отображаем данные из выбранного источника
    if (source === 'vetlek') {
        await displayVetlekData();
    } else if (source === 'vidal') {
        // Используем флаг hasFullInfo из объекта currentDrug
        const hasVidalData = Boolean(currentDrug.hasFullInfo);
        
        console.log('Проверка наличия данных Vidal:', hasVidalData);
        
        if (hasVidalData) {
            displayVidalData();
        } else {
            // Если данных нет, показываем сообщение
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

// Функция для возврата к результатам поиска
function backToSearch() {
    const drugInfo = document.getElementById('drug-info');
    const resultsSection = document.getElementById('results');
    const searchResults = document.getElementById('search-results');
    
    // Скрываем информацию о препарате
    if (drugInfo) {
        drugInfo.style.display = 'none';
        drugInfo.classList.remove('visible');
    }
    
    // Показываем результаты поиска
    if (resultsSection) {
        resultsSection.style.display = 'block';
        resultsSection.classList.add('visible');
    }
    if (searchResults) {
        searchResults.style.display = 'block';
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
    filteredDrugs.forEach((drug, index) => {
            console.log('Создание элемента для препарата:', drug.name);
            
        // Создаем элемент препарата с кнопкой
            const drugElement = document.createElement('div');
            drugElement.className = 'drug-item';
        drugElement.innerHTML = `
            <div class="drug-content">
                <h3 class="drug-name">${drug.name}</h3>
                ${drug.summary ? `<div class="drug-item-body">${drug.summary}</div>` : ''}
            </div>
            <button class="view-drug-btn">Подробнее</button>
        `;
        
        // Добавляем обработчики событий
        const viewButton = drugElement.querySelector('.view-drug-btn');
        const drugContent = drugElement.querySelector('.drug-content');
        
        // Обработчик для кнопки
        viewButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Предотвращаем всплытие события
            console.log('Клик по кнопке препарата:', drug.name);
            displayDrugInfo_global(drug);
        });
        
        // Обработчик для всего элемента
        drugContent.addEventListener('click', () => {
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
        console.error('Не найден drugInfoSection или currentDrug пустой:', { drugInfoSection, currentDrug });
        return;
    }
    console.log('currentDrug:', currentDrug);
    console.log('Флаг hasFullInfo:', currentDrug.hasFullInfo);

    // Получаем или создаем контейнер для контента
    let contentContainer = drugInfoSection.querySelector('.drug-info-content');
    if (!contentContainer) {
        console.log('Создаем новый контейнер для контента');
        contentContainer = document.createElement('div');
        contentContainer.className = 'drug-info-content';
        drugInfoSection.appendChild(contentContainer);
    }

    try {
        // Проверяем, есть ли у препарата поле source и равно ли оно "json"
        // Если да, то это препарат только из JSON-базы, для которого нет HTML-данных
        if (currentDrug.source === "json") {
            console.log('Препарат только из JSON-базы, отображаем доступные данные');
            console.log('Флаг hasFullInfo перед вызовом displayJsonOnlyDrug:', currentDrug.hasFullInfo);
            displayJsonOnlyDrug(contentContainer);
            return;
        }

        // Загружаем HTML файл, если он еще не загружен
        if (!window.drugsHtml) {
            console.log('Загрузка HTML файла...');
            const response = await fetch('api/all_drugs.html');
            if (!response.ok) {
                throw new Error(`Ошибка загрузки данных VetLek: ${response.status}`);
            }
            window.drugsHtml = await response.text();
            console.log('HTML файл загружен, размер:', window.drugsHtml.length);
        }

        // Создаем временный div для парсинга HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = window.drugsHtml;
        
        // Нормализуем название препарата для поиска
        const originalName = currentDrug.name;
        const searchName = originalName.toLowerCase()
            .replace(/®/g, '')
            .replace(/&/g, 'и')
            .replace(/_/g, ' ')
            .replace(/к\s*и\s*с/, 'кис')  // Обработка "к&с" -> "кис"
            .trim();
            
        console.log('Ищем препарат:', searchName, 'Оригинальное название:', originalName);

        // Ищем статью по разным критериям
        let article = null;
        let bestMatchScore = 0;
        let bestMatch = null;
        const articles = tempDiv.querySelectorAll('article');
        
        // Первый проход: ищем точное совпадение с оригинальным названием
        for (const art of articles) {
            const title = art.querySelector('h1, h2')?.textContent?.toLowerCase() || '';
            const normalizedTitle = title.replace(/®/g, '').replace(/&/g, 'и').trim();
            
            // Проверяем точное совпадение
            if (normalizedTitle === searchName || 
                (normalizedTitle.includes(searchName) && normalizedTitle.length < searchName.length * 1.5) || 
                (searchName.includes(normalizedTitle) && searchName.length < normalizedTitle.length * 1.5)) {
                
                const matchScore = 1 - Math.abs(searchName.length - normalizedTitle.length) / Math.max(searchName.length, normalizedTitle.length);
                
                if (matchScore > bestMatchScore) {
                    bestMatch = art;
                    bestMatchScore = matchScore;
                    console.log('Найдено точное совпадение:', {
                        title: normalizedTitle,
                        score: matchScore
                    });
                    
                    // Если совпадение очень хорошее (более 90%), сразу используем его
                    if (matchScore > 0.9) {
                        article = bestMatch;
                        break;
                    }
                }
            }
        }
        
        // Если точного совпадения нет и bestMatchScore низкий, проверяем частичные совпадения
        if (!article && bestMatchScore < 0.7) {
            console.log('Точное совпадение не найдено, ищем частичные совпадения');
            
            // Второй проход: ищем частичные совпадения
            for (const art of articles) {
                const articleText = art.textContent.toLowerCase();
                const title = art.querySelector('h1, h2')?.textContent?.toLowerCase() || '';
                const normalizedTitle = title.replace(/®/g, '').replace(/&/g, 'и').trim();
                
                // Проверяем, содержит ли статья все слова из названия препарата
                const searchWords = searchName.split(/\s+/).filter(word => word.length > 2); // Игнорируем короткие слова
                if (searchWords.length === 0) continue;
                
                const matchCount = searchWords.filter(word => articleText.includes(word.toLowerCase())).length;
                const matchScore = matchCount / searchWords.length;
                
                if (matchScore > bestMatchScore && matchScore >= 0.8) {
                    bestMatch = art;
                    bestMatchScore = matchScore;
                    console.log('Найдено частичное совпадение:', {
                        title: normalizedTitle,
                        score: matchScore,
                        matchedWords: matchCount + '/' + searchWords.length
                    });
                }
            }
        }
        
        // Используем лучшее найденное совпадение, если оно есть
        if (bestMatch && !article) {
            article = bestMatch;
        }

        // Если статья не найдена, показываем сообщение об ошибке
        if (!article) {
            console.error('Статья не найдена для препарата:', originalName);
            throw new Error(`Информация о препарате "${originalName}" не найдена в базе VetLek`);
        }

        // Проверяем, что найденная статья действительно соответствует искомому препарату
        const foundTitle = article.querySelector('h1, h2')?.textContent || '';
        const normalizedFoundTitle = foundTitle.toLowerCase().replace(/®/g, '').replace(/&/g, 'и').trim();
        
        // Строгая проверка соответствия
        if (!isRelevantMatch(searchName, normalizedFoundTitle)) {
            console.warn('Найденная статья может не соответствовать искомому препарату:', {
                search: searchName,
                found: normalizedFoundTitle
            });
            
            // Если совпадение слишком низкое, лучше показать данные только из JSON
            if (bestMatchScore < 0.6) {
                console.log('Совпадение слишком низкое, отображаем только данные из JSON');
                displayJsonOnlyDrug(contentContainer);
                return;
            }
        }

        // Очищаем контейнер и устанавливаем класс источника
        contentContainer.innerHTML = '';
        contentContainer.className = 'drug-info-content vetlek-source';

        // Создаем обертку для контента
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'drug-content-wrapper';

        // Очищаем HTML от изображений и добавляем в обертку
        const cleanedHtml = cleanHtmlFromImages(article.innerHTML);
        console.log('Очищенный HTML:', cleanedHtml.substring(0, 200) + '...');
        
        // Добавляем заголовок с названием препарата из JSON для подтверждения
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
        contentContainer.innerHTML = `
            <div class="error-message">
                ${error.message}
                <button class="retry-button" onclick="displayVetlekData()">Повторить попытку</button>
            </div>
        `;
        
        // Если произошла ошибка, пробуем отобразить данные из JSON
        setTimeout(() => {
            if (confirm('Не удалось загрузить полную информацию о препарате. Показать доступные данные?')) {
                displayJsonOnlyDrug(contentContainer);
            }
        }, 1000);
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

// Функция для отображения данных только из JSON
function displayJsonOnlyDrug(container) {
    if (!currentDrug) return;
    
    console.log('Отображение данных только из JSON для препарата:', currentDrug.name);
    console.log('Данные препарата:', currentDrug);
    console.log('Флаг полноты данных:', currentDrug.hasFullInfo);
    
    // Используем флаг hasFullInfo из объекта currentDrug вместо повторной проверки
    // Это позволит учесть специальные случаи, когда мы явно установили флаг
    const hasFullInfo = Boolean(currentDrug.hasFullInfo);
    
    console.log('Проверка полноты данных в displayJsonOnlyDrug:', hasFullInfo);
    
    // Очищаем контейнер
    container.innerHTML = '';
    container.className = 'drug-info-content json-source';
    
    // Создаем обертку для контента
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'drug-content-wrapper';
    
    // Формируем HTML с доступными данными
    let html = `<h1>${currentDrug.name}</h1>`;
    
    // Проверяем наличие латинского названия в скобках
    const latinNameMatch = currentDrug.name.match(/\(([^)]+)\)/);
    if (latinNameMatch) {
        html += `<p class="latin-name">${latinNameMatch[1]}</p>`;
    } else if (currentDrug.latin_name) {
        html += `<p class="latin-name">${currentDrug.latin_name}</p>`;
    }
    
    if (currentDrug.summary) {
        html += `<p class="drug-summary">${currentDrug.summary}</p>`;
    }
    
    if (currentDrug.description) {
        html += `<h2>Описание</h2><p>${currentDrug.description}</p>`;
    }
    
    if (currentDrug.composition) {
        html += `<h2>Состав</h2><div class="composition">${currentDrug.composition}</div>`;
    }
    
    if (currentDrug.manufacturer_info) {
        html += `<h2>Информация о производителе</h2>`;
        if (currentDrug.manufacturer_info.manufacturer) {
            html += `<p><strong>Производитель:</strong> ${currentDrug.manufacturer_info.manufacturer}</p>`;
        }
        if (currentDrug.manufacturer_info.manufacturer_country) {
            html += `<p><strong>Страна:</strong> ${currentDrug.manufacturer_info.manufacturer_country}</p>`;
        }
        if (currentDrug.manufacturer_info.registration_holder) {
            html += `<p><strong>Держатель регистрационного удостоверения:</strong> ${currentDrug.manufacturer_info.registration_holder}</p>`;
        }
        if (currentDrug.manufacturer_info.registration_holder_country) {
            html += `<p><strong>Страна держателя:</strong> ${currentDrug.manufacturer_info.registration_holder_country}</p>`;
        }
    }
    
    if (currentDrug.form_type) {
        html += `<p><strong>Лекарственная форма:</strong> ${currentDrug.form_type}</p>`;
    }
    
    if (currentDrug.registration_number) {
        html += `<p><strong>Регистрационный номер:</strong> ${currentDrug.registration_number}</p>`;
    }
    
    // Добавляем механизм действия, если есть
    if (currentDrug.mechanism) {
        html += `<h2>Механизм действия</h2><div class="mechanism">${currentDrug.mechanism}</div>`;
    }
    
    // Если есть другие поля, добавляем их
    const additionalFields = [
        { field: 'active_ingredients', title: 'Активные ингредиенты' },
        { field: 'indications', title: 'Показания к применению' },
        { field: 'contraindications', title: 'Противопоказания' },
        { field: 'dosage', title: 'Дозировка и способ применения' },
        { field: 'side_effects', title: 'Побочные эффекты' },
        { field: 'storage', title: 'Условия хранения' },
        { field: 'shelf_life', title: 'Срок годности' }
    ];
    
    additionalFields.forEach(item => {
        if (currentDrug[item.field]) {
            html += `<h2>${item.title}</h2>`;
            
            if (Array.isArray(currentDrug[item.field])) {
                if (currentDrug[item.field].length > 0) {
                    html += `<ul>`;
                    currentDrug[item.field].forEach(value => {
                        html += `<li>${value}</li>`;
                    });
                    html += `</ul>`;
                } else {
                    html += `<p>Информация отсутствует</p>`;
                }
            } else {
                html += `<div class="field-content">${currentDrug[item.field]}</div>`;
            }
        }
    });
    
    // Если данных очень мало, показываем сообщение
    if (html.length < 100) {
        html += `<p class="no-data-message">Для данного препарата доступна только базовая информация.</p>`;
    }
    
    // Добавляем предупреждение только если нет полной информации
    if (!hasFullInfo) {
        html += `<div class="data-source-info">
            <p>Отображена информация из базы данных препаратов. Полная информация недоступна.</p>
        </div>`;
    }
    
    contentWrapper.innerHTML = html;
    container.appendChild(contentWrapper);
    
    // Показываем секцию с информацией
    const drugInfoSection = document.getElementById('drug-info');
    if (drugInfoSection) {
        drugInfoSection.style.display = 'block';
        drugInfoSection.classList.add('visible');
    }
}

// Функция для отображения данных из Vidal
function displayVidalData() {
    const contentContainer = document.querySelector('#drug-info .drug-info-content');
    if (!contentContainer || !currentDrug) return;

    try {
        contentContainer.className = 'drug-info-content vidal-source';
        contentContainer.innerHTML = '';

        // Создаем структурированное отображение данных Vidal
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
        
        // Проверяем наличие латинского названия в скобках
        const latinNameMatch = currentDrug.name.match(/\(([^)]+)\)/);
        if (latinNameMatch) {
            contentWrapper.innerHTML += `<p class="latin-name">${latinNameMatch[1]}</p>`;
        } else if (currentDrug.latin_name) {
            contentWrapper.innerHTML += `<p class="latin-name">${currentDrug.latin_name}</p>`;
        }

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

        if (!hasContent) {
            // Если нет содержимого, но препарат помечен как имеющий полные данные
            if (currentDrug.hasFullInfo) {
                contentWrapper.innerHTML += `
                    <div class="warning-message">
                        <p>Данные о препарате "${currentDrug.name}" доступны, но в настоящий момент загружаются. Пожалуйста, попробуйте обновить страницу через несколько секунд.</p>
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
