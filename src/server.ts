import app from "./app";
import { config } from "./config";
import { seedAdmin } from "./utils/seedAdmin";

app.listen(config.port, async () => {
  await seedAdmin();
  console.log(`Server is running on port ${config.port}`);
});
