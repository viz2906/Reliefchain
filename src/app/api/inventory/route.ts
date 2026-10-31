// ============================================================================
// ReliefChain: Warehouse Inventory & Stock Balancer API Route
// File: src/app/api/inventory/route.ts
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';

export async function GET() {
  try {
    // 1. Fetch all warehouse inventory items with warehouse and category joins
    const inventoryRes = await query(`
      SELECT 
        wi.id,
        wi.warehouse_id,
        w.name AS warehouse_name,
        w.location_name,
        wi.category_id,
        rc.code AS resource_code,
        rc.name AS resource_name,
        rc.category_group,
        rc.unit_of_measure,
        rc.priority_rank,
        wi.available_quantity,
        wi.reserved_quantity,
        wi.minimum_threshold,
        wi.last_restocked_at,
        CASE 
          WHEN wi.available_quantity = 0 THEN 'OUT_OF_STOCK'
          WHEN wi.available_quantity <= wi.minimum_threshold THEN 'LOW_STOCK'
          ELSE 'SUFFICIENT'
        END AS stock_status
      FROM warehouse_inventory wi
      JOIN warehouses w ON wi.warehouse_id = w.id
      JOIN resource_categories rc ON wi.category_id = rc.id
      ORDER BY w.id ASC, rc.priority_rank ASC;
    `);

    // 2. Warehouses metadata list
    const warehousesRes = await query(`
      SELECT id, name, location_name, capacity_sqft, is_operational, latitude, longitude
      FROM warehouses
      ORDER BY id ASC;
    `);

    // 3. Resource Categories list
    const categoriesRes = await query(`
      SELECT id, code, name, category_group, unit_of_measure, priority_rank, weight_kg_per_unit
      FROM resource_categories
      ORDER BY priority_rank ASC, name ASC;
    `);

    return NextResponse.json({
      success: true,
      inventory: inventoryRes.rows,
      warehouses: warehousesRes.rows,
      categories: categoriesRes.rows,
    });
  } catch (error: any) {
    console.error('Inventory Error:', error);
    return NextResponse.json(
      { error: 'Failed to load inventory', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { warehouseId, categoryId, restockQuantity } = body;

    if (!warehouseId || !categoryId || !restockQuantity || restockQuantity <= 0) {
      return NextResponse.json(
        { error: 'Valid warehouseId, categoryId, and restockQuantity (> 0) required' },
        { status: 400 }
      );
    }

    const res = await query(
      `INSERT INTO warehouse_inventory (warehouse_id, category_id, available_quantity, reserved_quantity, minimum_threshold, last_restocked_at)
       VALUES ($1, $2, $3, 0, 100, CURRENT_TIMESTAMP)
       ON CONFLICT (warehouse_id, category_id)
       DO UPDATE SET 
         available_quantity = warehouse_inventory.available_quantity + EXCLUDED.available_quantity,
         last_restocked_at = CURRENT_TIMESTAMP
       RETURNING *;`,
      [warehouseId, categoryId, restockQuantity]
    );

    // Audit log
    await query(
      `INSERT INTO allocation_audit_log (entity_name, entity_id, action_type, new_state)
       VALUES ('warehouse_inventory', $1, 'STOCK_ADJUSTMENT', $2);`,
      [res.rows[0].id, JSON.stringify({ warehouseId, categoryId, restockQuantity })]
    );

    return NextResponse.json({
      success: true,
      updatedInventory: res.rows[0],
    });
  } catch (error: any) {
    console.error('Restock Error:', error);
    return NextResponse.json(
      { error: 'Failed to restock inventory', details: error.message },
      { status: 500 }
    );
  }
}
