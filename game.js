class DarkFarmGame {
    constructor() {
        this.souls = 0;
        this.darkEssence = 100;
        this.seedsInventory = {};
        this.harvestInventory = {};
        
        // Начальные грядки - 3 штуки
        this.plots = [];
        this.initialPlots = 3;
        this.maxPlots = 30;
        this.plotPrice = 25;
        
        // Настройки обмена валюты
        this.exchangeRate = 5;
        this.exchangeAmount = 10;
        
        // Система аккаунтов
        this.currentUser = null;
        this.autoSaveInterval = null;
        
        // Создаем начальные грядки
        for (let i = 0; i < this.initialPlots; i++) {
            this.addNewPlot();
        }
        
        this.lastUpdate = Date.now();
        
        this.seedTypes = {
            'shadow_berry': {
                name: 'Теневая ягода',
                emoji: '🌑',
                time: 10000,
                clicks: 5,
                buyPrice: 10,
                baseSellPrice: 5,
                description: 'Быстрорастущая, но дешёвая',
                dropChance: 0.6
            },
            'ghost_pumpkin': {
                name: 'Призрачная тыква',
                emoji: '🎃',
                time: 20000,
                clicks: 8,
                buyPrice: 25,
                baseSellPrice: 15,
                description: 'Средняя скорость, хорошая цена',
                dropChance: 0.5
            },
            'void_mushroom': {
                name: 'Гриб пустоты',
                emoji: '🍄',
                time: 30000,
                clicks: 12,
                buyPrice: 50,
                baseSellPrice: 35,
                description: 'Растёт медленно, но дорого стоит',
                dropChance: 0.4
            },
            'crystal_flower': {
                name: 'Хрустальный цветок',
                emoji: '🌷',
                time: 45000,
                clicks: 15,
                buyPrice: 80,
                baseSellPrice: 60,
                description: 'Ценный, но требует терпения',
                dropChance: 0.35
            },
            'blood_rose': {
                name: 'Кровавая роза',
                emoji: '🌹',
                time: 60000,
                clicks: 20,
                buyPrice: 120,
                baseSellPrice: 100,
                description: 'Очень редкая и дорогая',
                dropChance: 0.3
            },
            'moonlight_lily': {
                name: 'Лунная лилия',
                emoji: '🌸',
                time: 90000,
                clicks: 25,
                buyPrice: 200,
                baseSellPrice: 180,
                description: 'Цветёт только в лунном свете',
                dropChance: 0.25
            },
            'phantom_orchid': {
                name: 'Фантомная орхидея',
                emoji: '💮',
                time: 120000,
                clicks: 30,
                buyPrice: 300,
                baseSellPrice: 250,
                description: 'Легендарное растение из иного мира',
                dropChance: 0.2
            }
        };
        
        this.shopOpen = false;
        this.inventoryOpen = false;
        
        this.initAuth();
        this.setupAuthModal();
        this.startGameLoop();
        this.initShop();
        this.updateInventoryDisplay();
        this.renderFarm();
    }

    // ========== СИСТЕМА АККАУНТОВ ==========
    
    initAuth() {
        // Проверяем, есть ли сохраненная сессия
        const savedSession = localStorage.getItem('darkFarmCurrentUser');
        if (savedSession) {
            this.currentUser = savedSession;
            document.getElementById('authButton').textContent = `🚪 ${savedSession}`;
            this.loadGameFromStorage();
        }
    }

    setupAuthModal() {
        const authButton = document.getElementById('authButton');
        const modal = document.getElementById('authModal');
        const closeBtn = document.querySelector('.close');
        const showRegister = document.getElementById('showRegister');
        const showLogin = document.getElementById('showLogin');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');

        authButton.addEventListener('click', () => {
            if (this.currentUser) {
                this.logout();
            } else {
                this.showAuthModal();
            }
        });

        closeBtn.addEventListener('click', () => this.hideAuthModal());
        
        showRegister.addEventListener('click', () => {
            loginForm.classList.add('hidden');
            registerForm.classList.remove('hidden');
        });
        
        showLogin.addEventListener('click', () => {
            registerForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
        });

        // Обработчики форм
        document.getElementById('loginSubmit').addEventListener('click', () => this.login());
        document.getElementById('registerSubmit').addEventListener('click', () => this.register());

        // Обработка нажатия Enter
        document.getElementById('loginPassword').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.login();
        });
        document.getElementById('registerPassword').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.register();
        });
    }

    showAuthModal() {
        document.getElementById('authModal').classList.remove('hidden');
        document.getElementById('loginForm').classList.remove('hidden');
        document.getElementById('registerForm').classList.add('hidden');
        document.getElementById('authStatus').textContent = '';
        document.getElementById('loginUsername').value = '';
        document.getElementById('loginPassword').value = '';
        document.getElementById('registerUsername').value = '';
        document.getElementById('registerPassword').value = '';
        document.getElementById('registerConfirm').value = '';
    }

    hideAuthModal() {
        document.getElementById('authModal').classList.add('hidden');
    }

    login() {
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        const status = document.getElementById('authStatus');

        if (!username || !password) {
            status.textContent = 'Заполните все поля!';
            status.className = 'auth-status error';
            return;
        }

        const users = JSON.parse(localStorage.getItem('darkFarmUsers') || '{}');
        
        if (users[username] && users[username].password === this.hashPassword(password)) {
            this.currentUser = username;
            localStorage.setItem('darkFarmCurrentUser', username);
            document.getElementById('authButton').textContent = `🚪 ${username}`;
            this.loadGameFromStorage();
            this.startAutoSave();
            this.hideAuthModal();
            status.textContent = '';
        } else {
            status.textContent = 'Неверное имя пользователя или пароль!';
            status.className = 'auth-status error';
        }
    }

    register() {
        const username = document.getElementById('registerUsername').value.trim();
        const password = document.getElementById('registerPassword').value;
        const confirm = document.getElementById('registerConfirm').value;
        const status = document.getElementById('authStatus');

        if (!username || !password) {
            status.textContent = 'Заполните все поля!';
            status.className = 'auth-status error';
            return;
        }

        if (password !== confirm) {
            status.textContent = 'Пароли не совпадают!';
            status.className = 'auth-status error';
            return;
        }

        if (username.length < 3) {
            status.textContent = 'Имя пользователя должно быть не менее 3 символов!';
            status.className = 'auth-status error';
            return;
        }

        const users = JSON.parse(localStorage.getItem('darkFarmUsers') || '{}');
        
        if (users[username]) {
            status.textContent = 'Пользователь уже существует!';
            status.className = 'auth-status error';
            return;
        }

        // Создаем нового пользователя
        users[username] = {
            password: this.hashPassword(password),
            createdAt: new Date().toISOString()
        };
        
        localStorage.setItem('darkFarmUsers', JSON.stringify(users));

        status.textContent = 'Регистрация успешна! Теперь войдите.';
        status.className = 'auth-status success';

        // Показываем форму входа
        setTimeout(() => {
            document.getElementById('registerForm').classList.add('hidden');
            document.getElementById('loginForm').classList.remove('hidden');
        }, 1500);
    }

    hashPassword(password) {
        // Простое хеширование для демонстрации (в реальном приложении используйте более безопасные методы)
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString();
    }

    logout() {
        this.saveGameToStorage();
        this.currentUser = null;
        localStorage.removeItem('darkFarmCurrentUser');
        document.getElementById('authButton').textContent = '🔐 Войти в аккаунт';
        this.stopAutoSave();
        
        // Сбрасываем игру к начальным значениям
        this.souls = 0;
        this.darkEssence = 100;
        this.seedsInventory = {};
        this.harvestInventory = {};
        this.plots = [];
        for (let i = 0; i < this.initialPlots; i++) {
            this.addNewPlot();
        }
        
        this.updateDisplay();
        this.initShop();
        this.updateInventoryDisplay();
        this.renderFarm();
    }

    startAutoSave() {
        // Автосохранение каждые 30 секунд
        this.autoSaveInterval = setInterval(() => {
            this.saveGameToStorage();
        }, 30000);
    }

    stopAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    }

    saveGameToStorage() {
        if (!this.currentUser) return;
        
        const gameData = {
            souls: this.souls,
            darkEssence: this.darkEssence,
            seedsInventory: this.seedsInventory,
            harvestInventory: this.harvestInventory,
            plots: this.plots,
            plotPrice: this.plotPrice,
            exchangeRate: this.exchangeRate,
            exchangeAmount: this.exchangeAmount,
            lastUpdate: Date.now()
        };
        
        const users = JSON.parse(localStorage.getItem('darkFarmUsers') || '{}');
        if (users[this.currentUser]) {
            users[this.currentUser].gameData = gameData;
            localStorage.setItem('darkFarmUsers', JSON.stringify(users));
        }
    }

    loadGameFromStorage() {
        if (!this.currentUser) return;
        
        const users = JSON.parse(localStorage.getItem('darkFarmUsers') || '{}');
        const userData = users[this.currentUser];
        
        if (userData && userData.gameData) {
            const gameData = userData.gameData;
            
            this.souls = gameData.souls || 0;
            this.darkEssence = gameData.darkEssence || 100;
            this.seedsInventory = gameData.seedsInventory || {};
            this.harvestInventory = gameData.harvestInventory || {};
            this.plots = gameData.plots || [];
            this.plotPrice = gameData.plotPrice || 25;
            this.exchangeRate = gameData.exchangeRate || 5;
            this.exchangeAmount = gameData.exchangeAmount || 10;
            
            // Восстанавливаем начальные грядки если нужно
            if (this.plots.length === 0) {
                for (let i = 0; i < this.initialPlots; i++) {
                    this.addNewPlot();
                }
            }
            
            this.renderFarm();
            this.initShop();
            this.updateInventoryDisplay();
            this.updateDisplay();
            
            this.startAutoSave();
        }
    }

    // ========== ОСНОВНЫЕ МЕТОДЫ ИГРЫ ==========

    // Добавьте вызов saveGameToStorage() в ключевые методы:
    buySeed(seedType) {
        const seedData = this.seedTypes[seedType];
        if (this.darkEssence >= seedData.buyPrice) {
            this.darkEssence -= seedData.buyPrice;
            
            if (!this.seedsInventory[seedType]) {
                this.seedsInventory[seedType] = 0;
            }
            this.seedsInventory[seedType]++;
            
            this.updateDisplay();
            this.initShop();
            this.updateInventoryDisplay();
            this.saveGameToStorage(); // АВТОСОХРАНЕНИЕ
        }
    }

    plantSeed(plotIndex, seedType) {
        if (this.seedsInventory[seedType] > 0 && !this.plots[plotIndex].planted) {
            const seedData = this.seedTypes[seedType];
            
            this.plots[plotIndex].planted = true;
            this.plots[plotIndex].growth = 0;
            this.plots[plotIndex].clicks = 0;
            this.plots[plotIndex].type = seedType;
            this.plots[plotIndex].growthMethod = null;
            this.plots[plotIndex].plantTime = Date.now();
            this.plots[plotIndex].totalGrowthTime = seedData.time;
            this.plots[plotIndex].remainingTime = seedData.time;
            
            this.seedsInventory[seedType]--;
            
            this.updateDisplay();
            this.updateInventoryDisplay();
            this.saveGameToStorage(); // АВТОСОХРАНЕНИЕ
        }
    }

    harvest(plotIndex) {
        const plot = this.plots[plotIndex];
        if (plot.planted && plot.growth >= 100) {
            const seedType = plot.type;
            const seedData = this.seedTypes[seedType];
            
            // Добавляем урожай в инвентарь урожая
            if (!this.harvestInventory[seedType]) {
                this.harvestInventory[seedType] = 0;
            }
            this.harvestInventory[seedType]++;
            
            // Получаем случайное количество семян
            const seedDrop = this.getRandomSeedDrop(seedType);
            if (seedDrop > 0) {
                if (!this.seedsInventory[seedType]) {
                    this.seedsInventory[seedType] = 0;
                }
                this.seedsInventory[seedType] += seedDrop;
                this.showDropMessage(seedData.emoji, seedData.name, seedDrop);
            }
            
            // Сбрасываем участок
            plot.planted = false;
            plot.growth = 0;
            plot.clicks = 0;
            plot.type = null;
            plot.growthMethod = null;
            plot.plantTime = null;
            plot.totalGrowthTime = 0;
            plot.remainingTime = 0;
            
            this.updateDisplay();
            this.updateInventoryDisplay();
            this.saveGameToStorage(); // АВТОСОХРАНЕНИЕ
        }
    }

    sellHarvest(seedType) {
        if (this.harvestInventory[seedType] > 0) {
            const seedData = this.seedTypes[seedType];
            this.souls += seedData.baseSellPrice;
            this.harvestInventory[seedType]--;
            
            this.updateDisplay();
            this.updateInventoryDisplay();
            this.saveGameToStorage(); // АВТОСОХРАНЕНИЕ
        }
    }

    buyEssence() {
        if (this.souls >= this.exchangeAmount) {
            this.souls -= this.exchangeAmount;
            this.darkEssence += this.exchangeAmount * this.exchangeRate;
            this.updateDisplay();
            this.initShop();
            this.saveGameToStorage(); // АВТОСОХРАНЕНИЕ
            return true;
        }
        return false;
    }

    buyPlot() {
        if (this.souls >= this.plotPrice && this.plots.length < this.maxPlots) {
            this.souls -= this.plotPrice;
            if (this.addNewPlot()) {
                this.renderFarm();
                this.initShop();
                this.updateDisplay();
                this.saveGameToStorage(); // АВТОСОХРАНЕНИЕ
                return true;
            }
        } else if (this.plots.length >= this.maxPlots) {
            alert('Достигнут максимум грядок!');
        }
        return false;
    }    

    // ... остальные методы игры (getRandomSeedDrop, addNewPlot, renderFarm, handlePlotClick, 
    // initShop, clickCrop, growCrops, updateDisplay, toggleShop, toggleInventory, startGameLoop)
    // остаются БЕЗ ИЗМЕНЕНИЙ из вашего исходного кода
    
    // Инициализация игры

    // Метод для генерации случайного количества семян
    getRandomSeedDrop(seedType) {
        const seedData = this.seedTypes[seedType];
        const dropChance = seedData.dropChance;
        
        if (Math.random() < dropChance) {
            const randomValue = Math.random();
            if (randomValue < 0.4) {
                return 1;
            } else if (randomValue < 0.7) {
                return 2;
            }
        }
        return 0;
    }
    
    // Метод для добавления новой грядки
    addNewPlot() {
        if (this.plots.length < this.maxPlots) {
            this.plots.push({
                planted: false,
                growth: 0,
                clicks: 0,
                type: null,
                growthMethod: null,
                plantTime: null,
                totalGrowthTime: 0,
                remainingTime: 0
            });
            return true;
        }
        return false;
    }
    
    // Метод для отображения фермы
    renderFarm() {
        const farmArea = document.getElementById('farmArea');
        farmArea.innerHTML = '';
        
        this.plots.forEach((plot, index) => {
            const plotElement = document.createElement('div');
            plotElement.className = 'plot';
            plotElement.onclick = () => this.handlePlotClick(index);
            plotElement.innerHTML = '🟫';
            farmArea.appendChild(plotElement);
        });
        
        this.updateDisplay();
    }
    
    // Обработчик клика по грядке
    handlePlotClick(plotIndex) {
        const plot = this.plots[plotIndex];
        if (plot.planted) {
            if (plot.growth >= 100) {
                this.harvest(plotIndex);
            } else {
                this.clickCrop(plotIndex);
            }
        } else {
            const availableSeeds = Object.keys(this.seedsInventory).filter(seed => this.seedsInventory[seed] > 0);
            if (availableSeeds.length > 0) {
                const seedToPlant = availableSeeds[0];
                this.plantSeed(plotIndex, seedToPlant);
            } else {
                alert('Нет семян в инвентаре! Купите в магазине.');
            }
        }
    }
    
    // Инициализация магазина
    initShop() {
        const shopItems = document.getElementById('shopItems');
        shopItems.innerHTML = '';
        
        // Обмен валюты
        const exchangeShopItem = document.createElement('div');
        exchangeShopItem.className = 'shop-item exchange-shop-item';
        const canExchange = this.souls >= this.exchangeAmount;
        
        exchangeShopItem.innerHTML = `
            <div class="item-emoji">💱</div>
            <div class="item-name">Обмен валюты</div>
            <div class="item-price">${this.exchangeAmount} душ → ${this.exchangeAmount * this.exchangeRate} эссенции</div>
            <div class="item-growth">Курс: 1 душа = ${this.exchangeRate} эссенции</div>
            <div class="item-description">Обменяйте души на эссенцию для покупки семян</div>
            <button class="buy-btn" onclick="game.buyEssence()" 
                    ${!canExchange ? 'disabled' : ''}>
                Обменять
            </button>
        `;
        shopItems.appendChild(exchangeShopItem);
        
        // Покупка грядки
        const plotShopItem = document.createElement('div');
        plotShopItem.className = 'shop-item plot-shop-item';
        const canBuyPlot = this.souls >= this.plotPrice && this.plots.length < this.maxPlots;
        
        plotShopItem.innerHTML = `
            <div class="item-emoji">🟫</div>
            <div class="item-name">Дополнительная грядка</div>
            <div class="item-price">Цена: ${this.plotPrice} душ</div>
            <div class="item-growth">Грядок: ${this.plots.length}/${this.maxPlots}</div>
            <div class="item-description">Увеличьте площадь вашей фермы</div>
            <button class="buy-btn" onclick="game.buyPlot()" 
                    ${!canBuyPlot ? 'disabled' : ''}>
                ${this.plots.length >= this.maxPlots ? 'Максимум' : 'Купить грядку'}
            </button>
        `;
        shopItems.appendChild(plotShopItem);
        
        // Семена
        Object.entries(this.seedTypes).forEach(([seedType, seedData]) => {
            const shopItem = document.createElement('div');
            shopItem.className = `shop-item ${seedData.buyPrice > 100 ? 'expensive' : 'cheap'}`;
            
            shopItem.innerHTML = `
                <div class="item-emoji">${seedData.emoji}</div>
                <div class="item-name">${seedData.name}</div>
                <div class="item-price">Цена: ${seedData.buyPrice} эссенции</div>
                <div class="item-sell-price">Продажа урожая: ${seedData.baseSellPrice} душ</div>
                <div class="item-growth">Рост: ${seedData.time/1000}сек | Шанс семян: ${Math.round(seedData.dropChance * 100)}%</div>
                <div class="item-description">${seedData.description}</div>
                <button class="buy-btn" onclick="game.buySeed('${seedType}')" 
                        ${this.darkEssence < seedData.buyPrice ? 'disabled' : ''}>
                    Купить семена
                </button>
            `;
            
            shopItems.appendChild(shopItem);
        });
    }
    
    // Клик по растению для ускорения роста
    clickCrop(plotIndex) {
        const plot = this.plots[plotIndex];
        if (plot.planted && plot.growth < 100) {
            plot.clicks++;
            
            if (plot.remainingTime > 3000) {
                plot.remainingTime -= 3000;
                
                const progressFromTime = 100 - (plot.remainingTime / plot.totalGrowthTime * 100);
                const progressFromClicks = (plot.clicks / this.seedTypes[plot.type].clicks) * 100;
                
                plot.growth = Math.max(progressFromTime, progressFromClicks);
                
                if (plot.growth > 100) plot.growth = 100;
            } else {
                plot.growth = 100;
                plot.remainingTime = 0;
            }
            
            plot.plantTime = Date.now() - (plot.growth / 100) * plot.totalGrowthTime;
            
            const plotElement = document.querySelectorAll('.plot')[plotIndex];
            plotElement.classList.add('clicked');
            setTimeout(() => {
                plotElement.classList.remove('clicked');
            }, 300);
            
            this.updateDisplay();
        }
    }
    
    // Рост растений со временем
    growCrops(deltaTime) {
        this.plots.forEach(plot => {
            if (plot.planted && plot.growth < 100) {
                if (plot.growthMethod === null) {
                    plot.growthMethod = 'time';
                }
                
                if (plot.growthMethod === 'time') {
                    plot.remainingTime = Math.max(0, plot.remainingTime - (deltaTime * 1000));
                    plot.growth = 100 - (plot.remainingTime / plot.totalGrowthTime * 100);
                    if (plot.growth > 100) plot.growth = 100;
                }
            }
        });
    }
    
    // Обновление отображения
    updateDisplay() {
        document.getElementById('souls').textContent = `Души: ${this.souls}`;
        document.getElementById('darkEssence').textContent = `Тёмная эссенция: ${this.darkEssence}`;
        
        const plotElements = document.querySelectorAll('.plot');
        this.plots.forEach((plot, index) => {
            const plotElement = plotElements[index];
            if (!plotElement) return;
            
            if (plot.planted) {
                const seedData = this.seedTypes[plot.type];
                
                if (plot.growth >= 100) {
                    plotElement.textContent = seedData.emoji;
                    plotElement.style.background = '#4a2d5a';
                    plotElement.className = 'plot ready';
                    plotElement.title = `${seedData.name} - Готово к сбору! Кликни чтобы собрать (шанс семян: ${Math.round(seedData.dropChance * 100)}%)`;
                } else {
                    const growthStage = Math.floor(plot.growth / 25);
                    const stages = ['🌱', '🪴', '🌿', seedData.emoji];
                    plotElement.textContent = stages[growthStage] || stages[0];
                    plotElement.style.background = '#2d5a2d';
                    plotElement.className = 'plot growing';
                    
                    const timeLeft = plot.remainingTime / 1000;
                    const clicksLeft = this.seedTypes[plot.type].clicks - plot.clicks;
                    plotElement.title = `${seedData.name} - ${Math.ceil(timeLeft)}сек осталось | Кликов: ${plot.clicks} | Кликай чтобы ускорить рост на 3 секунды!`;
                }
                
                let progressContainer = plotElement.querySelector('.progress-container');
                if (!progressContainer) {
                    progressContainer = document.createElement('div');
                    progressContainer.className = 'progress-container';
                    plotElement.appendChild(progressContainer);
                }
                
                const timeLeft = Math.ceil(plot.remainingTime / 1000);
                const clickEffect = plot.clicks > 0 ? ` | -${plot.clicks * 3}сек от кликов` : '';
                
                progressContainer.innerHTML = `
                    <div class="growth-info">
                        ⏰ ${timeLeft}сек${clickEffect}
                    </div>
                    <div class="growth-progress">
                        <div class="growth-progress-fill" style="width: ${plot.growth}%"></div>
                    </div>
                    <div class="click-info">
                        👆 Кликай! Каждый клик ускоряет рост на 3 секунды
                    </div>
                `;
                
            } else {
                plotElement.textContent = '🟫';
                plotElement.style.background = '#0f3460';
                plotElement.className = 'plot';
                plotElement.title = 'Пустой участок - кликни чтобы посадить семена';
                
                const progressContainer = plotElement.querySelector('.progress-container');
                if (progressContainer) {
                    progressContainer.remove();
                }
            }
        });
    }
    
    // Переключение видимости магазина
    toggleShop() {
        this.shopOpen = !this.shopOpen;
        const shop = document.getElementById('shop');
        shop.classList.toggle('hidden', !this.shopOpen);
        
        if (this.shopOpen) {
            this.initShop();
        }
        
        if (this.shopOpen && this.inventoryOpen) {
            this.toggleInventory();
        }
    }
    
    // Переключение видимости инвентаря
    toggleInventory() {
        this.inventoryOpen = !this.inventoryOpen;
        const inventory = document.getElementById('inventory');
        inventory.classList.toggle('hidden', !this.inventoryOpen);
        
        if (this.inventoryOpen && this.shopOpen) {
            this.toggleShop();
        }
    }
    
    // Игровой цикл
    startGameLoop() {
        setInterval(() => {
            const now = Date.now();
            const deltaTime = (now - this.lastUpdate) / 1000;
            this.lastUpdate = now;
            
            this.growCrops(deltaTime);
            this.updateDisplay();
        }, 100);
    }
    
    // Показ сообщения о выпадении семян
    showDropMessage(emoji, name, count) {
        const message = document.createElement('div');
        message.className = 'drop-message';
        message.innerHTML = `
            <span class="drop-emoji">${emoji}</span>
            <span class="drop-text">+${count} семян ${name}!</span>
        `;
        
        document.body.appendChild(message);
        
        setTimeout(() => {
            message.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            message.classList.remove('show');
            setTimeout(() => {
                if (message.parentNode) {
                    message.parentNode.removeChild(message);
                }
            }, 500);
        }, 3000);
    }
    
    // Обновление отображения инвентаря
    updateInventoryDisplay() {
        const inventoryItems = document.getElementById('inventoryItems');
        inventoryItems.innerHTML = '';
        
        // Показываем семена
        let hasSeeds = false;
        const seedsSection = document.createElement('div');
        seedsSection.className = 'inventory-section';
        seedsSection.innerHTML = '<h4>📦 Семена (не для продажи)</h4>';
        
        Object.entries(this.seedsInventory).forEach(([seedType, count]) => {
            if (count > 0) {
                hasSeeds = true;
                const seedData = this.seedTypes[seedType];
                const seedItem = document.createElement('div');
                seedItem.className = 'inventory-item seed-item';
                
                seedItem.innerHTML = `
                    <div class="item-emoji">${seedData.emoji}</div>
                    <div class="item-name">${seedData.name}</div>
                    <div class="item-count">Семян: ${count}</div>
                    <div class="item-drop-chance">Шанс семян: ${Math.round(seedData.dropChance * 100)}%</div>
                    <div class="item-info">Посадите чтобы вырастить</div>
                `;
                
                seedsSection.appendChild(seedItem);
            }
        });
        
        if (hasSeeds) {
            inventoryItems.appendChild(seedsSection);
        }
        
        // Показываем урожай
        let hasHarvest = false;
        const harvestSection = document.createElement('div');
        harvestSection.className = 'inventory-section';
        harvestSection.innerHTML = '<h4>💰 Урожай (для продажи)</h4>';
        
        Object.entries(this.harvestInventory).forEach(([seedType, count]) => {
            if (count > 0) {
                hasHarvest = true;
                const seedData = this.seedTypes[seedType];
                const harvestItem = document.createElement('div');
                harvestItem.className = 'inventory-item harvest-item';
                
                harvestItem.innerHTML = `
                    <div class="item-emoji">${seedData.emoji}</div>
                    <div class="item-name">${seedData.name}</div>
                    <div class="item-count">Урожая: ${count}</div>
                    <div class="item-sell-price">Цена: ${seedData.baseSellPrice} душ</div>
                    <button class="sell-btn" onclick="game.sellHarvest('${seedType}')">
                        Продать за ${seedData.baseSellPrice} душ
                    </button>
                `;
                
                harvestSection.appendChild(harvestItem);
            }
        });
        
        if (hasHarvest) {
            inventoryItems.appendChild(harvestSection);
        }
        
        if (!hasSeeds && !hasHarvest) {
            inventoryItems.innerHTML = '<div class="empty-inventory">Инвентарь пуст</div>';
        }
    }
}
let game;
window.onload = function() {
    game = new DarkFarmGame();
    
    document.getElementById('shopToggle').addEventListener('click', () => {
        game.toggleShop();
    });
    
    document.getElementById('inventoryToggle').addEventListener('click', () => {
        game.toggleInventory();
    });
};
// Обработчики для модального окна (добавьте в самый конец файла, после класса)
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('authModal');
    const closeBtn = document.querySelector('.close');
    
    // Закрытие модального окна при клике вне его
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.classList.add('hidden');
        }
    });
    
    // Закрытие по ESC
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            modal.classList.add('hidden');
        }
    });
});




