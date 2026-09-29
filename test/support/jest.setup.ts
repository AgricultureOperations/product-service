import { applyTestEnv } from './test-env';

// AppModule validates the environment at import time (ConfigModule.forRoot), so set it before any spec loads.
applyTestEnv();
