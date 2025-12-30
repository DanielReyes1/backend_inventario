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

// Crear un producto
app.post('/crearProducto', async (req, res) => {
    const { codigo, nombre, cantidad, precio_compra, precio_venta, categoria_id } = req.body;

    if (!codigo || !nombre || !cantidad || !precio_compra || !precio_venta || !categoria_id ) {
        return res.status(400).json({ mensaje: "Falta parámetros: (codigo, nombre, cantidad, precio_compra, precio_venta, categoria_id)" });
    }

    const { data, error } = await supabase
        .from('producto')
        .insert([{ codigo, nombre, cantidad, precio_compra, precio_venta, categoria_id }])
        .select();

    if (error) return res.status(400).json({ 
        error: error.message,
        success: false 
    });

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
    res.json(data);
});

// Obtener un producto por ID
app.get('/getProducto/:id', async (req, res) => {
    const { id } = req.params;
    if (!id ) {
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
    res.json(data);
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
