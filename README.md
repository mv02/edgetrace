# EdgeTrace

**Automated Call Graph Comparison for GraalVM Native Image**

Web tool for comparing and querying call graphs from [GraalVM Native Image](https://www.graalvm.org/latest/reference-manual/native-image/) compilations.

Bachelor's thesis, Faculty of Information Technology, Brno University of Technology, 2025.

## Installation

1. Install [Docker](https://docs.docker.com/engine/install/) and [Docker Compose](https://docs.docker.com/compose/install/).

2. Clone the repository.

3. Copy the example environment file and populate the environment variables:
   ```sh
   cp .env.example .env
   nano .env
   ```

4. Build and run the project:
   ```sh
   docker compose -f compose.yaml -f compose.override.yaml up
   ```

5. The app is now running and available at http://localhost:3000.
   - Backend: http://localhost:3001
   - Neo4j Browser: http://localhost:7474

> [!TIP]
> Compose files can be specified in `.env` instead: `COMPOSE_FILE=compose.yaml:compose.override.yaml`
