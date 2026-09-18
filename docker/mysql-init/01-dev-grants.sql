-- CSAK FEJLESZTŐI KÖRNYEZET.
--
-- A Prisma `migrate dev` egy ideiglenes "árnyék" adatbázist hoz létre, hogy
-- ellenőrizze a migrációt, mielőtt az élesre futna. Ehhez CREATE DATABASE jog
-- kell, amivel a `devuser` alapból nem rendelkezik – enélkül a migráció
-- P3014 hibával elszáll.
--
-- Éles szerveren NE add meg ezt a jogot: ott `prisma migrate deploy` fut,
-- ami nem használ árnyék-adatbázist.
GRANT ALL PRIVILEGES ON *.* TO 'devuser'@'%';
FLUSH PRIVILEGES;
