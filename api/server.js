import express from "express";
import neo4j from "neo4j-driver";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: [/^http:\/\/localhost:\d+$/],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

const driver = neo4j.driver(
  process.env.NEO4J_URI || "bolt://localhost:7687",
  neo4j.auth.basic(
    process.env.NEO4J_USER || "neo4j",
    process.env.NEO4J_PASSWORD || "password"
  )
);

app.get("/api/graph", async (req, res) => {
  const session = driver.session();
  const { guid } = req.query;

  try {
    let query;
    let parameters = {};

    if (guid) {
      query = `
        MATCH (n)-[r]-(adj)
        WHERE n.GUID = $guid
        RETURN n, r, adj
      `;
      parameters = { guid };
    } else {
      query = `
        MATCH (n)
        OPTIONAL MATCH (n)-[r]->(m)
        RETURN n, r, m
      `;
    }

    const result = await session.run(query, parameters);

    const nodes = new Map();
    const links = [];

    result.records.forEach((record) => {
      const startNode = record.get("n");
      if (!nodes.has(startNode.identity.toString())) {
        nodes.set(startNode.identity.toString(), {
          id: startNode.identity.toString(),
          labels: startNode.labels,
          properties: startNode.properties,
        });
      }

      const rel = record.get("r");
      const endNode = record.get(guid ? "adj" : "m");

      if (rel && endNode) {
        if (!nodes.has(endNode.identity.toString())) {
          nodes.set(endNode.identity.toString(), {
            id: endNode.identity.toString(),
            labels: endNode.labels,
            properties: endNode.properties,
          });
        }

        links.push({
          source: startNode.identity.toString(),
          target: endNode.identity.toString(),
          type: rel.type,
          properties: rel.properties,
        });
      }
    });

    return res.json({
      success: true,
      data: {
        nodes: Array.from(nodes.values()),
        links,
      },
    });
  } catch (error) {
    console.error("Error fetching graph data:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching graph data",
    });
  } finally {
    await session.close();
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
