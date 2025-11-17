import os
from functools import wraps
from datetime import datetime, timedelta
from flask import request, current_app
from keycloak import KeycloakOpenID, KeycloakAdmin
from jose import jwt, JWTError
from ..models.user import User
from ..models.api_key import APIKey
from .. import db
from datetime import datetime, timedelta

RESET_SECRET = os.getenv("RESET_SECRET", "supersecretresetkey")

class AuthService:
    def __init__(self, app=None):
        self.keycloak_openid = None
        if app:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize Keycloak with app configuration"""
        self.keycloak_openid = KeycloakOpenID(
            server_url=app.config['KEYCLOAK_SERVER_URL'],
            client_id=app.config['KEYCLOAK_CLIENT_ID'],
            realm_name=app.config['KEYCLOAK_REALM_NAME'],
            client_secret_key=app.config['KEYCLOAK_CLIENT_SECRET'],
            verify=False
        )
    
    def get_token(self, username, password):
        """Get access token from Keycloak"""
        try:
            token = self.keycloak_openid.token(username, password)
            return token
        except Exception as e:
            current_app.logger.error(f"Error getting token: {str(e)}")
            return None
    
    def decode_token(self, token):
        """
        Decode and validate JWT token with detailed error reporting
        
        Returns:
            dict: Decoded token if valid
            None: If token is invalid with detailed error in logs
        """
        try:
            if not token or not isinstance(token, str):
                current_app.logger.error("Invalid token: Token is empty or not a string")
                return None
                
            current_app.logger.info(f"Starting token validation for token: {token[:10]}...")
            
            # Get public key from config
            try:
                if not current_app.config.get('KEYCLOAK_PUBLIC_KEY'):
                    current_app.logger.error("Missing configuration: KEYCLOAK_PUBLIC_KEY is not set")
                    return None
                    
                public_key = f"-----BEGIN PUBLIC KEY-----\n{current_app.config['KEYCLOAK_PUBLIC_KEY']}\n-----END PUBLIC KEY-----"
                current_app.logger.info("Public key formatted successfully")
            except KeyError as e:
                current_app.logger.error(f"Missing configuration: {str(e)}")
                return None

            # First verify if token is active
            try:
                current_app.logger.info("Calling Keycloak introspect endpoint...")
                token_info = self.keycloak_openid.introspect(token)
                current_app.logger.debug(f"Introspection response: {token_info}")
                
                if not token_info.get('active'):
                    error_msg = "Token is not active. "
                    if 'exp' in token_info:
                        from datetime import datetime
                        exp_time = datetime.fromtimestamp(token_info['exp'])
                        error_msg += f"Token expired at: {exp_time}. "
                    if 'client_id' in token_info:
                        error_msg += f"Client ID: {token_info['client_id']}. "
                    if 'username' in token_info:
                        error_msg += f"Username: {token_info['username']}."
                    current_app.logger.error(error_msg)
                    return None
                    
                current_app.logger.info("Token is active and valid")
                
            except Exception as e:
                current_app.logger.error(f"Error during token introspection: {str(e)}")
                current_app.logger.debug(f"Exception details:", exc_info=True)
                return None

            # Prepare issuer URL for validation
            issuer = f"{current_app.config['KEYCLOAK_SERVER_URL']}/realms/{current_app.config['KEYCLOAK_REALM_NAME']}"
            current_app.logger.info(f"Validating token with issuer: {issuer}")
            current_app.logger.debug(f"Keycloak server URL: {current_app.config['KEYCLOAK_SERVER_URL']}")
            current_app.logger.debug(f"Keycloak realm: {current_app.config['KEYCLOAK_REALM_NAME']}")
            current_app.logger.debug(f"Client ID: {current_app.config['KEYCLOAK_CLIENT_ID']}")

            # Decode and validate token
            try:
                # First decode without verification to get token claims
                unverified_claims = jwt.get_unverified_claims(token)
                current_app.logger.debug(f"Unverified token claims: {unverified_claims}")
                
                # Now verify the token
                decoded = jwt.decode(
                    token,
                    public_key,
                    algorithms=["RS256"],
                    issuer=issuer,
                    options={
                        "verify_aud": False,  # skip audience check
                        "verify_exp": True,
                        "verify_iat": True,
                        "verify_nbf": True,
                        "verify_iss": True,
                        "verify_signature": True
                    }
                )
                
                current_app.logger.info("Token decoded and validated successfully")
                current_app.logger.debug(f"Decoded token: {decoded}")
                return decoded
                
            except jwt.ExpiredSignatureError:
                current_app.logger.error("Token has expired")
                if 'exp' in unverified_claims:
                    from datetime import datetime
                    exp_time = datetime.fromtimestamp(unverified_claims['exp'])
                    current_app.logger.error(f"Token expired at: {exp_time}")
                return None
                
            except jwt.JWTClaimsError as e:
                current_app.logger.error(f"Invalid token claims: {str(e)}")
                current_app.logger.debug(f"Problematic claims: {unverified_claims}")
                return None
                
            except Exception as e:
                current_app.logger.error(f"Error decoding token: {str(e)}")
                current_app.logger.debug("Exception details:", exc_info=True)
                if 'unverified_claims' in locals():
                    current_app.logger.debug(f"Unverified claims: {unverified_claims}")
                return None

        except Exception as e:
            current_app.logger.error(f"Unexpected error in token validation: {str(e)}")
            current_app.logger.debug("Exception details:", exc_info=True)
            return None
    
    def get_user_info(self, token):
        """Get user info from Keycloak"""
        try:
            return self.keycloak_openid.userinfo(token)
        except Exception as e:
            current_app.logger.error(f"Error getting user info: {str(e)}")
            return None
    
    def sync_user_from_keycloak(self, user_info):
        """Sync or create user in local database from Keycloak"""
        username = user_info.get('preferred_username')
        email = user_info.get('email')
        first_name = user_info.get('given_name', '')
        last_name = user_info.get('family_name', '')
        user_id = user_info.get('sub')
        
        if not username or not email:
            return None
            
        user = User.query.filter_by(username=username).first()
        if not user:
            user = User(
                id=user_id,
                username=username,
                email=email,
                first_name=first_name,
                last_name=last_name,
                role_name=user_info.get('realm_access', {}).get('roles', ['user'])[0],
                status='active'
            )
            db.session.add(user)
        
        user.last_login = datetime.utcnow()
        db.session.commit()
        
        return user
    
    def dual_auth_required(self, f):
        @wraps(f)
        def decorated(*args, **kwargs):
            from werkzeug.exceptions import HTTPException
            
            # Get token from Authorization header
            auth_header = request.headers.get('Authorization')
            token = None
            if auth_header and auth_header.startswith('Bearer '):
                token = auth_header.split(" ")[1]
            
            # Get API Key from header if exists
            api_key = request.headers.get('X-API-Key')
            workflow_uuid = kwargs.get("workflow_uuid")
            
            # 1. If Bearer token is provided
            if token:
                decoded_token = self.decode_token(token)
                if not decoded_token:
                    return {
                        "status": "error",
                        "code": "invalid_token",
                        "message": "Invalid or expired token"
                    }, 401

                current_user = self.sync_user_from_keycloak(decoded_token)
                if not current_user:
                    return {
                        "status": "error",
                        "code": "user_not_found",
                        "message": "User account not found or inactive"
                    }, 401
            # 2. If no Bearer token but API Key is provided
            elif api_key:
                key_obj = self.validate_api_key(api_key, workflow_uuid)
                if not key_obj:
                    return {
                        "status": "error",
                        "code": "invalid_api_key",
                        "message": "Invalid API Key or Workflow not allowed"
                    }, 401
                current_user = key_obj
            # 3. If neither Bearer token nor valid API Key is provided
            else:
                return {
                    "status": "error",
                    "code": "missing_credentials",
                    "message": "Authentication required (Bearer or API Key)"
                }, 401

            # 4. If authentication is successful, proceed to route
            try:
                return f(*args, current_user=current_user, **kwargs)
            except HTTPException:
                raise
            except Exception as e:
                current_app.logger.error(f"Error in route handler: {str(e)}", exc_info=True)
                raise

        return decorated

    def token_required(self, f):
        @wraps(f)
        def decorated(*args, **kwargs):
            from werkzeug.exceptions import HTTPException
            
            # First, handle the token validation
            token = None
            if 'Authorization' in request.headers:
                try:
                    token = request.headers['Authorization'].split(" ")[1]
                except IndexError:
                    return {
                        'status': 'error',
                        'code': 'invalid_auth_header',
                        'message': 'Invalid Authorization header format. Expected: Bearer <token>'
                    }, 401

            if not token:
                return {
                    'status': 'error',
                    'code': 'missing_token',
                    'message': 'Authentication token is missing'
                }, 401

            try:
                # Try to decode and validate the token
                decoded_token = self.decode_token(token)
                if not decoded_token:
                    # Check if we can get more specific error from the token
                    try:
                        # Try to get unverified claims for better error reporting
                        unverified_claims = jwt.get_unverified_claims(token)
                        if 'exp' in unverified_claims:
                            from datetime import datetime
                            exp_time = datetime.fromtimestamp(unverified_claims['exp'])
                            current_time = datetime.now()
                            if exp_time < current_time:
                                return {
                                    'status': 'error',
                                    'code': 'token_expired',
                                    'message': 'Your session has expired. Please log in again.',
                                    'expired_at': exp_time.isoformat()
                                }, 401
                    except Exception:
                        pass
                    
                    return {
                        'status': 'error',
                        'code': 'invalid_token',
                        'message': 'Invalid or malformed authentication token'
                    }, 401

                # Get or sync the user
                current_user = self.sync_user_from_keycloak(decoded_token)
                if not current_user:
                    return {
                        'status': 'error',
                        'code': 'user_not_found',
                        'message': 'User account not found or inactive'
                    }, 401

                # If we get here, authentication was successful
                # Now call the actual route handler
                try:
                    return f(*args, current_user=current_user, **kwargs)
                except HTTPException as http_exc:
                    # Let HTTP exceptions (like 404, 403, etc.) propagate through
                    raise
                except Exception as e:
                    # Log other exceptions but don't convert them to 401
                    current_app.logger.error(f"Error in route handler: {str(e)}", exc_info=True)
                    raise

            except Exception as e:
                # Handle any other errors during token validation
                current_app.logger.error(f"Error during token validation: {str(e)}", exc_info=True)
                return {
                    'status': 'error',
                    'code': 'authentication_error',
                    'message': 'Failed to authenticate token.'
                }, 401

        return decorated

    def register_user(self, username, email, password, first_name='', last_name=''):
        """Register a new user in Keycloak and local database
        
        Args:
            username (str): The username
            email (str): User's email
            password (str): User's password
            first_name (str, optional): User's first name. Defaults to ''.
            last_name (str, optional): User's last name. Defaults to ''.
            
        Returns:
            dict: User info including id, username, email, first_name, last_name if successful
            None: If user already exists or registration fails
        """
        try:
            # Initialize KeycloakAdmin with direct admin credentials
            keycloak_admin = KeycloakAdmin(
                server_url=current_app.config['KEYCLOAK_SERVER_URL'],
                username=current_app.config['KEYCLOAK_ADMIN_USERNAME'],
                password=current_app.config['KEYCLOAK_ADMIN_PASSWORD'],
                realm_name='master',  # Use master realm for admin authentication
                verify=False
            )
            
            # Switch to the target realm for user creation
            keycloak_admin.realm_name = current_app.config['KEYCLOAK_REALM_NAME']
            
            # Create user payload with required fields
            user_payload = {
                "username": username,
                "email": email,
                "firstName": first_name,
                "lastName": last_name,
                "enabled": True,
                "emailVerified": False,
                "credentials": [{
                    "type": "password",
                    "value": password,
                    "temporary": False
                }]
            }
            
            try:
                # Create user in Keycloak
                user_id = keycloak_admin.create_user(user_payload)
                
                # Get the created user info
                user_info = keycloak_admin.get_user(user_id)
                return {
                    'id': user_info.get('id'),
                    'username': user_info.get('username'),
                    'email': user_info.get('email'),
                    'first_name': user_info.get('firstName', ''),
                    'last_name': user_info.get('lastName', '')
                }
                
            except Exception as create_err:
                # If user already exists, log and return None
                if 'User exists' in str(create_err):
                    current_app.logger.warning(f"User {username} already exists in Keycloak")
                    return None
                raise create_err
                
        except Exception as e:
            current_app.logger.error(f"Error in register_user: {str(e)}")
            return None

    def refresh_token(self, refresh_token):
        """Refresh access token using refresh token
        
        Args:
            refresh_token (str): The refresh token
            
        Returns:
            dict: New tokens including access_token and refresh_token
            None: If refresh fails
        """
        try:
            # Exchange refresh token for new tokens
            tokens = self.keycloak_openid.refresh_token(refresh_token)
            return {
                'access_token': tokens['access_token'],
                'refresh_token': tokens['refresh_token'],
                'expires_in': tokens['expires_in'],
                'refresh_expires_in': tokens['refresh_expires_in']
            }
        except Exception as e:
            current_app.logger.error(f"Error refreshing token: {str(e)}")
            return None

    def logout(self, token):
        """Revoke token in Keycloak
        
        Args:
            token (str): The access token to revoke
            
        Returns:
            bool: True if token was successfully revoked, False otherwise
        """
        try:
            # Get the token introspection to get the token ID
            token_info = self.keycloak_openid.introspect(token)
            if not token_info.get('active'):
                current_app.logger.warning("Token is already invalid or expired")
                return True
                
            # Revoke the token
            self.keycloak_openid.logout(token)
            current_app.logger.info("Successfully revoked token in Keycloak")
            return True
            
        except Exception as e:
            current_app.logger.error(f"Error revoking token: {str(e)}")
            return False

    def update_user(self, user_id, update_data, current_username=None):
        try:
            keycloak_admin = KeycloakAdmin(
                server_url=current_app.config['KEYCLOAK_SERVER_URL'],
                username=current_app.config['KEYCLOAK_ADMIN_USERNAME'],
                password=current_app.config['KEYCLOAK_ADMIN_PASSWORD'],
                realm_name='master',
                verify=False
            )
            keycloak_admin.realm_name = current_app.config['KEYCLOAK_REALM_NAME']

            # Update basic attributes
            user_payload = {}
            if 'username' in update_data:
                user_payload['username'] = update_data['username']
            if 'email' in update_data:
                user_payload['email'] = update_data['email']
            if 'first_name' in update_data:
                user_payload['firstName'] = update_data['first_name']
            if 'last_name' in update_data:
                user_payload['lastName'] = update_data['last_name']
            if 'enabled' in update_data:
                user_payload['enabled'] = update_data['enabled']

            if user_payload:
                keycloak_admin.update_user(user_id=user_id, payload=user_payload)

            # Password change with old_password verification
            if 'password' in update_data:
                old_password = update_data.get('old_password')
                if not old_password:
                    return None, "Old password is required to change password"

                # Verify old password via token request
                try:
                    self.keycloak_openid.token(current_username, old_password)
                except Exception:
                    return None, "Old password incorrect"

                keycloak_admin.set_user_password(
                    user_id=user_id,
                    password=update_data['password'],
                    temporary=False
                )

            # Update local DB
            user = User.query.get(user_id)
            if not user:
                return None, "User not found"

            if 'username' in update_data:
                user.username = update_data['username']
            if 'email' in update_data:
                user.email = update_data['email']
            if 'first_name' in update_data:
                user.first_name = update_data['first_name']
            if 'last_name' in update_data:
                user.last_name = update_data['last_name']
            if 'password' in update_data:
                user.password = update_data['password']
            if 'status' in update_data:
                user.status = update_data['status']

            db.session.commit()
            return user, None

        except Exception as e:
            current_app.logger.error(f"Error updating user: {str(e)}", exc_info=True)
            db.session.rollback()
            return None, "Failed to update user"

    def validate_api_key(self, token, workflow_uuid=None):
        """
        API Key validation based on token and optional workflow_uuid
        """
        if not token:
            return None

        key_obj = APIKey.query.filter_by(token=token).first()
        if not key_obj:
            return None

        # Jika ada workflow_uuid yang wajib dicek
        if workflow_uuid and str(key_obj.workflow_uuid) != str(workflow_uuid):
            current_app.logger.warning(
                f"API Key {token[:8]}... tidak cocok dengan workflow {workflow_uuid}"
            )
            return None

        # Update last_used_at
        key_obj.last_used_at = datetime.utcnow()
        db.session.commit()

        return key_obj

    def generate_reset_token(self, email):
        """Generate password reset token (valid 15 minutes)"""
        exp = datetime.utcnow() + timedelta(minutes=15)
        payload = {"email": email, "exp": exp}
        token = jwt.encode(payload, RESET_SECRET, algorithm="HS256")
        return token

    def verify_reset_token(self, token):
        """Verify reset token"""
        try:
            payload = jwt.decode(token, RESET_SECRET, algorithms=["HS256"])
            return payload["email"]
        except jwt.ExpiredSignatureError:
            return None
        except Exception:
            return None

    def _get_admin_client(self):
        return KeycloakAdmin(
            server_url=current_app.config['KEYCLOAK_SERVER_URL'],
            username=current_app.config['KEYCLOAK_ADMIN_USERNAME'],
            password=current_app.config['KEYCLOAK_ADMIN_PASSWORD'],
            realm_name=current_app.config['KEYCLOAK_REALM_NAME'],
            verify=False
        )

# Initialize auth service
auth_service = AuthService()
