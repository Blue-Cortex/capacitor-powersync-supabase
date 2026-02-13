import { SchemaTable } from '@blue-cortex/capacitor-powersync-supabase';

/**
 * PowerSync Database Schema
 * 
 * Define your database tables here. Each table automatically includes
 * an 'id' column (TEXT, primary key) - you don't need to define it.
 */
export const powerSyncSchema: SchemaTable[] = [
  {
    name: 'lists',
    columns: [
      { name: 'name', type: 'TEXT' },
      { name: 'created_at', type: 'TEXT' },
      { name: 'owner_id', type: 'TEXT' }
    ]
  },
  {
    name: 'todos',
    columns: [
      { name: 'list_id', type: 'TEXT' },
      { name: 'photo_id', type: 'TEXT' },
      { name: 'description', type: 'TEXT' },
      { name: 'completed', type: 'INTEGER' }, // 0 = false, 1 = true
      { name: 'created_at', type: 'TEXT' },
      { name: 'completed_at', type: 'TEXT' },
      { name: 'created_by', type: 'TEXT' },
      { name: 'completed_by', type: 'TEXT' }
    ],
    indexes: [
      {
        name: 'list_id_idx',
        columns: [{ name: 'list_id', ascending: true }]
      }
    ]
  }
];
