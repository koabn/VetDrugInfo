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
    
    // Определяем базовый URL для API (не используется, так как используем локальные данные)
    const USE_LOCAL_DATA = true;
    
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
            
            // Загружаем локальные данные
            console.log('Попытка загрузки файла api/drugs.json');
            const drugsResponse = await fetch('api/drugs.json');
            
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
    
    // Функция получения выбранных категорий
    function getSelectedCategories() {
        const selected = [];
        categoryCheckboxes.forEach(checkbox => {
            if (checkbox.checked) {
                selected.push(checkbox.value);
            }
        });
        return selected;
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

    // Функция поиска препаратов
    function searchDrugs(query) {
        if (!drugsData) {
            errorDiv.textContent = 'Данные еще не загружены';
            errorDiv.style.display = 'block';
            return;
        }
        
        const threshold = 0.7; // Порог схожести для нечеткого поиска
        query = query.toLowerCase();
        
        // Поиск по препаратам с учетом схожести
        const drugResults = drugsData.filter(drug => {
            // Проверяем, что поля существуют перед поиском
            const hasName = drug.name && typeof drug.name === 'string';
            const hasTradeName = drug.trade_names && typeof drug.trade_names === 'string';
            
            // Если нет нужных полей для поиска, пропускаем
            if (!hasName && !hasTradeName) return false;
            
            // Точное совпадение
            const nameMatch = hasName && drug.name.toLowerCase().includes(query);
            const tradeMatch = hasTradeName && drug.trade_names.toLowerCase().includes(query);
            
            if (nameMatch || tradeMatch) return true;
            
            // Нечеткий поиск
            const nameSimilarity = hasName ? Math.max(
                ...drug.name.toLowerCase().split(/\s+/).map(word => 
                    stringSimilarity(word, query)
                )
            ) : 0;
            
            const tradeSimilarity = hasTradeName ? Math.max(
                ...drug.trade_names.toLowerCase().split(/\s+/).map(word => 
                    stringSimilarity(word, query)
                )
            ) : 0;
            
            return nameSimilarity >= threshold || tradeSimilarity >= threshold;
        }).map(drug => ({
            ...drug,
            relevance: Math.max(
                ...(drug.name ? 
                    drug.name.toLowerCase().split(/\s+/).map(word => 
                        stringSimilarity(word, query)
                    ) : [0]
                ),
                ...(drug.trade_names ? 
                    drug.trade_names.toLowerCase().split(/\s+/).map(word => 
                        stringSimilarity(word, query)
                    ) : []
                )
            )
        })).sort((a, b) => b.relevance - a.relevance);
        
        // Скрываем все секции результатов сначала
        const resultsSection = document.getElementById('results');
        resultsSection.style.display = 'none';
        confirmationSection.style.display = 'none';
        drugInfo.style.display = 'none';
        
        if (drugResults.length > 0) {
            showDrugOptions(drugResults);
            errorDiv.style.display = 'none';
            confirmationSection.style.display = 'block';
        } else {
            errorDiv.textContent = 'Ничего не найдено';
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
        drugOptions.innerHTML = '';
        confirmationSection.style.display = 'block';
        drugInfo.style.display = 'none';
        reportErrorBtn.style.display = 'flex';
        showBackButton();
        
        results.forEach(drug => {
            const option = document.createElement('div');
            option.className = 'drug-option';
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'drug-name';
            nameSpan.textContent = `💊 ${drug.name}`;
            option.appendChild(nameSpan);
            
            if (drug.trade_names) {
                const tradeSpan = document.createElement('span');
                tradeSpan.className = 'drug-trade-names';
                tradeSpan.textContent = ` (${drug.trade_names})`;
                option.appendChild(tradeSpan);
            }
            
            option.addEventListener('click', () => {
                currentDrug = drug;
                confirmationSection.style.display = 'none';
                
                // Показываем секцию результатов и информацию о препарате
                const resultsSection = document.getElementById('results');
                resultsSection.style.display = 'block';
                resultsSection.classList.add('visible');
                drugInfo.style.display = 'block';
                
                // Показываем секцию с фильтрами
                const categoriesSection = document.querySelector('.categories-section');
                categoriesSection.style.display = 'block';
                displayFilteredDrugInfo(drug);
            });
            
            drugOptions.appendChild(option);
        });
    }
    
    // Функция отображения отфильтрованной информации о препарате
    function displayFilteredDrugInfo(drug) {
        drugContent.innerHTML = '';
        
        const title = document.createElement('div');
        title.className = 'drug-title';
        title.textContent = drug.name || 'Препарат без названия';
        drugContent.appendChild(title);
        
        const info = document.createElement('div');
        info.className = 'drug-info';
        
        let content = [];
        const selectedCategories = getSelectedCategories();
        
        // Базовая информация всегда отображается
        if (drug.trade_names) content.push(`💊 Международное непатентованное название: ${drug.trade_names}`);
        if (drug.form) content.push(`📦 Лекарственная форма: ${drug.form}`);
        if (drug.manufacturer) content.push(`🏭 Производитель: ${drug.manufacturer}`);
        if (drug.owner) content.push(`🏢 Держатель регистрационного удостоверения: ${drug.owner}`);
        
        // Показываем категории в зависимости от выбранных фильтров
        if (selectedCategories.length === 0 || selectedCategories.includes('mechanism')) {
            if (drug.mechanism) content.push(`⚡ Фармакотерапевтическая группа: ${drug.mechanism}`);
        }
        
        if (selectedCategories.length === 0 || selectedCategories.includes('indications')) {
            if (drug.indications) content.push(`🎯 Показания: ${drug.indications}`);
        }
        
        if (selectedCategories.length === 0 || selectedCategories.includes('side_effects')) {
            if (drug.side_effects) content.push(`⚕️ Побочные эффекты: ${drug.side_effects}`);
        }
        
        if (selectedCategories.length === 0 || selectedCategories.includes('contraindications')) {
            if (drug.contraindications) content.push(`⚠️ Противопоказания: ${drug.contraindications}`);
        }
        
        if (selectedCategories.length === 0 || selectedCategories.includes('composition')) {
            if (drug.composition) content.push(`🧪 Состав: ${drug.composition}`);
        }
        
        if (selectedCategories.length === 0 || selectedCategories.includes('usage')) {
            if (drug.usage) content.push(`💉 Условия отпуска: ${drug.usage}`);
        }
        
        if (selectedCategories.length === 0 || selectedCategories.includes('storage')) {
            if (drug.storage) content.push(`🏠 Хранение: ${drug.storage}`);
        }
        
        if (selectedCategories.length === 0 || selectedCategories.includes('dosage')) {
            if (drug.dosage) content.push(`💉 Дозировка: ${drug.dosage}`);
        }
        
        if (selectedCategories.length === 0 || selectedCategories.includes('registration')) {
            if (drug.shelf_life) content.push(`⏱️ Срок годности: ${drug.shelf_life}`);
            if (drug.registration_number) content.push(`📝 Регистрационный номер: ${drug.registration_number}`);
            if (drug.registration_date) content.push(`📅 Дата регистрации: ${drug.registration_date}`);
            if (drug.expiration_date) content.push(`🗓️ Дата окончания регистрации: ${drug.expiration_date}`);
            if (drug.drug_type) content.push(`🔍 Тип лекарственного средства: ${drug.drug_type}`);
            if (drug.status) content.push(`📊 Статус: ${drug.status}`);
        }
        
        info.innerHTML = content.join('<br><br>');
        drugContent.appendChild(info);
        
        // Показываем кнопку сообщения об ошибке
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
    document.getElementById('cancelErrorReport').addEventListener('click', closeErrorModal);
    document.getElementById('sendErrorReport').addEventListener('click', sendErrorReport);
    document.getElementById('errorModal').addEventListener('click', (e) => {
        if (e.target.id === 'errorModal') {
            closeErrorModal();
        }
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
    
    // Определяем порядок разделов информации
    const sections = [
        { 
            name: 'trade_names', 
            title: 'Международное непатентованное название', 
            category: 'Фармакотерапевтическая группа' 
        },
        { 
            name: 'indication', 
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
            name: 'pharmgroup', 
            title: 'Фармакотерапевтическая группа', 
            category: 'Фармакотерапевтическая группа' 
        },
        { 
            name: 'atx_code', 
            title: 'Код АТХ', 
            category: 'Фармакотерапевтическая группа',
            customFormat: (value) => {
                return drug.atx_name ? `${value}: ${drug.atx_name}` : value;
            }
        },
        { 
            name: 'producer', 
            title: 'Производитель', 
            category: 'Регистрационная информация' 
        },
        { 
            name: 'country', 
            title: 'Страна производства', 
            category: 'Регистрационная информация' 
        },
        { 
            name: 'reg_number', 
            title: 'Регистрационный номер', 
            category: 'Регистрационная информация' 
        },
        { 
            name: 'reg_date', 
            title: 'Дата регистрации', 
            category: 'Регистрационная информация' 
        },
        { 
            name: 'reg_holder', 
            title: 'Держатель регистрационного удостоверения', 
            category: 'Регистрационная информация' 
        },
        { 
            name: 'storage_conditions', 
            title: 'Условия хранения', 
            category: 'Хранение' 
        },
        { 
            name: 'release_form', 
            title: 'Форма выпуска', 
            category: 'Дозировка' 
        },
        { 
            name: 'release_conditions', 
            title: 'Условия отпуска', 
            category: 'Условия отпуска' 
        }
    ];
    
    // Показываем информацию в соответствии с выбранными категориями или все, если категории не выбраны
    sections.forEach(section => {
        // Если категории не выбраны или выбрана категория данного раздела, показываем информацию
        if (selectedCategories.length === 0 || selectedCategories.includes(section.category)) {
            const value = drug[section.name];
            
            if (value && value.trim()) {
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
