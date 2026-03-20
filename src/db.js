import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('Erro ao conectar ao SQLite:', err.message);
  } else {
    console.log('Conectado ao SQLite!');
  }
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'patient'
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      secretary_id INTEGER,
      doctor TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      cep TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      weather_alert TEXT,
      status TEXT NOT NULL DEFAULT 'Agendado',
      created_at TEXT NOT NULL,
      FOREIGN KEY(patient_id) REFERENCES users(id),
      FOREIGN KEY(secretary_id) REFERENCES users(id)
    )
  `);
});

export default db;