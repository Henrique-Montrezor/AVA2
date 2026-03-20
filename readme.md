🏥 Sistema de Agendamento Médico (MedSched)Este é um sistema completo de agendamento de consultas que integra autenticação de usuários, busca de endereço via CEP e previsão do tempo para a data da consulta.🚀 DemonstraçãoLink do Repositório: https://github.com/seu-usuario/seu-repositorioDeploy Frontend: https://seu-app-frontend.vercel.appDeploy Backend: https://seu-app-api.railway.app🛠️ Tecnologias UtilizadasBackendNode.js & Express: Servidor e gerenciamento de rotas.SQLite: Banco de dados relacional para persistência de usuários e agendamentos.Crypto: Hash de senhas (PBKDF2) e geração de tokens de sessão.Integrações Externas:ViaCEP: Busca de endereços por CEP.Open-Meteo: Previsão do tempo automática para o dia do agendamento.FrontendVue.js 3: Framework progressivo para a interface do usuário.Axios: Cliente HTTP para consumo da API.Vue Router: Gerenciamento de rotas de navegação.📋 FuncionalidadesAutenticação Segura: Cadastro de usuários e login com tokens de sessão.Controle de Acesso (RBAC): Diferenciação entre perfis de patient (paciente) e secretary/admin.Agendamento Inteligente: - Verifica disponibilidade de horário e médico.Preenche o endereço automaticamente ao digitar o CEP.Emite alerta de chuva (weather_alert) baseado na localização e data da consulta.Dashboard: Visualização de consultas marcadas (pacientes veem as suas, secretários veem todas).⚙️ Como executar o projetoPré-requisitosNode.js instalado (v16 ou superior)Gerenciador de pacotes (npm ou yarn)1. Configurar o BackendBash# Entre na pasta do servidor
cd backend

# Instale as dependências
npm install

# Certifique-se de que o arquivo db.js está configurado
# Inicie o servidor
O servidor rodará em http://localhost:3000. Configurar o Frontend (Vue.js)Bash# Entre na pasta do frontend

# Instale as dependências
npm install

# Inicie o projeto
npm run dev
🔌 Endpoints da API (Resumo)MétodoRotaDescriçãoAcessoPOST/registerCadastro de novo usuárioPúblicoPOST/loginLogin e geração de tokenPúblicoGET/profileDados do usuário logadoAutenticadoGET/availabilityVerifica se horário está livreAutenticadoPOST/appointmentsCria um novo agendamentoAutenticadoGET/appointmentsLista agendamentosAutenticadoGET/weatherConsulta clima por data e CEPPúblico📝 LicençaEste projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.
