import os
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
import anthropic
from dotenv import load_dotenv

load_dotenv()
# Step 1: Prepare documents
documents = [
    "Our refund policy: 30 days, full refund with receipt.",
    "Shipping takes 3-5 business days for domestic orders.",
    "We accept Visa, Mastercard, and PayPal.",
    "Customer support: support@example.com or call 1-800-HELP"
]

print(os.environ["CLAUDE_API_KEY"])

class rag_model():

    def __init__(self):
        self.model = SentenceTransformer("all-MiniLM-L6-v2", device ="cpu")  # 384-dim embeddings
        embeddings = self.model.encode(documents)

        dimension = embeddings.shape[1]
        self.index = faiss.IndexFlatL2(dimension)
        self.index.add(np.array(embeddings))

        self.client = anthropic.Anthropic(api_key=os.environ["CLAUDE_API_KEY"])

    def retrieve(self, query, k=2):
        query_embedding = self.model.encode([query])
        distances, indices = self.index.search(query_embedding, k)
        return [documents[i] for i in indices[0]]

    def rag_query(self, question, conversation: list | None = None):
        # Retrieve relevant docs
        context = self.retrieve(question)

        # Create prompt
        prompt = f"""Answer the question based only on this context:

    Context:
    {chr(10).join(context)}

    Question: {question}

    Answer:"""

        # Earlier turns are expected as {"role": "user" | "assistant", "content": str}
        messages = [
            {"role": turn["role"], "content": turn["content"]} for turn in conversation or []
        ]
        messages.append({"role": "user", "content": prompt})

        # Generate response. The fallback lets the API retry on another model if this one refuses.
        response = self.client.beta.messages.create(
            model="claude-opus-5-5",
            max_tokens=16000,
            messages=messages,
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
        )

        if response.stop_reason == "refusal":
            return "Sorry, I can't help with that."

        return "".join(block.text for block in response.content if block.type == "text")


model: rag_model = rag_model()
