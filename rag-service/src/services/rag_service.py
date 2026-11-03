import os
from pathlib import Path
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
from anthropic import AsyncAnthropic
from dotenv import load_dotenv

load_dotenv()
# # Might implement langchain https://www.datacamp.com/tutorial/building-a-rag-system-with-langchain-and-fastapi?utm_cid=19589720824&utm_aid=157098106775&utm_campaign=230119_1-ps-other~dsa-tofu~all_2-b2c_3-apac_4-prc_5-na_6-na_7-le_8-pdsh-go_9-nb-e_10-na_11-na&utm_loc=9062542-&utm_mtd=-c&utm_kw=&utm_source=google&utm_medium=paid_search&utm_content=ps-other~apac-en~dsa~tofu~tutorial~artificial-intelligence&gad_source=1&gad_campaignid=19589720824&gbraid=0AAAAADQ9WsFOp055eTCmpATtil_ROe2nf&gclid=CjwKCAjwxpvXBhASEiwAue4B4d6ak2zA5rRgKmQM5vPNlnu3S3ZWS8czpzIEnbfyuLpHtBwXZIXy_RoCOTYQAvD_BwE
DATA_DIR = Path(__file__).resolve().parent.parent / "data"

documents = [path.read_text(encoding="utf-8") for path in sorted(DATA_DIR.glob("*.txt"))]


class rag_system():

    def __init__(self):
        self.model = SentenceTransformer("all-MiniLM-L6-v2", device ="cpu")  # 384-dim embeddings
        embeddings = self.model.encode(documents)

        dimension = embeddings.shape[1]
        self.index = faiss.IndexFlatL2(dimension)
        self.index.add(np.array(embeddings))

        self.client = AsyncAnthropic(api_key=os.environ["CLAUDE_API_KEY"])

    def retrieve(self, query, k=2):
        query_embedding = self.model.encode([query])
        distances, indices = self.index.search(query_embedding, k)
        return [documents[i] for i in indices[0]]

    async def rag_query(self, question, conversation: list | None = None):
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
            model="claude-haiku-5-5",
            max_tokens=16000,
            messages=messages,
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
        )

        if response.stop_reason == "refusal":
            return "Sorry, I can't help with that."

        return "".join(block.text for block in response.content if block.type == "text")

rag: rag_system| None = None

# Test Class
# class rag_system():
#     def __init__(self):
#         print("rag created")

#     async def rag_query(self, question, conversation: list | None = None):
#         return "This is my rag response"

def boostrap_rag_system():
    global rag
    rag = rag_system()

def get_rag_system():
    global rag

    if rag is None:
        rag = rag_system()

    return rag
