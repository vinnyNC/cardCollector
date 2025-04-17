# Examining and Enhancing Database Schema

Here are SQL queries to analyze your public schema and find potential enhancements:

## 1. List all tables with row counts

```sql
SELECT tablename,
       pg_size_pretty(pg_total_relation_size(quote_ident(tablename)))                       as size,
       (SELECT reltuples FROM pg_class WHERE oid = (quote_ident(tablename)::regclass)::oid) AS row_estimate
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(quote_ident(tablename)) DESC;
```

## 2. Find tables without primary keys

```sql
SELECT t.table_name
FROM information_schema.tables t
         LEFT JOIN information_schema.table_constraints tc
                   ON tc.table_name = t.table_name
                       AND tc.constraint_type = 'PRIMARY KEY'
                       AND tc.table_schema = t.table_schema
WHERE t.table_schema = 'public'
  AND tc.constraint_name IS NULL
  AND t.table_type = 'BASE TABLE';
```

## 3. Identify missing indexes on foreign keys

```sql
SELECT tc.table_schema,
       tc.table_name,
       kcu.column_name,
       ccu.table_name  AS foreign_table_name,
       ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name
         JOIN information_schema.constraint_column_usage ccu
              ON ccu.constraint_name = tc.constraint_name
         LEFT JOIN pg_indexes pi
                   ON pi.tablename = tc.table_name
                       AND pi.indexdef LIKE '%' || kcu.column_name || '%'
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND pi.indexname IS NULL;
```

## 4. Find unused indexes

```sql
SELECT s.schemaname,
       s.relname                                      AS tablename,
       s.indexrelname                                 AS indexname,
       pg_size_pretty(pg_relation_size(s.indexrelid)) AS index_size,
       s.idx_scan                                     AS index_scans
FROM pg_stat_user_indexes s
         JOIN pg_index i ON s.indexrelid = i.indexrelid
WHERE s.schemaname = 'public'
  AND s.idx_scan < 10 -- Adjust based on your application's usage
  AND NOT i.indisprimary
  AND NOT i.indisunique
ORDER BY pg_relation_size(s.indexrelid) DESC;
```

## 5. Find columns with inefficient data types

```sql
SELECT table_name,
       column_name,
       data_type,
       character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (data_type = 'character varying' AND character_maximum_length > 255) OR
    (data_type = 'text') OR
    (data_type IN ('integer', 'bigint') AND column_name LIKE '%id')
    )
ORDER BY table_name, ordinal_position;
```

## Common enhancement opportunities:

- Add missing primary keys and foreign key constraints
- Normalize tables with repeating data
- Add indexes for frequently queried columns
- Implement consistent naming conventions
- Add table and column comments for documentation
- Review data types for space efficiency