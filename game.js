class DarkFarmGame {
    constructor() {
        this.souls = 0;
        this.darkEssence = 100;
        this.seedsInventory = {};
        this.harvestInventory = {};
        this.shopCounters = {};
        this.shopCounters = {};
        this.exchangeCounter = 1;
        this.plotCounter = 1;
        this.sellCounters = {};
        // Начальные грядки - 3 штуки
        this.plots = [];
        this.initialPlots = 3;
        this.maxPlots = 31;
        this.plotPrice = 25;
        
        // Настройки обмена валюты
        this.exchangeRate = 5;
        this.exchangeAmount = 10;
        
        // Система аккаунтов
        this.currentUser = null;
        this.autoSaveInterval = null;
        
        this.lastUpdate = Date.now();
        
        // ✅ ПРАВИЛЬНЫЙ ПОРЯДОК: seedTypes ДО инициализации shopCounters
        this.seedTypes = {
            'shadow_berry': {
                name: 'Теневая ягода',
                emoji: '🍇',
                time: 20000,
                clicks: 7,
                buyPrice: 10,
                baseSellPrice: 4,
                description: 'Быстрорастущая, но дешёвая',
                dropChance: 0.5
            },
            'ghost_pumpkin': {
                name: 'Призрачная тыква',
                emoji: '🎃',
                time: 120000,
                clicks: 40,
                buyPrice: 25,
                baseSellPrice: 10,
                description: 'Средняя скорость, хорошая цена',
                dropChance: 0.35
            },
            'void_mushroom': {
                name: 'Гриб пустоты',
                emoji: '🍄',
                time: 900000,
                clicks: 300,
                buyPrice: 50,
                baseSellPrice: 20,
                description: 'Растёт медленно, но дорого стоит',
                dropChance: 0.3
            },
            'crystal_flower': {
                name: 'Хрустальный цветок',
                emoji: '🌷',
                time: 2400000,
                clicks: 800,
                buyPrice: 80,
                baseSellPrice: 32,
                description: 'Ценный, но требует терпения',
                dropChance: 0.28
            },
            'blood_rose': {
                name: 'Кровавая роза',
                emoji: '🌹',
                time: 5400000,
                clicks: 1800,
                buyPrice: 120,
                baseSellPrice: 48,
                description: 'Очень редкая и дорогая',
                dropChance: 0.15
            },
            'moonlight_lily': {
                name: 'Лунная лилия',
                emoji: '🌸',
                time: 10800000,
                clicks: 3600,
                buyPrice: 200,
                baseSellPrice: 80,
                description: 'Цветёт только в лунном свете',
                dropChance: 0.1
            },
            'phantom_orchid': {
                name: 'Фантомная орхидея',
                emoji: '💮',
                time: 21600000,
                clicks: 7200,
                buyPrice: 300,
                baseSellPrice: 120,
                description: 'Легендарное растение из иного мира',
                dropChance: 0.05
            }
        };
        
        // ✅ ТЕПЕРЬ инициализируем shopCounters после seedTypes
        Object.keys(this.seedTypes).forEach(seedType => {
            this.shopCounters[seedType] = 1;
        });
        
        this.shopOpen = false;
        this.inventoryOpen = false;
        
        this.firebaseConfig = {
            apiKey: "AIzaSyCNBY7csQIsnE_EujafSPyAr-pvMxUq81w",
            authDomain: "dark-farm-game.firebaseapp.com",
            projectId: "dark-farm-game",
            storageBucket: "dark-farm-game.firebasestorage.app",
            messagingSenderId: "438535642043",
            appId: "1:438535642043:web:cef80bcf756208073b829e"
        };
        
        this.firebaseApp = null;
        this.db = null;
        this.auth = null;
        
        // ✅ ПРАВИЛЬНЫЙ ПОРЯДОК ИНИЦИАЛИЗАЦИИ:
        // 1. Загружаем данные
        this.loadFromLocalStorage();
        
        // 2. Если данных нет, создаем начальные грядки
        if (this.plots.length === 0) {
            for (let i = 0; i < this.initialPlots; i++) {
                this.addNewPlot();
            }
        }
        
        // 3. Инициализируем интерфейс
        this.setupAuthModal();
        this.startGameLoop();
        this.initShop();
        this.updateInventoryDisplay();
        this.renderFarm();
        this.initFirebase();
        this.calculateOfflineProgress();
        this.setupBeforeUnload();
        
        setTimeout(() => {
            if (!this.auth) {
                console.warn("Firebase Auth все еще не инициализирован, пробуем снова...");
                this.initFirebase();
            }
        }, 2000);
    }
    
    // ========== КОНЕЦ КОНСТРУКТОРА ==========

    calculateOfflineProgress() {
        const lastPlayed = localStorage.getItem('darkFarm_lastPlayed');
        if (!lastPlayed) {
            this.saveLastPlayedTime();
            return;
        }
    
        const now = Date.now();
        const offlineTime = now - parseInt(lastPlayed);
        const maxOfflineTime = 24 * 60 * 60 * 1000;
        
        console.log(`Офлайн время: ${offlineTime}ms`);
        
        if (offlineTime > 10000 && offlineTime < maxOfflineTime) {
            this.processOfflineGrowth(offlineTime);
            this.showOfflineProgressMessage(offlineTime);
        }
        
        this.saveLastPlayedTime();
    }
    
    processOfflineGrowth(offlineTime) {
        let growthOccurred = false;
        
        this.plots.forEach(plot => {
            if (plot.planted && plot.growth < 100 && plot.totalGrowthTime > 0) {
                const growthPerMs = 100 / plot.totalGrowthTime;
                const offlineGrowth = growthPerMs * offlineTime;
                
                plot.growth = Math.min(100, plot.growth + offlineGrowth);
                plot.remainingTime = Math.max(0, plot.remainingTime - offlineTime);
                
                if (plot.growth >= 100) {
                    plot.growth = 100;
                    plot.remainingTime = 0;
                }
                
                growthOccurred = true;
                console.log(`Грядка выросла на ${offlineGrowth.toFixed(2)}%`);
            }
        });
        
        if (growthOccurred) {
            this.updateDisplay();
            this.saveToLocalStorage();
        }
    }
    
    showOfflineProgressMessage(offlineTime) {
        const hours = Math.floor(offlineTime / (1000 * 60 * 60));
        const minutes = Math.floor((offlineTime % (1000 * 60 * 60)) / (1000 * 60));
        
        let timeString = '';
        if (hours > 0) timeString += `${hours}ч `;
        if (minutes > 0) timeString += `${minutes}м`;
        
        const grownPlants = this.plots.filter(plot => 
            plot.planted && plot.growth >= 100
        ).length;
        
        const message = document.createElement('div');
        message.className = 'offline-progress-message';
        message.innerHTML = `
            <div class="offline-header">⚡ Офлайн прогресс</div>
            <div class="offline-time">Вы отсутствовали: ${timeString}</div>
            <div class="offline-info">Выросли ${grownPlants} растений!</div>
            <div class="offline-tip">Кликайте на растения для сбора урожая</div>
        `;
        
        document.body.appendChild(message);
        
        setTimeout(() => message.classList.add('show'), 100);
        setTimeout(() => {
            message.classList.remove('show');
            setTimeout(() => {
                if (message.parentNode) message.parentNode.removeChild(message);
            }, 500);
        }, 5000);
    }
    
    saveLastPlayedTime() {
        localStorage.setItem('darkFarm_lastPlayed', Date.now().toString());
    }
    
    saveToLocalStorage() {
        const gameData = {
            souls: this.souls,
            darkEssence: this.darkEssence,
            seedsInventory: this.seedsInventory,
            harvestInventory: this.harvestInventory,
            plots: this.plots,
            lastUpdate: Date.now()
        };
        localStorage.setItem('darkFarm_backup', JSON.stringify(gameData));
    }
    
    loadFromLocalStorage() {
        const saved = localStorage.getItem('darkFarm_backup');
        if (saved) {
            try {
                const gameData = JSON.parse(saved);
                this.souls = gameData.souls || 0;
                this.darkEssence = gameData.darkEssence || 100;
                this.seedsInventory = gameData.seedsInventory || {};
                this.harvestInventory = gameData.harvestInventory || {};
                this.plots = gameData.plots || [];
                
                console.log(`Загружено ${this.plots.length} грядок из сохранения`);
                return true;
            } catch (error) {
                console.error('Ошибка загрузки из localStorage:', error);
            }
        }
        return false;
    }
    
    setupBeforeUnload() {
        window.addEventListener('beforeunload', () => {
            this.saveLastPlayedTime();
            if (this.currentUser) {
                this.saveGameToCloud();
            } else {
                this.saveToLocalStorage();
            }
        });
    }

    checkAuthState() {
        if (!this.auth) {
            console.error("Firebase Auth не инициализирован!");
            return;
        }
        
        console.log("Подписываемся на изменения состояния аутентификации...");
        
        this.auth.onAuthStateChanged((user) => {
            console.log("Изменение состояния аутентификации:", user);
            
            if (user) {
                console.log("Пользователь вошел:", user.email);
                this.currentUser = user;
                document.getElementById('authButton').textContent = '👤 Аккаунт';
                this.loadGameFromCloud();
                this.showAuthStatus("Успешный вход!", "success");
            } else {
                console.log("Пользователь вышел");
                this.currentUser = null;
                document.getElementById('authButton').textContent = '🔐 Войти в аккаунт';
                this.stopAutoSave();
                this.resetGame();
            }
        }, (error) => {
            console.error("Ошибка в onAuthStateChanged:", error);
        });
    }

    showAuthStatus(message, type = "error") {
        const status = document.getElementById('authStatus');
        status.textContent = message;
        status.className = `auth-status ${type}`;
        
        if (type === "success") {
            setTimeout(() => {
                status.textContent = '';
                status.className = 'auth-status';
            }, 3000);
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

        document.getElementById('loginSubmit').addEventListener('click', () => this.login());
        document.getElementById('registerSubmit').addEventListener('click', () => this.register());

        document.getElementById('loginPassword').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.login();
        });
        document.getElementById('registerPassword').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.register();
        });
        
        setTimeout(() => {
            console.log("Firebase Config:", this.firebaseConfig);
            console.log("Firebase Auth:", this.auth);
        }, 1000);
    }

    initFirebase() {
        try {
            console.log("Инициализация Firebase...");
            
            if (typeof firebase === 'undefined') {
                console.error("Firebase не загружен!");
                return;
            }
    
            if (!firebase.apps.length) {
                this.firebaseApp = firebase.initializeApp(this.firebaseConfig);
                console.log("Firebase app инициализирован:", this.firebaseApp);
            } else {
                this.firebaseApp = firebase.app();
                console.log("Используем существующий Firebase app");
            }
    
            this.db = firebase.firestore();
            this.auth = firebase.auth();
            
            console.log("Firebase Auth инициализирован:", this.auth);
            console.log("Firebase Firestore инициализирован:", this.db);
            
            this.checkAuthState();
            
        } catch (error) {
            console.error("Ошибка инициализации Firebase:", error);
        }
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

    async login() {
        const email = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        const status = document.getElementById('authStatus');
        
        console.log("Попытка входа:", email);
        
        if (!this.auth) {
            this.showAuthStatus("Ошибка: Firebase не инициализирован");
            return;
        }
        
        try {
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            console.log("Вход успешен:", userCredential.user);
            this.hideAuthModal();
            status.textContent = '';
        } catch (error) {
            console.error("Ошибка входа:", error);
            this.showAuthStatus('Ошибка входа: ' + error.message);
        }
    }
    
    async register() {
        const email = document.getElementById('registerUsername').value.trim();
        const password = document.getElementById('registerPassword').value;
        const confirm = document.getElementById('registerConfirm').value;
        const status = document.getElementById('authStatus');
        
        console.log("Попытка регистрации:", email);
        
        if (!this.auth) {
            this.showAuthStatus("Ошибка: Firebase не инициализирован");
            return;
        }
        
        if (!email || !password || !confirm) {
            this.showAuthStatus('Заполните все поля!');
            return;
        }
    
        if (password !== confirm) {
            this.showAuthStatus('Пароли не совпадают!');
            return;
        }
    
        try {
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            console.log("Регистрация успешна:", userCredential.user);
            await this.createNewUserData();
            this.hideAuthModal();
            status.textContent = '';
        } catch (error) {
            console.error("Ошибка регистрации:", error);
            this.showAuthStatus('Ошибка регистрации: ' + error.message);
        }
    }

    async logout() {
        await this.saveGameToCloud();
        if (this.auth) {
            await this.auth.signOut();
        }
        this.currentUser = null;
        document.getElementById('authButton').textContent = '🔐 Войти в аккаунт';
        this.stopAutoSave();
        this.resetGame();
    }

    async saveGameToCloud() {
        if (!this.currentUser) return;
        
        const gameData = {
            souls: this.souls,
            darkEssence: this.darkEssence,
            seedsInventory: this.seedsInventory,
            harvestInventory: this.harvestInventory,
            plots: this.plots,
            lastUpdate: Date.now()
        };
        
        try {
            await this.db.collection('users').doc(this.currentUser.uid).set({
                gameData: gameData,
                lastSaved: new Date()
            });
            
            this.saveLastPlayedTime();
            this.saveToLocalStorage();
            
        } catch (error) {
            console.error('Ошибка сохранения в облако:', error);
            this.saveToLocalStorage();
        }
    }

    resetGame() {
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

    async loadGameFromCloud() {
        if (!this.currentUser) {
            if (this.loadFromLocalStorage()) {
                this.renderFarm();
                this.updateDisplay();
                this.initShop();
                this.updateInventoryDisplay();
            }
            return;
        }
        
        try {
            const doc = await this.db.collection('users').doc(this.currentUser.uid).get();
            
            if (doc.exists) {
                const userData = doc.data();
                const gameData = userData.gameData;
                
                this.souls = gameData.souls || 0;
                this.darkEssence = gameData.darkEssence || 100;
                this.seedsInventory = gameData.seedsInventory || {};
                this.harvestInventory = gameData.harvestInventory || {};
                this.plots = gameData.plots || [];

                console.log(`Загружено ${this.plots.length} грядок из облака`);

                this.renderFarm();
                this.updateDisplay();
                this.initShop();
                this.updateInventoryDisplay();
                this.saveToLocalStorage();
            } else {
                this.loadFromLocalStorage();
                this.renderFarm();
            }
        } catch (error) {
            console.error('Ошибка загрузки из облака:', error);
            this.loadFromLocalStorage();
            this.renderFarm();
        }
        this.startAutoSave();
    }

    stopAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    }

    startAutoSave() {
        this.autoSaveInterval = setInterval(() => {
            if (this.currentUser) {
                this.saveGameToCloud();
            } else {
                this.saveToLocalStorage();
                this.saveLastPlayedTime();
            }
        }, 30000);
    }
    
    async createNewUserData() {
        this.plots = [];
        for (let i = 0; i < this.initialPlots; i++) {
            this.addNewPlot();
        }
        
        const gameData = {
            souls: 0,
            darkEssence: 100,
            seedsInventory: {},
            harvestInventory: {},
            plots: this.plots,
            lastUpdate: Date.now()
        };
        
        await this.saveGameToCloud();
    }

    // ========== ОСНОВНЫЕ МЕТОДЫ ИГРЫ ==========
    incrementSell(seedType) {
        if (!this.sellCounters[seedType]) {
            this.sellCounters[seedType] = 1;
        }
        const maxSellable = this.harvestInventory[seedType] || 0;
        if (this.sellCounters[seedType] < maxSellable) {
            this.sellCounters[seedType]++;
            this.updateInventorySellItem(seedType);
        }
    }
    
    decrementSell(seedType) {
        if (!this.sellCounters[seedType]) {
            this.sellCounters[seedType] = 1;
        }
        if (this.sellCounters[seedType] > 1) {
            this.sellCounters[seedType]--;
            this.updateInventorySellItem(seedType);
        }
    }
    
    setMaxSell(seedType) {
        const maxSellable = this.harvestInventory[seedType] || 0;
        if (maxSellable > 0) {
            this.sellCounters[seedType] = maxSellable;
            this.updateInventorySellItem(seedType);
        }
    }
    
    updateSellFromInput(seedType) {
        const input = document.getElementById(`sell-quantity-${seedType}`);
        const maxSellable = this.harvestInventory[seedType] || 0;
        let value = parseInt(input.value) || 1;
        
        if (value < 1) value = 1;
        if (value > maxSellable) value = maxSellable;
        
        this.sellCounters[seedType] = value;
        this.updateInventorySellItem(seedType);
    }
    
    // Обновленный метод sellHarvest с поддержкой счетчика
    sellHarvest(seedType) {
        const sellCount = this.sellCounters[seedType] || 1;
        const seedData = this.seedTypes[seedType];
        
        if (this.harvestInventory[seedType] >= sellCount) {
            const totalPrice = seedData.baseSellPrice * sellCount;
            this.souls += totalPrice;
            this.harvestInventory[seedType] -= sellCount;
            
            // Сбрасываем счетчик после продажи
            this.sellCounters[seedType] = 1;
            
            this.updateDisplay();
            this.updateInventoryDisplay();
            this.saveGameToCloud();
            
            // Показываем сообщение о успешной продаже
            this.showSellMessage(seedData.emoji, seedData.name, sellCount, totalPrice);
        }
    }
    
    // Метод для показа сообщения о продаже
    showSellMessage(emoji, name, count, price) {
        const message = document.createElement('div');
        message.className = 'purchase-message';
        message.innerHTML = `
            <span class="purchase-emoji">💰</span>
            <span class="purchase-text">Продано ${count} урожая ${name} за ${price} душ!</span>
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
    
    // Метод для обновления отображения элемента продажи в инвентаре
    updateInventorySellItem(seedType) {
        const sellCount = this.sellCounters[seedType] || 1;
        const seedData = this.seedTypes[seedType];
        const maxSellable = this.harvestInventory[seedType] || 0;
        const totalPrice = seedData.baseSellPrice * sellCount;
        const canSell = maxSellable >= sellCount && sellCount > 0;
        
        // Обновляем input
        const input = document.getElementById(`sell-quantity-${seedType}`);
        if (input) {
            input.value = sellCount;
            input.max = maxSellable;
        }
        
        // Обновляем подсказку
        const hint = document.getElementById(`sell-hint-${seedType}`);
        if (hint) {
            hint.textContent = `Можно продать: ${maxSellable} шт`;
            hint.style.color = maxSellable > 0 ? '#4CAF50' : '#f44336';
        }
        
        // Обновляем общую стоимость и кнопку
        const harvestItem = document.querySelector(`#sell-quantity-${seedType}`)?.closest('.inventory-item');
        if (harvestItem) {
            const totalElement = harvestItem.querySelector('.sell-total');
            if (totalElement) {
                totalElement.textContent = `${totalPrice} душ`;
            }
            
            const button = harvestItem.querySelector('.sell-btn');
            if (button) {
                button.textContent = `Продать ${sellCount} шт за ${totalPrice} душ`;
                button.disabled = !canSell;
            }
        }
    }
    
    // Обновите метод updateInventoryDisplay для добавления счетчиков продажи
    updateInventoryDisplay() {
        const inventoryItems = document.getElementById('inventoryItems');
        inventoryItems.innerHTML = '';
        
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
        
        let hasHarvest = false;
        const harvestSection = document.createElement('div');
        harvestSection.className = 'inventory-section';
        harvestSection.innerHTML = '<h4>💰 Урожай (для продажи)</h4>';
        
        Object.entries(this.harvestInventory).forEach(([seedType, count]) => {
            if (count > 0) {
                hasHarvest = true;
                const seedData = this.seedTypes[seedType];
                const sellCount = this.sellCounters[seedType] || 1;
                const totalPrice = seedData.baseSellPrice * sellCount;
                const canSell = count >= sellCount;
                
                const harvestItem = document.createElement('div');
                harvestItem.className = 'inventory-item harvest-item';
                
                harvestItem.innerHTML = `
                    <div class="item-emoji">${seedData.emoji}</div>
                    <div class="item-name">${seedData.name}</div>
                    <div class="item-count">Урожая: ${count}</div>
                    <div class="item-sell-price">Цена за шт: ${seedData.baseSellPrice} душ</div>
                    
                    <div class="quantity-controls">
                        <div class="quantity-info">
                            <span>Количество: </span>
                            <span class="quantity-total sell-total">${totalPrice} душ</span>
                        </div>
                        <div class="quantity-buttons">
                            <button class="quantity-btn" onclick="game.decrementSell('${seedType}')">-</button>
                            <input type="number" 
                                   class="quantity-input" 
                                   id="sell-quantity-${seedType}" 
                                   value="${sellCount}" 
                                   min="1" 
                                   max="${count}" 
                                   onchange="game.updateSellFromInput('${seedType}')">
                            <button class="quantity-btn" onclick="game.incrementSell('${seedType}')">+</button>
                            <button class="quantity-max-btn" onclick="game.setMaxSell('${seedType}')">MAX</button>
                        </div>
                        <div class="quantity-hint" id="sell-hint-${seedType}">
                            Можно продать: ${count} шт
                        </div>
                    </div>
                    
                    <button class="sell-btn" onclick="game.sellHarvest('${seedType}')" 
                            ${!canSell ? 'disabled' : ''}>
                        Продать ${sellCount} шт за ${totalPrice} душ
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
    buySeed(seedType) {
        const seedData = this.seedTypes[seedType];
        const quantity = this.shopCounters[seedType] || 1;
        const totalPrice = seedData.buyPrice * quantity;
        
        if (this.darkEssence >= totalPrice) {
            this.darkEssence -= totalPrice;
            
            if (!this.seedsInventory[seedType]) {
                this.seedsInventory[seedType] = 0;
            }
            this.seedsInventory[seedType] += quantity;
            
            this.shopCounters[seedType] = 1;
            
            this.updateDisplay();
            this.initShop();
            this.updateInventoryDisplay();
            this.saveGameToCloud();
            
            this.showPurchaseMessage(seedData.emoji, seedData.name, quantity, totalPrice);
        }
    }
    
    showPurchaseMessage(emoji, name, quantity, price) {
        const message = document.createElement('div');
        message.className = 'purchase-message';
        message.innerHTML = `
            <span class="purchase-emoji">${emoji}</span>
            <span class="purchase-text">Куплено ${quantity} семян ${name} за ${price} эссенции!</span>
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
            this.saveGameToCloud();
        }
    }

    harvest(plotIndex) {
        const plot = this.plots[plotIndex];
        if (plot.planted && plot.growth >= 100) {
            const seedType = plot.type;
            const seedData = this.seedTypes[seedType];
            
            if (!this.harvestInventory[seedType]) {
                this.harvestInventory[seedType] = 0;
            }
            this.harvestInventory[seedType]++;
            
            const seedDrop = this.getRandomSeedDrop(seedType);
            if (seedDrop > 0) {
                if (!this.seedsInventory[seedType]) {
                    this.seedsInventory[seedType] = 0;
                }
                this.seedsInventory[seedType] += seedDrop;
                this.showDropMessage(seedData.emoji, seedData.name, seedDrop);
            }
            
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
            this.saveGameToCloud();
        }
    }

    sellHarvest(seedType) {
        if (this.harvestInventory[seedType] > 0) {
            const seedData = this.seedTypes[seedType];
            this.souls += seedData.baseSellPrice;
            this.harvestInventory[seedType]--;
            
            this.updateDisplay();
            this.updateInventoryDisplay();
            this.saveGameToCloud();
        }
    }

    buyEssence() {
        const totalCost = this.exchangeAmount * this.exchangeCounter;
        const totalGain = this.exchangeAmount * this.exchangeRate * this.exchangeCounter;
        
        if (this.souls >= totalCost) {
            this.souls -= totalCost;
            this.darkEssence += totalGain;
            
            // Сбрасываем счетчик после покупки
            this.exchangeCounter = 1;
            
            this.updateDisplay();
            this.initShop();
            this.saveGameToCloud();
            
            // Показываем сообщение о успешном обмене
            this.showExchangeMessage(totalCost, totalGain);
            return true;
        }
        return false;
    }
    
    buyPlot() {
        const totalCost = this.plotPrice * this.plotCounter;
        
        if (this.souls >= totalCost && this.plots.length + this.plotCounter <= this.maxPlots) {
            this.souls -= totalCost;
            
            // Добавляем несколько грядок
            for (let i = 0; i < this.plotCounter; i++) {
                this.addNewPlot();
            }
            
            // Сбрасываем счетчик после покупки
            this.plotCounter = 1;
            
            this.renderFarm();
            this.initShop();
            this.updateDisplay();
            this.saveGameToCloud();
            
            // Показываем сообщение о успешной покупке
            this.showPlotMessage(this.plotCounter, totalCost);
            return true;
        } else if (this.plots.length + this.plotCounter > this.maxPlots) {
            alert('Достигнут максимум грядок!');
        }
        return false;
    }
    showExchangeMessage(cost, gain) {
        const message = document.createElement('div');
        message.className = 'purchase-message';
        message.innerHTML = `
            <span class="purchase-emoji">💱</span>
            <span class="purchase-text">Обменяно ${cost} душ на ${gain} эссенции!</span>
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
    
    showPlotMessage(count, cost) {
        const message = document.createElement('div');
        message.className = 'purchase-message';
        message.innerHTML = `
            <span class="purchase-emoji">🟫</span>
            <span class="purchase-text">Куплено ${count} грядок за ${cost} душ!</span>
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
    
    renderFarm() {
        const farmArea = document.getElementById('farmArea');
        farmArea.innerHTML = '';
        
        console.log(`Рендерим ${this.plots.length} грядок`);
        
        this.plots.forEach((plot, index) => {
            const plotElement = document.createElement('div');
            plotElement.className = 'plot';
            plotElement.onclick = () => this.handlePlotClick(index);
            
            if (plot.planted) {
                const seedData = this.seedTypes[plot.type];
                if (plot.growth >= 100) {
                    plotElement.textContent = seedData.emoji;
                    plotElement.className = 'plot ready';
                } else {
                    const growthStage = Math.floor(plot.growth / 25);
                    const stages = ['🌱', '🪴', '🌿', seedData.emoji];
                    plotElement.textContent = stages[growthStage] || stages[0];
                    plotElement.className = 'plot growing';
                }
            } else {
                plotElement.textContent = '🟫';
                plotElement.className = 'plot';
            }
            
            farmArea.appendChild(plotElement);
        });
        
        this.updateDisplay();
    }

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
    
    initShop() {
        const shopItems = document.getElementById('shopItems');
        shopItems.innerHTML = '';
        
        // ОБМЕН ВАЛЮТЫ с счетчиком
        const exchangeTotalCost = this.exchangeAmount * this.exchangeCounter;
        const exchangeTotalGain = this.exchangeAmount * this.exchangeRate * this.exchangeCounter;
        const maxExchange = Math.floor(this.souls / this.exchangeAmount);
        const canExchange = this.souls >= exchangeTotalCost;
        
        const exchangeShopItem = document.createElement('div');
        exchangeShopItem.className = 'shop-item exchange-shop-item';
        
        exchangeShopItem.innerHTML = `
            <div class="item-emoji">💱</div>
            <div class="item-name">Обмен валюты</div>
            <div class="item-price">${this.exchangeAmount} душ → ${this.exchangeAmount * this.exchangeRate} эссенции</div>
            <div class="item-growth">Курс: 1 душа = ${this.exchangeRate} эссенции</div>
            <div class="item-description">Обменяйте души на эссенцию для покупки семян</div>
            
            <div class="quantity-controls">
                <div class="quantity-info">
                    <span>Количество: </span>
                    <span class="quantity-total">${exchangeTotalCost} душ → ${exchangeTotalGain} эссенции</span>
                </div>
                <div class="quantity-buttons">
                    <button class="quantity-btn" onclick="game.decrementExchange()">-</button>
                    <input type="number" 
                           class="quantity-input" 
                           id="quantity-exchange" 
                           value="${this.exchangeCounter}" 
                           min="1" 
                           max="${maxExchange}" 
                           onchange="game.updateExchangeFromInput()">
                    <button class="quantity-btn" onclick="game.incrementExchange()">+</button>
                    <button class="quantity-max-btn" onclick="game.setMaxExchange()">MAX</button>
                </div>
                <div class="quantity-hint" id="hint-exchange">
                    Можно обменять: ${maxExchange} раз
                </div>
            </div>
            
            <button class="buy-btn" onclick="game.buyEssence()" 
                    ${!canExchange ? 'disabled' : ''}>
                Обменять ${this.exchangeCounter} раз за ${exchangeTotalCost} душ
            </button>
        `;
        shopItems.appendChild(exchangeShopItem);
        
        // ПОКУПКА ГРЯДОК с счетчиком
        const plotTotalCost = this.plotPrice * this.plotCounter;
        const maxPlotsToBuy = Math.min(
            Math.floor(this.souls / this.plotPrice),
            this.maxPlots - this.plots.length
        );
        const canBuyPlot = this.souls >= plotTotalCost && this.plots.length + this.plotCounter <= this.maxPlots;
        
        const plotShopItem = document.createElement('div');
        plotShopItem.className = 'shop-item plot-shop-item';
        
        plotShopItem.innerHTML = `
            <div class="item-emoji">🟫</div>
            <div class="item-name">Дополнительная грядка</div>
            <div class="item-price">Цена: ${this.plotPrice} душ</div>
            <div class="item-growth">Грядок: ${this.plots.length}/${this.maxPlots}</div>
            <div class="item-description">Увеличьте площадь вашей фермы</div>
            
            <div class="quantity-controls">
                <div class="quantity-info">
                    <span>Количество: </span>
                    <span class="quantity-total">${plotTotalCost} душ</span>
                </div>
                <div class="quantity-buttons">
                    <button class="quantity-btn" onclick="game.decrementPlot()">-</button>
                    <input type="number" 
                           class="quantity-input" 
                           id="quantity-plot" 
                           value="${this.plotCounter}" 
                           min="1" 
                           max="${maxPlotsToBuy}" 
                           onchange="game.updatePlotFromInput()">
                    <button class="quantity-btn" onclick="game.incrementPlot()">+</button>
                    <button class="quantity-max-btn" onclick="game.setMaxPlot()">MAX</button>
                </div>
                <div class="quantity-hint" id="hint-plot">
                    Можно купить: ${maxPlotsToBuy} грядок
                </div>
            </div>
            
            <button class="buy-btn" onclick="game.buyPlot()" 
                    ${!canBuyPlot ? 'disabled' : ''}>
                ${this.plots.length + this.plotCounter >= this.maxPlots ? 'Максимум' : `Купить ${this.plotCounter} грядок за ${plotTotalCost} душ`}
            </button>
        `;
        shopItems.appendChild(plotShopItem);
        
        // Семена с счетчиками (без изменений)
        Object.entries(this.seedTypes).forEach(([seedType, seedData]) => {
            const shopItem = document.createElement('div');
            shopItem.className = `shop-item ${seedData.buyPrice > 100 ? 'expensive' : 'cheap'}`;
            
            const currentCount = this.shopCounters[seedType] || 1;
            const totalPrice = seedData.buyPrice * currentCount;
            const canAfford = this.darkEssence >= totalPrice;
            const maxAffordable = Math.floor(this.darkEssence / seedData.buyPrice);
            
            shopItem.innerHTML = `
                <div class="item-emoji">${seedData.emoji}</div>
                <div class="item-name">${seedData.name}</div>
                <div class="item-price">Цена: ${seedData.buyPrice} эссенции</div>
                <div class="item-sell-price">Продажа урожая: ${seedData.baseSellPrice} душ</div>
                <div class="item-growth">Рост: ${seedData.time/1000}сек | Шанс семян: ${Math.round(seedData.dropChance * 100)}%</div>
                <div class="item-description">${seedData.description}</div>
                
                <div class="quantity-controls">
                    <div class="quantity-info">
                        <span>Количество: </span>
                        <span class="quantity-total">${totalPrice} эссенции</span>
                    </div>
                    <div class="quantity-buttons">
                        <button class="quantity-btn" onclick="game.decrementQuantity('${seedType}')">-</button>
                        <input type="number" 
                               class="quantity-input" 
                               id="quantity-${seedType}" 
                               value="${currentCount}" 
                               min="1" 
                               max="${maxAffordable}" 
                               onchange="game.updateQuantityFromInput('${seedType}')">
                        <button class="quantity-btn" onclick="game.incrementQuantity('${seedType}')">+</button>
                        <button class="quantity-max-btn" onclick="game.setMaxQuantity('${seedType}')">MAX</button>
                    </div>
                    <div class="quantity-hint" id="hint-${seedType}">
                        Можно купить: ${maxAffordable} шт
                    </div>
                </div>
                
                <button class="buy-btn" onclick="game.buySeed('${seedType}')" 
                        ${!canAfford ? 'disabled' : ''}>
                    Купить ${currentCount} семян за ${totalPrice} эссенции
                </button>
            `;
            
            shopItems.appendChild(shopItem);
        });
    }
        // Методы для управления количеством обмена валюты
    incrementExchange() {
        const maxAffordable = Math.floor(this.souls / this.exchangeAmount);
        if (this.exchangeCounter < maxAffordable) {
            this.exchangeCounter++;
            this.updateShopExchange();
        }
    }
    
    decrementExchange() {
        if (this.exchangeCounter > 1) {
            this.exchangeCounter--;
            this.updateShopExchange();
        }
    }
    
    setMaxExchange() {
        const maxAffordable = Math.floor(this.souls / this.exchangeAmount);
        if (maxAffordable > 0) {
            this.exchangeCounter = maxAffordable;
            this.updateShopExchange();
        }
    }
    
    updateExchangeFromInput() {
        const input = document.getElementById('quantity-exchange');
        const maxAffordable = Math.floor(this.souls / this.exchangeAmount);
        let value = parseInt(input.value) || 1;
        
        if (value < 1) value = 1;
        if (value > maxAffordable) value = maxAffordable;
        
        this.exchangeCounter = value;
        this.updateShopExchange();
    }
    
    updateShopExchange() {
        const totalCost = this.exchangeAmount * this.exchangeCounter;
        const totalGain = this.exchangeAmount * this.exchangeRate * this.exchangeCounter;
        const maxAffordable = Math.floor(this.souls / this.exchangeAmount);
        const canAfford = this.souls >= totalCost;
        
        // Обновляем input
        const input = document.getElementById('quantity-exchange');
        if (input) {
            input.value = this.exchangeCounter;
            input.max = maxAffordable;
        }
        
        // Обновляем подсказку
        const hint = document.getElementById('hint-exchange');
        if (hint) {
            hint.textContent = `Можно обменять: ${maxAffordable} раз`;
            hint.style.color = maxAffordable > 0 ? '#4CAF50' : '#f44336';
        }
        
        // Обновляем общую стоимость
        const shopItem = document.querySelector('.exchange-shop-item');
        if (shopItem) {
            const totalElement = shopItem.querySelector('.quantity-total');
            if (totalElement) {
                totalElement.textContent = `${totalCost} душ → ${totalGain} эссенции`;
            }
            
            // Обновляем кнопку
            const button = shopItem.querySelector('.buy-btn');
            if (button) {
                button.textContent = `Обменять ${this.exchangeCounter} раз за ${totalCost} душ`;
                button.disabled = !canAfford;
            }
        }
    }
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
    // Методы для управления количеством покупки грядок
    incrementPlot() {
        const maxAffordableBySouls = Math.floor(this.souls / this.plotPrice);
        const maxByPlots = this.maxPlots - this.plots.length;
        const maxAffordable = Math.min(maxAffordableBySouls, maxByPlots);
        
        if (this.plotCounter < maxAffordable) {
            this.plotCounter++;
            this.updateShopPlot();
        }
    }
    
    decrementPlot() {
        if (this.plotCounter > 1) {
            this.plotCounter--;
            this.updateShopPlot();
        }
    }
    
    setMaxPlot() {
        const maxAffordableBySouls = Math.floor(this.souls / this.plotPrice);
        const maxByPlots = this.maxPlots - this.plots.length;
        const maxAffordable = Math.min(maxAffordableBySouls, maxByPlots);
        
        if (maxAffordable > 0) {
            this.plotCounter = maxAffordable;
            this.updateShopPlot();
        }
    }
    
    updatePlotFromInput() {
        const input = document.getElementById('quantity-plot');
        const maxAffordableBySouls = Math.floor(this.souls / this.plotPrice);
        const maxByPlots = this.maxPlots - this.plots.length;
        const maxAffordable = Math.min(maxAffordableBySouls, maxByPlots);
        let value = parseInt(input.value) || 1;
        
        if (value < 1) value = 1;
        if (value > maxAffordable) value = maxAffordable;
        
        this.plotCounter = value;
        this.updateShopPlot();
    }
    
    updateShopPlot() {
        const totalCost = this.plotPrice * this.plotCounter;
        const maxAffordableBySouls = Math.floor(this.souls / this.plotPrice);
        const maxByPlots = this.maxPlots - this.plots.length;
        const maxAffordable = Math.min(maxAffordableBySouls, maxByPlots);
        const canAfford = this.souls >= totalCost && this.plotCounter <= maxByPlots;
        
        // Обновляем input
        const input = document.getElementById('quantity-plot');
        if (input) {
            input.value = this.plotCounter;
            input.max = maxAffordable;
        }
        
        // Обновляем подсказку
        const hint = document.getElementById('hint-plot');
        if (hint) {
            hint.textContent = `Можно купить: ${maxAffordable} грядок`;
            hint.style.color = maxAffordable > 0 ? '#4CAF50' : '#f44336';
        }
        
        // Обновляем общую стоимость
        const shopItem = document.querySelector('.plot-shop-item');
        if (shopItem) {
            const totalElement = shopItem.querySelector('.quantity-total');
            if (totalElement) {
                totalElement.textContent = `${totalCost} душ`;
            }
            
            // Обновляем кнопку
            const button = shopItem.querySelector('.buy-btn');
            if (button) {
                const isMax = this.plots.length + this.plotCounter >= this.maxPlots;
                button.textContent = isMax ? 
                    'Максимум' : 
                    `Купить ${this.plotCounter} грядок за ${totalCost} душ`;
                button.disabled = !canAfford || isMax;
            }
        }
    }
    
    updateDisplay() {
        document.getElementById('souls').textContent = `Души: ${this.souls}`;
        document.getElementById('darkEssence').textContent = `Тёмная эссенция: ${this.darkEssence}`;
        
        // Если магазин открыт, обновляем все доступные количества
        if (this.shopOpen) {
            // Обновляем обмен валюты
            this.updateShopExchange();
            
            // Обновляем покупку грядок
            this.updateShopPlot();
            
            // Обновляем семена
            Object.keys(this.seedTypes).forEach(seedType => {
                this.updateShopItem(seedType);
            });
        }
        
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
    
    toggleInventory() {
        this.inventoryOpen = !this.inventoryOpen;
        const inventory = document.getElementById('inventory');
        inventory.classList.toggle('hidden', !this.inventoryOpen);
        
        if (this.inventoryOpen && this.shopOpen) {
            this.toggleShop();
        }
    }
    
    startGameLoop() {
        setInterval(() => {
            const now = Date.now();
            const deltaTime = (now - this.lastUpdate) / 1000;
            this.lastUpdate = now;
            
            this.growCrops(deltaTime);
            this.updateDisplay();
        }, 100);
    }
    
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
    
    updateInventoryDisplay() {
        const inventoryItems = document.getElementById('inventoryItems');
        inventoryItems.innerHTML = '';
        
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

    // Методы для управления количеством в магазине
    incrementQuantity(seedType) {
        const maxAffordable = Math.floor(this.darkEssence / this.seedTypes[seedType].buyPrice);
        const currentCount = this.shopCounters[seedType] || 1;
        
        if (currentCount < maxAffordable) {
            this.shopCounters[seedType] = currentCount + 1;
            this.updateShopItem(seedType);
        }
    }
    
    decrementQuantity(seedType) {
        const currentCount = this.shopCounters[seedType] || 1;
        if (currentCount > 1) {
            this.shopCounters[seedType] = currentCount - 1;
            this.updateShopItem(seedType);
        }
    }
    
    setMaxQuantity(seedType) {
        const maxAffordable = Math.floor(this.darkEssence / this.seedTypes[seedType].buyPrice);
        if (maxAffordable > 0) {
            this.shopCounters[seedType] = maxAffordable;
            this.updateShopItem(seedType);
        }
    }
    
    updateQuantityFromInput(seedType) {
        const input = document.getElementById(`quantity-${seedType}`);
        const maxAffordable = Math.floor(this.darkEssence / this.seedTypes[seedType].buyPrice);
        let value = parseInt(input.value) || 1;
        
        if (value < 1) value = 1;
        if (value > maxAffordable) value = maxAffordable;
        
        this.shopCounters[seedType] = value;
        this.updateShopItem(seedType);
    }
    
    updateShopItem(seedType) {
        const seedData = this.seedTypes[seedType];
        const currentCount = this.shopCounters[seedType] || 1;
        const totalPrice = seedData.buyPrice * currentCount;
        const maxAffordable = Math.floor(this.darkEssence / seedData.buyPrice);
        const canAfford = this.darkEssence >= totalPrice;
        
        // Обновляем input
        const input = document.getElementById(`quantity-${seedType}`);
        if (input) {
            input.value = currentCount;
            input.max = maxAffordable;
        }
        
        // Обновляем подсказку
        const hint = document.getElementById(`hint-${seedType}`);
        if (hint) {
            hint.textContent = `Можно купить: ${maxAffordable} шт`;
            hint.style.color = maxAffordable > 0 ? '#4CAF50' : '#f44336';
        }
        
        // Обновляем общую стоимость - ИСПРАВЛЕННЫЙ СЕЛЕКТОР
        const shopItem = document.querySelector(`#quantity-${seedType}`)?.closest('.shop-item');
        if (shopItem) {
            const totalElement = shopItem.querySelector('.quantity-total');
            if (totalElement) {
                totalElement.textContent = `${totalPrice} эссенции`;
            }
            
            // Обновляем кнопку
            const button = shopItem.querySelector('.buy-btn');
            if (button) {
                button.textContent = `Купить ${currentCount} семян за ${totalPrice} эссенции`;
                button.disabled = !canAfford;
            }
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

document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('authModal');
    const closeBtn = document.querySelector('.close');
    
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.classList.add('hidden');
        }
    });
    
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            modal.classList.add('hidden');
        }
    });
});







