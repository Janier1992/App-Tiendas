// Módulo de gestión de inventario
class InventoryManager {
    constructor() {
        this.inventory = [];
        this.products = [];
        this.currentFilter = 'all';
        this.currentSort = 'name';
        this.currentPage = 1;
        this.pageSize = 20;
        this.totalItems = 0;
        this.searchTerm = '';
        this.selectedProduct = null;
        this.isInitialized = false;
        
        this.init();
    }

    async init() {
        try {
            // Esperar a que AuthManager esté listo
            await this.waitForAuthManager();
            
            // Verificar autenticación
            if (!authManager.isAuthenticated()) {
                window.location.href = 'login.html';
                return;
            }

            // Configurar listeners de eventos
            this.setupEventListeners();
            
            // Cargar datos
            await this.loadInventory();
            await this.loadProducts();
            
            this.isInitialized = true;
            log('InventoryManager inicializado correctamente', 'info');
            
        } catch (error) {
            handleError(error, 'InventoryManager.init');
        }
    }

    async waitForAuthManager() {
        let attempts = 0;
        const maxAttempts = 50;
        
        while (!window.authManager?.isInitialized && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.authManager?.isInitialized) {
            throw new Error('AuthManager no está disponible');
        }
    }

    setupEventListeners() {
        // Búsqueda
        const searchInput = document.getElementById('search-inventory');
        if (searchInput) {
            searchInput.addEventListener('input', AppUtils.debounce((e) => {
                this.searchTerm = e.target.value.trim();
                this.currentPage = 1;
                this.renderInventory();
            }, 300));
        }

        // Filtros
        const stockFilter = document.getElementById('stock-filter');
        if (stockFilter) {
            stockFilter.addEventListener('change', (e) => {
                this.currentFilter = e.target.value;
                this.currentPage = 1;
                this.renderInventory();
            });
        }

        const sortBy = document.getElementById('sort-by');
        if (sortBy) {
            sortBy.addEventListener('change', (e) => {
                this.currentSort = e.target.value;
                this.renderInventory();
            });
        }

        // Formulario de ajuste de stock
        const stockForm = document.getElementById('stock-form');
        if (stockForm) {
            stockForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveStockAdjustment();
            });
        }

        // Selector de producto en modal
        const stockProduct = document.getElementById('stock-product');
        if (stockProduct) {
            stockProduct.addEventListener('change', (e) => {
                this.onProductSelected(e.target.value);
            });
        }

        // Tipo de ajuste y cantidad
        const adjustmentType = document.getElementById('adjustment-type');
        const adjustmentQuantity = document.getElementById('adjustment-quantity');
        
        if (adjustmentType && adjustmentQuantity) {
            [adjustmentType, adjustmentQuantity].forEach(input => {
                input.addEventListener('change', () => {
                    this.updateStockPreview();
                });
                input.addEventListener('input', () => {
                    this.updateStockPreview();
                });
            });
        }

        // Paginación
        const prevPageBtn = document.getElementById('inventory-prev-page');
        const nextPageBtn = document.getElementById('inventory-next-page');
        
        if (prevPageBtn) {
            prevPageBtn.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.renderInventory();
                }
            });
        }
        
        if (nextPageBtn) {
            nextPageBtn.addEventListener('click', () => {
                const totalPages = Math.ceil(this.totalItems / this.pageSize);
                if (this.currentPage < totalPages) {
                    this.currentPage++;
                    this.renderInventory();
                }
            });
        }
    }

    async loadInventory() {
        try {
            this.showLoadingState();
            
            // Obtener tiendas del usuario
            const userStores = await this.getUserStores();
            if (!userStores || userStores.length === 0) {
                this.showEmptyState();
                return;
            }

            const storeIds = userStores.map(store => store.id);
            
            // Cargar inventario con información de productos
            const { data: inventory, error } = await supabase
                .from('inventory')
                .select(`
                    *,
                    products!inner (
                        id,
                        name,
                        description,
                        price,
                        image_url,
                        store_id,
                        created_at
                    )
                `)
                .in('products.store_id', storeIds)
                .order('last_updated', { ascending: false });

            if (error) {
                throw error;
            }

            this.inventory = inventory || [];
            this.updateSummaryCards();
            this.renderInventory();
            
            log('Inventario cargado:', 'debug', this.inventory);
            
        } catch (error) {
            log('Error al cargar inventario:', 'error', error);
            showMessage('Error al cargar inventario', 'error');
            this.showEmptyState();
        }
    }

    async loadProducts() {
        try {
            // Obtener tiendas del usuario
            const userStores = await this.getUserStores();
            if (!userStores || userStores.length === 0) {
                return;
            }

            const storeIds = userStores.map(store => store.id);
            
            // Cargar productos para el selector
            const { data: products, error } = await supabase
                .from('products')
                .select('*')
                .in('store_id', storeIds)
                .order('name');

            if (error) {
                throw error;
            }

            this.products = products || [];
            this.populateProductSelector();
            
        } catch (error) {
            log('Error al cargar productos:', 'error', error);
        }
    }

    async getUserStores() {
        try {
            const { data: stores, error } = await supabase
                .from('stores')
                .select('*')
                .eq('owner_id', authManager.getCurrentUser().id);

            if (error) {
                throw error;
            }

            return stores;
        } catch (error) {
            log('Error al obtener tiendas:', 'error', error);
            return [];
        }
    }

    updateSummaryCards() {
        const totalProducts = this.inventory.length;
        const totalStock = this.inventory.reduce((sum, item) => sum + item.stock_quantity, 0);
        const lowStockItems = this.inventory.filter(item => item.stock_quantity > 0 && item.stock_quantity <= 10).length;
        const outOfStockItems = this.inventory.filter(item => item.stock_quantity === 0).length;

        // Actualizar contadores en la UI
        this.updateCounter('total-products-count', totalProducts);
        this.updateCounter('total-stock-count', totalStock);
        this.updateCounter('low-stock-count', lowStockItems);
        this.updateCounter('out-of-stock-count', outOfStockItems);
    }

    updateCounter(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            // Animación de contador
            const currentValue = parseInt(element.textContent) || 0;
            this.animateCounter(element, currentValue, value);
        }
    }

    animateCounter(element, start, end) {
        const duration = 1000;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const current = Math.floor(start + (end - start) * progress);
            element.textContent = current.toLocaleString();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    renderInventory() {
        const tbody = document.getElementById('inventory-tbody');
        const emptyState = document.getElementById('inventory-empty-state');
        const loadingState = document.getElementById('inventory-loading-state');
        const tableContainer = document.querySelector('.inventory-table-container');
        
        if (!tbody) return;

        // Ocultar estados de carga y vacío
        if (emptyState) emptyState.style.display = 'none';
        if (loadingState) loadingState.style.display = 'none';

        // Filtrar y ordenar inventario
        const filteredInventory = this.getFilteredAndSortedInventory();

        if (filteredInventory.length === 0) {
            this.showEmptyState();
            return;
        }

        // Aplicar paginación
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const paginatedInventory = filteredInventory.slice(startIndex, endIndex);

        // Renderizar filas
        tbody.innerHTML = paginatedInventory.map(item => this.createInventoryRow(item)).join('');
        
        // Mostrar tabla
        if (tableContainer) tableContainer.style.display = 'block';
        
        // Actualizar paginación
        this.totalItems = filteredInventory.length;
        this.updatePagination();
    }

    getFilteredAndSortedInventory() {
        let filtered = [...this.inventory];

        // Aplicar filtro de búsqueda
        if (this.searchTerm) {
            filtered = filtered.filter(item => 
                item.products.name.toLowerCase().includes(this.searchTerm.toLowerCase())
            );
        }

        // Aplicar filtro de stock
        if (this.currentFilter !== 'all') {
            filtered = filtered.filter(item => {
                switch (this.currentFilter) {
                    case 'in-stock':
                        return item.stock_quantity > 10;
                    case 'low-stock':
                        return item.stock_quantity > 0 && item.stock_quantity <= 10;
                    case 'out-of-stock':
                        return item.stock_quantity === 0;
                    default:
                        return true;
                }
            });
        }

        // Aplicar ordenamiento
        filtered.sort((a, b) => {
            switch (this.currentSort) {
                case 'name':
                    return a.products.name.localeCompare(b.products.name);
                case 'stock':
                    return b.stock_quantity - a.stock_quantity;
                case 'updated':
                    return new Date(b.last_updated) - new Date(a.last_updated);
                default:
                    return 0;
            }
        });

        return filtered;
    }

    createInventoryRow(item) {
        const product = item.products;
        const stock = item.stock_quantity;
        const stockStatus = this.getStockStatus(stock);
        const stockBadge = this.getStockBadge(stock);
        const totalValue = stock * product.price;
        const lastUpdated = AppUtils.formatRelativeDate(item.last_updated);

        return `
            <tr data-product-id="${product.id}">
                <td>
                    <div class="product-cell">
                        ${product.image_url 
                            ? `<img src="${product.image_url}" alt="${product.name}" class="product-image-small">`
                            : `<div class="product-image-placeholder-small">
                                 <i class="fas fa-image"></i>
                               </div>`
                        }
                        <div class="product-info-small">
                            <h4 class="product-name-small">${product.name}</h4>
                            <p class="product-id-small">ID: ${product.id.slice(-8)}</p>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="stock-quantity ${stockStatus}">${stock}</span>
                </td>
                <td>
                    <span class="stock-status ${stockStatus}">${stockBadge}</span>
                </td>
                <td class="price-cell">
                    ${AppUtils.formatCurrency(product.price)}
                </td>
                <td class="value-cell">
                    ${AppUtils.formatCurrency(totalValue)}
                </td>
                <td class="last-updated">
                    ${lastUpdated}
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn-small adjust" 
                                onclick="inventoryManager.adjustStock('${product.id}')"
                                title="Ajustar stock">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn-small history" 
                                onclick="inventoryManager.showHistory('${product.id}')"
                                title="Ver historial">
                            <i class="fas fa-history"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    getStockStatus(stock) {
        if (stock === 0) return 'out-of-stock';
        if (stock <= 10) return 'low-stock';
        return 'in-stock';
    }

    getStockBadge(stock) {
        if (stock === 0) return 'Agotado';
        if (stock <= 10) return 'Stock Bajo';
        return 'En Stock';
    }

    populateProductSelector() {
        const selector = document.getElementById('stock-product');
        if (!selector) return;

        selector.innerHTML = '<option value="">Seleccionar producto</option>';
        
        this.products.forEach(product => {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = product.name;
            selector.appendChild(option);
        });
    }

    onProductSelected(productId) {
        if (!productId) {
            this.hideCurrentStock();
            this.hideStockPreview();
            return;
        }

        const inventoryItem = this.inventory.find(item => item.products.id === productId);
        if (inventoryItem) {
            this.selectedProduct = inventoryItem;
            this.showCurrentStock(inventoryItem.stock_quantity);
            this.updateStockPreview();
        }
    }

    showCurrentStock(currentStock) {
        const container = document.getElementById('current-stock-info');
        const value = document.getElementById('current-stock-value');
        
        if (container && value) {
            value.textContent = currentStock;
            container.style.display = 'block';
        }
    }

    hideCurrentStock() {
        const container = document.getElementById('current-stock-info');
        if (container) {
            container.style.display = 'none';
        }
    }

    updateStockPreview() {
        if (!this.selectedProduct) {
            this.hideStockPreview();
            return;
        }

        const adjustmentType = document.getElementById('adjustment-type').value;
        const adjustmentQuantity = parseInt(document.getElementById('adjustment-quantity').value) || 0;
        
        if (!adjustmentType || adjustmentQuantity < 0) {
            this.hideStockPreview();
            return;
        }

        const currentStock = this.selectedProduct.stock_quantity;
        let newStock = currentStock;

        switch (adjustmentType) {
            case 'add':
                newStock = currentStock + adjustmentQuantity;
                break;
            case 'remove':
                newStock = Math.max(0, currentStock - adjustmentQuantity);
                break;
            case 'set':
                newStock = adjustmentQuantity;
                break;
        }

        this.showStockPreview(newStock);
    }

    showStockPreview(newStock) {
        const container = document.getElementById('new-stock-preview');
        const value = document.getElementById('new-stock-value');
        
        if (container && value) {
            value.textContent = newStock;
            container.style.display = 'block';
        }
    }

    hideStockPreview() {
        const container = document.getElementById('new-stock-preview');
        if (container) {
            container.style.display = 'none';
        }
    }

    async saveStockAdjustment() {
        try {
            const saveBtn = document.getElementById('save-stock-btn');
            this.setButtonLoading(saveBtn, true);

            const formData = this.getStockFormData();
            
            // Validar datos
            if (!this.validateStockData(formData)) {
                return;
            }

            // Calcular nuevo stock
            const currentStock = this.selectedProduct.stock_quantity;
            let newStock = currentStock;

            switch (formData.type) {
                case 'add':
                    newStock = currentStock + formData.quantity;
                    break;
                case 'remove':
                    newStock = Math.max(0, currentStock - formData.quantity);
                    break;
                case 'set':
                    newStock = formData.quantity;
                    break;
            }

            // Actualizar stock en la base de datos
            const { error } = await supabase
                .from('inventory')
                .update({
                    stock_quantity: newStock,
                    last_updated: new Date().toISOString()
                })
                .eq('product_id', formData.productId);

            if (error) {
                throw error;
            }

            // Registrar el ajuste en el historial (si tienes una tabla de historial)
            await this.recordStockAdjustment(formData, currentStock, newStock);

            showMessage('Stock ajustado exitosamente', 'success');
            this.closeStockModal();
            await this.loadInventory();
            
        } catch (error) {
            handleError(error, 'Ajustar stock');
        } finally {
            const saveBtn = document.getElementById('save-stock-btn');
            this.setButtonLoading(saveBtn, false);
        }
    }

    async recordStockAdjustment(formData, oldStock, newStock) {
        try {
            // Crear tabla de historial si no existe (esto debería estar en el schema SQL)
            const historyRecord = {
                product_id: formData.productId,
                adjustment_type: formData.type,
                quantity_changed: formData.quantity,
                old_stock: oldStock,
                new_stock: newStock,
                reason: formData.reason,
                notes: formData.notes,
                user_id: authManager.getCurrentUser().id,
                created_at: new Date().toISOString()
            };

            // Nota: Esto requeriría una tabla 'stock_history' en la base de datos
            // Por ahora solo lo registramos en el log
            log('Ajuste de stock registrado:', 'info', historyRecord);
            
        } catch (error) {
            log('Error al registrar historial de stock:', 'error', error);
        }
    }

    getStockFormData() {
        return {
            productId: document.getElementById('stock-product').value,
            type: document.getElementById('adjustment-type').value,
            quantity: parseInt(document.getElementById('adjustment-quantity').value) || 0,
            reason: document.getElementById('adjustment-reason').value,
            notes: document.getElementById('adjustment-notes').value.trim()
        };
    }

    validateStockData(data) {
        if (!data.productId) {
            showMessage('Debes seleccionar un producto', 'error');
            return false;
        }

        if (!data.type) {
            showMessage('Debes seleccionar un tipo de ajuste', 'error');
            return false;
        }

        if (data.quantity < 0) {
            showMessage('La cantidad no puede ser negativa', 'error');
            return false;
        }

        if (data.type === 'remove' && data.quantity > this.selectedProduct.stock_quantity) {
            showMessage('No puedes reducir más stock del disponible', 'error');
            return false;
        }

        return true;
    }

    adjustStock(productId) {
        const inventoryItem = this.inventory.find(item => item.products.id === productId);
        if (!inventoryItem) {
            showMessage('Producto no encontrado', 'error');
            return;
        }

        // Preseleccionar el producto en el modal
        const productSelector = document.getElementById('stock-product');
        if (productSelector) {
            productSelector.value = productId;
            this.onProductSelected(productId);
        }

        this.openStockModal();
    }

    async showHistory(productId) {
        try {
            // Por ahora mostrar un modal simple con información
            // En una implementación completa, cargarías el historial desde la base de datos
            const product = this.products.find(p => p.id === productId);
            if (!product) return;

            const modal = document.getElementById('history-modal');
            const title = document.getElementById('history-modal-title');
            const container = document.getElementById('history-container');
            
            if (modal && title && container) {
                title.textContent = `Historial de Stock - ${product.name}`;
                
                // Mostrar mensaje temporal
                container.innerHTML = `
                    <div class="history-item">
                        <div class="history-icon add">
                            <i class="fas fa-info-circle"></i>
                        </div>
                        <div class="history-details">
                            <div class="history-action">Historial de Stock</div>
                            <div class="history-reason">Esta funcionalidad requiere una tabla de historial en la base de datos</div>
                            <div class="history-notes">Implementación pendiente para el historial completo de movimientos</div>
                        </div>
                        <div class="history-meta">
                            <div class="history-date">${AppUtils.formatDate(new Date())}</div>
                        </div>
                    </div>
                `;
                
                modal.classList.add('active');
            }
            
        } catch (error) {
            handleError(error, 'Mostrar historial');
        }
    }

    async exportInventory() {
        try {
            showLoader(true);
            
            // Preparar datos para exportar
            const exportData = this.inventory.map(item => ({
                'Producto': item.products.name,
                'Stock Actual': item.stock_quantity,
                'Estado': this.getStockBadge(item.stock_quantity),
                'Precio': item.products.price,
                'Valor Total': item.stock_quantity * item.products.price,
                'Última Actualización': AppUtils.formatDate(item.last_updated)
            }));

            // Convertir a CSV
            const csvContent = this.convertToCSV(exportData);
            
            // Descargar archivo
            const filename = `inventario_${new Date().toISOString().split('T')[0]}.csv`;
            AppUtils.downloadFile(csvContent, filename, 'text/csv');
            
            showMessage('Inventario exportado exitosamente', 'success');
            
        } catch (error) {
            handleError(error, 'Exportar inventario');
        } finally {
            showLoader(false);
        }
    }

    convertToCSV(data) {
        if (!data.length) return '';
        
        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];
        
        data.forEach(row => {
            const values = headers.map(header => {
                const value = row[header];
                return typeof value === 'string' ? `"${value}"` : value;
            });
            csvRows.push(values.join(','));
        });
        
        return csvRows.join('\n');
    }

    updatePagination() {
        const paginationContainer = document.getElementById('inventory-pagination');
        const paginationInfo = document.getElementById('inventory-pagination-info');
        const prevPageBtn = document.getElementById('inventory-prev-page');
        const nextPageBtn = document.getElementById('inventory-next-page');
        const pageNumbers = document.getElementById('inventory-page-numbers');
        
        if (!paginationContainer) return;

        const totalPages = Math.ceil(this.totalItems / this.pageSize);
        
        if (totalPages <= 1) {
            paginationContainer.style.display = 'none';
            return;
        }

        paginationContainer.style.display = 'flex';

        // Actualizar información de paginación
        const from = (this.currentPage - 1) * this.pageSize + 1;
        const to = Math.min(this.currentPage * this.pageSize, this.totalItems);
        
        if (paginationInfo) {
            paginationInfo.textContent = `Mostrando ${from}-${to} de ${this.totalItems} productos`;
        }

        // Actualizar botones de navegación
        if (prevPageBtn) {
            prevPageBtn.disabled = this.currentPage === 1;
        }
        
        if (nextPageBtn) {
            nextPageBtn.disabled = this.currentPage === totalPages;
        }

        // Generar números de página
        if (pageNumbers) {
            pageNumbers.innerHTML = this.generatePageNumbers(totalPages);
        }
    }

    generatePageNumbers(totalPages) {
        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        let html = '';
        
        for (let i = startPage; i <= endPage; i++) {
            html += `
                <button class="page-number ${i === this.currentPage ? 'active' : ''}" 
                        onclick="inventoryManager.goToPage(${i})">
                    ${i}
                </button>
            `;
        }
        
        return html;
    }

    goToPage(page) {
        this.currentPage = page;
        this.renderInventory();
    }

    showLoadingState() {
        const tableContainer = document.querySelector('.inventory-table-container');
        const emptyState = document.getElementById('inventory-empty-state');
        const loadingState = document.getElementById('inventory-loading-state');
        
        if (tableContainer) tableContainer.style.display = 'none';
        if (emptyState) emptyState.style.display = 'none';
        if (loadingState) loadingState.style.display = 'flex';
    }

    showEmptyState() {
        const tableContainer = document.querySelector('.inventory-table-container');
        const emptyState = document.getElementById('inventory-empty-state');
        const loadingState = document.getElementById('inventory-loading-state');
        
        if (tableContainer) tableContainer.style.display = 'none';
        if (loadingState) loadingState.style.display = 'none';
        if (emptyState) emptyState.style.display = 'flex';
    }

    openStockModal() {
        const modal = document.getElementById('stock-modal');
        if (modal) {
            modal.classList.add('active');
            this.resetStockForm();
        }
    }

    closeStockModal() {
        const modal = document.getElementById('stock-modal');
        if (modal) {
            modal.classList.remove('active');
            this.resetStockForm();
        }
    }

    closeHistoryModal() {
        const modal = document.getElementById('history-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    resetStockForm() {
        const form = document.getElementById('stock-form');
        if (form) {
            form.reset();
            this.selectedProduct = null;
            this.hideCurrentStock();
            this.hideStockPreview();
        }
    }

    setButtonLoading(button, loading) {
        if (!button) return;
        
        const btnText = button.querySelector('.btn-text');
        const btnLoader = button.querySelector('.btn-loader');
        
        if (loading) {
            button.disabled = true;
            button.classList.add('loading');
            if (btnText) btnText.style.display = 'none';
            if (btnLoader) btnLoader.style.display = 'block';
        } else {
            button.disabled = false;
            button.classList.remove('loading');
            if (btnText) btnText.style.display = 'inline';
            if (btnLoader) btnLoader.style.display = 'none';
        }
    }
}

// Crear instancia global
let inventoryManager;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    inventoryManager = new InventoryManager();
    window.inventoryManager = inventoryManager;
});

// Funciones globales para los event handlers
window.openStockModal = function() {
    if (inventoryManager) {
        inventoryManager.openStockModal();
    }
};

window.closeStockModal = function() {
    if (inventoryManager) {
        inventoryManager.closeStockModal();
    }
};

window.closeHistoryModal = function() {
    if (inventoryManager) {
        inventoryManager.closeHistoryModal();
    }
};

window.exportInventory = function() {
    if (inventoryManager) {
        inventoryManager.exportInventory();
    }
};

