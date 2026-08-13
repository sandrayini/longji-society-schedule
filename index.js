require('dotenv').config();
const app = require('./server/index');
const config = require('./server/config');

app.listen(config.port, () => {
  console.log(`Server running at http://localhost:${config.port}`);
});
