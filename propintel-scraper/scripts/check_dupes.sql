\pset pager off
\pset format unaligned
\pset fieldsep '|'

SELECT municipio, periodo, COUNT(*) as cnt FROM datos_notariales WHERE ciudad='asturias' GROUP BY municipio, periodo HAVING COUNT(*) > 1;
SELECT ciudad, zona, periodo, COUNT(*) as cnt FROM gap_analisis GROUP BY ciudad, zona, periodo HAVING COUNT(*) > 1;
