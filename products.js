// Módulo de gestión de productos
class ProductManager {
    constructor() {
        this.products = [];
        this.currentFilter = 'all';
        this.currentPage = 1;
        this.pageSize = 12;
        this.totalProducts = 0;
        this.searchTerm = '';
        this.editingProduct = null;
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
            
            // Cargar productos
            await this.loadProducts();
            
            this.isInitialized = true;
            log('ProductManager inicializado correctamente', 'info');
            
        } catch (error) {
            handleError(error, 'ProductManager.init');
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
        // Búsqueda de productos
        const searchInput = document.getElementById('search-products');
        if (searchInput) {
            searchInput.addEventListener('input', AppUtils.debounce((e) => {
                this.searchTerm = e.target.value.trim();
                this.currentPage = 1;
                this.loadProducts();
            }, 300));
        }

        // Filtros de productos
        const filterTabs = document.querySelectorAll('.filter-tab');
        filterTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const filter = e.currentTarget.dataset.filter;
                this.setFilter(filter);
            });
        });

        // Formulario de producto
        const productForm = document.getElementById('product-form');
        if (productForm) {
            productForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveProduct();
            });
        }

        // Upload de imagen
        const imageInput = document.getElementById('product-image');
        if (imageInput) {
            imageInput.addEventListener('change', (e) => {
                this.handleImageUpload(e);
            });
        }

        // Paginación
        const prevPageBtn = document.getElementById('prev-page');
        const nextPageBtn = document.getElementById('next-page');
        
        if (prevPageBtn) {
            prevPageBtn.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.loadProducts();
                }
            });
        }
        
        if (nextPageBtn) {
            nextPageBtn.addEventListener('click', () => {
                const totalPages = Math.ceil(this.totalProducts / this.pageSize);
                if (this.currentPage < totalPages) {
                    this.currentPage++;
                    this.loadProducts();
                }
            });
        }
    }

    async loadProducts() {
        try {
            this.showLoadingState();
            
            // Obtener tiendas del usuario
            const userStores = await this.getUserStores();
            if (!userStores || userStores.length === 0) {
                this.showEmptyState();
                return;
            }

            const storeIds = userStores.map(store => store.id);
            
            // Construir query base
            let query = supabase
                .from('products')
                .select(`
                    *,
                    inventory (
                        stock_quantity
                    )
                `)
                .in('store_id', storeIds);

            // Aplicar filtro de búsqueda
            if (this.searchTerm) {
                query = query.ilike('name', `%${this.searchTerm}%`);
            }

            // Obtener total de productos para paginación
            const { count } = await supabase
                .from('products')
                .select('*', { count: 'exact', head: true })
                .in('store_id', storeIds);

            this.totalProducts = count || 0;

            // Aplicar paginación
            const from = (this.currentPage - 1) * this.pageSize;
            const to = from + this.pageSize - 1;
            
            query = query
                .order('created_at', { ascending: false })
                .range(from, to);

            const { data: products, error } = await query;

            if (error) {
                throw error;
            }

            this.products = products || [];
            this.renderProducts();
            this.updateFilterCounts();
            this.updatePagination();
            
            log('Productos cargados:', 'debug', this.products);
            
        } catch (error) {
            log('Error al cargar productos:', 'error', error);
            showMessage('Error al cargar productos', 'error');
            this.showEmptyState();
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

    renderProducts() {
        const productsGrid = document.getElementById('products-grid');
        const emptyState = document.getElementById('empty-state');
        const loadingState = document.getElementById('loading-state');
        
        if (!productsGrid) return;

        // Ocultar estados de carga y vacío
        if (emptyState) emptyState.style.display = 'none';
        if (loadingState) loadingState.style.display = 'none';

        // Filtrar productos según el filtro actual
        const filteredProducts = this.getFilteredProducts();

        if (filteredProducts.length === 0) {
            this.showEmptyState();
            return;
        }

        // Renderizar productos
        productsGrid.innerHTML = filteredProducts.map(product => this.createProductCard(product)).join('');
        
        // Mostrar grid
        productsGrid.style.display = 'grid';
    }

    getFilteredProducts() {
        if (this.currentFilter === 'all') {
            return this.products;
        }

        return this.products.filter(product => {
            const stock = product.inventory?.[0]?.stock_quantity || 0;
            
            switch (this.currentFilter) {
                case 'in-stock':
                    return stock > 10;
                case 'low-stock':
                    return stock > 0 && stock <= 10;
                case 'out-of-stock':
                    return stock === 0;
                default:
                    return true;
            }
        });
    }

    createProductCard(product) {
        const stock = product.inventory?.[0]?.stock_quantity || 0;
        const stockStatus = this.getStockStatus(stock);
        const stockBadge = this.getStockBadge(stock);
        
        return `
            <div class="product-card" data-product-id="${product.id}">
                <div class="product-image">
                    ${product.image_url 
                        ? `<img src="${product.image_url}" alt="${product.name}" loading="lazy">`
                        : `<div class="product-image-placeholder">
                             <i class="fas fa-image"></i>
                           </div>`
                    }
                    <div class="product-actions">
                        <button class="action-btn edit" onclick="productManager.editProduct('${product.id}')" title="Editar producto">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="productManager.deleteProduct('${product.id}')" title="Eliminar producto">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="product-info">
                    <div class="product-header">
                        <h3 class="product-name">${product.name}</h3>
                        <div class="product-price">${AppUtils.formatCurrency(product.price)}</div>
                    </div>
                    ${product.description 
                        ? `<p class="product-description">${product.description}</p>`
                        : ''
                    }
                    <div class="product-footer">
                        <div class="stock-info">
                            <span class="stock-badge ${stockStatus}">${stockBadge}</span>
                            <span class="stock-quantity">${stock} unidades</span>
                        </div>
                    </div>
                </div>
            </div>
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

    setFilter(filter) {
        this.currentFilter = filter;
        this.currentPage = 1;
        
        // Actualizar UI de filtros
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
        
        // Renderizar productos filtrados
        this.renderProducts();
        this.updatePagination();
    }

    updateFilterCounts() {
        const allCount = this.products.length;
        const inStockCount = this.products.filter(p => (p.inventory?.[0]?.stock_quantity || 0) > 10).length;
        const lowStockCount = this.products.filter(p => {
            const stock = p.inventory?.[0]?.stock_quantity || 0;
            return stock > 0 && stock <= 10;
        }).length;
        const outOfStockCount = this.products.filter(p => (p.inventory?.[0]?.stock_quantity || 0) === 0).length;

        // Actualizar contadores en la UI
        this.updateTabCount('count-all', allCount);
        this.updateTabCount('count-in-stock', inStockCount);
        this.updateTabCount('count-low-stock', lowStockCount);
        this.updateTabCount('count-out-of-stock', outOfStockCount);
    }

    updateTabCount(elementId, count) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = count;
        }
    }

    updatePagination() {
        const paginationContainer = document.getElementById('pagination-container');
        const paginationInfo = document.getElementById('pagination-info-text');
        const prevPageBtn = document.getElementById('prev-page');
        const nextPageBtn = document.getElementById('next-page');
        const pageNumbers = document.getElementById('page-numbers');
        
        if (!paginationContainer) return;

        const filteredProducts = this.getFilteredProducts();
        const totalPages = Math.ceil(this.totalProducts / this.pageSize);
        
        if (totalPages <= 1) {
            paginationContainer.style.display = 'none';
            return;
        }

        paginationContainer.style.display = 'flex';

        // Actualizar información de paginación
        const from = (this.currentPage - 1) * this.pageSize + 1;
        const to = Math.min(this.currentPage * this.pageSize, this.totalProducts);
        
        if (paginationInfo) {
            paginationInfo.textContent = `Mostrando ${from}-${to} de ${this.totalProducts} productos`;
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
                        onclick="productManager.goToPage(${i})">
                    ${i}
                </button>
            `;
        }
        
        return html;
    }

    goToPage(page) {
        this.currentPage = page;
        this.loadProducts();
    }

    showLoadingState() {
        const productsGrid = document.getElementById('products-grid');
        const emptyState = document.getElementById('empty-state');
        const loadingState = document.getElementById('loading-state');
        
        if (productsGrid) productsGrid.style.display = 'none';
        if (emptyState) emptyState.style.display = 'none';
        if (loadingState) loadingState.style.display = 'flex';
    }

    showEmptyState() {
        const productsGrid = document.getElementById('products-grid');
        const emptyState = document.getElementById('empty-state');
        const loadingState = document.getElementById('loading-state');
        
        if (productsGrid) productsGrid.style.display = 'none';
        if (loadingState) loadingState.style.display = 'none';
        if (emptyState) emptyState.style.display = 'flex';
    }

    async saveProduct() {
        try {
            const saveBtn = document.getElementById('save-product-btn');
            this.setButtonLoading(saveBtn, true);

            const formData = this.getFormData();
            
            // Validar datos
            if (!this.validateProductData(formData)) {
                return;
            }

            // Obtener primera tienda del usuario
            const userStores = await this.getUserStores();
            if (!userStores || userStores.length === 0) {
                showMessage('Debes crear una tienda primero', 'error');
                return;
            }

            const storeId = userStores[0].id;

            if (this.editingProduct) {
                // Actualizar producto existente
                await this.updateProduct(this.editingProduct.id, formData);
            } else {
                // Crear nuevo producto
                await this.createProduct(storeId, formData);
            }

            this.closeProductModal();
            await this.loadProducts();
            
        } catch (error) {
            handleError(error, 'Guardar producto');
        } finally {
            const saveBtn = document.getElementById('save-product-btn');
            this.setButtonLoading(saveBtn, false);
        }
    }

    async createProduct(storeId, formData) {
        // Crear producto
        const { data: product, error: productError } = await supabase
            .from('products')
            .insert([{
                store_id: storeId,
                name: formData.name,
                description: formData.description,
                price: formData.price,
                image_url: formData.imageUrl
            }])
            .select()
            .single();

        if (productError) {
            throw productError;
        }

        // Crear registro de inventario
        const { error: inventoryError } = await supabase
            .from('inventory')
            .insert([{
                product_id: product.id,
                stock_quantity: formData.initialStock
            }]);

        if (inventoryError) {
            throw inventoryError;
        }

        showMessage('Producto creado exitosamente', 'success');
        log('Producto creado:', 'info', product);
    }

    async updateProduct(productId, formData) {
        // Actualizar producto
        const { error: productError } = await supabase
            .from('products')
            .update({
                name: formData.name,
                description: formData.description,
                price: formData.price,
                image_url: formData.imageUrl
            })
            .eq('id', productId);

        if (productError) {
            throw productError;
        }

        // Actualizar inventario si se especificó
        if (formData.initialStock !== undefined) {
            const { error: inventoryError } = await supabase
                .from('inventory')
                .update({
                    stock_quantity: formData.initialStock,
                    last_updated: new Date().toISOString()
                })
                .eq('product_id', productId);

            if (inventoryError) {
                throw inventoryError;
            }
        }

        showMessage('Producto actualizado exitosamente', 'success');
        log('Producto actualizado:', 'info', { productId, formData });
    }

    getFormData() {
        return {
            name: document.getElementById('product-name').value.trim(),
            description: document.getElementById('product-description').value.trim(),
            price: parseFloat(document.getElementById('product-price').value),
            initialStock: parseInt(document.getElementById('initial-stock').value) || 0,
            category: document.getElementById('product-category').value,
            imageUrl: this.uploadedImageUrl || null
        };
    }

    validateProductData(data) {
        if (!data.name) {
            showMessage('El nombre del producto es requerido', 'error');
            return false;
        }

        if (!data.price || data.price <= 0) {
            showMessage('El precio debe ser mayor a 0', 'error');
            return false;
        }

        if (data.initialStock < 0) {
            showMessage('El stock inicial no puede ser negativo', 'error');
            return false;
        }

        return true;
    }

    async editProduct(productId) {
        try {
            const product = this.products.find(p => p.id === productId);
            if (!product) {
                showMessage('Producto no encontrado', 'error');
                return;
            }

            this.editingProduct = product;
            this.populateForm(product);
            this.openProductModal('Editar Producto');
            
        } catch (error) {
            handleError(error, 'Editar producto');
        }
    }

    populateForm(product) {
        document.getElementById('product-name').value = product.name || '';
        document.getElementById('product-description').value = product.description || '';
        document.getElementById('product-price').value = product.price || '';
        document.getElementById('product-category').value = product.category || '';
        
        // Cargar stock actual
        const stock = product.inventory?.[0]?.stock_quantity || 0;
        document.getElementById('initial-stock').value = stock;
        
        // Cargar imagen si existe
        if (product.image_url) {
            this.showImagePreview(product.image_url);
            this.uploadedImageUrl = product.image_url;
        }
    }

    async deleteProduct(productId) {
        try {
            const product = this.products.find(p => p.id === productId);
            if (!product) {
                showMessage('Producto no encontrado', 'error');
                return;
            }

            // Mostrar modal de confirmación
            this.showDeleteConfirmation(product);
            
        } catch (error) {
            handleError(error, 'Eliminar producto');
        }
    }

    showDeleteConfirmation(product) {
        const modal = document.getElementById('delete-modal');
        const productNameElement = document.getElementById('delete-product-name');
        
        if (modal && productNameElement) {
            productNameElement.textContent = product.name;
            modal.classList.add('active');
            
            // Guardar referencia del producto a eliminar
            this.productToDelete = product;
        }
    }

    async confirmDelete() {
        try {
            if (!this.productToDelete) return;

            const deleteBtn = document.getElementById('confirm-delete-btn');
            this.setButtonLoading(deleteBtn, true);

            // Eliminar producto (el inventario se eliminará automáticamente por CASCADE)
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', this.productToDelete.id);

            if (error) {
                throw error;
            }

            showMessage('Producto eliminado exitosamente', 'success');
            this.closeDeleteModal();
            await this.loadProducts();
            
        } catch (error) {
            handleError(error, 'Eliminar producto');
        } finally {
            const deleteBtn = document.getElementById('confirm-delete-btn');
            this.setButtonLoading(deleteBtn, false);
        }
    }

    async handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validar archivo
        const validation = AppUtils.validateFile(file, {
            maxSize: 5 * 1024 * 1024, // 5MB
            allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        });

        if (!validation.isValid) {
            showMessage(validation.errors[0], 'error');
            return;
        }

        try {
            showLoader(true);
            
            // Crear nombre único para el archivo
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
            
            // Subir archivo a Supabase Storage
            const { data, error } = await supabase.storage
                .from('product-images')
                .upload(fileName, file);

            if (error) {
                throw error;
            }

            // Obtener URL pública
            const { data: { publicUrl } } = supabase.storage
                .from('product-images')
                .getPublicUrl(fileName);

            this.uploadedImageUrl = publicUrl;
            this.showImagePreview(publicUrl);
            
            showMessage('Imagen subida exitosamente', 'success');
            
        } catch (error) {
            log('Error al subir imagen:', 'error', error);
            showMessage('Error al subir imagen', 'error');
        } finally {
            showLoader(false);
        }
    }

    showImagePreview(imageUrl) {
        const placeholder = document.getElementById('upload-placeholder');
        const preview = document.getElementById('image-preview');
        const previewImg = document.getElementById('preview-img');
        
        if (placeholder && preview && previewImg) {
            placeholder.style.display = 'none';
            preview.style.display = 'block';
            previewImg.src = imageUrl;
        }
    }

    removeImage() {
        const placeholder = document.getElementById('upload-placeholder');
        const preview = document.getElementById('image-preview');
        const imageInput = document.getElementById('product-image');
        
        if (placeholder && preview && imageInput) {
            placeholder.style.display = 'block';
            preview.style.display = 'none';
            imageInput.value = '';
            this.uploadedImageUrl = null;
        }
    }

    openProductModal(title = 'Añadir Producto') {
        const modal = document.getElementById('product-modal');
        const modalTitle = document.getElementById('modal-title');
        
        if (modal && modalTitle) {
            modalTitle.textContent = title;
            modal.classList.add('active');
            
            // Limpiar formulario si es nuevo producto
            if (title === 'Añadir Producto') {
                this.resetForm();
            }
        }
    }

    closeProductModal() {
        const modal = document.getElementById('product-modal');
        if (modal) {
            modal.classList.remove('active');
            this.resetForm();
            this.editingProduct = null;
        }
    }

    closeDeleteModal() {
        const modal = document.getElementById('delete-modal');
        if (modal) {
            modal.classList.remove('active');
            this.productToDelete = null;
        }
    }

    resetForm() {
        const form = document.getElementById('product-form');
        if (form) {
            form.reset();
            this.removeImage();
            this.uploadedImageUrl = null;
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
let productManager;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    productManager = new ProductManager();
    window.productManager = productManager;
});

// Funciones globales para los event handlers
window.openProductModal = function() {
    if (productManager) {
        productManager.openProductModal();
    }
};

window.closeProductModal = function() {
    if (productManager) {
        productManager.closeProductModal();
    }
};

window.closeDeleteModal = function() {
    if (productManager) {
        productManager.closeDeleteModal();
    }
};

window.confirmDelete = function() {
    if (productManager) {
        productManager.confirmDelete();
    }
};

window.removeImage = function() {
    if (productManager) {
        productManager.removeImage();
    }
};

