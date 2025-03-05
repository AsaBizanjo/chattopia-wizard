# chats/utils/chroma_client.py
import chromadb
from chromadb.config import Settings
import openai
from django.conf import settings
import os

class ChromaClient:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ChromaClient, cls).__new__(cls)
            cls._instance.client = chromadb.Client(Settings(
                chroma_db_impl="duckdb+parquet",
                persist_directory=os.path.join(settings.BASE_DIR, "chroma_db")
            ))
            cls._instance.collection = cls._instance.client.get_or_create_collection(
                name="document_store"
            )
        return cls._instance

    @staticmethod
    def get_embedding(text):
        """Get embedding using OpenAI's text-embedding-3-large model"""
        response = openai.Embeddings.create(
            model="text-embedding-3-large",
            input=text
        )
        return response.data[0].embedding

    def add_documents(self, texts, metadata_list):
        """Add documents to Chroma DB"""
        embeddings = [self.get_embedding(text) for text in texts]
        ids = [str(hash(text)) for text in texts]
        
        self.collection.add(
            embeddings=embeddings,
            documents=texts,
            metadatas=metadata_list,
            ids=ids
        )
        return ids

    def search(self, query, n_results=5):
        """Search for relevant documents"""
        query_embedding = self.get_embedding(query)
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results
        )
        return results