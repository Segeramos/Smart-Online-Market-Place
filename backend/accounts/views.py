from django.shortcuts import render

# Create your views here.
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import User
from .serializers import UserSerializer
from rest_framework_simplejwt.tokens import RefreshToken

# User registration
class RegisterView(APIView):
    def post(self, request):
        data = request.data
        user = User.objects.create_user(
            email=data['email'],
            password=data['password'],
            full_name=data['full_name'],
            role=data.get('role', 'customer')
        )
        serializer = UserSerializer(user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

# User login
class LoginView(APIView):
    def post(self, request):
        data = request.data
        user = authenticate(email=data['email'], password=data['password'])
        if user:
            serializer = UserSerializer(user)
            return Response(serializer.data)
        return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)
