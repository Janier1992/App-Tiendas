-- Creación de la tabla 'users'
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS para la tabla 'users'
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios puedan ver y actualizar su propio registro
CREATE POLICY "Users can view and update their own record" ON public.users
  FOR ALL USING (auth.uid() = id);

-- Creación de la tabla 'stores'
CREATE TABLE public.stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS para la tabla 'stores'
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- Política para que los dueños puedan ver y gestionar sus propias tiendas
CREATE POLICY "Owners can manage their own stores" ON public.stores
  FOR ALL USING (auth.uid() = owner_id);

-- Creación de la tabla 'products'
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL CHECK (price >= 0),
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS para la tabla 'products'
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios puedan ver productos de sus tiendas
CREATE POLICY "Users can view products from their stores" ON public.products
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid()));

-- Política para que los dueños puedan gestionar productos de sus tiendas
CREATE POLICY "Owners can manage products in their stores" ON public.products
  FOR ALL USING (EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid()));

-- Creación de la tabla 'inventory'
CREATE TABLE public.inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID UNIQUE NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS para la tabla 'inventory'
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios puedan ver el inventario de sus productos
CREATE POLICY "Users can view inventory of their products" ON public.inventory
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.products WHERE id = product_id AND EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())));

-- Política para que los dueños puedan gestionar el inventario de sus productos
CREATE POLICY "Owners can manage inventory of their products" ON public.inventory
  FOR ALL USING (EXISTS (SELECT 1 FROM public.products WHERE id = product_id AND EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())));

-- Creación de la tabla 'orders'
CREATE TYPE order_status AS ENUM (
    'pending',
    'completed',
    'cancelled',
    'delivered'
);

CREATE TYPE payment_status AS ENUM (
    'unpaid',
    'paid'
);

CREATE TYPE order_type AS ENUM (
    'online',
    'in_person'
);

CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    delivery_address TEXT,
    total_amount NUMERIC NOT NULL CHECK (total_amount >= 0),
    status order_status NOT NULL DEFAULT 'pending',
    payment_status payment_status NOT NULL DEFAULT 'unpaid',
    order_type order_type NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS para la tabla 'orders'
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Política para que los dueños puedan ver y gestionar pedidos de sus tiendas
CREATE POLICY "Owners can manage orders in their stores" ON public.orders
  FOR ALL USING (EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid()));

-- Creación de la tabla 'order_items'
CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price_at_order NUMERIC NOT NULL CHECK (price_at_order >= 0)
);

-- Habilitar RLS para la tabla 'order_items'
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Política para que los dueños puedan ver ítems de pedidos de sus tiendas
CREATE POLICY "Owners can view order items in their stores" ON public.order_items
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())));

-- Política para que los dueños puedan gestionar ítems de pedidos de sus tiendas
CREATE POLICY "Owners can manage order items in their stores" ON public.order_items
  FOR ALL USING (EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())));

-- Creación de la tabla 'deliveries'
CREATE TYPE delivery_status AS ENUM (
    'scheduled',
    'in_progress',
    'delivered',
    'cancelled'
);

CREATE TABLE public.deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID UNIQUE NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    delivery_person_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status delivery_status NOT NULL DEFAULT 'scheduled',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS para la tabla 'deliveries'
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

-- Política para que los dueños puedan ver y gestionar domicilios de sus tiendas
CREATE POLICY "Owners can manage deliveries in their stores" ON public.deliveries
  FOR ALL USING (EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())));

-- Política para que los repartidores puedan ver sus domicilios asignados
CREATE POLICY "Delivery persons can view their assigned deliveries" ON public.deliveries
  FOR SELECT USING (auth.uid() = delivery_person_id);

-- Creación de la tabla 'personal_tasks'
CREATE TABLE public.personal_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS para la tabla 'personal_tasks'
ALTER TABLE public.personal_tasks ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios puedan gestionar sus propias tareas personales
CREATE POLICY "Users can manage their own personal tasks" ON public.personal_tasks
  FOR ALL USING (auth.uid() = user_id);

-- Función para crear un registro de usuario en la tabla 'public.users' después de la autenticación
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para ejecutar la función 'handle_new_user' después de una nueva inserción en 'auth.users'
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();



