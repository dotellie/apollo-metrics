# Apollo Server Metrics

[![Build Status](https://travis-ci.org/dotellie/apollo-metrics.svg?branch=develop)](https://travis-ci.org/dotellie/apollo-metrics)
![npm](https://img.shields.io/npm/v/apollo-metrics)

Export Apollo server request information to Prometheus through
[prom-client](https://github.com/siimon/prom-client).

## Usage

```typescript
import { ApolloServer } from "apollo-server-express";
import express from "express";
import { register } from "prom-client";
import createMetricsPlugin from "apollo-metrics";

async function start(): Promise<void> {
  try {
    const app = express();

    app.get("/metrics", (_, res) => res.send(register.metrics());
    const apolloMetricsPlugin = createMetricsPlugin(register);

    const server = new ApolloServer({
      plugins: [apolloMetricsPlugin],
      // IMPORTANT: tracing needs to be enabled to get resolver and request timings!
      tracing: true
    });
    server.applyMiddleware({ app, path: "/" });

    app.listen(5000, () => console.log(`🚀 Service started`));
  } catch (error) {
    console.error("Failed to start!", error);
  }
}

start();
```

## License

MIT
