// game.js
class DarkFarmGame {
    constructor() {
        this.souls = 0;
        this.darkEssence = 100;
        this.seedsInventory = {};
        this.harvestInventory = {};
        this.elixirInventory = {};
        this.shopCounters = {};
        this.exchangeCounter = 1;
        this.plotCounter = 1;
        this.sellCounters = {};
        
        // Грядки
        this.plots = [];
        this.initialPlots = 3;
        this.maxPlots = 31;
        this.plotPrice = 25;
        
        // Состояния интерфейса
        this.shopOpen = false;
        this.inventoryOpen = false;
        
        // Алхимический котел
        this.alchemyCauldron = {
            owned: false,
            working: false,
            progress: 0,
            currentRecipe: null,
            startTime: null,
            totalTime: 0,
            inputQuantity: 0,
            outputQuantity: 0
        };
        
        // Типы семян
        this.seedTypes = {
            'shadow_berry': {
                name: 'Теневая ягода',
                emoji: '🍇',
                time: 20000,
                clicks: 7,
                buyPrice: 10,
                baseSellPrice: 5,
                description: 'Быстрорастущая, но дешёвая',
                dropChance: 0.5
            },
            'ghost_pumpkin': {
                name: 'Призрачная тыква',
                emoji: '🎃',
                time: 50000,
                clicks: 40,
                buyPrice: 25,
                baseSellPrice: 15,
                description: 'Средняя скорость, хорошая цена',
                dropChance: 0.35
            },
            'void_mushroom': {
                name: 'Гриб пустоты',
                emoji: '🍄',
                time: 100000,
                clicks: 300,
                buyPrice: 50,
                baseSellPrice: 28,
                description: 'Растёт медленно, но дорого стоит',
                dropChance: 0.3
            },
            'crystal_flower': {
                name: 'Хрустальный цветок',
                emoji: '🌷',
                time: 800000,
                clicks: 800,
                buyPrice: 80,
                baseSellPrice: 37,
                description: 'Ценный, но требует терпения',
                dropChance: 0.28
            },
            'blood_rose': {
                name: 'Кровавая роза',
                emoji: '🌹',
                time: 5400000,
                clicks: 1800,
                buyPrice: 120,
                baseSellPrice: 60,
                description: 'Очень редкая и дорогая',
                dropChance: 0.15
            }
        };
        
        // Рецепты эликсиров
        this.elixirRecipes = {
            'ghost_pumpkin': {
                name: 'Призрачный Эликсир',
                emoji: '👻',
                baseSellPrice: 25,
                description: 'Эфирная субстанция из призрачной тыквы',
                brewingTime: 30000,
                outputMultiplier: 1
            },
            'void_mushroom': {
                name: 'Эликсир Пустоты',
                emoji: '⚫',
                baseSellPrice: 45,
                description: 'Концентрированная энергия небытия',
                brewingTime: 60000,
                outputMultiplier: 1
            },
            'crystal_flower': {
                name: 'Кристальный Настой',
                emoji: '💎',
                baseSellPrice: 65,
                description: 'Сияющая жидкость с частицами кристаллов',
                brewingTime: 120000,
                outputMultiplier: 1
            },
            'blood_rose': {
                name: 'Кровавый Отвар',
                emoji: '🩸',
                baseSellPrice: 100,
                description: 'Густая тёмная жидкость с металлическим блеском',
                brewingTime: 240000,
                outputMultiplier: 1
            }
        };
        
        // Инициализация счетчиков магазина
        Object.keys(this.seedTypes).forEach(seedType => {
            this.shopCounters[seedType] = 1;
            this.sellCounters[seedType] = 1;
        });
        
        // Загрузка и инициализация
        this.loadFromLocalStorage();
        
        if (this.plots.length === 0) {
            for (let i = 0; i < this.initialPlots; i++) {
                this.addNewPlot();
            }
        }
        
        this.startGameLoop();
        this.initShop();
        this.updateInventoryDisplay();
        this.renderFarm();
        this.renderBuildings();
    }

    // ========== АЛХИМИЧЕСКИЙ КОТЕЛ ==========

    renderBuildings() {
        const buildingsContainer = document.getElementById('buildingsContainer');
        buildingsContainer.innerHTML = '';

        const cauldron = document.createElement('div');
        cauldron.className = `cauldron-building ${!this.alchemyCauldron.owned ? 'locked' : ''} ${this.alchemyCauldron.working ? 'working' : ''} ${this.alchemyCauldron.progress >= 100 ? 'ready' : ''}`;

        if (!this.alchemyCauldron.owned) {
            // Котел не куплен
            cauldron.innerHTML = `
                <div class="cauldron-emoji">🧪</div>
                <div class="cauldron-name">Алхимический Котёл</div>
                <div class="cauldron-price">Цена: 500 душ</div>
                <div class="cauldron-description">Превращает цветы в магические эликсиры</div>
                <div class="cauldron-stats">Увеличивает стоимость урожая в 1.5-2 раза</div>
                <div class="cauldron-info">Требуется для создания эликсиров</div>
                <button class="cauldron-buy-btn" onclick="game.buyCauldron()" 
                        ${this.souls >= 500 ? '' : 'disabled'}>
                    Купить за 500 душ
                </button>
            `;
        } else if (this.alchemyCauldron.working) {
            // Котел работает
            const recipe = this.elixirRecipes[this.alchemyCauldron.currentRecipe];
            const timeLeft = this.alchemyCauldron.totalTime - (Date.now() - this.alchemyCauldron.startTime);
            const progress = Math.min(100, ((Date.now() - this.alchemyCauldron.startTime) / this.alchemyCauldron.totalTime) * 100);
            
            cauldron.innerHTML = `
                <div class="cauldron-emoji">🧪</div>
                <div class="cauldron-name">Алхимический Котёл</div>
                <div class="cauldron-status">🔄 Варится: ${recipe.name}</div>
                
                <div class="cauldron-progress">
                    <div class="cauldron-progress-info">
                        Осталось: ${Math.ceil(timeLeft / 1000)} сек
                    </div>
                    <div class="cauldron-progress-bar">
                        <div class="cauldron-progress-fill" style="width: ${progress}%"></div>
                    </div>
                </div>
                
                <div class="cauldron-info">
                    Создаёт: ${this.alchemyCauldron.outputQuantity} эликсира
                </div>
                
                <button class="cauldron-collect-btn" onclick="game.collectElixir()" 
                        ${progress >= 100 ? '' : 'disabled'}>
                    ${progress >= 100 ? '🎁 Забрать эликсир!' : '⏳ Ещё не готово'}
                </button>
            `;
        } else {
            // Котел готов к работе
            const availableRecipes = Object.keys(this.elixirRecipes)
                .filter(recipeType => this.harvestInventory[recipeType] > 0);
            
            cauldron.innerHTML = `
                <div class="cauldron-emoji">🧪</div>
                <div class="cauldron-name">Алхимический Котёл</div>
                <div class="cauldron-status">✅ Готов к работе</div>
                <div class="cauldron-description">Выберите цветы для переработки в эликсир</div>
                
                <div class="cauldron-controls">
                    <div class="cauldron-input-label">Тип цветов:</div>
                    <select class="cauldron-seed-select" id="cauldronRecipeType" onchange="game.updateCauldronMaxQuantity()">
                        <option value="">-- Выберите цветы --</option>
                        ${availableRecipes.map(recipeType => {
                            const recipe = this.elixirRecipes[recipeType];
                            const seed = this.seedTypes[recipeType];
                            return `<option value="${recipeType}">${seed.name} (доступно: ${this.harvestInventory[recipeType]}) → ${recipe.name}</option>`;
                        }).join('')}
                    </select>
                    
                    <div class="cauldron-input-label">Количество цветов:</div>
                    <div class="cauldron-quantity">
                        <button class="cauldron-quantity-btn" onclick="game.decrementCauldronQuantity()">-</button>
                        <input type="number" class="cauldron-quantity-input" id="cauldronQuantity" value="1" min="1" max="10">
                        <button class="cauldron-quantity-btn" onclick="game.incrementCauldronQuantity()">+</button>
                    </div>
                </div>
                
                <button class="cauldron-start-btn" onclick="game.startBrewing()" id="startBrewingBtn">
                    Начать варку эликсира
                </button>
            `;
            
            // Обновляем максимальное количество
            this.updateCauldronMaxQuantity();
        }
        
        buildingsContainer.appendChild(cauldron);
    }

    buyCauldron() {
        if (this.souls >= 500 && !this.alchemyCauldron.owned) {
            this.souls -= 500;
            this.alchemyCauldron.owned = true;
            
            this.updateDisplay();
            this.renderBuildings();
            this.saveToLocalStorage();
            
            this.showMessage('🧪', 'Куплен Алхимический Котёл!', 'success');
        }
    }

    updateCauldronMaxQuantity() {
        const recipeType = document.getElementById('cauldronRecipeType').value;
        if (recipeType && this.harvestInventory[recipeType]) {
            const input = document.getElementById('cauldronQuantity');
            input.max = Math.min(10, this.harvestInventory[recipeType]);
        }
    }

    incrementCauldronQuantity() {
        const input = document.getElementById('cauldronQuantity');
        const recipeType = document.getElementById('cauldronRecipeType').value;
        
        if (!recipeType) return;
        
        const maxQuantity = Math.min(10, this.harvestInventory[recipeType] || 0);
        let value = parseInt(input.value) || 1;
        
        if (value < maxQuantity) {
            value++;
            input.value = value;
        }
    }

    decrementCauldronQuantity() {
        const input = document.getElementById('cauldronQuantity');
        let value = parseInt(input.value) || 1;
        
        if (value > 1) {
            value--;
            input.value = value;
        }
    }

    startBrewing() {
        const recipeType = document.getElementById('cauldronRecipeType').value;
        const quantity = parseInt(document.getElementById('cauldronQuantity').value) || 1;
        
        if (!recipeType) {
            this.showMessage('⚠️', 'Выберите тип цветов для переработки!', 'error');
            return;
        }
        
        if (!this.harvestInventory[recipeType] || this.harvestInventory[recipeType] < quantity) {
            this.showMessage('⚠️', 'Недостаточно выбранных цветов!', 'error');
            return;
        }
        
        // Забираем цветы из инвентаря
        this.harvestInventory[recipeType] -= quantity;
        
        // Настраиваем процесс варки
        const recipe = this.elixirRecipes[recipeType];
        this.alchemyCauldron.working = true;
        this.alchemyCauldron.currentRecipe = recipeType;
        this.alchemyCauldron.progress = 0;
        this.alchemyCauldron.startTime = Date.now();
        this.alchemyCauldron.totalTime = recipe.brewingTime * quantity;
        this.alchemyCauldron.inputQuantity = quantity;
        this.alchemyCauldron.outputQuantity = quantity * recipe.outputMultiplier;
        
        this.updateDisplay();
        this.renderBuildings();
        this.updateInventoryDisplay();
        this.saveToLocalStorage();
        
        this.showMessage('🔥', `Начата варка ${recipe.name}!`,'success');
    }

    collectElixir() {
        if (!this.alchemyCauldron.working || this.alchemyCauldron.progress < 100) return;
        
        const recipeType = this.alchemyCauldron.currentRecipe;
        const recipe = this.elixirRecipes[recipeType];
        
        // Добавляем эликсир в инвентарь
        if (!this.elixirInventory[recipeType]) {
            this.elixirInventory[recipeType] = 0;
        }
        this.elixirInventory[recipeType] += this.alchemyCauldron.outputQuantity;
        
        // Сбрасываем состояние котла
        this.alchemyCauldron.working = false;
        this.alchemyCauldron.currentRecipe = null;
        this.alchemyCauldron.progress = 0;
        this.alchemyCauldron.startTime = null;
        this.alchemyCauldron.totalTime = 0;
        this.alchemyCauldron.inputQuantity = 0;
        this.alchemyCauldron.outputQuantity = 0;
        
        this.updateDisplay();
        this.renderBuildings();
        this.updateInventoryDisplay();
        this.saveToLocalStorage();
        
        this.showMessage(recipe.emoji, `Создано ${this.alchemyCauldron.outputQuantity} эликсира ${recipe.name}!`, 'success');
    }

    updateCauldronProgress() {
        if (this.alchemyCauldron.working && this.alchemyCauldron.startTime) {
            const elapsed = Date.now() - this.alchemyCauldron.startTime;
            this.alchemyCauldron.progress = Math.min(100, (elapsed / this.alchemyCauldron.totalTime) * 100);
            
            if (this.alchemyCauldron.progress >= 100) {
                this.renderBuildings();
                this.saveToLocalStorage();
            }
        }
    }

    // ========== ОСНОВНЫЕ МЕТОДЫ ИГРЫ ==========

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
            this.saveToLocalStorage();
            
            this.showPurchaseMessage(seedData.emoji, seedData.name, quantity, totalPrice);
        }
    }
    
    showPurchaseMessage(emoji, name, quantity, price) {
        this.showMessage(emoji, `Куплено ${quantity} семян ${name} за ${price} эссенции!`, 'success');
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
            this.saveToLocalStorage();
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
            this.saveToLocalStorage();
        }
    }

    buyEssence() {
        const exchangeRate = 5;
        const exchangeAmount = 1;
        const totalCost = exchangeAmount * this.exchangeCounter;
        const totalGain = exchangeAmount * exchangeRate * this.exchangeCounter;
        
        if (this.souls >= totalCost) {
            this.souls -= totalCost;
            this.darkEssence += totalGain;
            
            this.exchangeCounter = 1;
            
            this.updateDisplay();
            this.initShop();
            this.saveToLocalStorage();
            
            this.showMessage('💱', `Обменяно ${totalCost} душ на ${totalGain} эссенции!`, 'success');
            return true;
        }
        return false;
    }
    
    buyPlot() {
        const totalCost = this.plotPrice * this.plotCounter;
        
        if (this.souls >= totalCost && this.plots.length + this.plotCounter <= this.maxPlots) {
            this.souls -= totalCost;
            
            for (let i = 0; i < this.plotCounter; i++) {
                this.addNewPlot();
            }
            
            this.plotCounter = 1;
            
            this.renderFarm();
            this.initShop();
            this.updateDisplay();
            this.saveToLocalStorage();
            
            this.showMessage('🟫', `Куплено ${this.plotCounter} грядок за ${totalCost} душ!`, 'success');
            return true;
        } else if (this.plots.length + this.plotCounter > this.maxPlots) {
            alert('Достигнут максимум грядок!');
        }
        return false;
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
    
    initShop() {
        const shopItems = document.getElementById('shopItems');
        shopItems.innerHTML = '';
        
        // ОБМЕН ВАЛЮТЫ
        const exchangeRate = 5;
        const exchangeAmount = 1;
        const exchangeTotalCost = exchangeAmount * this.exchangeCounter;
        const exchangeTotalGain = exchangeAmount * exchangeRate * this.exchangeCounter;
        const maxExchange = Math.floor(this.souls / exchangeAmount);
        const canExchange = this.souls >= exchangeTotalCost;
        
        const exchangeShopItem = document.createElement('div');
        exchangeShopItem.className = 'shop-item exchange-shop-item';
        
        exchangeShopItem.innerHTML = `
            <div class="item-emoji">💱</div>
            <div class="item-name">Обмен валюты</div>
            <div class="item-price">${exchangeAmount} душ → ${exchangeAmount * exchangeRate} эссенции</div>
            <div class="item-growth">Курс: 1 душа = ${exchangeRate} эссенции</div>
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
        
        // ПОКУПКА ГРЯДОК
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
        
        // Семена
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
        const exchangeAmount = 1;
        const maxAffordable = Math.floor(this.souls / exchangeAmount);
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
        const exchangeAmount = 1;
        const maxAffordable = Math.floor(this.souls / exchangeAmount);
        if (maxAffordable > 0) {
            this.exchangeCounter = maxAffordable;
            this.updateShopExchange();
        }
    }
    
    updateExchangeFromInput() {
        const exchangeAmount = 1;
        const input = document.getElementById('quantity-exchange');
        const maxAffordable = Math.floor(this.souls / exchangeAmount);
        let value = parseInt(input.value) || 1;
        
        if (value < 1) value = 1;
        if (value > maxAffordable) value = maxAffordable;
        
        this.exchangeCounter = value;
        this.updateShopExchange();
    }
    
    updateShopExchange() {
        const exchangeRate = 5;
        const exchangeAmount = 1;
        const totalCost = exchangeAmount * this.exchangeCounter;
        const totalGain = exchangeAmount * exchangeRate * this.exchangeCounter;
        const maxAffordable = Math.floor(this.souls / exchangeAmount);
        const canAfford = this.souls >= totalCost;
        
        const input = document.getElementById('quantity-exchange');
        if (input) {
            input.value = this.exchangeCounter;
            input.max = maxAffordable;
        }
        
        const hint = document.getElementById('hint-exchange');
        if (hint) {
            hint.textContent = `Можно обменять: ${maxAffordable} раз`;
            hint.style.color = maxAffordable > 0 ? '#4CAF50' : '#f44336';
        }
        
        const shopItem = document.querySelector('.exchange-shop-item');
        if (shopItem) {
            const totalElement = shopItem.querySelector('.quantity-total');
            if (totalElement) {
                totalElement.textContent = `${totalCost} душ → ${totalGain} эссенции`;
            }
            
            const button = shopItem.querySelector('.buy-btn');
            if (button) {
                button.textContent = `Обменять ${this.exchangeCounter} раз за ${totalCost} душ`;
                button.disabled = !canAfford;
            }
        }
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
        
        const input = document.getElementById('quantity-plot');
        if (input) {
            input.value = this.plotCounter;
            input.max = maxAffordable;
        }
        
        const hint = document.getElementById('hint-plot');
        if (hint) {
            hint.textContent = `Можно купить: ${maxAffordable} грядок`;
            hint.style.color = maxAffordable > 0 ? '#4CAF50' : '#f44336';
        }
        
        const shopItem = document.querySelector('.plot-shop-item');
        if (shopItem) {
            const totalElement = shopItem.querySelector('.quantity-total');
            if (totalElement) {
                totalElement.textContent = `${totalCost} душ`;
            }
            
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
        
        if (this.shopOpen) {
            this.updateShopExchange();
            this.updateShopPlot();
            
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
                } else {
                    const growthStage = Math.floor(plot.growth / 25);
                    const stages = ['🌱', '🪴', '🌿', seedData.emoji];
                    plotElement.textContent = stages[growthStage] || stages[0];
                    plotElement.style.background = '#2d5a2d';
                    plotElement.className = 'plot growing';
                }
            } else {
                plotElement.textContent = '🟫';
                plotElement.style.background = '#0f3460';
                plotElement.className = 'plot';
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
            this.updateCauldronProgress();
            this.updateDisplay();
        }, 100);
    }
    
    showDropMessage(emoji, name, count) {
        this.showMessage(emoji, `+${count} семян ${name}!`, 'success');
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

    incrementSell(seedType) {
        const max = this.harvestInventory[seedType] || 0;
        const current = this.sellCounters[seedType] || 1;
        if (current < max) {
            this.sellCounters[seedType] = current + 1;
            this.updateInventoryDisplay();
        }
    }

    decrementSell(seedType) {
        const current = this.sellCounters[seedType] || 1;
        if (current > 1) {
            this.sellCounters[seedType] = current - 1;
            this.updateInventoryDisplay();
        }
    }

    setMaxSell(seedType) {
        const max = this.harvestInventory[seedType] || 0;
        if (max > 0) {
            this.sellCounters[seedType] = max;
            this.updateInventoryDisplay();
        }
    }

    updateSellFromInput(seedType) {
        const input = document.getElementById(`sell-quantity-${seedType}`);
        const max = this.harvestInventory[seedType] || 0;
        let value = parseInt(input.value) || 1;
        if (value < 1) value = 1;
        if (value > max) value = max;
        this.sellCounters[seedType] = value;
        this.updateInventoryDisplay();
    }

    updateShopItem(seedType) {
        const seedData = this.seedTypes[seedType];
        const currentCount = this.shopCounters[seedType] || 1;
        const totalPrice = seedData.buyPrice * currentCount;
        const maxAffordable = Math.floor(this.darkEssence / seedData.buyPrice);
        const canAfford = this.darkEssence >= totalPrice;
        
        const input = document.getElementById(`quantity-${seedType}`);
        if (input) {
            input.value = currentCount;
            input.max = maxAffordable;
        }
        
        const hint = document.getElementById(`hint-${seedType}`);
        if (hint) {
            hint.textContent = `Можно купить: ${maxAffordable} шт`;
            hint.style.color = maxAffordable > 0 ? '#4CAF50' : '#f44336';
        }
        
        const shopItem = document.querySelector(`#quantity-${seedType}`)?.closest('.shop-item');
        if (shopItem) {
            const totalElement = shopItem.querySelector('.quantity-total');
            if (totalElement) {
                totalElement.textContent = `${totalPrice} эссенции`;
            }
            
            const button = shopItem.querySelector('.buy-btn');
            if (button) {
                button.textContent = `Купить ${currentCount} семян за ${totalPrice} эссенции`;
                button.disabled = !canAfford;
            }
        }
    }
    
    updateInventoryDisplay() {
        const inventoryItems = document.getElementById('inventoryItems');
        inventoryItems.innerHTML = '';
        
        // Секция семян
        let hasSeeds = false;
        const seedsSection = document.createElement('div');
        seedsSection.className = 'inventory-section';
        seedsSection.innerHTML = '<h4>📦 Семена</h4>';
        
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
                    <div class="item-info">Посадите чтобы вырастить</div>
                `;
                
                seedsSection.appendChild(seedItem);
            }
        });
        
        if (hasSeeds) {
            inventoryItems.appendChild(seedsSection);
        }
        
        // Секция урожая
        let hasHarvest = false;
        const harvestSection = document.createElement('div');
        harvestSection.className = 'inventory-section';
        harvestSection.innerHTML = '<h4>🌿 Урожай (для продажи или котла)</h4>';
        
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
                            <span>Продать: </span>
                            <span class="quantity-total">${totalPrice} душ</span>
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
        
        // Секция эликсиров
        let hasElixirs = false;
        const elixirsSection = document.createElement('div');
        elixirsSection.className = 'inventory-section';
        elixirsSection.innerHTML = '<h4>🧪 Эликсиры (из котла)</h4>';
        
        Object.entries(this.elixirInventory).forEach(([elixirType, count]) => {
            if (count > 0) {
                hasElixirs = true;
                const elixirData = this.elixirRecipes[elixirType];
                const sellCount = this.sellCounters[elixirType] || 1;
                const totalPrice = elixirData.baseSellPrice * sellCount;
                const canSell = count >= sellCount;
                
                const elixirItem = document.createElement('div');
                elixirItem.className = 'inventory-item';
                elixirItem.style.background = 'linear-gradient(135deg, #5a2d5a, #7c4a7c)';
                
                elixirItem.innerHTML = `
                    <div class="item-emoji">${elixirData.emoji}</div>
                    <div class="item-name">${elixirData.name}</div>
                    <div class="item-count">Эликсиров: ${count}</div>
                    <div class="item-sell-price">Цена за шт: ${elixirData.baseSellPrice} душ</div>
                    <div class="item-description">${elixirData.description}</div>
                    
                    <div class="quantity-controls">
                        <div class="quantity-info">
                            <span>Продать: </span>
                            <span class="quantity-total">${totalPrice} душ</span>
                        </div>
                        <div class="quantity-buttons">
                            <button class="quantity-btn" onclick="game.decrementSell('${elixirType}')">-</button>
                            <input type="number" 
                                   class="quantity-input" 
                                   id="sell-quantity-${elixirType}" 
                                   value="${sellCount}" 
                                   min="1" 
                                   max="${count}" 
                                   onchange="game.updateSellFromInput('${elixirType}')">
                            <button class="quantity-btn" onclick="game.incrementSell('${elixirType}')">+</button>
                            <button class="quantity-max-btn" onclick="game.setMaxSell('${elixirType}')">MAX</button>
                        </div>
                    </div>
                    
                    <button class="sell-btn" onclick="game.sellElixir('${elixirType}')" 
                            ${!canSell ? 'disabled' : ''}>
                        Продать ${sellCount} шт за ${totalPrice} душ
                    </button>
                `;
                
                elixirsSection.appendChild(elixirItem);
            }
        });
        
        if (hasElixirs) {
            inventoryItems.appendChild(elixirsSection);
        }
        
        if (!hasSeeds && !hasHarvest && !hasElixirs) {
            inventoryItems.innerHTML = '<div class="empty-inventory">Инвентарь пуст</div>';
        }
    }

    sellHarvest(seedType) {
        const sellCount = this.sellCounters[seedType] || 1;
        const seedData = this.seedTypes[seedType];
        
        if (this.harvestInventory[seedType] >= sellCount) {
            const totalPrice = seedData.baseSellPrice * sellCount;
            this.souls += totalPrice;
            this.harvestInventory[seedType] -= sellCount;
            
            this.sellCounters[seedType] = 1;
            
            this.updateDisplay();
            this.updateInventoryDisplay();
            this.saveToLocalStorage();
            
            this.showMessage('💰', `Продано ${sellCount} урожая ${seedData.name} за ${totalPrice} душ!`, 'success');
        }
    }

    sellElixir(elixirType) {
        const sellCount = this.sellCounters[elixirType] || 1;
        const elixirData = this.elixirRecipes[elixirType];
        
        if (this.elixirInventory[elixirType] >= sellCount) {
            const totalPrice = elixirData.baseSellPrice * sellCount;
            this.souls += totalPrice;
            this.elixirInventory[elixirType] -= sellCount;
            
            this.sellCounters[elixirType] = 1;
            
            this.updateDisplay();
            this.updateInventoryDisplay();
            this.saveToLocalStorage();
            
            this.showMessage('💰', `Продано ${sellCount} эликсира ${elixirData.name} за ${totalPrice} душ!`, 'success');
        }
    }

    showMessage(emoji, text, type = 'info') {
        const message = document.createElement('div');
        message.className = 'purchase-message';
        
        if (type === 'success') {
            message.style.background = '#4CAF50';
        } else if (type === 'error') {
            message.style.background = '#f44336';
        } else {
            message.style.background = '#2196F3';
        }
        
        message.innerHTML = `
            <span class="purchase-emoji">${emoji}</span>
            <span class="purchase-text">${text}</span>
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

    saveToLocalStorage() {
        const gameData = {
            souls: this.souls,
            darkEssence: this.darkEssence,
            seedsInventory: this.seedsInventory,
            harvestInventory: this.harvestInventory,
            elixirInventory: this.elixirInventory,
            plots: this.plots,
            alchemyCauldron: this.alchemyCauldron,
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
                this.elixirInventory = gameData.elixirInventory || {};
                this.plots = gameData.plots || [];
                this.alchemyCauldron = gameData.alchemyCauldron || {
                    owned: false,
                    working: false,
                    progress: 0,
                    currentRecipe: null,
                    startTime: null,
                    totalTime: 0,
                    inputQuantity: 0,
                    outputQuantity: 0
                };
                
                this.lastUpdate = gameData.lastUpdate || Date.now();
                return true;
            } catch (error) {
                console.error('Ошибка загрузки из localStorage:', error);
            }
        }
        return false;
    }
}

// Инициализация игры
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
