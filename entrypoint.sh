set -e
echo "Running migrations..."
npx sequelize-cli db:migrate --config config/config.js
echo "Starting server..."
exec node server.js