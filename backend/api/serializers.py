from rest_framework import serializers

from api.models import Customer, FeedbackRecord, SynthesisRun, ChatMessage


class FeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeedbackRecord
        fields = ["channel", "text", "sentiment", "signal",
                  "is_synthetic", "synthesis_round", "seed_corpus_size"]


class CustomerListSerializer(serializers.ModelSerializer):
    feedback = FeedbackSerializer(many=True, read_only=True)
    fd_lakhs = serializers.ReadOnlyField()
    recommended_product = serializers.ReadOnlyField()

    class Meta:
        model = Customer
        fields = "__all__"


class CustomerDetailSerializer(serializers.ModelSerializer):
    feedback = FeedbackSerializer(many=True, read_only=True)
    fd_lakhs = serializers.ReadOnlyField()
    profile_sentence = serializers.ReadOnlyField()
    recommended_product = serializers.ReadOnlyField()

    class Meta:
        model = Customer
        fields = "__all__"


class SynthesisRunSerializer(serializers.ModelSerializer):
    class Meta:
        model = SynthesisRun
        fields = "__all__"


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ["session_id", "role", "content", "intent",
                  "agents_used", "chart_spec", "created_at"]
