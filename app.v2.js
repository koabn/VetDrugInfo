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
            searchDrugs(query);
            showBackButton();
            
            // Показываем блок результатов поиска
            const resultsSection = document.getElementById('results');
            if (resultsSection) {
                resultsSection.style.display = 'block';
                setTimeout(() => {
                    resultsSection.classList.add('visible');
                }, 10);
            }
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
        
        errorDiv.style.display = 'none';
        confirmationSection.style.display = 'none';
        drugInfo.style.display = 'none';
        
        // Если найдено более одного препарата, показываем список выбора
        if (drugResults.length > 1) {
            showDrugOptions(drugResults);
        } 
        // Если найден ровно один препарат, показываем информацию о нем
        else if (drugResults.length === 1) {
            currentDrug = drugResults[0];
            const selectedCategories = getSelectedCategories();
            displayFilteredDrugInfo(currentDrug);
        } 
        // Если ничего не найдено, показываем сообщение об ошибке
        else {
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
    
    // Функция отображения списка найденных препаратов
    function showDrugOptions(results) {
        // Показываем блок выбора препаратов
        confirmationSection.style.display = 'block';
        drugOptions.innerHTML = '';
        
        // Создаем список препаратов
        results.slice(0, 20).forEach(drug => { // Ограничиваем 20 результатами
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
            option.addEventListener('click', () => {
                console.log('Выбран препарат:', drug.name);
                currentDrug = drug;
                const selectedCategories = getSelectedCategories();
                confirmationSection.style.display = 'none';
                
                // Показываем секцию результатов если она скрыта
                const resultsSection = document.getElementById('results');
                if (resultsSection && resultsSection.style.display === 'none') {
                    resultsSection.style.display = 'block';
                    setTimeout(() => {
                        resultsSection.classList.add('visible');
                    }, 10);
                }
                
                displayFilteredDrugInfo(drug);
                
                // Добавляем отступ сверху для элемента drug-info
                drugInfo.style.marginTop = '20px';
                
                // Прокручиваем страницу к информации о препарате
                drugInfo.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
            
            drugOptions.appendChild(option);
        });
        
        // Если результатов много, показываем сообщение
        if (results.length > 20) {
            const moreResults = document.createElement('div');
            moreResults.className = 'more-results';
            moreResults.textContent = `Показаны первые 20 результатов из ${results.length}. Уточните запрос для более точных результатов.`;
            drugOptions.appendChild(moreResults);
        }
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
        const resultsSection = document.getElementById('results');
        if (resultsSection) {
            resultsSection.style.display = 'block';
            setTimeout(() => {
                resultsSection.classList.add('visible');
            }, 10);
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
        
        // Основная информация о препарате
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
            }
        ];
        
        // Отображаем выбранные разделы
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
                    contentElement.textContent = section.customFormat ? section.customFormat(value) : value;
                    
                    sectionElement.appendChild(titleElement);
                    sectionElement.appendChild(contentElement);
                    drugSummary.appendChild(sectionElement);
                }
            }
        });
        
        // Добавляем краткую информацию в содержимое
        drugContent.appendChild(drugSummary);
        
        // Показываем кнопку "Сообщить об ошибке"
        reportErrorBtn.style.display = 'flex';
    }
    
    // Функция для отображения модального окна сообщения об ошибке
    async function reportError() {
        const errorModal = document.getElementById('errorModal');
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
    const drugListElement = document.getElementById('drugList');
    drugListElement.innerHTML = '';

    if (filteredDrugs.length === 0) {
        drugListElement.innerHTML = '<div class="no-results">Препараты не найдены</div>';
        return;
    }

    const selectedCategories = getSelectedCategories();

    filteredDrugs.forEach((drug, index) => {
        const drugItem = document.createElement('div');
        drugItem.className = 'drug-item';
        drugItem.style.setProperty('--item-index', index); // Добавляем индекс для анимации
        
        const drugName = document.createElement('div');
        drugName.className = 'drug-name';
        drugName.textContent = drug.name || 'Препарат без названия';
        drugItem.appendChild(drugName);

        if (drug.trade_names && drug.trade_names.trim()) {
            const drugTradeNames = document.createElement('div');
            drugTradeNames.className = 'drug-trade-names';
            drugTradeNames.textContent = drug.trade_names;
            drugItem.appendChild(drugTradeNames);
        }

        if (drug.atx_code && drug.atx_name) {
            const drugClassification = document.createElement('div');
            drugClassification.className = 'drug-classification';
            drugClassification.textContent = `${drug.atx_code}: ${drug.atx_name}`;
            drugItem.appendChild(drugClassification);
        }

        drugItem.addEventListener('click', () => {
            displayDrugInfo(drug, selectedCategories);
        });

        drugListElement.appendChild(drugItem);
    });
}

function displayDrugInfo(drug, selectedCategories) {
    const modal = document.getElementById('drugInfoModal');
    const modalTitle = document.getElementById('drugInfoTitle');
    const modalBody = document.getElementById('drugInfoContent');
    
    modalTitle.textContent = drug.name || 'Препарат без названия';
    modalBody.innerHTML = '';
    
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
            title: 'Международное непатентованное название', 
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
            category: 'Условия отпуска' 
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
                contentElement.textContent = section.customFormat ? section.customFormat(value) : value;
                
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
        const drugName = drug.name || 'Без названия';
        window.Telegram.WebApp.openTelegramLink(`https://t.me/vetaptekibot?start=report_${encodeURIComponent(drugName)}`);
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
    const adaptedDrug = { ...drug };
    
    // Извлекаем данные из вложенного объекта manufacturer_info
    if (drug.manufacturer_info) {
        adaptedDrug.producer = drug.manufacturer_info.manufacturer;
        adaptedDrug.producer_country = drug.manufacturer_info.manufacturer_country;
        adaptedDrug.registration_holder = drug.manufacturer_info.registration_holder;
        adaptedDrug.registration_holder_country = drug.manufacturer_info.registration_holder_country;
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
}
