// server.js
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const app = express();

// Configurar Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey);

app.use(express.json());

// Endpoint de prueba
app.get('/', (req, res) => {
  res.json({ message: 'API funcionando correctamente' });
});

// Puerto
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});

// Función para generar código tipo base36
function base36encode(number) {
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let result = "";
    while (number > 0) {
        const i = number % 36;
        result = chars[i] + result;
        number = Math.floor(number / 36);
    }
    return result;
}

function generarCodigoProducto() {
    const now = new Date();
    const timestamp = parseInt(
        now.getFullYear().toString() +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0') +
        String(now.getHours()).padStart(2, '0') +
        String(now.getMinutes()).padStart(2, '0') +
        String(now.getSeconds()).padStart(2, '0')
    );
    const aleatorio = Math.floor(Math.random() * 900 + 100); // 100-999
    return base36encode(timestamp) + aleatorio;
}
// Crear un producto
app.post('/crearProducto', async (req, res) => {
    const {nombre, cantidad, precio_compra, precio_venta, categoria_id, fecha_agregado} = req.body;

    if (!nombre || !cantidad || !precio_compra || !precio_venta || !categoria_id ) {
        return res.status(400).json({ mensaje: "Falta parámetros: (nombre, cantidad, precio_compra, precio_venta, categoria_id)" });
    }
    // Generar código único
    const codigo = generarCodigoProducto();

    // Convertir fecha del formato DD/MM/YYYY a timestamp ISO
    let fechaISO;
    if (fecha_agregado) {
        const [dia, mes, anio] = fecha_agregado.split('/').map(Number);
        const dateObj = new Date(anio, mes - 1, dia);
        fechaISO = dateObj.toISOString();
    } else {
        fechaISO = new Date().toISOString();
    }

    const { data, error } = await supabase
        .from('producto')
        .insert([{
        codigo,
        nombre,
        cantidad,
        precio_compra,
        precio_venta,
        categoria_id,
        fecha_agregado: fechaISO
        }])
        .select();

    if (error) return res.status(400).json({ error: error.message, success: false });

    res.json(data[0]);
});

// Obtener todos los productos
app.get('/getProductos', async (req, res) => {
    const { data, error } = await supabase
        .from('producto')
        .select('*')
        .order('fecha_agregado', { ascending: false });

    if (error) return res.status(400).json({ 
        mensaje: "Error al obtener productos",
        error: error.message,
    });
    const dataFormateada = data.map(p => ({
        ...p,
        fecha_agregado: new Date(p.fecha_agregado).toLocaleDateString('es-ES')
    }));
     res.json(dataFormateada);
});

app.get('/getProducto/:id', async (req, res) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({ mensaje: "Falta parámetros: (id)" });
    }
    const { data, error } = await supabase
        .from('producto')
        .select('*')
        .eq('id', id)
        .single();

    if (error) return res.status(404).json({ 
        mensaje: "Error al buscar producto",
        error: error.message,
    });

    // Formatear la fecha antes de enviarla
    const productoFormateado = {
        ...data,
        fecha_agregado: new Date(data.fecha_agregado).toLocaleDateString('es-ES')
    };

    res.json(productoFormateado);
});

// Actualizar un producto
app.put('/modificarProducto/:id', async (req, res) => {
    const { id } = req.params;
    const { codigo, nombre, cantidad, precio_compra, precio_venta, categoria_id, activo } = req.body;
    if (!id || !codigo || !nombre || !cantidad || !precio_compra || !precio_venta || !categoria_id ) {
        return res.status(400).json({ mensaje: "Falta parámetros: (id, codigo, nombre, cantidad, precio_compra, precio_venta, categoria_id)" });
    }

  const { data, error } = await supabase
    .from('producto')
    .update({ codigo, nombre, cantidad, precio_compra, precio_venta, categoria_id, activo })
    .eq('id', id)
    .select();

  if (error) return res.status(400).json({ 
        success: false,
        mensaje: "Error al modificar usuario",
        error: error.message,
  });
  res.json(data[0]);
});

// Eliminar un producto
app.delete('/eliminarProducto/:id', async (req, res) => {
    const { id } = req.params;
    if (!id ) {
        return res.status(400).json({ mensaje: "Falta parámetros: (id)" });
    }
    const { data, error } = await supabase
        .from('producto')
        .delete()
        .eq('id', id)
        .select();

    if (error) return res.status(400).json({ 
        mensaje: `Error eliminando producto con id: ${id}`,
        error: error.message,
    });
    res.json({ mensaje: 'Producto eliminado', data: data[0] });
});
/*
app.post('/crearVenta', async (req, res) => {
  const { cliente, productos } = req.body;

  if (!cliente || !productos || productos.length === 0) {
    return res.status(400).json({ error: "Faltan parámetros: cliente o productos" });
  }

  try {
    let totalProductos = 0;
    let subtotalTotal = 0;
    let descuentoTotal = 0;
    const detalles = [];

    // Validar productos y calcular subtotal
    for (const p of productos) {
      const { data: producto, error: productoError } = await supabase
        .from('producto')
        .select('*')
        .eq('id', p.producto_id)
        .single();

      if (productoError || !producto) {
        return res.status(404).json({ error: `Producto ID ${p.producto_id} no encontrado` });
      }

      if (p.cantidad > producto.cantidad) {
        return res.status(400).json({ 
          error: `Cantidad insuficiente para el producto ${producto.nombre}. Solicitado ${p.cantidad}, Disponible ${producto.cantidad}` 
        });
      }

      const subtotal_producto = (producto.precio_venta * p.cantidad) - (p.descuento || 0);
      subtotalTotal += subtotal_producto;
      totalProductos += p.cantidad;
      descuentoTotal += p.descuento;

      detalles.push({
        producto_id: p.producto_id,
        cantidad: p.cantidad,
        descuento: p.descuento || 0,
        subtotal: subtotal_producto
      });
    }
    // Crear la venta
    const { data: ventaData, error: ventaError } = await supabase
      .from('venta')
      .insert([{ 
        cliente, 
        total: subtotalTotal, 
        cantidad_productos: totalProductos, 
        descuento: descuentoTotal
      }])
      .select()
      .single();

    if (ventaError) return res.status(400).json({ error: ventaError.message });

    // Insertar detalles de venta
    const detallesConVenta = detalles.map(d => ({ ...d, venta_id: ventaData.id }));
    const { data: detallesData, error: detallesError } = await supabase
      .from('detalle_venta')
      .insert(detallesConVenta)
      .select();

    if (detallesError) return res.status(400).json({ error: detallesError.message });

    // Actualizar stock de cada producto
    for (const d of productos) {
      const { data: prodData } = await supabase
        .from('producto')
        .select('cantidad')
        .eq('id', d.producto_id)
        .single();

      const nuevaCantidad = prodData.cantidad - d.cantidad;

      await supabase
        .from('producto')
        .update({ cantidad: nuevaCantidad })
        .eq('id', d.producto_id);
    }

    // Respuesta
    res.json({ venta: ventaData, detalles: detallesData });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
*/
// Crear venta
app.post('/crearVenta', async (req, res) => {
  const { cliente, productos } = req.body;

  if (!cliente || !productos || productos.length === 0) {
    return res.status(400).json({ error: "Faltan parámetros: cliente o productos" });
  }

  // Validar que ninguna cantidad sea 0 o negativa
  for (const p of productos) {
    if (!p.cantidad || p.cantidad <= 0) {
      return res.status(400).json({ 
        error: `Cantidad inválida para el producto ID ${p.producto_id}: ${p.cantidad}` 
      });
    }
  }

  const { data, error } = await supabase.rpc('crear_venta', {
    p_cliente: cliente,
    p_productos: productos
  });

  if (error) return res.status(400).json({ error: error.message });

  res.json(data);
});

// Modificar venta
app.put('/modificarVenta/:id', async (req, res) => {
  const { id } = req.params;
  const { cliente, productos } = req.body;

  if (!productos || productos.length === 0) {
    return res.status(400).json({ error: "Faltan productos para modificar" });
  }

  // Validar que ninguna cantidad sea 0 o negativa
  for (const p of productos) {
    if (!p.cantidad || p.cantidad <= 0) {
      return res.status(400).json({ 
        error: `Cantidad inválida para el producto ID ${p.producto_id}: ${p.cantidad}` 
      });
    }
  }

  const { error } = await supabase.rpc('modificar_venta', {
    p_venta_id: id,
    p_cliente: cliente,
    p_productos: productos
  });

  if (error) return res.status(400).json({ error: error.message });

  res.json({ mensaje: 'Venta modificada correctamente' });
});


app.get('/getVentas', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('venta')
      .select(`
        id,
        cliente,
        total,
        descuento,
        cantidad_productos,
        fecha,
        detalle_venta (
          cantidad,
          descuento,
          subtotal,
          producto (
            nombre,
            precio_venta
          )
        )
      `)
      .order('fecha', { ascending: false });

    if (error) return res.status(400).json({ error: error.message });

    // Formatear fecha
    const ventas = data.map(v => ({
      ...v,
      fecha: new Date(v.fecha).toLocaleDateString('es-ES')
    }));

    res.json(ventas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/getVenta/:id', async (req, res) => {
  const { id } = req.params;

  if (!id) return res.status(400).json({ error: "Falta parámetro: id" });

  try {
    const { data, error } = await supabase
      .from('venta')
      .select(`
        id,
        cliente,
        total,
        descuento,
        cantidad_productos,
        fecha,
        detalle_venta (
          cantidad,
          descuento,
          subtotal,
          producto (
            nombre,
            precio_venta
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: "Venta no encontrada" });
    }

    data.fecha = new Date(data.fecha).toLocaleDateString('es-ES');

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/eliminarVenta/:id', async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase.rpc('eliminar_venta', {
    p_venta_id: id
  });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.json({ mensaje: 'Venta eliminada y stock restaurado correctamente' });
});


app.get('/buscarProducto', async (req, res) => {
  const { q } = req.query; // q puede ser nombre, código o fecha en dd/mm/yyyy

  if (!q) return res.status(400).json({ error: "Falta parámetro: q" });

  try {
    let filter = supabase.from('producto');

    // Detectar si es fecha (dd/mm/yyyy)
    const fechaRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (fechaRegex.test(q)) {
      const [dia, mes, año] = q.split('/');
      const fechaInicio = new Date(`${año}-${mes}-${dia}T00:00:00`);
      const fechaFin = new Date(`${año}-${mes}-${dia}T23:59:59`);

      const { data, error } = await filter
        .select('*')
        .gte('fecha_agregado', fechaInicio.toISOString())
        .lte('fecha_agregado', fechaFin.toISOString())
        .order('fecha_agregado', { ascending: false });

      if (error) return res.status(400).json({ error: error.message });

      // Formatear fecha para respuesta
      const resultados = data.map(p => ({
        ...p,
        fecha_agregado: new Date(p.fecha_agregado).toLocaleDateString('es-ES')
      }));

      return res.json(resultados);
    }

    // Si no es fecha, buscar por nombre o código
    const { data, error } = await filter
      .select('*')
      .or(`nombre.ilike.%${q}%,codigo.ilike.%${q}%`)
      .order('fecha_agregado', { ascending: false });

    if (error) return res.status(400).json({ error: error.message });

    // Formatear fecha
    const resultados = data.map(p => ({
      ...p,
      fecha_agregado: new Date(p.fecha_agregado).toLocaleDateString('es-ES')
    }));

    res.json(resultados);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Buscar producto por código
app.get('/buscarProductoCodigo/:codigo', async (req, res) => {
  const { codigo } = req.params;

  if (!codigo) {
    return res.status(400).json({ error: "Falta parámetro: codigo" });
  }

  try {
    const { data, error } = await supabase
      .from('producto')
      .select('*')
      .eq('codigo', codigo)
      .single(); // 'single' porque el código debe ser único

    if (error) {
      return res.status(404).json({ error: `Producto con código ${codigo} no encontrado` });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get('/fechasProductos', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('producto')
      .select('fecha_agregado')
      .order('fecha_agregado', { ascending: true });

    if (error) return res.status(400).json({ error: error.message });

    // Convertir a formato "12 de diciembre de 2025" y eliminar duplicados
    const fechasUnicas = [...new Set(
      data.map(p => new Date(p.fecha_agregado).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }))
    )];

    res.json(fechasUnicas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/categorias', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('categoria')
      .select('*')

    if (error) return res.status(400).json({ error: error.message });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/getDatos', async (req, res) => {
  try {
    // 1️⃣ Total ganado (suma de ventas)
    const { data: ventas, error: ventasError } = await supabase
      .from('venta')
      .select('total, descuento');

    if (ventasError) return res.status(400).json({ error: ventasError.message });

    const totalGanado = ventas.reduce((acc, v) => acc + v.total, 0);

    // 2️⃣ Total de costo (suma de precio_compra * cantidad vendida)
    const { data: detalles, error: detallesError } = await supabase
      .from('detalle_venta')
      .select('producto_id, cantidad');

    if (detallesError) return res.status(400).json({ error: detallesError.message });

    // Obtener info de productos
    const { data: productos, error: productosError } = await supabase
      .from('producto')
      .select('id, cantidad, precio_compra');

    if (productosError) return res.status(400).json({ error: productosError.message });

    // Crear un mapa de productos para acceso rápido
    const productosMap = {};
    productos.forEach(p => { productosMap[p.id] = p; });

    let totalCosto = 0;
    detalles.forEach(d => {
      const producto = productosMap[d.producto_id];
      if (producto) totalCosto += producto.precio_compra * d.cantidad;
    });

    // 3️⃣ Profit
    const profit = totalGanado - totalCosto;

    // 4️⃣ Cantidad de productos disponibles y vendidos
    const totalProductosDisponibles = productos.reduce((acc, p) => acc + p.cantidad, 0);
    const totalProductosVendidos = detalles.reduce((acc, d) => acc + d.cantidad, 0);
    const totalProductos = totalProductosDisponibles + totalProductosVendidos;

    res.json({
      totalGanado,
      totalCosto,
      profit,
      totalProductosDisponibles,
      totalProductosVendidos,
      totalProductos
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
