// Lógica para el dashboard principal
document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticación
    setTimeout(() => {
        if (!requireAuth()) {
            return;
        }
        initializeDashboard();
    }, 500);
});

// Inicializar dashboard
async function initializeDashboard() {
    try {
        showLoader(true);
        
        // Esperar a que el AuthManager esté listo
        await waitForAuthManager();
        
        // Cargar datos del usuario
        await loadUserData();
        
        // Cargar métricas del dashboard
        await loadDashboardMetrics();
        
        // Cargar actividad reciente
        await loadRecentActivity();
        
        // Configurar listeners de eventos
        setupEventListeners();
        
        log('Dashboard inicializado correctamente', 'info');
    } catch (error) {
        handleError(error, 'Dashboard initialization');
    } finally {
        showLoader(false);
    }
}

// Esperar a que AuthManager esté disponible
async function waitForAuthManager() {
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

// Cargar datos del usuario
async function loadUserData() {
    try {
        const user = authManager.getCurrentUser();
        if (!user) {
            throw new Error('Usuario no encontrado');
        }

        // Actualizar nombre del usuario en la interfaz
        const userNameElement = document.getElementById('user-name');
        if (userNameElement) {
            const displayName = user.profile?.display_name || 
                              user.user_metadata?.full_name || 
                              user.email.split('@')[0];
            userNameElement.textContent = displayName;
        }

        // Cargar datos adicionales del usuario si es necesario
        await loadUserStores();
        
    } catch (error) {
        log('Error al cargar datos del usuario:', 'error', error);
        // Usar datos por defecto si hay error
        const userNameElement = document.getElementById('user-name');
        if (userNameElement) {
            userNameElement.textContent = 'Usuario';
        }
    }
}

// Cargar tiendas del usuario
async function loadUserStores() {
    try {
        const { data: stores, error } = await supabase
            .from('stores')
            .select('*')
            .eq('owner_id', authManager.getCurrentUser().id);

        if (error) {
            throw error;
        }

        // Guardar tiendas en variable global para uso posterior
        window.userStores = stores || [];
        
        log('Tiendas cargadas:', 'debug', stores);
        
    } catch (error) {
        log('Error al cargar tiendas:', 'error', error);
        window.userStores = [];
    }
}

// Cargar métricas del dashboard
async function loadDashboardMetrics() {
    try {
        // Si no hay tiendas, mostrar métricas por defecto
        if (!window.userStores || window.userStores.length === 0) {
            displayDefaultMetrics();
            return;
        }

        const storeIds = window.userStores.map(store => store.id);
        
        // Cargar ventas totales
        await loadSalesMetrics(storeIds);
        
        // Cargar métricas de pedidos
        await loadOrdersMetrics(storeIds);
        
        // Cargar estado del inventario
        await loadInventoryMetrics(storeIds);
        
    } catch (error) {
        log('Error al cargar métricas:', 'error', error);
        displayDefaultMetrics();
    }
}

// Cargar métricas de ventas
async function loadSalesMetrics(storeIds) {
    try {
        const { data: orders, error } = await supabase
            .from('orders')
            .select('total_amount, created_at, payment_status')
            .in('store_id', storeIds)
            .eq('payment_status', 'paid');

        if (error) {
            throw error;
        }

        // Calcular total de ventas
        const totalSales = orders.reduce((sum, order) => sum + parseFloat(order.total_amount), 0);
        
        // Calcular ventas del mes anterior para comparación
        const currentMonth = new Date();
        const lastMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
        
        const currentMonthSales = orders.filter(order => 
            new Date(order.created_at) >= lastMonth
        ).reduce((sum, order) => sum + parseFloat(order.total_amount), 0);
        
        const previousMonthSales = orders.filter(order => {
            const orderDate = new Date(order.created_at);
            return orderDate < lastMonth;
        }).reduce((sum, order) => sum + parseFloat(order.total_amount), 0);
        
        // Calcular porcentaje de cambio
        let changePercentage = 0;
        if (previousMonthSales > 0) {
            changePercentage = ((currentMonthSales - previousMonthSales) / previousMonthSales) * 100;
        }
        
        // Actualizar interfaz
        updateSalesDisplay(totalSales, changePercentage);
        
    } catch (error) {
        log('Error al cargar métricas de ventas:', 'error', error);
    }
}

// Cargar métricas de pedidos
async function loadOrdersMetrics(storeIds) {
    try {
        const { data: orders, error } = await supabase
            .from('orders')
            .select('id, created_at, status')
            .in('store_id', storeIds);

        if (error) {
            throw error;
        }

        const totalOrders = orders.length;
        
        // Calcular pedidos del mes actual vs anterior
        const currentMonth = new Date();
        const lastMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
        
        const currentMonthOrders = orders.filter(order => 
            new Date(order.created_at) >= lastMonth
        ).length;
        
        const previousMonthOrders = orders.filter(order => {
            const orderDate = new Date(order.created_at);
            return orderDate < lastMonth;
        }).length;
        
        // Calcular porcentaje de cambio
        let changePercentage = 0;
        if (previousMonthOrders > 0) {
            changePercentage = ((currentMonthOrders - previousMonthOrders) / previousMonthOrders) * 100;
        }
        
        // Actualizar interfaz
        updateOrdersDisplay(totalOrders, changePercentage);
        
    } catch (error) {
        log('Error al cargar métricas de pedidos:', 'error', error);
    }
}

// Cargar métricas de inventario
async function loadInventoryMetrics(storeIds) {
    try {
        const { data: inventory, error } = await supabase
            .from('inventory')
            .select(`
                stock_quantity,
                products!inner(store_id)
            `)
            .in('products.store_id', storeIds);

        if (error) {
            throw error;
        }

        // Calcular productos con stock bajo (menos de 10 unidades)
        const lowStockProducts = inventory.filter(item => item.stock_quantity < 10).length;
        const totalProducts = inventory.length;
        
        let status = 'Bueno';
        let changePercentage = 0;
        
        if (totalProducts > 0) {
            const lowStockPercentage = (lowStockProducts / totalProducts) * 100;
            
            if (lowStockPercentage > 30) {
                status = 'Crítico';
                changePercentage = -lowStockPercentage;
            } else if (lowStockPercentage > 15) {
                status = 'Bajo';
                changePercentage = -lowStockPercentage;
            } else {
                status = 'Bueno';
                changePercentage = 5; // Valor positivo por defecto
            }
        }
        
        // Actualizar interfaz
        updateInventoryDisplay(status, changePercentage);
        
    } catch (error) {
        log('Error al cargar métricas de inventario:', 'error', error);
    }
}

// Mostrar métricas por defecto
function displayDefaultMetrics() {
    updateSalesDisplay(0, 0);
    updateOrdersDisplay(0, 0);
    updateInventoryDisplay('Sin datos', 0);
}

// Actualizar display de ventas
function updateSalesDisplay(totalSales, changePercentage) {
    const salesElement = document.getElementById('total-sales');
    if (salesElement) {
        salesElement.textContent = `$${totalSales.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`;
    }
    
    updateMetricChange('sales-card', changePercentage);
}

// Actualizar display de pedidos
function updateOrdersDisplay(totalOrders, changePercentage) {
    const ordersElement = document.getElementById('total-orders');
    if (ordersElement) {
        ordersElement.textContent = totalOrders.toLocaleString();
    }
    
    updateMetricChange('orders-card', changePercentage);
}

// Actualizar display de inventario
function updateInventoryDisplay(status, changePercentage) {
    const inventoryCard = document.querySelector('.inventory-card .metric-value');
    if (inventoryCard) {
        inventoryCard.textContent = status;
    }
    
    updateMetricChange('inventory-card', changePercentage);
}

// Actualizar indicador de cambio de métrica
function updateMetricChange(cardClass, changePercentage) {
    const card = document.querySelector(`.${cardClass}`);
    if (!card) return;
    
    const changeElement = card.querySelector('.metric-change');
    if (!changeElement) return;
    
    const icon = changeElement.querySelector('i');
    const span = changeElement.querySelector('span');
    
    if (changePercentage >= 0) {
        changeElement.className = 'metric-change positive';
        icon.className = 'fas fa-arrow-up';
        span.textContent = `+${Math.abs(changePercentage).toFixed(1)}%`;
    } else {
        changeElement.className = 'metric-change negative';
        icon.className = 'fas fa-arrow-down';
        span.textContent = `-${Math.abs(changePercentage).toFixed(1)}%`;
    }
}

// Cargar actividad reciente
async function loadRecentActivity() {
    try {
        if (!window.userStores || window.userStores.length === 0) {
            displayDefaultActivity();
            return;
        }

        const storeIds = window.userStores.map(store => store.id);
        
        // Cargar pedidos recientes
        const { data: recentOrders, error } = await supabase
            .from('orders')
            .select('*')
            .in('store_id', storeIds)
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) {
            throw error;
        }

        // Cargar productos con stock bajo
        const { data: lowStockProducts, error: inventoryError } = await supabase
            .from('inventory')
            .select(`
                stock_quantity,
                products!inner(name, store_id)
            `)
            .in('products.store_id', storeIds)
            .lt('stock_quantity', 10)
            .limit(3);

        if (inventoryError) {
            log('Error al cargar productos con stock bajo:', 'error', inventoryError);
        }

        // Combinar y mostrar actividades
        displayRecentActivity(recentOrders, lowStockProducts || []);
        
    } catch (error) {
        log('Error al cargar actividad reciente:', 'error', error);
        displayDefaultActivity();
    }
}

// Mostrar actividad reciente
function displayRecentActivity(orders, lowStockProducts) {
    const activityList = document.getElementById('recent-activity');
    if (!activityList) return;
    
    activityList.innerHTML = '';
    
    // Agregar pedidos recientes
    orders.slice(0, 3).forEach(order => {
        const timeAgo = getTimeAgo(new Date(order.created_at));
        const activityItem = createActivityItem(
            'fas fa-shopping-cart',
            'Nuevo Pedido Recibido',
            `Pedido #${order.id.slice(-8)}`,
            timeAgo,
            'primary'
        );
        activityList.appendChild(activityItem);
    });
    
    // Agregar alertas de stock bajo
    lowStockProducts.forEach(product => {
        const activityItem = createActivityItem(
            'fas fa-exclamation-triangle',
            'Alerta de Stock Bajo',
            `Producto: ${product.products.name}`,
            'Ahora',
            'warning'
        );
        activityList.appendChild(activityItem);
    });
    
    // Si no hay actividades, mostrar mensaje
    if (orders.length === 0 && lowStockProducts.length === 0) {
        displayDefaultActivity();
    }
}

// Mostrar actividad por defecto
function displayDefaultActivity() {
    const activityList = document.getElementById('recent-activity');
    if (!activityList) return;
    
    activityList.innerHTML = `
        <div class="activity-item">
            <div class="activity-icon">
                <i class="fas fa-info-circle"></i>
            </div>
            <div class="activity-details">
                <div class="activity-title">Bienvenido a tu dashboard</div>
                <div class="activity-subtitle">Comienza agregando productos a tu tienda</div>
                <div class="activity-time">Ahora</div>
            </div>
        </div>
    `;
}

// Crear elemento de actividad
function createActivityItem(iconClass, title, subtitle, time, type = 'primary') {
    const item = document.createElement('div');
    item.className = 'activity-item';
    
    item.innerHTML = `
        <div class="activity-icon ${type}">
            <i class="${iconClass}"></i>
        </div>
        <div class="activity-details">
            <div class="activity-title">${title}</div>
            <div class="activity-subtitle">${subtitle}</div>
            <div class="activity-time">${time}</div>
        </div>
    `;
    
    return item;
}

// Calcular tiempo transcurrido
function getTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
        return 'Hace menos de 1 min';
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `Hace ${minutes} min`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `Hace ${hours}h`;
    } else {
        const days = Math.floor(diffInSeconds / 86400);
        return `Hace ${days}d`;
    }
}

// Configurar listeners de eventos
function setupEventListeners() {
    // Configurar navegación móvil
    setupMobileNavigation();
    
    // Configurar auto-refresh de datos
    setupAutoRefresh();
    
    // Configurar listeners de la sidebar
    setupSidebarListeners();
}

// Configurar navegación móvil
function setupMobileNavigation() {
    // Crear botón de menú móvil si no existe
    if (!document.querySelector('.mobile-menu-btn')) {
        const mobileMenuBtn = document.createElement('button');
        mobileMenuBtn.className = 'mobile-menu-btn';
        mobileMenuBtn.innerHTML = '<i class="fas fa-bars"></i>';
        mobileMenuBtn.onclick = toggleMobileMenu;
        document.body.appendChild(mobileMenuBtn);
    }
    
    // Crear overlay si no existe
    if (!document.querySelector('.sidebar-overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.onclick = closeMobileMenu;
        document.body.appendChild(overlay);
    }
}

// Alternar menú móvil
function toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
}

// Cerrar menú móvil
function closeMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
}

// Configurar auto-refresh de datos
function setupAutoRefresh() {
    // Refrescar datos cada 5 minutos
    setInterval(async () => {
        try {
            await loadDashboardMetrics();
            await loadRecentActivity();
            log('Datos del dashboard actualizados automáticamente', 'debug');
        } catch (error) {
            log('Error en auto-refresh:', 'error', error);
        }
    }, 5 * 60 * 1000); // 5 minutos
}

// Configurar listeners de la sidebar
function setupSidebarListeners() {
    // Cerrar menú móvil al hacer clic en un enlace
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                closeMobileMenu();
            }
        });
    });
}

// Función para abrir configuración
function openSettings() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.classList.add('active');
        loadStoreSettings();
    }
}

// Función para cerrar configuración
function closeSettings() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Cargar configuración de la tienda
async function loadStoreSettings() {
    try {
        if (!window.userStores || window.userStores.length === 0) {
            return;
        }
        
        const store = window.userStores[0]; // Usar la primera tienda
        
        document.getElementById('store-name').value = store.name || '';
        document.getElementById('store-address').value = store.address || '';
        document.getElementById('store-phone').value = store.phone || '';
        
    } catch (error) {
        log('Error al cargar configuración:', 'error', error);
    }
}

// Guardar configuración
async function saveSettings() {
    try {
        showLoader(true);
        
        const storeName = document.getElementById('store-name').value.trim();
        const storeAddress = document.getElementById('store-address').value.trim();
        const storePhone = document.getElementById('store-phone').value.trim();
        
        if (!storeName) {
            showMessage('El nombre de la tienda es requerido', 'error');
            return;
        }
        
        const userId = authManager.getCurrentUser().id;
        
        // Si no hay tiendas, crear una nueva
        if (!window.userStores || window.userStores.length === 0) {
            const { data, error } = await supabase
                .from('stores')
                .insert([{
                    owner_id: userId,
                    name: storeName,
                    address: storeAddress,
                    phone: storePhone
                }])
                .select();
            
            if (error) {
                throw error;
            }
            
            window.userStores = data;
        } else {
            // Actualizar tienda existente
            const { error } = await supabase
                .from('stores')
                .update({
                    name: storeName,
                    address: storeAddress,
                    phone: storePhone
                })
                .eq('id', window.userStores[0].id);
            
            if (error) {
                throw error;
            }
            
            // Actualizar datos locales
            window.userStores[0] = {
                ...window.userStores[0],
                name: storeName,
                address: storeAddress,
                phone: storePhone
            };
        }
        
        showMessage('Configuración guardada correctamente', 'success');
        closeSettings();
        
    } catch (error) {
        handleError(error, 'Guardar configuración');
    } finally {
        showLoader(false);
    }
}

// Hacer funciones disponibles globalmente
window.openSettings = openSettings;
window.closeSettings = closeSettings;
window.saveSettings = saveSettings;
window.toggleMobileMenu = toggleMobileMenu;

