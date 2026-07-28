import { createApp } from './app';

const app = createApp();
const port = parseInt(process.env.PORT ?? '4000', 10);

export const server = app.listen(port, () => {
  console.log(`Server listening on ${port}`);
});

const shutdown = () => {
  server.close(() => process.exit(0));
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
