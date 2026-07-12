-- Migración para añadir soporte a tiendas virtuales
ALTER TABLE tiendas ADD COLUMN is_virtual INTEGER DEFAULT 0;

-- Marcar MAD-01 como virtual
UPDATE tiendas SET is_virtual = 1 WHERE id_tienda = 'MAD-01';
