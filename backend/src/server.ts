import { createApp } from './app';

const app = createApp();
const port = parseInt(process.env.PORT ?? '4000', 10);

app.listen(port, () => {
  console.log(`Server listening on ${port}`);
});
