const express = require('express')
const { connectWithRetry } = require('./db');
const app = express()
const port = process.env.PORT || 3000;

app.get('/', async(req, res) => {
  let result = "<h1>Full Cycle Rocks!</h1><div>";

  const [people, fields] = await db.query('SELECT * FROM people;');

  console.log(people);

  people.forEach(person => {
    result += `<p>${person.name}</p>`;
  });

  result += "</div>";

  res.send(result)
})

async function startServer() {
  try {
      global.db = await connectWithRetry();
      
      app.listen(port, () => {
          console.log(`Server running on port ${port}`);
      });
  } catch (err) {
      console.error('Failed to start server:', err);
      process.exit(1);
  }
}



startServer();