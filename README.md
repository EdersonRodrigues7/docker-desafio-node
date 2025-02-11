## Docker: Desafio Node - Curso Full Cycle 3.0
O objetivo do desafio é aplicar os conceitos aprendidos sobre docker compose para subir três serviços:
- Um banco de dados MySQL;
- Uma aplicação simples em node js; e
- Um conteiner nginx para servir de proxy reverso.

Basicamente, deve ser possível acessar a aplicação node através da porta exposta pelo nginx e receber como resposta uma página com "Full Cycle Rocks!" e uma lista de nomes cadastrados no banco de dados.

### Como utilizar
Basta baixar o projeto, criar um arquivo ".env" na pasta raiz com base no ".env.example" e executar o comando `docker-compose up -d --build`.

### Serviço MySQL
A configuração do banco de dados utiliza a imagem do mysql 8, define as credenciais com base em variáveis de ambiente e cria um volume para fins de desenvolvimento. Também foi criado um script SQL inicial para criar o database e a tabela "people", mapeando-o da pasta mysql para o entrypoint do docker.
É possível encontrar uma explicação para essa técnica de "pré-carregar" o banco de dados no seguinte [artigo do medium](https://medium.com/opensanca/criando-uma-imagem-docker-com-o-banco-de-dados-pr%C3%A9-carregado-5b97b7802007). Bastou adaptar para MySQL ao invés de PostgreSQL.
Além disso, o container é linkado na rede "fullcycle" para poder se comunicar com os demais serviços.
```
 mysql:
    image: mysql:8.0
    container_name: mysql-db
    restart: unless-stopped
    environment:
      - MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
      - MYSQL_DATABASE=${DB_NAME}
      - MYSQL_USER=${DB_USER}
      - MYSQL_PASSWORD=${DB_PASSWORD}
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
      - ./mysql/init:/docker-entrypoint-initdb.d:ro
    networks:
      - fullcycle
```
### Serviço Node JS
```
node_app:
    build:
      context: ./node-app
      dockerfile: Dockerfile
    container_name: node_app
    entrypoint: dockerize -wait tcp://mysql-db:3306 -timeout 30s node src/index.js
    restart: unless-stopped
    environment:
      NODE_ENV: ${NODE_ENV:-production}
      PORT: ${APP_PORT:-3000}
      DB_HOST: ${DB_HOST}
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      DB_NAME: ${DB_NAME}
      DB_PORT: ${DB_PORT}
    ports:
      - "${APP_PORT:-3000}:3000"
    depends_on:
      - mysql
    networks:
      - fullcycle
    volumes:
      - ./node-app:/usr/src/app
      - /usr/src/app/node_modules
```
Trata-se de uma aplicação simples node js com express, somente com o endpoint inicial ("/"). O endpoint basicamente chama o banco de dados e retorna a lista de nomes cadastrados.
Inicialmente a aplicação estava apresentando alguns problemas para conectar ao banco de dados diretamente (connection refused ou timeout) e, por isso, foi necessário implementar um esquema de retentativa.
O fluxo fica da seguinte forma:
- O servidor é iniciado, chamando a função de conexão com o banco de dados;
- A função carrega as credenciais das variáveis de ambiente e faz até 5 tentativas de conexão;
- Quando o endpoint é chamado, utiliza a conexão para fazer a consulta dos nomes.

Atualização: foi adicionada a dependência do container node js com o serviço mysql, utilizando o "depends_on" no docker-compose, além do dockerize para garantir que o app só irá subir quando o banco de dados estiver disponível.
### Serviço Nginx
O serviço foi configurado sem grandes alterações no padrão do Dockerfile ou do docker-compose.
```
nginx:
    build:
      context: ./nginx
      dockerfile: Dockerfile
    container_name: nginx_ederson
    restart: unless-stopped
    ports:
      - "8080:80"
    depends_on:
      - node_app
    networks:
      - fullcycle
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
```
Para o propósito de configuração do proxy reverso, a subseção "server" do arquivo "nginx.conf" é a que nos interessa. Nesse trecho do arquivo é preciso apontar a porta que será exposta pelo nginx, o nome do servidor e o proxy_pass dentro da "location" definida:
```
server {

        listen 80;

        server_name node_app;


        add_header X-Frame-Options "SAMEORIGIN";

        add_header X-XSS-Protection "1; mode=block";

        add_header X-Content-Type-Options "nosniff";

        location / {

            proxy_pass http://node_app:3000;

            proxy_http_version 1.1;

            proxy_set_header Upgrade $http_upgrade;

            proxy_set_header Connection 'upgrade';

            proxy_set_header Host $host;

            proxy_cache_bypass $http_upgrade;

            proxy_set_header X-Real-IP $remote_addr;

            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

            proxy_set_header X-Forwarded-Proto $scheme;

        }

    }
```
