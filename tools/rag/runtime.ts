import { loadRagConfig } from "./config";
import { OllamaEmbeddingsClient } from "./embeddings";
import { QdrantVectorStore } from "./qdrant-store";
import { RagService } from "./service";

export function createRagService(): RagService {
  const config = loadRagConfig();
  const embeddings = new OllamaEmbeddingsClient({
    baseUrl: config.ollamaUrl,
    model: config.embeddingModel,
    dimensions: config.embeddingDimensions,
  });
  const store = new QdrantVectorStore({
    url: config.qdrantUrl,
    apiKey: config.qdrantApiKey,
    collection: config.qdrantCollection,
  });

  return new RagService({
    config,
    embeddings,
    store,
  });
}
