CREATE DATABASE IF NOT EXISTS fullcycle;
USE fullcycle;
CREATE TABLE IF NOT EXISTS people (id INT NOT NULL AUTO_INCREMENT, name VARCHAR(100) NOT NULL, PRIMARY KEY (id));
INSERT INTO people (name) VALUES ("Fulano"), ("Cicrano"), ("Beltrano");