UPDATE gap_analisis SET zona = 'Oviedo' WHERE zona = 'oviedo';
UPDATE gap_analisis SET zona = 'Gijón' WHERE zona = 'gijón';
UPDATE gap_analisis SET zona = 'Avilés' WHERE zona = 'avilés';

-- Also fix anuncios if needed
UPDATE anuncios SET distrito = 'Oviedo' WHERE distrito = 'oviedo';
UPDATE anuncios SET distrito = 'Gijón' WHERE distrito = 'gijón';
UPDATE anuncios SET distrito = 'Avilés' WHERE distrito = 'avilés';
