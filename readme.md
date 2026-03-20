# 🏥 MedSched - Sistema de Agendamento Médico

Sistema completo para gestão de consultas médicas, integrando autenticação, busca automática de endereços via CEP e previsão do tempo para a data do agendamento.

## 🚀 Como Executar o Projeto

O projeto está configurado para rodar o **Backend** e o **Frontend** simultaneamente com um único comando a partir da pasta raiz.

1.  **Instale as dependências** (na raiz do projeto):
    ```bash
    npm install
    ```

2.  **Inicie as aplicações:**
    ```bash
    npm run dev
    ```

* **Frontend:** [http://localhost:3001](http://localhost:3001)
* **Backend:** [http://localhost:3000](http://localhost:3000)

---

## 🛠️ Tecnologias Utilizadas

### **Backend (Node.js & Express)**
* **Banco de Dados:** SQLite (com suporte a Promises).
* **Segurança:** Hash de senhas usando `PBKDF2` e autenticação via Bearer Token.
* **APIs Externas:** * [ViaCEP](https://viacep.com.br/) para localização.
    * [Open-Meteo](https://open-meteo.com/) para previsão meteorológica.

### **Frontend (Vue.js)**
* **Framework:** Vue.js 3.
* **Comunicação:** Axios para consumo da API REST.

---

## 📋 Funcionalidades Principais

* **Fluxo de Autenticação:** Registro e Login com diferentes níveis de acesso (`patient`, `secretary`, `admin`).
* **Agendamento Inteligente:** * Validação de disponibilidade de horário/médico.
    * Autopreenchimento de endereço via CEP.
    * **Alerta de Clima:** O sistema verifica se há previsão de chuva para o local e data da consulta, ajudando o paciente a se planejar.
* **Painel Administrativo:** Secretários e administradores possuem visão geral de todos os agendamentos.

---

## 🔌 Principais Endpoints da API

| Rota | Método | Descrição |
| :--- | :--- | :--- |
| `/register` | `POST` | Cria um novo usuário. |
| `/login` | `POST` | Autentica e retorna o token de sessão. |
| `/appointments` | `POST` | Realiza um novo agendamento (Requer Token). |
| `/availability` | `GET` | Consulta se um horário está disponível. |
| `/weather` | `GET` | Retorna o clima baseado no CEP e Data. |

---

## 🔗 Links e Deploy

* **Repositório GitHub:** [Acesse aqui](https://github.com/seu-usuario/seu-repositorio)
---

> **Nota:** Certifique-se de que as portas 3000 e 3001 estão liberadas no seu ambiente local antes de iniciar.
