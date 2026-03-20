<script setup lang="ts">
import { reactive, ref, computed } from 'vue';

type User = {
  id: number;
  name: string;
  email: string;
  role: 'patient' | 'secretary' | 'admin';
};

type Appointment = {
  id: number;
  patient_id: number;
  secretary_id: number | null;
  doctor: string;
  date: string;
  time: string;
  cep: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  weather_alert: string | null;
  status: string;
};

const apiBase = 'http://localhost:3000';

const state = reactive({
  view: 'login',
  loading: false,
  message: '',
  user: null as User | null,
  token: localStorage.getItem('authToken') || '',
  loginData: { email: '', password: '' },
  registerData: { name: '', email: '', password: '' },

  appointmentForm: {
    patientId: '',
    doctor: '',
    date: '',
    time: '',
    cep: ''
  },
  appointments: [] as Appointment[],
  availability: null as boolean | null,
});

const authHeaders = () => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  return headers;
};

const showMessage = (text: string, error = false) => {
  state.message = text;
  if (error) console.error(text);
  setTimeout(() => { state.message = ''; }, 5000);
};

const login = async () => {
  try {
    state.loading = true;
    const res = await fetch(`${apiBase}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state.loginData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Falha no login');

    state.user = data.user;
    state.token = data.token;
    localStorage.setItem('authToken', data.token);
    state.view = 'dashboard';
    fetchAppointments();
    showMessage('Login realizado com sucesso');
  } catch (err: any) {
    showMessage(err.message, true);
  } finally {
    state.loading = false;
  }
};

const register = async () => {
  try {
    state.loading = true;
    const res = await fetch(`${apiBase}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state.registerData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Falha ao registrar');

    showMessage('Registro realizado com sucesso, faça login.');
    state.view = 'login';
  } catch (err: any) {
    showMessage(err.message, true);
  } finally {
    state.loading = false;
  }
};

const logout = () => {
  state.user = null;
  state.token = '';
  localStorage.removeItem('authToken');
  state.view = 'login';
  state.appointments = [];
};

const fetchAppointments = async () => {
  if (!state.user) return;
  try {
    state.loading = true;
    const endpoint = state.user.role === 'patient' ? '/appointments' : '/admin/appointments';
    const res = await fetch(`${apiBase}${endpoint}`, {
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Falha ao buscar atendimentos');
    state.appointments = data.appointments;
  } catch (err: any) {
    showMessage(err.message, true);
  } finally {
    state.loading = false;
  }
};

const checkAvailability = async () => {
  if (!state.appointmentForm.date || !state.appointmentForm.time || !state.appointmentForm.doctor) {
    showMessage('Preencha doctor, date e time para verificar disponibilidade', true);
    return;
  }

  try {
    const url = new URL(`${apiBase}/availability`);
    url.searchParams.set('date', state.appointmentForm.date);
    url.searchParams.set('time', state.appointmentForm.time);
    url.searchParams.set('doctor', state.appointmentForm.doctor);

    const res = await fetch(url.toString(), { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Falha ao verificar disponibilidade');

    state.availability = data.available;
    showMessage(data.available ? 'Horário disponível' : 'Horário ocupado');
  } catch (err: any) {
    showMessage(err.message, true);
  }
};

const bookAppointment = async () => {
  if (!state.user) {
    showMessage('Faça login primeiro', true);
    return;
  }

  try {
    state.loading = true;
    const payload = {
      patientId: state.user.role === 'patient' ? undefined : Number(state.appointmentForm.patientId) || undefined,
      doctor: state.appointmentForm.doctor,
      date: state.appointmentForm.date,
      time: state.appointmentForm.time,
      cep: state.appointmentForm.cep || undefined,
    };

    const res = await fetch(`${apiBase}/appointments`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Falha ao agendar consulta');

    showMessage('Consulta agendada com sucesso');
    state.appointmentForm = { patientId: '', doctor: '', date: '', time: '', cep: '' };
    state.availability = null;
    fetchAppointments();
  } catch (err: any) {
    showMessage(err.message, true);
  } finally {
    state.loading = false;
  }
};

const isLogged = computed(() => !!state.user);
</script>

<template>
  <div class="app-container">
    <h1>Clínica de Agendamento</h1>

    <section v-if="state.message" class="notify">{{ state.message }}</section>

    <section v-if="!isLogged">
      <div class="tabs">
        <button :class="{ active: state.view === 'login' }" @click="state.view = 'login'">Login</button>
        <button :class="{ active: state.view === 'register' }" @click="state.view = 'register'">Cadastro</button>
      </div>

      <div v-if="state.view === 'login'" class="card">
        <label>Email<input v-model="state.loginData.email" type="email" /></label>
        <label>Senha<input v-model="state.loginData.password" type="password" /></label>
        <button @click="login" :disabled="state.loading">Entrar</button>
      </div>

      <div v-if="state.view === 'register'" class="card">
        <label>Nome<input v-model="state.registerData.name" /></label>
        <label>Email<input v-model="state.registerData.email" type="email" /></label>
        <label>Senha<input v-model="state.registerData.password" type="password" /></label>
        <button @click="register" :disabled="state.loading">Cadastrar</button>
      </div>
    </section>

    <section v-else class="dashboard">
      <p>Olá, {{ state.user?.name }} ({{ state.user?.role }})</p>
      <button class="logout" @click="logout">Sair</button>

      <div class="card">
        <h2>Agendar consulta</h2>
        <div class="grid">
          <label>Paciente (se secretária/admin)
            <input v-model="state.appointmentForm.patientId" type="number" placeholder="ID paciente" />
          </label>
          <label>Médico<input v-model="state.appointmentForm.doctor" /></label>
          <label>Data<input v-model="state.appointmentForm.date" type="date" /></label>
          <label>Hora<input v-model="state.appointmentForm.time" type="time" /></label>
          <label>CEP<input v-model="state.appointmentForm.cep" /></label>
        </div>

        <div class="actions">
          <button @click="checkAvailability" :disabled="state.loading">Verificar disponibilidade</button>
          <button @click="bookAppointment" :disabled="state.loading">Agendar</button>
        </div>

        <p v-if="state.availability !== null">Status: <strong>{{ state.availability ? 'Disponível' : 'Ocupado' }}</strong></p>
      </div>

      <div class="card">
        <h2>Consultas</h2>
        <button @click="fetchAppointments" :disabled="state.loading">Atualizar</button>

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Médico</th>
              <th>Data</th>
              <th>Hora</th>
              <th>Status</th>
              <th>CEP</th>
              <th>Cidade</th>
              <th>Clima</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="appointment in state.appointments" :key="appointment.id">
              <td>{{ appointment.id }}</td>
              <td>{{ appointment.doctor }}</td>
              <td>{{ appointment.date }}</td>
              <td>{{ appointment.time }}</td>
              <td>{{ appointment.status }}</td>
              <td>{{ appointment.cep || 'N/A' }}</td>
              <td>{{ appointment.city || 'N/A' }}</td>
              <td>{{ appointment.weather_alert || 'N/A' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<style scoped>
.app-container {
  max-width: 960px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

h1 {
  text-align: center;
  margin-bottom: 20px;
}

.card {
  padding: 16px;
  margin: 12px 0;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.tabs {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-bottom: 16px;
}

button {
  margin-top: 8px;
  padding: 10px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background: #1976d2;
  color: white;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

button.active {
  background: #0a5cad;
}

.logout {
  background: #e53935;
}

label {
  display: block;
  margin-top: 8px;
}

input {
  width: 100%;
  padding: 8px;
  margin-top: 4px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 12px;
}

table th,
 table td {
  border: 1px solid #ccc;
  padding: 6px;
  text-align: left;
}

.notify {
  color: #1565c0;
  background: #e3f2fd;
  padding: 10px;
  border: 1px solid #90caf9;
  border-radius: 6px;
  margin-bottom: 12px;
}
</style>
