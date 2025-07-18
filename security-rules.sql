-- Reglas de Seguridad para Supabase
-- Estas reglas deben ejecutarse en el Editor SQL de Supabase

-- =============================================
-- CONFIGURACIÓN DE SEGURIDAD PARA STORAGE
-- =============================================

-- Crear bucket para imágenes de productos si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Política para permitir subida de imágenes (solo usuarios autenticados)
CREATE POLICY "Usuarios autenticados pueden subir imágenes" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'product-images' 
    AND auth.role() = 'authenticated'
);

-- Política para permitir lectura pública de imágenes
CREATE POLICY "Imágenes públicas para lectura" ON storage.objects
FOR SELECT USING (bucket_id = 'product-images');

-- Política para permitir actualización de imágenes (solo el propietario)
CREATE POLICY "Propietarios pueden actualizar sus imágenes" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'product-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Política para permitir eliminación de imágenes (solo el propietario)
CREATE POLICY "Propietarios pueden eliminar sus imágenes" ON storage.objects
FOR DELETE USING (
    bucket_id = 'product-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- =============================================
-- POLÍTICAS RLS PARA TABLA USERS
-- =============================================

-- Los usuarios solo pueden ver y editar su propio perfil
CREATE POLICY "Usuarios pueden ver su propio perfil" ON public.users
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Usuarios pueden actualizar su propio perfil" ON public.users
FOR UPDATE USING (auth.uid() = id);

-- =============================================
-- POLÍTICAS RLS PARA TABLA STORES
-- =============================================

-- Los usuarios solo pueden ver sus propias tiendas
CREATE POLICY "Propietarios pueden ver sus tiendas" ON public.stores
FOR SELECT USING (auth.uid() = owner_id);

-- Los usuarios pueden crear tiendas
CREATE POLICY "Usuarios autenticados pueden crear tiendas" ON public.stores
FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Los propietarios pueden actualizar sus tiendas
CREATE POLICY "Propietarios pueden actualizar sus tiendas" ON public.stores
FOR UPDATE USING (auth.uid() = owner_id);

-- Los propietarios pueden eliminar sus tiendas
CREATE POLICY "Propietarios pueden eliminar sus tiendas" ON public.stores
FOR DELETE USING (auth.uid() = owner_id);

-- =============================================
-- POLÍTICAS RLS PARA TABLA PRODUCTS
-- =============================================

-- Los usuarios solo pueden ver productos de sus tiendas
CREATE POLICY "Propietarios pueden ver productos de sus tiendas" ON public.products
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.stores 
        WHERE stores.id = products.store_id 
        AND stores.owner_id = auth.uid()
    )
);

-- Los usuarios pueden crear productos en sus tiendas
CREATE POLICY "Propietarios pueden crear productos en sus tiendas" ON public.products
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.stores 
        WHERE stores.id = products.store_id 
        AND stores.owner_id = auth.uid()
    )
);

-- Los propietarios pueden actualizar productos de sus tiendas
CREATE POLICY "Propietarios pueden actualizar productos de sus tiendas" ON public.products
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.stores 
        WHERE stores.id = products.store_id 
        AND stores.owner_id = auth.uid()
    )
);

-- Los propietarios pueden eliminar productos de sus tiendas
CREATE POLICY "Propietarios pueden eliminar productos de sus tiendas" ON public.products
FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM public.stores 
        WHERE stores.id = products.store_id 
        AND stores.owner_id = auth.uid()
    )
);

-- =============================================
-- POLÍTICAS RLS PARA TABLA INVENTORY
-- =============================================

-- Los usuarios solo pueden ver inventario de sus productos
CREATE POLICY "Propietarios pueden ver inventario de sus productos" ON public.inventory
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.products 
        JOIN public.stores ON products.store_id = stores.id
        WHERE products.id = inventory.product_id 
        AND stores.owner_id = auth.uid()
    )
);

-- Los usuarios pueden crear registros de inventario para sus productos
CREATE POLICY "Propietarios pueden crear inventario para sus productos" ON public.inventory
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.products 
        JOIN public.stores ON products.store_id = stores.id
        WHERE products.id = inventory.product_id 
        AND stores.owner_id = auth.uid()
    )
);

-- Los propietarios pueden actualizar inventario de sus productos
CREATE POLICY "Propietarios pueden actualizar inventario de sus productos" ON public.inventory
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.products 
        JOIN public.stores ON products.store_id = stores.id
        WHERE products.id = inventory.product_id 
        AND stores.owner_id = auth.uid()
    )
);

-- =============================================
-- POLÍTICAS RLS PARA TABLA SALES
-- =============================================

-- Los usuarios solo pueden ver ventas de sus tiendas
CREATE POLICY "Propietarios pueden ver ventas de sus tiendas" ON public.sales
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.stores 
        WHERE stores.id = sales.store_id 
        AND stores.owner_id = auth.uid()
    )
);

-- Los usuarios pueden crear ventas en sus tiendas
CREATE POLICY "Propietarios pueden crear ventas en sus tiendas" ON public.sales
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.stores 
        WHERE stores.id = sales.store_id 
        AND stores.owner_id = auth.uid()
    )
);

-- Los propietarios pueden actualizar ventas de sus tiendas
CREATE POLICY "Propietarios pueden actualizar ventas de sus tiendas" ON public.sales
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.stores 
        WHERE stores.id = sales.store_id 
        AND stores.owner_id = auth.uid()
    )
);

-- =============================================
-- POLÍTICAS RLS PARA TABLA SALE_ITEMS
-- =============================================

-- Los usuarios solo pueden ver items de ventas de sus tiendas
CREATE POLICY "Propietarios pueden ver items de sus ventas" ON public.sale_items
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.sales 
        JOIN public.stores ON sales.store_id = stores.id
        WHERE sales.id = sale_items.sale_id 
        AND stores.owner_id = auth.uid()
    )
);

-- Los usuarios pueden crear items de ventas en sus tiendas
CREATE POLICY "Propietarios pueden crear items de ventas" ON public.sale_items
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.sales 
        JOIN public.stores ON sales.store_id = stores.id
        WHERE sales.id = sale_items.sale_id 
        AND stores.owner_id = auth.uid()
    )
);

-- =============================================
-- POLÍTICAS RLS PARA TABLA ORDERS
-- =============================================

-- Los usuarios solo pueden ver pedidos de sus tiendas
CREATE POLICY "Propietarios pueden ver pedidos de sus tiendas" ON public.orders
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.stores 
        WHERE stores.id = orders.store_id 
        AND stores.owner_id = auth.uid()
    )
);

-- Los usuarios pueden crear pedidos en sus tiendas
CREATE POLICY "Propietarios pueden crear pedidos en sus tiendas" ON public.orders
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.stores 
        WHERE stores.id = orders.store_id 
        AND stores.owner_id = auth.uid()
    )
);

-- Los propietarios pueden actualizar pedidos de sus tiendas
CREATE POLICY "Propietarios pueden actualizar pedidos de sus tiendas" ON public.orders
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.stores 
        WHERE stores.id = orders.store_id 
        AND stores.owner_id = auth.uid()
    )
);

-- =============================================
-- POLÍTICAS RLS PARA TABLA ORDER_ITEMS
-- =============================================

-- Los usuarios solo pueden ver items de pedidos de sus tiendas
CREATE POLICY "Propietarios pueden ver items de sus pedidos" ON public.order_items
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.orders 
        JOIN public.stores ON orders.store_id = stores.id
        WHERE orders.id = order_items.order_id 
        AND stores.owner_id = auth.uid()
    )
);

-- Los usuarios pueden crear items de pedidos en sus tiendas
CREATE POLICY "Propietarios pueden crear items de pedidos" ON public.order_items
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.orders 
        JOIN public.stores ON orders.store_id = stores.id
        WHERE orders.id = order_items.order_id 
        AND stores.owner_id = auth.uid()
    )
);

-- =============================================
-- POLÍTICAS RLS PARA TABLA DELIVERIES
-- =============================================

-- Los usuarios solo pueden ver entregas de sus pedidos
CREATE POLICY "Propietarios pueden ver entregas de sus pedidos" ON public.deliveries
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.orders 
        JOIN public.stores ON orders.store_id = stores.id
        WHERE orders.id = deliveries.order_id 
        AND stores.owner_id = auth.uid()
    )
);

-- Los usuarios pueden crear entregas para sus pedidos
CREATE POLICY "Propietarios pueden crear entregas para sus pedidos" ON public.deliveries
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.orders 
        JOIN public.stores ON orders.store_id = stores.id
        WHERE orders.id = deliveries.order_id 
        AND stores.owner_id = auth.uid()
    )
);

-- Los propietarios pueden actualizar entregas de sus pedidos
CREATE POLICY "Propietarios pueden actualizar entregas de sus pedidos" ON public.deliveries
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.orders 
        JOIN public.stores ON orders.store_id = stores.id
        WHERE orders.id = deliveries.order_id 
        AND stores.owner_id = auth.uid()
    )
);

-- =============================================
-- POLÍTICAS RLS PARA TABLA CLIENTS
-- =============================================

-- Los usuarios solo pueden ver clientes de sus tiendas
CREATE POLICY "Propietarios pueden ver clientes de sus tiendas" ON public.clients
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.stores 
        WHERE stores.id = clients.store_id 
        AND stores.owner_id = auth.uid()
    )
);

-- Los usuarios pueden crear clientes en sus tiendas
CREATE POLICY "Propietarios pueden crear clientes en sus tiendas" ON public.clients
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.stores 
        WHERE stores.id = clients.store_id 
        AND stores.owner_id = auth.uid()
    )
);

-- Los propietarios pueden actualizar clientes de sus tiendas
CREATE POLICY "Propietarios pueden actualizar clientes de sus tiendas" ON public.clients
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.stores 
        WHERE stores.id = clients.store_id 
        AND stores.owner_id = auth.uid()
    )
);

-- Los propietarios pueden eliminar clientes de sus tiendas
CREATE POLICY "Propietarios pueden eliminar clientes de sus tiendas" ON public.clients
FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM public.stores 
        WHERE stores.id = clients.store_id 
        AND stores.owner_id = auth.uid()
    )
);

-- =============================================
-- POLÍTICAS RLS PARA TABLA PERSONAL_TASKS
-- =============================================

-- Los usuarios solo pueden ver sus propias tareas
CREATE POLICY "Usuarios pueden ver sus propias tareas" ON public.personal_tasks
FOR SELECT USING (auth.uid() = user_id);

-- Los usuarios pueden crear sus propias tareas
CREATE POLICY "Usuarios pueden crear sus propias tareas" ON public.personal_tasks
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Los usuarios pueden actualizar sus propias tareas
CREATE POLICY "Usuarios pueden actualizar sus propias tareas" ON public.personal_tasks
FOR UPDATE USING (auth.uid() = user_id);

-- Los usuarios pueden eliminar sus propias tareas
CREATE POLICY "Usuarios pueden eliminar sus propias tareas" ON public.personal_tasks
FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- FUNCIONES DE SEGURIDAD ADICIONALES
-- =============================================

-- Función para validar que un usuario es propietario de una tienda
CREATE OR REPLACE FUNCTION public.is_store_owner(store_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.stores 
        WHERE id = store_id 
        AND owner_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener tiendas del usuario actual
CREATE OR REPLACE FUNCTION public.get_user_stores()
RETURNS SETOF public.stores AS $$
BEGIN
    RETURN QUERY 
    SELECT * FROM public.stores 
    WHERE owner_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =============================================

-- Índices para mejorar el rendimiento de las consultas con RLS
CREATE INDEX IF NOT EXISTS idx_stores_owner_id ON public.stores(owner_id);
CREATE INDEX IF NOT EXISTS idx_products_store_id ON public.products(store_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON public.inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_store_id ON public.sales(store_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON public.orders(store_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_order_id ON public.deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_clients_store_id ON public.clients(store_id);
CREATE INDEX IF NOT EXISTS idx_personal_tasks_user_id ON public.personal_tasks(user_id);

-- Índices para búsquedas y filtros
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products USING gin(to_tsvector('spanish', name));
CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients USING gin(to_tsvector('spanish', name));
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);
CREATE INDEX IF NOT EXISTS idx_personal_tasks_due_date ON public.personal_tasks(due_date);

-- =============================================
-- CONFIGURACIÓN DE REALTIME (OPCIONAL)
-- =============================================

-- Habilitar realtime para tablas que necesiten actualizaciones en tiempo real
-- Nota: Esto debe configurarse desde el panel de Supabase en Database > Replication

-- ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.personal_tasks;

-- =============================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- =============================================

COMMENT ON POLICY "Usuarios autenticados pueden subir imágenes" ON storage.objects IS 
'Permite a usuarios autenticados subir imágenes al bucket de productos';

COMMENT ON POLICY "Propietarios pueden ver productos de sus tiendas" ON public.products IS 
'Garantiza que los usuarios solo puedan acceder a productos de tiendas que poseen';

COMMENT ON FUNCTION public.is_store_owner(UUID) IS 
'Función auxiliar para validar propiedad de tienda en políticas RLS';

-- =============================================
-- CONFIGURACIÓN FINAL
-- =============================================

-- Asegurar que RLS esté habilitado en todas las tablas
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_tasks ENABLE ROW LEVEL SECURITY;

