from django.urls import path

from api import views

urlpatterns = [
    path("health/", views.health, name="health"),
    path("products/", views.products, name="products"),
    path("stats/", views.stats, name="stats"),

    # customers & dataset upload / reset
    path("reset/", views.reset_data, name="reset-data"),
    path("upload/", views.upload_customers, name="upload-customers"),
    path("datasets/", views.saved_datasets_list, name="saved-datasets"),
    path("datasets/<int:dataset_id>/activate/", views.saved_dataset_activate, name="saved-dataset-activate"),
    path("datasets/<int:dataset_id>/", views.saved_dataset_delete, name="saved-dataset-delete"),
    path("customers/", views.customer_list, name="customer-list"),
    path("customers/<str:customer_id>/", views.customer_detail, name="customer-detail"),

    # PART 1 - recommendation with reasoning
    path("customers/<str:customer_id>/recommend/", views.recommend, name="recommend"),
    path("customers/<str:customer_id>/eligibility/", views.eligibility, name="eligibility"),
    path("nudge-queue/", views.nudge_queue, name="nudge-queue"),

    # PART 2 - RM chatbot
    path("chat/", views.chat, name="chat"),
    path("chat/trending-questions/", views.chat_trending_questions, name="chat-trending-questions"),
    path("chat/<str:session_id>/", views.chat_history, name="chat-history"),

    # ops & RAG pipeline
    path("synthesis/runs/", views.synthesis_runs, name="synthesis-runs"),
    path("synthesis/step/", views.synthesis_step, name="synthesis-step"),
    path("synthesis/reset/", views.synthesis_reset, name="synthesis-reset"),
    path("synthesis/export/", views.export_synthesized_csv, name="synthesis-export"),
    path("rag/build/", views.build_rag_pipeline_view, name="rag-build"),
    path("rag/chunks/", views.rag_chunks_view, name="rag-chunks"),
    path("rag/search/", views.rag_search, name="rag-search"),
    path("quality-gate/", views.quality_gate_view, name="quality-gate"),
    path("validate/", views.validate_recommendation, name="validate-recommendation"),
    path("validate/<str:customer_id>/", views.validate_recommendation, name="validate-customer-recommendation"),
]
