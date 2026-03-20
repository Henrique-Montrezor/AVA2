import express from 'express';
import crypto from 'crypto';
import db from './db.js';

const app = express();
const PORT = 3000;
const sessions = new Map();

app.use(express.json());

const hashPassword = (password, salt = null) => {
  const safeSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, safeSalt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt: safeSalt };
};

const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
});

const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
});

const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function (err) {
    if (err) return reject(err);
    resolve({ id: this.lastID });
  });
});

const authenticate = (req, res, next) => {
  const auth = req.headers.authorization?.split(' ');
  if (!auth || auth[0] !== 'Bearer' || !auth[1]) return res.status(401).json({ error: 'Autenticação necessária' });

  const token = auth[1];
  const session = sessions.get(token);
  if (!session) return res.status(401).json({ error: 'Token inválido ou expirado' });

  req.user = session;
  next();
};

const authorizeRoles = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  next();
};

const fetchCepData = async (cep) => {
  const cleanCep = cep.replace(/\D/g, '');
  const resp = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
  if (!resp.ok) throw new Error('CEP não encontrado');
  const data = await resp.json();
  if (data.erro) throw new Error('CEP não encontrado');
  return data;
};

const coordenadasPorEstado = {
  SP: { lat: -23.55052, lon: -46.633309 },
  RJ: { lat: -22.906847, lon: -43.172896 },
  MG: { lat: -19.916683, lon: -43.934493 },
  BA: { lat: -12.971399, lon: -38.501305 },
  // outros estados podem ser adicionados
};

const isRainy = (weatherCode) => {
  // códigos do Open-Meteo para precipitação leve a forte
  const rainyCodes = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82];
  return rainyCodes.includes(Number(weatherCode));
};

const getWeatherForecast = async (date, state = 'SP') => {
  const { lat, lon } = coordenadasPorEstado[state] || coordenadasPorEstado.SP;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode&start_date=${date}&end_date=${date}&timezone=America/Sao_Paulo`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('Falha ao obter clima');

  const data = await resp.json();
  const code = data.daily?.weathercode?.[0];
  if (code === undefined) throw new Error('Clima indisponível');

  return {
    date,
    weatherCode: code,
    willRain: isRainy(code),
    description: isRainy(code) ? 'Possibilidade de chuva' : 'Sem previsão de chuva',
  };
};

app.get('/health', (req, res) => {
  res.send('Health check passed!');
});

app.post('/register', async (req, res) => {
  try {
    const { name, email, password, role = 'patient' } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email e password são obrigatórios' });
    }
    const existing = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) return res.status(409).json({ error: 'Email já cadastrado' });

    const { hash, salt } = hashPassword(password);
    const result = await dbRun(
      'INSERT INTO users (name, email, password_hash, salt, role) VALUES (?,?,?,?,?)',
      [name, email, hash, salt, role]
    );

    res.status(201).json({ id: result.id, name, email, role });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email e password são obrigatórios' });
    }

    const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });

    const { hash } = hashPassword(password, user.salt);
    if (hash !== user.password_hash) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, { id: user.id, name: user.name, email: user.email, role: user.role });

    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/profile', authenticate, (req, res) => {
  res.json({ user: req.user });
});

app.get('/availability', authenticate, async (req, res) => {
  try {
    const { date, time, doctor } = req.query;
    if (!date || !time || !doctor) {
      return res.status(400).json({ error: 'date, time e doctor são obrigatórios' });
    }
    const row = await dbGet('SELECT COUNT(*) AS count FROM appointments WHERE date = ? AND time = ? AND doctor = ?', [date, time, doctor]);
    const available = row.count === 0;
    res.json({ available });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/appointments', authenticate, async (req, res) => {
  try {
    const { patientId, doctor, date, time, cep } = req.body;
    if (!doctor || !date || !time) {
      return res.status(400).json({ error: 'doctor, date e time são obrigatórios' });
    }

    const targetPatientId = req.user.role === 'patient' ? req.user.id : patientId;
    if (!targetPatientId) {
      return res.status(400).json({ error: 'patientId é obrigatório para usuários não-paciente' });
    }

    const busy = await dbGet('SELECT COUNT(*) AS count FROM appointments WHERE date = ? AND time = ? AND doctor = ?', [date, time, doctor]);
    if (busy.count > 0) {
      return res.status(409).json({ error: 'Horário já reservado' });
    }

    let cepInfo = null;
    let weatherInfo = null;

    if (cep) {
      try {
        cepInfo = await fetchCepData(cep);
        weatherInfo = await getWeatherForecast(date, (cepInfo.uf || 'SP'));
      } catch (err) {
        // continua com dados parciais
      }
    }

    const insert = await dbRun(
      `INSERT INTO appointments (patient_id, secretary_id, doctor, date, time, cep, address, city, state, weather_alert, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        targetPatientId,
        req.user.role === 'secretary' || req.user.role === 'admin' ? req.user.id : null,
        doctor,
        date,
        time,
        cep || null,
        cepInfo ? `${cepInfo.logradouro || ''}` : null,
        cepInfo?.localidade || null,
        cepInfo?.uf || null,
        weatherInfo ? weatherInfo.description : null,
        new Date().toISOString(),
      ]
    );

    res.status(201).json({
      id: insert.id,
      patientId: targetPatientId,
      doctor,
      date,
      time,
      cepInfo,
      weatherInfo,
      status: 'Agendado',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/appointments', authenticate, async (req, res) => {
  try {
    let rows;
    if (req.user.role === 'patient') {
      rows = await dbAll('SELECT * FROM appointments WHERE patient_id = ? ORDER BY date, time', [req.user.id]);
    } else {
      rows = await dbAll('SELECT * FROM appointments ORDER BY date, time', []);
    }
    res.json({ appointments: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/admin/appointments', authenticate, authorizeRoles('secretary', 'admin'), async (req, res) => {
  try {
    const rows = await dbAll('SELECT * FROM appointments ORDER BY date, time', []);
    res.json({ appointments: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/cep/:cep', async (req, res) => {
  try {
    const data = await fetchCepData(req.params.cep);
    res.json(data);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

app.get('/weather', async (req, res) => {
  try {
    const { date, cep } = req.query;
    if (!date || !cep) {
      return res.status(400).json({ error: 'date e cep são obrigatórios' });
    }

    const dataCep = await fetchCepData(cep);
    const forecast = await getWeatherForecast(date, dataCep.uf || 'SP');

    res.json({ cep: dataCep, forecast });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on localhost:${PORT}`);
}); 
