from flask import request, jsonify, current_app, Blueprint
from flask_restx import Namespace, Resource, fields
from ..services.auth_service import auth_service
from ..models.user import User, db
from functools import wraps

bp = Blueprint('auth', __name__)

# Initialize the API namespace
api = Namespace('Auth', description='Authentication operations')

# Request/Response models
login_model = api.model('Login', {
    'username': fields.String(required=True, description='Username', example='testuser'),
    'password': fields.String(required=True, description='Password', example='securepassword123')
})

user_model = api.model('User', {
    'id': fields.String(description='User ID'),
    'username': fields.String(description='Username'),
    'email': fields.String(description='Email address'),
    'first_name': fields.String(description='First name'),
    'last_name': fields.String(description='Last name'),
    'role_name': fields.String(description='User role'),
    'status': fields.String(description='Account status'),
    'last_login': fields.DateTime(description='Last login timestamp'),
    'created_at': fields.DateTime(description='Account creation timestamp'),
    'updated_at': fields.DateTime(description='Last update timestamp')
})

login_response = api.model('LoginResponse', {
    'access_token': fields.String(description='JWT access token'),
    'refresh_token': fields.String(description='Refresh token for getting new access tokens'),
    'expires_in': fields.Integer(description='Access token expiration time in seconds'),
    'refresh_expires_in': fields.Integer(description='Refresh token expiration time in seconds'),
    'user': fields.Nested(user_model, description='User information')
})

user_signup_model = api.model('Signup', {
    'username': fields.String(required=True, description='Username', example='testuser'),
    'email': fields.String(required=True, description='Email address', example='test@example.com'),
    'password': fields.String(required=True, description='Password', example='securepassword123'),
    'first_name': fields.String(description='First name', example='John'),
    'last_name': fields.String(description='Last name', example='Doe')
})

refresh_model = api.model('RefreshToken', {
    'refresh_token': fields.String(required=True, description='Refresh token')
})

update_model = api.model('UpdateUser', {
    'username': fields.String(description='Username'),
    'email': fields.String(description='Email address'),
    'first_name': fields.String(description='First name'),
    'last_name': fields.String(description='Last name'),
    'password': fields.String(description='New password'),
    'old_password': fields.String(description='Old password (required if changing password)'),
    'status': fields.String(description='Account status', example='active'),
    'enabled': fields.Boolean(description='Enable or disable user')
})


@api.route('/login')
class Login(Resource):
    @api.doc('user_login', 
             description='Authenticate user and get access token',
             responses={
                 200: 'Successfully logged in',
                 400: 'Missing username or password',
                 401: 'Invalid credentials',
                 500: 'Internal server error'
             })
    @api.expect(login_model, validate=True)
    @api.marshal_with(login_response, code=200)
    def post(self):
        """
        Authenticate user with username and password
        Returns access token and user information
        """
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            api.abort(400, 'Username and password are required')
        
        # Get token from Keycloak
        token = auth_service.get_token(username, password)
        
        if not token:
            api.abort(401, 'Invalid credentials')
        
        # Get user info and sync with local DB
        user_info = auth_service.get_user_info(token['access_token'])
        if not user_info:
            api.abort(500, 'Failed to get user info')

        print(user_info)
        
        user = auth_service.sync_user_from_keycloak(user_info)
        if not user:
            api.abort(500, 'Failed to sync user data')
        
        return {
            'access_token': token['access_token'],
            'refresh_token': token['refresh_token'],
            'expires_in': token['expires_in'],
            'refresh_expires_in': token['refresh_expires_in'],
            'user': user.to_dict()
        }

@api.route('/signup')
class Signup(Resource):
    @api.doc('user_signup',
             description='Register a new user',
             responses={
                 200: 'User created successfully',
                 400: 'Invalid input',
                 409: 'Username or email already exists',
                 500: 'Internal server error'
             })
    @api.expect(user_signup_model, validate=True)
    def post(self):
        """
        Register a new user
        """
        try:
            data = request.get_json()
            
            # Check if username or email already exists
            if User.query.filter_by(username=data['username']).first():
                api.abort(409, 'Username already exists')
            if User.query.filter_by(email=data['email']).first():
                api.abort(409, 'Email already registered')
            
            try:
                # Register user in Keycloak first
                user_info = auth_service.register_user(
                    username=data['username'],
                    email=data['email'],
                    password=data['password'],
                    first_name=data.get('first_name', ''),
                    last_name=data.get('last_name', '')
                )
            except Exception as e:
                api.abort(500, 'Failed to register user in authentication service caused by : ' + str(e))

            if not user_info:
                api.abort(500, 'Failed to register user in authentication service')
            
            # Create user in database with Keycloak user ID
            user = User(
                id=user_info['id'],
                username=user_info['username'],
                email=user_info['email'],
                first_name=user_info.get('first_name', ''),
                last_name=user_info.get('last_name', '')
            )
            user.password = data['password']
            
            db.session.add(user)
            db.session.commit()
            
            return user.to_dict(), 200
            
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error during user registration: {str(e)}")
            api.abort(500, 'Failed to register user')

@api.route('/logout')
class Logout(Resource):
    @api.doc('user_logout',
             description='Logout user and invalidate token',
             security='bearer',
             params={
                 'Authorization': {
                     'description': 'Bearer refresh token',
                     'required': True,
                     'in': 'header'
                 }
             },
             authorizations={
                 'bearer': {
                     'type': 'bearer',
                     'in': 'header',
                     'name': 'Authorization',
                     'description': 'Type in the value input box: Bearer {your_token}'
                 }
             },
             responses={
                 200: 'Successfully logged out',
                 401: 'Invalid or missing token',
                 500: 'Failed to revoke token'
             })
    #@auth_service.token_required
    def post(self):
        """
        Logout user by invalidating the current token
        """

        token = None
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(" ")[1]
        
        if not token:
            api.abort(401, 'Token is missing')
            
        if not auth_service.logout(token):
            api.abort(500, 'Failed to revoke token')
        
        return {'message': 'Successfully logged out'}, 200

@api.route('/refresh')
class Refresh(Resource):
    @api.doc('refresh_token',
             description='Refresh access token using refresh token',
             responses={
                 200: 'Token refreshed successfully',
                 400: 'Refresh token is required',
                 401: 'Invalid refresh token',
                 500: 'Failed to refresh token'
             })
    @api.expect(refresh_model, validate=True)
    def post(self):
        """
        Refresh access token using refresh token.
        
        This endpoint exchanges a valid refresh token for a new access token and refresh token.
        The refresh token must be included in the request body.
        """
        data = request.get_json()
        refresh_token = data.get('refresh_token')
        
        if not refresh_token:
            api.abort(400, 'Refresh token is required')
        
        try:
            # Use the auth service to refresh the token
            new_tokens = auth_service.refresh_token(refresh_token)
            
            if not new_tokens:
                api.abort(401, 'Invalid refresh token')
                
            return {
                'access_token': new_tokens['access_token'],
                'refresh_token': new_tokens['refresh_token'],
                'expires_in': new_tokens['expires_in'],
                'token_type': 'Bearer'
            }, 200
            
        except Exception as e:
            current_app.logger.error(f"Error refreshing token: {str(e)}")
            api.abort(500, 'Failed to refresh token')

@api.route('/testing_protected')
class Protected(Resource):
    @api.doc('testing_protected',
             description='Testing protected route',
             security='bearer',
             params={
                 'Authorization': {
                     'description': 'Bearer access token',
                     'required': True,
                     'in': 'header'
                 }
             },
             authorizations={
                 'bearer': {
                     'type': 'Authorization',
                     'in': 'header',
                     'name': 'Authorization',
                     'description': 'Type in the value input box: Bearer {your_token}'
                 }
             },
             responses={
                 200: 'Successfully invoked protected route',
                 401: 'Invalid or missing token',
                 500: 'Failed to revoke token'
             })
    @auth_service.token_required
    def post(self, current_user):

        print(current_user)
    
        return {'message': 'Successfully invoked protected route'}, 200


@api.route('/testing_non_protected')
class NonProtected(Resource):
    @api.doc('testing_non_protected',
             description='Testing non protected route',
             responses={
                 200: 'Successfully invoked protected route',
                 401: 'Invalid or missing token',
                 500: 'Failed to revoke token'
                 })
    def post(self):
        return {'message': 'Successfully invoked non protected route'}, 200

@api.route('/user/<string:user_id>')
class UpdateUser(Resource):
    @api.expect(update_model, validate=True)
    @auth_service.token_required
    def put(self, user_id, current_user=None):
        data = request.get_json()
        updated_user, error = auth_service.update_user(user_id, data, current_user.username)
        if not updated_user:
            api.abort(400, error)
        return updated_user.to_dict(), 200

@api.route('/forgot-password')
class ForgotPassword(Resource):
    @api.doc('forgot_password', description='Send reset password link to email')
    def post(self):
        data = request.get_json()
        email = data.get('email')

        if not email:
            api.abort(400, 'Email is required')

        # Cari user berdasarkan email di Keycloak
        keycloak_admin = auth_service._get_admin_client()
        users = keycloak_admin.get_users({"email": email})
        if not users:
            api.abort(404, 'User not found')

        # Generate reset token
        token = auth_service.generate_reset_token(email)

        # Kirim email (contoh log dulu)
        reset_link = f"{current_app.config['FRONTEND_URL']}/reset-password?token={token}"
        
        # Kirim email reset password
        from flask_mail import Message
        from app import mail

        msg = Message("Reset Your Password", recipients=[email])
        msg.body = f"Hi,\n\nClick the link below to reset your password:\n{reset_link}\n\nIf you didn't request this, please ignore this email."
        mail.send(msg)

        # TODO: ganti log di atas jadi pengiriman email SMTP kamu
        return {"message": "Reset link sent to your email"}, 200


@api.route('/reset-password')
class ResetPassword(Resource):
    @api.doc('reset_password', description='Reset password with valid token')
    def post(self):
        data = request.get_json()
        token = data.get('token')
        new_password = data.get('new_password')

        if not token or not new_password:
            api.abort(400, 'Token and new password are required')

        email = auth_service.verify_reset_token(token)
        if not email:
            api.abort(400, 'Invalid or expired token')

        keycloak_admin = auth_service._get_admin_client()
        users = keycloak_admin.get_users({"email": email})
        if not users:
            api.abort(404, 'User not found')

        user_id = users[0]["id"]

        # Set new password di Keycloak
        keycloak_admin.set_user_password(
            user_id=user_id,
            password=new_password,
            temporary=False
        )

        return {"message": "Password has been reset successfully"}, 200
