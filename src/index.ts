import { ApolloServerPlugin } from "apollo-server-plugin-base";
import { TracingFormat } from "apollo-tracing";
import { Registry, Counter, labelValues, Histogram } from "prom-client";

const nanosToSec = 1_000_000_000;

function filterUndefined(from: {
  [label: string]: string | number | undefined;
}): labelValues {
  return Object.fromEntries(
    Object.entries(from).filter(([_, o]) => o)
  ) as labelValues;
}

export default function createMetricsPlugin(
  register: Registry
): ApolloServerPlugin {
  const parsed = new Counter({
    name: "graphql_queries_parsed",
    help: "The amount of GraphQL queries that have been parsed.",
    labelNames: ["operationName", "operation"],
    registers: [register]
  });

  const validationStarted = new Counter({
    name: "graphql_queries_validation_started",
    help: "The amount of GraphQL queries that have started validation.",
    labelNames: ["operationName", "operation"],
    registers: [register]
  });

  const resolved = new Counter({
    name: "graphql_queries_resolved",
    help:
      "The amount of GraphQL queries that have had their operation resolved.",
    labelNames: ["operationName", "operation"],
    registers: [register]
  });

  const startedExecuting = new Counter({
    name: "graphql_queries_execution_started",
    help: "The amount of GraphQL queries that have started executing.",
    labelNames: ["operationName", "operation"],
    registers: [register]
  });

  const encounteredErrors = new Counter({
    name: "graphql_queries_errored",
    help: "The amount of GraphQL queries that have encountered errors.",
    labelNames: ["operationName", "operation"],
    registers: [register]
  });

  const responded = new Counter({
    name: "graphql_queries_responded",
    help:
      "The amount of GraphQL queries that have been executed and been attempted to send to the client. This includes requests with errors.",
    labelNames: ["operationName", "operation"],
    registers: [register]
  });

  const resolverTime = new Histogram({
    name: "graphql_resolver_time",
    help: "The time to resolve a GraphQL field.",
    labelNames: ["parentType", "fieldName", "returnType"],
    registers: [register]
  });

  const totalRequestTime = new Histogram({
    name: "graphql_total_request_time",
    help: "The time to complete a GraphQL query.",
    labelNames: ["operationName", "operation"],
    registers: [register]
  });

  const metricsPlugin: ApolloServerPlugin = {
    requestDidStart() {
      return {
        parsingDidStart(parsingContext) {
          const labels = filterUndefined({
            operationName: parsingContext.request.operationName || "",
            operation: parsingContext.operation?.operation
          });
          parsed.inc(labels);
        },
        validationDidStart(validationContext) {
          const labels = filterUndefined({
            operationName: validationContext.request.operationName || "",
            operation: validationContext.operation?.operation
          });
          validationStarted.inc(labels);
        },
        didResolveOperation(resolveContext) {
          const labels = filterUndefined({
            operationName: resolveContext.request.operationName || "",
            operation: resolveContext.operation.operation
          });
          resolved.inc(labels);
        },
        executionDidStart(executingContext) {
          const labels = filterUndefined({
            operationName: executingContext.request.operationName || "",
            operation: executingContext.operation.operation
          });
          startedExecuting.inc(labels);
        },
        didEncounterErrors(errorContext) {
          const labels = filterUndefined({
            operationName: errorContext.request.operationName || "",
            operation: errorContext.operation?.operation
          });
          encounteredErrors.inc(labels);
        },
        willSendResponse(responseContext) {
          const labels = filterUndefined({
            operationName: responseContext.request.operationName || "",
            operation: responseContext.operation?.operation
          });
          responded.inc(labels);

          const tracing: TracingFormat =
            responseContext.response.extensions?.tracing;

          if (tracing && tracing.version === 1) {
            totalRequestTime.observe(labels, tracing.duration / nanosToSec);

            tracing.execution.resolvers.forEach(
              ({ parentType, fieldName, returnType, duration }) => {
                resolverTime.observe(
                  {
                    parentType,
                    fieldName,
                    returnType
                  },
                  duration / nanosToSec
                );
              }
            );
            console.log(tracing.execution.resolvers);
          }
        }
      };
    }
  };

  return metricsPlugin;
}
