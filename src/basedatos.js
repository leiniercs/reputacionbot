const { Pool } = require('pg');
const baseDatos = new Pool({
	host: '/run/postgresql',
	user: 'reputacionbot',
	password: 'LYhUuFYaoCS4gyUoumpmNbc1v71rJ2OWdurDSKBfGNo5fNUWhyPnSQ3j8',
	database: 'reputacionbot',
	max: 10
});
 
module.exports = {
	baseDatos
}